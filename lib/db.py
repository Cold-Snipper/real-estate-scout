"""
Immo Snippy — Database abstraction layer (Stage 1).
Supports both local (SQLite) and cloud (MongoDB) with identical schemas.
Use get_db() and get_collection(table_name) for unified CRUD.
"""
from __future__ import annotations

import os
import sqlite3
import threading
import time
from typing import Any

# Mode: "local" (SQLite) or "cloud" (MongoDB). Stage 2 will set from user session.
MODE_ENV = "IMMO_SNIPPY_MODE"
_mode_local: threading.local | None = None


def _get_mode_storage() -> threading.local:
    global _mode_local
    if _mode_local is None:
        _mode_local = threading.local()
    return _mode_local


def get_mode() -> str:
    """Return current DB mode: 'local' (SQLite) or 'cloud' (MongoDB)."""
    try:
        storage = _get_mode_storage()
        if hasattr(storage, "mode") and storage.mode in ("local", "cloud"):
            return storage.mode
    except Exception:
        pass
    return os.getenv(MODE_ENV, "local").strip().lower() or "local"


def set_mode(mode: str) -> None:
    """Set current DB mode (for Stage 2: from user session)."""
    if mode not in ("local", "cloud"):
        raise ValueError("mode must be 'local' or 'cloud'")
    storage = _get_mode_storage()
    storage.mode = mode


# Table/collection names and SQLite table name mapping (logs -> activity_logs)
# CRM: owners, properties, conversations (in providers.db when using abstraction)
COLLECTION_NAMES = (
    "operators", "operator_documents", "users", "leads", "agents", "logs",
    "owners", "properties", "conversations",
)
SQLITE_TABLE_MAP = {
    "operators": "operators",
    "operator_documents": "operator_documents",
    "users": "users",
    "leads": "leads",
    "agents": "agents",
    "logs": "activity_logs",
    "owners": "owners",
    "properties": "properties",
    "conversations": "conversations",
}


# ─────────────────────────────────────────────────────────────────────────────
# SQLite backend
# ─────────────────────────────────────────────────────────────────────────────

def _get_sqlite_path() -> str:
    from pathlib import Path
    path = os.getenv("OPERATORS_DB_PATH") or os.getenv("PROVIDERS_DB")
    if path:
        return str(Path(path))
    return str(Path(__file__).resolve().parent.parent / "operator_onboarding" / "providers.db")


def _ensure_sqlite_init() -> None:
    try:
        from operator_onboarding.db import init_db
        init_db()
    except ImportError:
        pass


def _sqlite_conn():
    _ensure_sqlite_init()
    return sqlite3.connect(_get_sqlite_path())


class _SQLiteCollection:
    """Unified collection interface over a SQLite table."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.table = SQLITE_TABLE_MAP.get(name, name)

    def _where(self, query: dict) -> tuple[str, list[Any]]:
        if not query:
            return "", []
        parts = []
        args = []
        for k, v in query.items():
            if k == "_id":
                k = "id"
            parts.append(f'"{k}" = ?')
            args.append(v)
        return " WHERE " + " AND ".join(parts), args

    def insert_one(self, doc: dict) -> int:
        doc = dict(doc)
        doc.pop("_id", None)
        if "id" in doc and doc["id"] is None:
            del doc["id"]
        cols = [k for k in doc if doc[k] is not None]
        placeholders = ", ".join("?" * len(cols))
        columns = ", ".join(f'"{k}"' for k in cols)
        conn = _sqlite_conn()
        try:
            cur = conn.execute(
                f'INSERT INTO {self.table} ({columns}) VALUES ({placeholders})',
                [doc[k] for k in cols],
            )
            conn.commit()
            return cur.lastrowid or 0
        finally:
            conn.close()

    def find_one(self, query: dict) -> dict | None:
        where, args = self._where(query)
        if not where and query:
            return None
        conn = _sqlite_conn()
        try:
            conn.row_factory = sqlite3.Row
            row = conn.execute(f"SELECT * FROM {self.table}{where} LIMIT 1", args).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def find(self, query: dict, limit: int = 0) -> list[dict]:
        where, args = self._where(query)
        limit_clause = f" LIMIT {int(limit)}" if limit > 0 else ""
        conn = _sqlite_conn()
        try:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(f"SELECT * FROM {self.table}{where} ORDER BY id{limit_clause}", args).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def update_one(self, query: dict, update: dict) -> int:
        if not update:
            return 0
        set_parts = []
        set_args = []
        for k, v in update.items():
            if k in ("id", "_id"):
                continue
            set_parts.append(f'"{k}" = ?')
            set_args.append(v)
        if self.table in ("operators", "operator_documents"):
            set_parts.append("updated_at = ?")
            set_args.append(int(time.time()))
        where, where_args = self._where(query)
        set_args.extend(where_args)
        set_sql = ", ".join(set_parts)
        conn = _sqlite_conn()
        try:
            cur = conn.execute(f"UPDATE {self.table} SET {set_sql}{where}", set_args)
            conn.commit()
            return cur.rowcount
        finally:
            conn.close()

    def delete_one(self, query: dict) -> bool:
        where, args = self._where(query)
        if not where:
            return False
        conn = _sqlite_conn()
        try:
            cur = conn.execute(f"DELETE FROM {self.table}{where}", args)
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


class _SQLiteDB:
    """SQLite-backed DB with get_collection(name)."""

    def get_collection(self, name: str) -> _SQLiteCollection:
        if name not in COLLECTION_NAMES:
            raise ValueError(f"Unknown collection: {name}. Known: {COLLECTION_NAMES}")
        return _SQLiteCollection(name)


# ─────────────────────────────────────────────────────────────────────────────
# MongoDB backend
# ─────────────────────────────────────────────────────────────────────────────

def _mongo_client():
    try:
        from pymongo import MongoClient
    except ImportError:
        raise RuntimeError("pymongo not installed. Run: pip install pymongo")
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    return MongoClient(uri)


def _mongo_db():
    client = _mongo_client()
    name = os.getenv("MONGO_DB_NAME", "coldbot")
    return client[name]


class _MongoCollection:
    """Unified collection interface over a MongoDB collection."""

    def __init__(self, name: str) -> None:
        self.name = name
        self._coll = _mongo_db()[name]

    def _query(self, query: dict) -> dict:
        if not query:
            return {}
        q = dict(query)
        if "id" in q:
            try:
                from bson import ObjectId
                q["_id"] = ObjectId(str(q.pop("id")))
            except Exception:
                q["_id"] = q.pop("id")
        return q

    def insert_one(self, doc: dict) -> Any:
        doc = dict(doc)
        doc.pop("id", None)
        doc.pop("_id", None)
        r = self._coll.insert_one(doc)
        return str(r.inserted_id)

    def find_one(self, query: dict) -> dict | None:
        q = self._query(query)
        doc = self._coll.find_one(q)
        if doc is None:
            return None
        d = dict(doc)
        if "_id" in d:
            d["id"] = str(d.pop("_id"))
        return d

    def find(self, query: dict, limit: int = 0) -> list[dict]:
        q = self._query(query)
        cursor = self._coll.find(q).sort("_id", 1)
        if limit > 0:
            cursor = cursor.limit(limit)
        out = []
        for doc in cursor:
            d = dict(doc)
            if "_id" in d:
                d["id"] = str(d.pop("_id"))
            out.append(d)
        return out

    def update_one(self, query: dict, update: dict) -> int:
        if not update:
            return 0
        q = self._query(query)
        unset = {k: "" for k, v in update.items() if v is None}
        set_part = {k: v for k, v in update.items() if v is not None}
        if set_part:
            self._coll.update_one(q, {"$set": set_part})
        if unset:
            self._coll.update_one(q, {"$unset": unset})
        return 1

    def delete_one(self, query: dict) -> bool:
        q = self._query(query)
        r = self._coll.delete_one(q)
        return r.deleted_count > 0


class _MongoDB:
    """MongoDB-backed DB with get_collection(name)."""

    def get_collection(self, name: str) -> _MongoCollection:
        if name not in COLLECTION_NAMES:
            raise ValueError(f"Unknown collection: {name}. Known: {COLLECTION_NAMES}")
        return _MongoCollection(name)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_db() -> _SQLiteDB | _MongoDB:
    """Return DB adapter for current mode: SQLite (local) or MongoDB (cloud)."""
    if get_mode() == "cloud":
        return _MongoDB()
    return _SQLiteDB()


def get_collection(table_name: str):
    """Return unified collection/table handle for the given name."""
    return get_db().get_collection(table_name)


# Optional: ensure Mongo collections exist and have indexes (call once when in cloud mode)
def ensure_mongo_indexes() -> None:
    if get_mode() != "cloud":
        return
    db = _mongo_db()
    for name in COLLECTION_NAMES:
        coll = db[name]
        if name == "users":
            coll.create_index([("provider", 1), ("provider_id", 1)], unique=True)
        elif name == "operators":
            coll.create_index("id", unique=True)
        elif name in ("leads", "agents", "logs"):
            coll.create_index("timestamp")


if __name__ == "__main__":
    # Quick test: local mode, get_collection, insert_one, find_one
    import sys
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    set_mode("local")
    coll = get_collection("users")
    one = coll.find_one({})
    print("mode:", get_mode(), "| users find_one:", "ok" if one is None or one else "ok")
    print("Stage 1 DB abstraction: OK. Run with IMMO_SNIPPY_MODE=cloud to use MongoDB.")
    sys.exit(0)
