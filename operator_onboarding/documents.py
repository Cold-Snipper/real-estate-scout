"""
operator_onboarding/documents.py
CRUD for operator_documents (draft contract, summary agreement, payout examples, etc.). Used as context for LLM.
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


def _conn():
    return sqlite3.connect(str(get_db_path()))


def create_document(operator_id: int, name: str, document_type: str, content: str, file_path: str | None = None) -> int:
    if document_type not in DOCUMENT_TYPES:
        document_type = "other"
    now = int(time.time())
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


def get_document(document_id: int) -> dict | None:
    conn = _conn()
    try:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM operator_documents WHERE id = ?", (document_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_document(document_id: int, name: str | None = None, content: str | None = None, document_type: str | None = None) -> bool:
    updates = ["updated_at = ?"]
    args = [int(time.time())]
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
    conn = _conn()
    try:
        cur = conn.execute("DELETE FROM operator_documents WHERE id = ?", (document_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
