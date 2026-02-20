# CRM storage — local-first SQLite for owners, properties, conversations.
# Schema and init as specified; extend with get_all_owners and helpers as needed.
import os
import sqlite3
from pathlib import Path
from typing import Any


def _get_crm_db_path() -> Path:
    path = os.getenv("CRM_DB_PATH")
    if path:
        return Path(path)
    return Path(__file__).resolve().parent.parent / "data" / "crm.db"


def init_crm_db(db_path: str | Path | None = None) -> Path:
    path = Path(db_path) if db_path else _get_crm_db_path()
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = _row_factory
    conn.execute("""
        CREATE TABLE IF NOT EXISTS owners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_name TEXT,
            owner_email TEXT UNIQUE,
            owner_phone TEXT,
            owner_notes TEXT,
            created_at INTEGER,
            updated_at INTEGER
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER,
            listing_ref TEXT,
            title TEXT,
            price REAL,
            bedrooms INTEGER,
            bathrooms INTEGER,
            surface_m2 REAL,
            location TEXT,
            description TEXT,
            listing_url TEXT,
            contact_email TEXT,
            phone_number TEXT,
            phone_source TEXT,
            transaction_type TEXT,
            viability_score REAL,
            recommendation TEXT,
            estimated_annual_gross REAL,
            price_to_earnings REAL,
            degree_of_certainty TEXT,
            sales_pipeline_stage TEXT DEFAULT 'New Lead',
            chatbot_pipeline_stage TEXT DEFAULT 'No Contact',
            last_contact_date INTEGER,
            created_at INTEGER,
            updated_at INTEGER,
            FOREIGN KEY(owner_id) REFERENCES owners(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER,
            channel TEXT,
            message_text TEXT,
            sender TEXT,
            timestamp INTEGER,
            FOREIGN KEY(property_id) REFERENCES properties(id)
        )
    """)
    # Migrations: add columns required by CRM functional spec (property + AI control)
    _migrate_crm_schema(conn)
    conn.commit()
    conn.close()
    return path


def _migrate_crm_schema(conn: sqlite3.Connection) -> None:
    """Add columns from CRM_FUNCTIONAL_SPEC if missing; migrate legacy listing fields to schema names."""
    try:
        info = conn.execute("PRAGMA table_info(properties)").fetchall()
        # Row may be dict (row_factory) or tuple; column name is index 1
        existing = {(row["name"] if isinstance(row, dict) else row[1]) for row in info}
        schema_cols = [
            ("listing_ref", "TEXT"),
            ("surface_m2", "REAL"),
            ("listing_url", "TEXT"),
            ("phone_number", "TEXT"),
            ("phone_source", "TEXT"),
            ("transaction_type", "TEXT"),
        ]
        for col, typ in schema_cols:
            if col not in existing:
                conn.execute(f"ALTER TABLE properties ADD COLUMN {col} {typ}")
        if "size_sqm" in existing and "surface_m2" in existing:
            conn.execute("UPDATE properties SET surface_m2 = size_sqm WHERE surface_m2 IS NULL AND size_sqm IS NOT NULL")
        if "source_url" in existing and "listing_url" in existing:
            conn.execute("UPDATE properties SET listing_url = source_url WHERE listing_url IS NULL AND source_url IS NOT NULL")
        if "contact_phone" in existing and "phone_number" in existing:
            conn.execute("UPDATE properties SET phone_number = contact_phone WHERE phone_number IS NULL AND contact_phone IS NOT NULL")
        if "listing_type" in existing and "transaction_type" in existing:
            conn.execute("UPDATE properties SET transaction_type = listing_type WHERE transaction_type IS NULL AND listing_type IS NOT NULL")
        # Schema-aligned fields (schema-realestate-listings-standardJSON): source, rent_price, sale_price, rooms, image_urls, etc.
        for col, typ in [
            ("address", "TEXT"),
            ("source_platform", "TEXT"),
            ("source", "TEXT"),
            ("rental_terms", "TEXT"),
            ("photos", "TEXT"),
            ("image_urls", "TEXT"),  # JSON array of URLs
            ("rent_price", "REAL"),
            ("sale_price", "REAL"),
            ("rooms", "INTEGER"),
            ("deposit", "REAL"),
            ("monthly_charges", "REAL"),
            ("terrace_m2", "REAL"),
            ("year_of_construction", "INTEGER"),
            ("first_seen", "TEXT"),
            ("last_updated", "TEXT"),
            ("estimated_operating_costs", "REAL"),
            ("cash_flow_projection", "REAL"),
            ("risk_indicators", "TEXT"),
            ("automation_enabled", "INTEGER DEFAULT 0"),
            ("ai_stop_stage", "TEXT"),
        ]:
            if col not in existing:
                conn.execute(f"ALTER TABLE properties ADD COLUMN {col} {typ}")
    except sqlite3.OperationalError:
        pass


def _row_factory(cursor: sqlite3.Cursor, row: tuple) -> dict[str, Any]:
    return {cursor.description[i][0]: row[i] for i in range(len(row))}


def _conn(db_path: Path | None = None):
    path = db_path or _get_crm_db_path()
    if not path.exists():
        init_crm_db(path)
    conn = sqlite3.connect(str(path))
    conn.row_factory = _row_factory
    return conn


def get_all_owners() -> list[dict[str, Any]]:
    """Return all owners with their properties; last_contact_date is max over properties."""
    db_path = _get_crm_db_path()
    if not db_path.exists():
        init_crm_db(db_path)
    conn = _conn(db_path)
    try:
        owners = conn.execute(
            "SELECT id, owner_name, owner_email, owner_phone, owner_notes, created_at, updated_at FROM owners ORDER BY id"
        ).fetchall()
        out = []
        for o in owners:
            owner_id = o["id"]
            props = conn.execute(
                "SELECT * FROM properties WHERE owner_id = ? ORDER BY id",
                (owner_id,),
            ).fetchall()
            last_contact = None
            for p in props:
                if p.get("last_contact_date"):
                    if last_contact is None or (p["last_contact_date"] or 0) > last_contact:
                        last_contact = p["last_contact_date"]
            out.append({
                **o,
                "properties": props,
                "last_contact_date": last_contact,
            })
        return out
    finally:
        conn.close()


def insert_owner(
    owner_name: str,
    owner_email: str,
    owner_phone: str | None = None,
    owner_notes: str | None = None,
) -> int:
    """Insert an owner; returns new id."""
    import time
    db_path = _get_crm_db_path()
    if not db_path.exists():
        init_crm_db(db_path)
    conn = _conn(db_path)
    try:
        now = int(time.time())
        conn.execute(
            "INSERT INTO owners (owner_name, owner_email, owner_phone, owner_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (owner_name, owner_email, owner_phone or None, owner_notes or None, now, now),
        )
        conn.commit()
        row = conn.execute("SELECT last_insert_rowid() AS id").fetchone()
        return row["id"] if isinstance(row, dict) else row[0]
    finally:
        conn.close()


def insert_property(owner_id: int, **kwargs: Any) -> int:
    """Insert a property for an owner. Pass column names as kwargs (e.g. title=..., price=...). Returns new id."""
    import time
    db_path = _get_crm_db_path()
    if not db_path.exists():
        init_crm_db(db_path)
    conn = _conn(db_path)
    cols = [
        "owner_id", "listing_ref", "title", "price", "bedrooms", "bathrooms", "surface_m2",
        "location", "description", "listing_url", "contact_email", "phone_number", "phone_source",
        "transaction_type", "viability_score", "recommendation", "estimated_annual_gross",
        "price_to_earnings", "degree_of_certainty", "sales_pipeline_stage", "chatbot_pipeline_stage",
        "last_contact_date", "created_at", "updated_at",
        "address", "source_platform", "source", "rental_terms", "photos", "image_urls",
        "rent_price", "sale_price", "rooms", "deposit", "monthly_charges", "terrace_m2",
        "year_of_construction", "first_seen", "last_updated",
    ]
    now = int(time.time())
    row: dict[str, Any] = {"owner_id": owner_id, "created_at": now, "updated_at": now}
    for k, v in kwargs.items():
        if k in cols:
            row[k] = v
    keys = [k for k in cols if k in row]
    placeholders = ", ".join("?" for _ in keys)
    names = ", ".join(keys)
    try:
        conn.execute(f"INSERT INTO properties ({names}) VALUES ({placeholders})", [row[k] for k in keys])
        conn.commit()
        r = conn.execute("SELECT last_insert_rowid() AS id").fetchone()
        return r["id"] if isinstance(r, dict) else r[0]
    finally:
        conn.close()


def update_owner(owner_id: int, **kwargs: Any) -> bool:
    """Update an owner by id. Allowed: owner_name, owner_email, owner_phone, owner_notes. Returns True if row existed."""
    allowed = {"owner_name", "owner_email", "owner_phone", "owner_notes"}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return False
    import time
    updates["updated_at"] = int(time.time())
    set_clause = ", ".join(f'"{k}" = ?' for k in updates)
    args = list(updates.values()) + [owner_id]
    conn = _conn(_get_crm_db_path())
    try:
        cur = conn.execute(f"UPDATE owners SET {set_clause} WHERE id = ?", args)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def get_conversations(property_id: int) -> list[dict[str, Any]]:
    """Return conversations for a property, ordered by timestamp. No deletion allowed (read-only for history)."""
    db_path = _get_crm_db_path()
    if not db_path.exists():
        return []
    conn = _conn(db_path)
    try:
        rows = conn.execute(
            "SELECT id, property_id, channel, message_text, sender, timestamp FROM conversations WHERE property_id = ? ORDER BY timestamp ASC",
            (property_id,),
        ).fetchall()
        return list(rows)
    finally:
        conn.close()


def add_conversation(property_id: int, channel: str, message_text: str, sender: str) -> int:
    """Append a conversation message. Returns new id. Messages are immutable (no delete API)."""
    import time
    db_path = _get_crm_db_path()
    if not db_path.exists():
        init_crm_db(db_path)
    conn = _conn(db_path)
    try:
        now = int(time.time())
        conn.execute(
            "INSERT INTO conversations (property_id, channel, message_text, sender, timestamp) VALUES (?, ?, ?, ?, ?)",
            (property_id, channel, message_text, sender, now),
        )
        conn.commit()
        r = conn.execute("SELECT last_insert_rowid() AS id").fetchone()
        return r["id"] if isinstance(r, dict) else r[0]
    finally:
        conn.close()


def get_all_conversations_flat() -> list[dict[str, Any]]:
    """Return all conversations (for export), with property_id and channel."""
    db_path = _get_crm_db_path()
    if not db_path.exists():
        return []
    conn = _conn(db_path)
    try:
        return conn.execute(
            "SELECT id, property_id, channel, message_text, sender, timestamp FROM conversations ORDER BY property_id, timestamp"
        ).fetchall()
    finally:
        conn.close()


def update_property(property_id: int, **kwargs: Any) -> bool:
    """Update a property by id. Pass only columns to update. Aligned to schema-realestate-listings-standardJSON where applicable."""
    allowed = {
        "sales_pipeline_stage", "chatbot_pipeline_stage", "viability_score", "recommendation",
        "estimated_annual_gross", "price_to_earnings", "degree_of_certainty", "last_contact_date",
        "title", "price", "bedrooms", "bathrooms", "surface_m2", "location", "description",
        "listing_url", "contact_email", "phone_number", "phone_source",
        "listing_ref", "transaction_type", "address", "source_platform", "source",
        "rental_terms", "photos", "image_urls", "rent_price", "sale_price", "rooms",
        "deposit", "monthly_charges", "terrace_m2", "year_of_construction", "first_seen", "last_updated",
        "estimated_operating_costs", "cash_flow_projection", "risk_indicators",
        "automation_enabled", "ai_stop_stage",
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return False
    import time
    updates["updated_at"] = int(time.time())
    set_clause = ", ".join(f'"{k}" = ?' for k in updates)
    args = list(updates.values()) + [property_id]
    conn = _conn(_get_crm_db_path())
    try:
        cur = conn.execute(f"UPDATE properties SET {set_clause} WHERE id = ?", args)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
