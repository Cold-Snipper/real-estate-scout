from __future__ import annotations

"""
Dry-run smoke test for mailer end-to-end flow.

It seeds a temporary CRM DB with an atHome-like property and runs the mailer in dry-run mode.
This exercises:
- DB selection/migrations
- LLM message drafting fallback (or real LLM if configured)
- atHome/Immotop adapter dry-run path
- CRM conversation appends
- SSE-independent runner

Run:
  python3 mailer/dev_mailer_dryrun_smoke.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Allow running as a plain file: `python mailer/dev_mailer_dryrun_smoke.py`
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from mailer.config import MailerConfig
from mailer.main import run_mailer_once


async def main() -> int:
    # Use a temp-ish DB path in repo data folder so we can inspect if needed.
    db_path = Path("data/crm_mailer_smoke.db").resolve()
    os.environ["CRM_DB_PATH"] = str(db_path)
    if db_path.exists():
        db_path.unlink()

    from lib.crm_storage import init_crm_db, insert_owner, insert_property, get_conversations

    init_crm_db(db_path)
    owner_id = insert_owner("Smoke Owner", "smoke@example.com", owner_phone="+352 661 111 222")
    prop_id = insert_property(
        owner_id=owner_id,
        title="atHome Smoke Listing",
        location="Luxembourg",
        description="Nice apartment, please contact.",
        listing_url="https://www.athome.lu/some/listing/123",
        phone_number="+352 661 111 222",
        contact_email="smoke@example.com",
        source="athome",
    )

    # Provide operator form fields via env (required for non-dry-run form filling, still required by module).
    os.environ.setdefault("MAILER_OPERATOR_FIRST_NAME", "Test")
    os.environ.setdefault("MAILER_OPERATOR_LAST_NAME", "Operator")
    os.environ.setdefault("MAILER_OPERATOR_EMAIL", "operator@example.com")
    os.environ.setdefault("MAILER_OPERATOR_PHONE", "+352 661 999 888")
    os.environ.setdefault("MAILER_DEFAULT_COUNTRY_CODE", "352")

    cfg = MailerConfig(
        operator_id=1,
        source="athome",
        limit=10,
        dry_run=True,
        headless=True,
        crm_db_path=db_path,
    )
    stats = await run_mailer_once(cfg, listing_ids=[prop_id])
    print("stats:", stats)

    conv = get_conversations(prop_id)
    print("conversations:", len(conv))
    for m in conv[-3:]:
        print("-", m.get("channel"), m.get("sender"), (m.get("message_text") or "")[:80])

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

