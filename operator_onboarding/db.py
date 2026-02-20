"""
Operator Onboarding — SQLite schema and init for Immo Snippy (100% local).
Stage 1: Database schema + init_db(). Providers table for Airbnb management companies.
"""
import sqlite3
import os
from pathlib import Path

# Fully configurable: OPERATORS_DB_PATH or PROVIDERS_DB; else default next to this file.
DEFAULT_DB_PATH = Path(__file__).resolve().parent / "providers.db"


def get_db_path() -> Path:
    path = os.getenv("OPERATORS_DB_PATH") or os.getenv("PROVIDERS_DB")
    if path:
        return Path(path)
    return DEFAULT_DB_PATH


PROVIDERS_SCHEMA = """
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    tagline TEXT,
    years_operating INTEGER,
    properties_managed INTEGER,
    main_cities TEXT,
    services TEXT,
    usps TEXT,
    ideal_client_profile TEXT,
    preferred_property_types TEXT,
    min_property_value INTEGER,
    pricing_model TEXT,
    tone_style TEXT,
    key_phrases TEXT,
    languages TEXT,
    calendly_link TEXT,
    call_length_minutes INTEGER,
    qualification_rules TEXT,
    logo_path TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- JSON columns (stored as TEXT): services, usps, pricing_model, key_phrases, languages, qualification_rules
"""

# Airbnb Agency type: operators table (same DB, add-only; providers table left unchanged)
# rules = JSON array of up to 50 sentence-form rules/guides for the AI
OPERATORS_SCHEMA = """
CREATE TABLE IF NOT EXISTS operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    website_url TEXT,
    tagline TEXT,
    countries TEXT,
    services TEXT,
    usps TEXT,
    ideal_client_profile TEXT,
    preferred_property_types TEXT,
    min_property_value INTEGER,
    pricing_model TEXT,
    tone_style TEXT,
    key_phrases TEXT,
    languages TEXT,
    calendly_link TEXT,
    call_length_minutes INTEGER DEFAULT 30,
    qualification_rules TEXT,
    logo_path TEXT,
    notes TEXT,
    rules TEXT,
    created_at INTEGER,
    updated_at INTEGER
);
"""

# Documents per operator (draft contract, summary agreement, payout examples, etc.) — context for LLM
OPERATOR_DOCUMENTS_SCHEMA = """
CREATE TABLE IF NOT EXISTS operator_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_operator_documents_operator_id ON operator_documents(operator_id);
"""

# Auth: local and OAuth users (same DB, local-first)
USERS_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    provider_id TEXT,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    user_type TEXT NOT NULL DEFAULT 'local',
    created_at INTEGER,
    last_login INTEGER,
    UNIQUE(provider, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
"""

# Leads, agents, activity logs — same schema for local (SQLite) and cloud (Mongo) hybrid mode
LEADS_SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_hash TEXT,
    contact_email TEXT,
    phone_number TEXT,
    listing_url TEXT,
    is_private INTEGER DEFAULT 0,
    confidence REAL,
    reason TEXT,
    status TEXT,
    message_subject TEXT,
    message_body TEXT,
    channel TEXT,
    timestamp INTEGER
);
CREATE INDEX IF NOT EXISTS idx_leads_timestamp ON leads(timestamp);
"""
AGENTS_SCHEMA = """
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_name TEXT,
    listing_title TEXT,
    price TEXT,
    location TEXT,
    url TEXT,
    contact TEXT,
    reason TEXT,
    timestamp INTEGER
);
CREATE INDEX IF NOT EXISTS idx_agents_timestamp ON agents(timestamp);
"""
LOGS_SCHEMA = """
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_hash TEXT,
    contact_email TEXT,
    listing_url TEXT,
    status TEXT,
    channel TEXT,
    timestamp INTEGER,
    time TEXT
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
"""

# CRM (owner-centric): same schema as lib/crm_storage for use with lib/db abstraction
OWNERS_SCHEMA = """
CREATE TABLE IF NOT EXISTS owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_name TEXT,
    owner_email TEXT UNIQUE,
    owner_phone TEXT,
    owner_notes TEXT,
    created_at INTEGER,
    updated_at INTEGER
);
"""
PROPERTIES_SCHEMA = """
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
);
"""
CONVERSATIONS_SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    channel TEXT,
    message_text TEXT,
    sender TEXT,
    timestamp INTEGER,
    FOREIGN KEY(property_id) REFERENCES properties(id)
);
"""


def init_db(db_path: Path | None = None) -> Path:
    """
    Create the providers database and table if they do not exist.
    Returns the path to the database file.
    Adds operators.rules column if missing (migration for existing DBs).
    """
    path = db_path or get_db_path()
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    try:
        conn.executescript(PROVIDERS_SCHEMA)
        conn.executescript(OPERATORS_SCHEMA)
        conn.executescript(OPERATOR_DOCUMENTS_SCHEMA)
        conn.executescript(USERS_SCHEMA)
        conn.executescript(LEADS_SCHEMA)
        conn.executescript(AGENTS_SCHEMA)
        conn.executescript(LOGS_SCHEMA)
        conn.executescript(OWNERS_SCHEMA)
        conn.executescript(PROPERTIES_SCHEMA)
        conn.executescript(CONVERSATIONS_SCHEMA)
        # Migration: add operators.rules if not present; add agency_context_ext for expanded onboarding
        try:
            info = conn.execute("PRAGMA table_info(operators)").fetchall()
            col_names = [row[1] for row in info]
            if "rules" not in col_names:
                conn.execute("ALTER TABLE operators ADD COLUMN rules TEXT")
            if "agency_context_ext" not in col_names:
                conn.execute("ALTER TABLE operators ADD COLUMN agency_context_ext TEXT")
            # Migration: rename ideal_client -> ideal_client_profile (audit checklist)
            if "ideal_client" in col_names and "ideal_client_profile" not in col_names:
                conn.execute("ALTER TABLE operators RENAME COLUMN ideal_client TO ideal_client_profile")
            # Schema compliance: listing_url, phone_number (leads/activity_logs); properties schema fields
            for table in ("leads", "activity_logs"):
                try:
                    info = conn.execute(f"PRAGMA table_info({table})").fetchall()
                    cols = {row[1] for row in info}
                    if "source_url" in cols and "listing_url" not in cols:
                        conn.execute(f"ALTER TABLE {table} ADD COLUMN listing_url TEXT")
                        conn.execute(f"UPDATE {table} SET listing_url = source_url")
                    if table == "leads" and "contact_phone" in cols and "phone_number" not in cols:
                        conn.execute("ALTER TABLE leads ADD COLUMN phone_number TEXT")
                        conn.execute("UPDATE leads SET phone_number = contact_phone")
                except sqlite3.OperationalError:
                    pass
            try:
                info = conn.execute("PRAGMA table_info(properties)").fetchall()
                cols = {row[1] for row in info}
                for new_col, typ, old_col in [
                    ("surface_m2", "REAL", "size_sqm"),
                    ("listing_url", "TEXT", "source_url"),
                    ("phone_number", "TEXT", "contact_phone"),
                    ("transaction_type", "TEXT", "listing_type"),
                ]:
                    if old_col in cols and new_col not in cols:
                        conn.execute(f"ALTER TABLE properties ADD COLUMN {new_col} {typ}")
                        conn.execute(f"UPDATE properties SET {new_col} = {old_col}")
                if "listing_ref" not in cols:
                    conn.execute("ALTER TABLE properties ADD COLUMN listing_ref TEXT")
                if "phone_source" not in cols:
                    conn.execute("ALTER TABLE properties ADD COLUMN phone_source TEXT")
            except sqlite3.OperationalError:
                pass
        except sqlite3.OperationalError:
            pass
        conn.commit()
    finally:
        conn.close()
    return path


if __name__ == "__main__":
    p = init_db()
    print(f"DB initialized: {p}")
