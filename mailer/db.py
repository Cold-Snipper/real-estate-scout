from __future__ import annotations

import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Optional


@dataclass(frozen=True)
class ListingRow:
    property_id: int
    listing_url: str
    title: str | None
    description: str | None
    location: str | None
    phone_number: str | None
    contact_email: str | None
    source: str | None


def _row_factory(cursor: sqlite3.Cursor, row: tuple) -> dict[str, Any]:
    return {cursor.description[i][0]: row[i] for i in range(len(row))}


def _crm_db_path(configured: Path | None = None) -> Path:
    if configured:
        return configured
    # Reuse the same default location as lib/crm_storage.py
    return Path(__file__).resolve().parent.parent / "data" / "crm.db"


def ensure_mailer_columns(crm_db_path: Path | None = None) -> None:
    """
    Add the columns we need to track email/whatsapp sends.
    Safe to call repeatedly.
    """
    path = _crm_db_path(crm_db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    try:
        conn.row_factory = _row_factory
        info = conn.execute("PRAGMA table_info(properties)").fetchall()
        cols = {row["name"] for row in info}

        alters: list[str] = []
        if "sent_via_email" not in cols:
            alters.append("ALTER TABLE properties ADD COLUMN sent_via_email INTEGER DEFAULT 0")
        if "sent_via_whatsapp" not in cols:
            alters.append("ALTER TABLE properties ADD COLUMN sent_via_whatsapp INTEGER DEFAULT 0")
        if "mailer_last_error" not in cols:
            alters.append("ALTER TABLE properties ADD COLUMN mailer_last_error TEXT")
        if "mailer_last_run_at" not in cols:
            alters.append("ALTER TABLE properties ADD COLUMN mailer_last_run_at INTEGER")

        for stmt in alters:
            conn.execute(stmt)
        conn.commit()
    finally:
        conn.close()


def fetch_pending_listings(
    source: str,
    limit: int,
    crm_db_path: Path | None = None,
) -> list[ListingRow]:
    """
    Fetch pending listings from CRM `properties` table.

    Selection strategy:
    - listing_url contains athome.lu or immotop.lu depending on source
    - not yet sent via email (sent_via_email=0 OR NULL)
    - prefer records with a listing_url
    """
    ensure_mailer_columns(crm_db_path)
    path = _crm_db_path(crm_db_path)
    conn = sqlite3.connect(str(path))
    conn.row_factory = _row_factory
    try:
        where = ["listing_url IS NOT NULL", "TRIM(listing_url) != ''", "(sent_via_email IS NULL OR sent_via_email = 0)"]
        params: list[Any] = []
        if source == "athome":
            where.append("listing_url LIKE ?")
            params.append("%athome.lu%")
        elif source == "immotop":
            where.append("listing_url LIKE ?")
            params.append("%immotop.lu%")
        else:
            where.append("(listing_url LIKE ? OR listing_url LIKE ?)")
            params.extend(["%athome.lu%", "%immotop.lu%"])

        sql = f"""
            SELECT
              id AS property_id,
              listing_url,
              title,
              description,
              location,
              phone_number,
              contact_email,
              source
            FROM properties
            WHERE {' AND '.join(where)}
            ORDER BY COALESCE(last_contact_date, 0) ASC, id ASC
            LIMIT ?
        """
        rows = conn.execute(sql, params + [int(limit)]).fetchall()
        out: list[ListingRow] = []
        for r in rows:
            out.append(
                ListingRow(
                    property_id=int(r["property_id"]),
                    listing_url=str(r["listing_url"]),
                    title=r.get("title"),
                    description=r.get("description"),
                    location=r.get("location"),
                    phone_number=r.get("phone_number"),
                    contact_email=r.get("contact_email"),
                    source=r.get("source"),
                )
            )
        return out
    finally:
        conn.close()


def fetch_listings_by_ids(
    listing_ids: list[int],
    crm_db_path: Path | None = None,
) -> list[ListingRow]:
    """Fetch specific CRM properties by id (used for manual selection)."""
    if not listing_ids:
        return []
    ensure_mailer_columns(crm_db_path)
    path = _crm_db_path(crm_db_path)
    conn = sqlite3.connect(str(path))
    conn.row_factory = _row_factory
    try:
        ids = [int(x) for x in listing_ids]
        placeholders = ",".join("?" for _ in ids)
        sql = f"""
            SELECT
              id AS property_id,
              listing_url,
              title,
              description,
              location,
              phone_number,
              contact_email,
              source
            FROM properties
            WHERE id IN ({placeholders})
            ORDER BY id ASC
        """
        rows = conn.execute(sql, ids).fetchall()
        out: list[ListingRow] = []
        for r in rows:
            if not r.get("listing_url"):
                continue
            out.append(
                ListingRow(
                    property_id=int(r["property_id"]),
                    listing_url=str(r["listing_url"]),
                    title=r.get("title"),
                    description=r.get("description"),
                    location=r.get("location"),
                    phone_number=r.get("phone_number"),
                    contact_email=r.get("contact_email"),
                    source=r.get("source"),
                )
            )
        return out
    finally:
        conn.close()


def fetch_listing(listing_id: int, crm_db_path: Path | None = None) -> dict[str, Any] | None:
    """
    Fetch one listing/property from CRM by id, returned as a dict for integration layers.
    """
    rows = fetch_listings_by_ids([int(listing_id)], crm_db_path=crm_db_path)
    if not rows:
        return None
    r = rows[0]
    return {
        "id": r.property_id,
        "url": r.listing_url,
        "title": r.title,
        "location": r.location,
        "description": r.description,
        "phone": r.phone_number,
        "email": r.contact_email,
        "source": r.source,
    }


def list_ready_properties(
    source: str,
    limit: int,
    crm_db_path: Path | None = None,
) -> list[dict[str, Any]]:
    """Return lightweight JSON rows for the UI."""
    rows = fetch_pending_listings(source=source, limit=limit, crm_db_path=crm_db_path)
    out: list[dict[str, Any]] = []
    for r in rows:
        out.append(
            {
                "id": r.property_id,
                "listing_url": r.listing_url,
                "title": r.title,
                "location": r.location,
                "source": r.source,
                "phone_number": r.phone_number,
                "contact_email": r.contact_email,
            }
        )
    return out


def mark_attempt(property_id: int, error: str | None, crm_db_path: Path | None = None) -> None:
    """Record last attempt timestamp and optionally last error."""
    ensure_mailer_columns(crm_db_path)
    path = _crm_db_path(crm_db_path)
    conn = sqlite3.connect(str(path))
    try:
        now = int(time.time())
        conn.execute(
            "UPDATE properties SET mailer_last_run_at = ?, mailer_last_error = ? WHERE id = ?",
            (now, error, int(property_id)),
        )
        conn.commit()
    finally:
        conn.close()


def mark_sent(
    property_id: int,
    *,
    sent_via_email: bool,
    sent_via_whatsapp: bool,
    crm_db_path: Path | None = None,
) -> None:
    ensure_mailer_columns(crm_db_path)
    path = _crm_db_path(crm_db_path)
    conn = sqlite3.connect(str(path))
    try:
        now = int(time.time())
        conn.execute(
            """
            UPDATE properties
            SET sent_via_email = ?,
                sent_via_whatsapp = ?,
                last_contact_date = ?,
                chatbot_pipeline_stage = ?,
                mailer_last_run_at = ?,
                mailer_last_error = NULL
            WHERE id = ?
            """,
            (
                1 if sent_via_email else 0,
                1 if sent_via_whatsapp else 0,
                now,
                "Contacted",
                now,
                int(property_id),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def mark_contacted_bulk(
    property_ids: list[int],
    *,
    sent_via_email: bool = True,
    sent_via_whatsapp: bool = False,
    crm_db_path: Path | None = None,
) -> int:
    """
    Mark selected properties as contacted (without sending).
    Returns updated row count.
    """
    if not property_ids:
        return 0
    ensure_mailer_columns(crm_db_path)
    path = _crm_db_path(crm_db_path)
    conn = sqlite3.connect(str(path))
    try:
        now = int(time.time())
        ids = [int(x) for x in property_ids]
        placeholders = ",".join("?" for _ in ids)
        sql = f"""
            UPDATE properties
            SET sent_via_email = ?,
                sent_via_whatsapp = ?,
                last_contact_date = ?,
                chatbot_pipeline_stage = ?,
                mailer_last_run_at = ?,
                mailer_last_error = NULL
            WHERE id IN ({placeholders})
        """
        cur = conn.execute(
            sql,
            [
                1 if sent_via_email else 0,
                1 if sent_via_whatsapp else 0,
                now,
                "Contacted",
                now,
                *ids,
            ],
        )
        conn.commit()
        return int(cur.rowcount or 0)
    finally:
        conn.close()


def export_properties_csv(property_ids: list[int], crm_db_path: Path | None = None) -> str:
    """Return a CSV string for selected properties."""
    if not property_ids:
        return "id,title,location,source,listing_url,contact_email,phone_number\n"
    rows = fetch_listings_by_ids(property_ids, crm_db_path=crm_db_path)
    # Keep it simple and robust (minimal CSV escaping).
    def esc(v: Any) -> str:
        s = "" if v is None else str(v)
        if any(c in s for c in [",", "\n", '"']):
            s = '"' + s.replace('"', '""') + '"'
        return s

    lines = ["id,title,location,source,listing_url,contact_email,phone_number"]
    for r in rows:
        lines.append(
            ",".join(
                [
                    esc(r.property_id),
                    esc(r.title),
                    esc(r.location),
                    esc(r.source),
                    esc(r.listing_url),
                    esc(r.contact_email),
                    esc(r.phone_number),
                ]
            )
        )
    return "\n".join(lines) + "\n"


def append_conversation(property_id: int, channel: str, message_text: str, sender: str = "ai") -> None:
    """
    Append message to CRM conversations using existing storage helper.
    """
    try:
        from lib.crm_storage import add_conversation
    except Exception:
        # Fallback: direct SQL insert (should be rare).
        path = _crm_db_path(None)
        conn = sqlite3.connect(str(path))
        try:
            now = int(time.time())
            conn.execute(
                "INSERT INTO conversations (property_id, channel, message_text, sender, timestamp) VALUES (?, ?, ?, ?, ?)",
                (int(property_id), channel, message_text, sender, now),
            )
            conn.commit()
        finally:
            conn.close()
        return

    add_conversation(property_id, channel=channel, message_text=message_text, sender=sender)

