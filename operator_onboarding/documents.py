"""
operator_onboarding/documents.py
CRUD for operator_documents. Uses SQLite when mode=local, MongoDB when mode=cloud (lib.db).
"""
import sqlite3
import time
from typing import Any

try:
    from .db import get_db_path, init_db
except ImportError:
    from db import get_db_path, init_db

init_db()

DOCUMENT_TYPES = ("draft_contract", "summary_agreement", "payout_examples", "other")
DOCUMENT_TYPE_LABELS = {
    "draft_contract": "Draft contract",
    "summary_agreement": "Summary agreement",
    "payout_examples": "Payout examples",
    "other": "Other document",
}


def _mode_cloud() -> bool:
    try:
        from lib.db import get_mode
        return get_mode() == "cloud"
    except ImportError:
        return False


def _mongo_docs():
    from lib.db import _mongo_db
    return _mongo_db()["operator_documents"]


def _mongo_next_doc_id() -> int:
    doc = _mongo_docs().find_one({}, sort=[("id", -1)], projection={"id": 1})
    return (doc["id"] + 1) if doc and doc.get("id") is not None else 1


def _conn():
    return sqlite3.connect(str(get_db_path()))


def create_document(operator_id: int, name: str, document_type: str, content: str, file_path: str | None = None) -> int:
    if document_type not in DOCUMENT_TYPES:
        document_type = "other"
    now = int(time.time())
    if _mode_cloud():
        doc_id = _mongo_next_doc_id()
        _mongo_docs().insert_one({
            "id": doc_id,
            "operator_id": operator_id,
            "name": name,
            "document_type": document_type,
            "content": content,
            "file_path": file_path,
            "created_at": now,
            "updated_at": now,
        })
        return doc_id
    conn = _conn()
    try:
        cur = conn.execute(
            """INSERT INTO operator_documents (operator_id, name, document_type, content, file_path, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (operator_id, name, document_type, content, file_path or None, now, now),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_documents(operator_id: int) -> list[dict]:
    if _mode_cloud():
        cursor = _mongo_docs().find({"operator_id": operator_id}).sort("document_type", 1).sort("name", 1)
        return [_doc_to_dict(d) for d in cursor]
    conn = _conn()
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, operator_id, name, document_type, content, file_path, created_at, updated_at FROM operator_documents WHERE operator_id = ? ORDER BY document_type, name",
            (operator_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def _doc_to_dict(d: dict) -> dict:
    d = dict(d)
    d.pop("_id", None)
    return d


def get_document(document_id: int) -> dict | None:
    if _mode_cloud():
        d = _mongo_docs().find_one({"id": document_id})
        return _doc_to_dict(d) if d else None
    conn = _conn()
    try:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM operator_documents WHERE id = ?", (document_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_document(document_id: int, name: str | None = None, content: str | None = None, document_type: str | None = None) -> bool:
    now = int(time.time())
    if _mode_cloud():
        set_part = {"updated_at": now}
        if name is not None:
            set_part["name"] = name
        if content is not None:
            set_part["content"] = content
        if document_type is not None and document_type in DOCUMENT_TYPES:
            set_part["document_type"] = document_type
        if len(set_part) <= 1:
            return False
        r = _mongo_docs().update_one({"id": document_id}, {"$set": set_part})
        return r.matched_count > 0
    updates = ["updated_at = ?"]
    args = [now]
    if name is not None:
        updates.append("name = ?")
        args.append(name)
    if content is not None:
        updates.append("content = ?")
        args.append(content)
    if document_type is not None and document_type in DOCUMENT_TYPES:
        updates.append("document_type = ?")
        args.append(document_type)
    if len(args) <= 1:
        return False
    args.append(document_id)
    conn = _conn()
    try:
        cur = conn.execute(f"UPDATE operator_documents SET {', '.join(updates)} WHERE id = ?", args)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_document(document_id: int) -> bool:
    if _mode_cloud():
        r = _mongo_docs().delete_one({"id": document_id})
        return r.deleted_count > 0
    conn = _conn()
    try:
        cur = conn.execute("DELETE FROM operator_documents WHERE id = ?", (document_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
