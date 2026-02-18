# Bot (moved from COLD BOT archive/old_root_stack)

Scanning loop: finds leads, qualifies with LLM, sends outreach using operator context (`config.yaml` → `active_provider_id` → `get_provider_context()`).

**Run from repo root:** `python -m bot.main` (config is read from repo root `config.yaml`).

**Note:** `main.py` imports `storage` (init_db, already_contacted, log_contacted, count_contacts_since). The original COLD BOT repo did not contain `storage.py` in the archive; it was documented as "at repo root". If you need to run the bot, add a `storage` module in this folder that provides that interface (SQLite contacted table), or run from a layout where `storage` is on the path.
