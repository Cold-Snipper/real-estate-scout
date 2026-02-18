#!/usr/bin/env python3
"""
Test MongoDB Atlas connection. Run from repo root or backend/ with MONGO_URI set.

  cd backend && python scripts/check_mongo_connect.py
  # or with .env: set MONGO_URI in backend/.env, then from backend/:
  python scripts/check_mongo_connect.py
"""
import os
import sys
from pathlib import Path

# Allow running from backend/ or repo root
backend = Path(__file__).resolve().parent.parent
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))

# Load .env if present
env_file = backend / ".env"
if env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(env_file)
    except ImportError:
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                os.environ.setdefault(k.strip(), v)

def main():
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME", "coldbot")

    print("MongoDB connection check")
    print("  MONGO_URI set:", bool(uri))
    print("  MONGO_DB_NAME:", db_name)
    if not uri:
        print("\n  → Set MONGO_URI in backend/.env or export it.")
        print("  → Example: MONGO_URI=\"mongodb+srv://karlo:YOUR_PASSWORD@cluster0.unaaqbqbds.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0\"")
        return 1

    if "<PASSWORD>" in uri or "<db_password>" in uri:
        print("\n  → Replace <PASSWORD> or <db_password> in MONGO_URI with your real Atlas password.")
        return 1

    try:
        import pymongo
    except ImportError:
        print("\n  → pymongo not installed. Run: pip install pymongo")
        return 1

    uri = uri.strip().lstrip("\ufeff")

    try:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        db = client[db_name]
        # List collections to confirm we can read
        colls = db.list_collection_names()
        print("\n  Connection: OK (ping succeeded)")
        print("  Database:", db_name)
        print("  Collections:", colls or "(none yet)")
        return 0
    except Exception as e:
        print("\n  Connection: FAILED")
        print("  Error:", e)
        if "auth" in str(e).lower() or "8000" in str(e):
            print("\n  → In Atlas: Database → Connect → Connect your application → copy the connection string.")
            print("  → Paste it into backend/.env as MONGO_URI=... and replace <password> with your password.")
            print("  → Ensure Network Access allows your IP (or 0.0.0.0/0 for dev).")
        return 1

if __name__ == "__main__":
    sys.exit(main())
