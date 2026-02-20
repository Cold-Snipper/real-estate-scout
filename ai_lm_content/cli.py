#!/usr/bin/env python3
"""
CLI to push/pull ai_lm_content to/from the dedicated MongoDB database.

Usage (from repo root or with PYTHONPATH including repo root):
  python -m ai_lm_content.cli push [content_id]
  python -m ai_lm_content.cli pull [content_id]
  python -m ai_lm_content.cli show [content_id]

Requires: MONGO_URI (and optionally MONGO_AI_CONTENT_DB=immosnippy_ai_content).
"""

import argparse
import os
import sys
from pathlib import Path

# Allow running as python -m ai_lm_content.cli from repo root
_REPO = Path(__file__).resolve().parent.parent
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))

# Load backend .env for MONGO_URI if present
_env = _REPO / "backend" / ".env"
if _env.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env)
    except ImportError:
        pass


def main():
    from ai_lm_content.loader import (
        get_prompt,
        push_to_db,
        pull_from_db,
        list_content_ids,
        AI_CONTENT_DB_NAME,
    )

    p = argparse.ArgumentParser(description="Push/pull ai_lm_content to/from MongoDB")
    p.add_argument("action", choices=["push", "pull", "show"], help="push: folder→DB, pull: DB→folder, show: print prompt")
    p.add_argument("content_id", nargs="?", default="property_valuation_daily_rental", help="Content ID (default: property_valuation_daily_rental)")
    p.add_argument("--version", "-v", default=None, help="Version tag (optional)")
    args = p.parse_args()

    if args.action == "show":
        try:
            text = get_prompt(args.content_id)
            print(text[:2000] + ("..." if len(text) > 2000 else ""))
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
        return

    if not os.getenv("MONGO_URI"):
        print("MONGO_URI not set. Set it (e.g. in backend/.env) to push/pull.", file=sys.stderr)
        sys.exit(1)

    if args.action == "push":
        try:
            out = push_to_db(args.content_id, version=args.version)
            print(f"Pushed {out['content_id']} v{out['version']} to DB '{out['db']}'")
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
    elif args.action == "pull":
        try:
            out = pull_from_db(args.content_id, version=args.version)
            print(f"Pulled {out['content_id']} v{out['version']} to {out['path']}")
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
