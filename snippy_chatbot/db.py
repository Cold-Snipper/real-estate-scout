import os
import sqlite3
from datetime import datetime
from pathlib import Path

# Use same CRM DB as lib.crm_storage (respect CRM_DB_PATH, else repo/data/crm.db)
def _get_db_path() -> Path:
    path = os.getenv("CRM_DB_PATH")
    if path:
        return Path(path)
    return Path(__file__).resolve().parent.parent / "data" / "crm.db"


DB_PATH = _get_db_path()


def get_db_connection():
    """Return connection to existing CRM database (WAL mode for better concurrency)."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except Exception:
        pass  # WAL not supported on some setups; continue with default
    return conn


def init_chatbot_tables():
    """Create the 3 new tables needed for the chatbot"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            operator_id INTEGER NOT NULL,
            owner_id INTEGER,
            property_id INTEGER,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            valuation_json TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
        );

        CREATE TABLE IF NOT EXISTS valuation_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            full_json TEXT NOT NULL,
            natural_summary TEXT NOT NULL,
            score INTEGER NOT NULL,
            recommendation TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
        );
    """)

    conn.commit()
    conn.close()
    print("✅ Snippy Chat Bot tables initialized successfully")


# Run this once when you first set up
if __name__ == "__main__":
    init_chatbot_tables()
