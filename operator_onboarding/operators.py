"""
operator_onboarding/operators.py
CRUD for operators table (Airbnb Agency type). Uses SQLite when mode=local, MongoDB when mode=cloud (lib.db).
"""
import json
import sqlite3
import time
from pathlib import Path
from typing import Any

try:
    from .db import get_db_path, init_db
except ImportError:
    from db import get_db_path, init_db

# Ensure DB and operators table exist on import
init_db()

MAX_RULES = 50


def _mode_cloud() -> bool:
    """True when lib.db mode is cloud (use MongoDB for operators)."""
    try:
        from lib.db import get_mode
        return get_mode() == "cloud"
    except ImportError:
        return False


def _mongo_operators():
    from lib.db import _mongo_db
    return _mongo_db()["operators"]


def _mongo_next_id() -> int:
    coll = _mongo_operators()
    doc = coll.find_one({}, sort=[("id", -1)], projection={"id": 1})
    return (doc["id"] + 1) if doc and doc.get("id") is not None else 1


def _parse_operator_doc(d: dict | None) -> dict | None:
    """Normalize operator doc from Mongo (id, JSON fields)."""
    if d is None:
        return None
    d = dict(d)
    d.pop("_id", None)
    for key in ("services", "usps", "pricing_model", "key_phrases", "languages", "qualification_rules", "rules", "agency_context_ext"):
        if d.get(key) and isinstance(d[key], str):
            try:
                parsed = json.loads(d[key])
                if key == "rules" and isinstance(parsed, list):
                    d[key] = parsed[:MAX_RULES]
                else:
                    d[key] = parsed
            except json.JSONDecodeError:
                pass
    if d.get("rules") is None:
        d["rules"] = []
    if d.get("agency_context_ext") is None:
        d["agency_context_ext"] = {}
    return d


def _conn():
    return sqlite3.connect(str(get_db_path()))


def _serialize_json_fields(data: dict) -> dict:
    out = dict(data)
    for key in ("services", "usps", "pricing_model", "key_phrases", "languages", "qualification_rules", "rules", "agency_context_ext"):
        if key in out and out[key] is not None and not isinstance(out[key], str):
            if key == "rules" and isinstance(out[key], list):
                out[key] = json.dumps(out[key][:MAX_RULES])
            elif key == "agency_context_ext" and isinstance(out[key], dict):
                out[key] = json.dumps(out[key])
            else:
                out[key] = json.dumps(out[key])
    return out


def create_operator(data: dict) -> int:
    """Insert a new operator. Returns new row id. Uses MongoDB when mode=cloud."""
    if _mode_cloud():
        data = _serialize_json_fields(data)
        now = int(time.time())
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data["id"] = _mongo_next_id()
        doc = {k: v for k, v in data.items() if v is not None}
        _mongo_operators().insert_one(doc)
        return data["id"]
    data = _serialize_json_fields(data)
    now = int(time.time())
    data.setdefault("created_at", now)
    data.setdefault("updated_at", now)
    cols = [k for k in data if k != "id"]
    placeholders = ", ".join("?" * len(cols))
    columns = ", ".join(cols)
    conn = _conn()
    try:
        cur = conn.execute(
            f"INSERT INTO operators ({columns}) VALUES ({placeholders})",
            [data[k] for k in cols],
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_operator(operator_id: int) -> dict | None:
    """Fetch one operator by id. Returns dict with JSON fields parsed, or None. Uses MongoDB when mode=cloud."""
    if _mode_cloud():
        return _parse_operator_doc(_mongo_operators().find_one({"id": operator_id}))
    conn = _conn()
    try:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM operators WHERE id = ?", (operator_id,)).fetchone()
        if row is None:
            return None
        d = dict(row)
        for key in ("services", "usps", "pricing_model", "key_phrases", "languages", "qualification_rules", "rules", "agency_context_ext"):
            if d.get(key) and isinstance(d[key], str):
                try:
                    parsed = json.loads(d[key])
                    if key == "rules" and isinstance(parsed, list):
                        d[key] = parsed[:MAX_RULES]
                    else:
                        d[key] = parsed
                except json.JSONDecodeError:
                    pass
        if d.get("rules") is None:
            d["rules"] = []
        if d.get("agency_context_ext") is None:
            d["agency_context_ext"] = {}
        return d
    finally:
        conn.close()


def get_all_operators() -> list[dict]:
    """Fetch all operators. JSON fields parsed. Uses MongoDB when mode=cloud."""
    if _mode_cloud():
        cursor = _mongo_operators().find({}).sort("id", 1)
        return [_parse_operator_doc(d) for d in cursor if _parse_operator_doc(d)]
    conn = _conn()
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM operators ORDER BY id").fetchall()
        out = []
        for row in rows:
            d = dict(row)
            for key in ("services", "usps", "pricing_model", "key_phrases", "languages", "qualification_rules", "rules", "agency_context_ext"):
                if d.get(key) and isinstance(d[key], str):
                    try:
                        parsed = json.loads(d[key])
                        if key == "rules" and isinstance(parsed, list):
                            d[key] = parsed[:MAX_RULES]
                        else:
                            d[key] = parsed
                    except json.JSONDecodeError:
                        pass
            if d.get("rules") is None:
                d["rules"] = []
            if d.get("agency_context_ext") is None:
                d["agency_context_ext"] = {}
            out.append(d)
        return out
    finally:
        conn.close()


def update_operator(operator_id: int, data: dict) -> bool:
    """Update an operator by id. Returns True if a row was updated. Uses MongoDB when mode=cloud."""
    if _mode_cloud():
        data = _serialize_json_fields(data)
        data["updated_at"] = int(time.time())
        data.pop("id", None)
        data.pop("created_at", None)
        r = _mongo_operators().update_one({"id": operator_id}, {"$set": data})
        return r.modified_count > 0 or r.matched_count > 0
    data = _serialize_json_fields(data)
    data["updated_at"] = int(time.time())
    data.pop("id", None)
    data.pop("created_at", None)
    cols = [k for k in data]
    set_clause = ", ".join(f"{k} = ?" for k in cols)
    conn = _conn()
    try:
        cur = conn.execute(
            f"UPDATE operators SET {set_clause} WHERE id = ?",
            [data[k] for k in cols] + [operator_id],
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_operator(operator_id: int) -> bool:
    """Delete an operator by id. Deletes documents first. Uses MongoDB when mode=cloud."""
    if _mode_cloud():
        try:
            from lib.db import _mongo_db
            db = _mongo_db()
            db["operator_documents"].delete_many({"operator_id": operator_id})
            r = db["operators"].delete_one({"id": operator_id})
            return r.deleted_count > 0
        except Exception:
            return False
    conn = _conn()
    try:
        conn.execute("DELETE FROM operator_documents WHERE operator_id = ?", (operator_id,))
        cur = conn.execute("DELETE FROM operators WHERE id = ?", (operator_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
