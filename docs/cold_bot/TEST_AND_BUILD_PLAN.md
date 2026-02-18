# Test & build plan

How to test and build the Cold Bot app (Python bot + Next.js dashboard).

---

## 1. Test the Python bot

**Location:** `cold_bot/` (repo: `cold_bot/`)

| Step | Command | What it does |
|------|--------|----------------|
| 1 | `cd cold_bot` | Go to bot root |
| 2 | `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` | Create venv and install deps (first time only) |
| 3 | `playwright install` | Install browser binaries (first time only) |
| 4 | `.venv/bin/python -m pytest tests/ -v` | Run all tests |

**Quick one-liner (from repo root):**
```bash
cd cold_bot && .venv/bin/python -m pytest tests/ -v
```
(Assumes `.venv` already exists and deps are installed.)

**What gets tested:**
- `test_config_loader.py` — config load, validation, defaults
- `test_browser_automation.py` — init, scroll, close (mocked)
- `test_data_scraper.py` — extract_listings, dedup
- `test_email_sender.py` — init_db, is_contacted, send_email (mocked), rate limit
- `test_llm_integration.py` — classify, extract_contact, generate_proposal (mocked)
- `test_main.py` — e2e mock (main loop with patched silos)

**Success:** All tests pass (or only known skips). Fix any failing tests before relying on the bot.

---

## 2. Build the dashboard

**Location:** `cold_bot/dashboard/`

| Step | Command | What it does |
|------|--------|----------------|
| 1 | `cd cold_bot/dashboard` | Go to dashboard |
| 2 | `npm install` | Install Node deps (first time only) |
| 3 | `npm run build` | Production build |

**Quick one-liner (from repo root):**
```bash
cd cold_bot/dashboard && npm run build
```

**Success:** Build completes with no errors. Output is in `cold_bot/dashboard/.next/`. Run with `npm start` (port 1111).

---

## 3. Run the app (dev)

| What | Command | Where |
|------|--------|-------|
| Dashboard (dev) | `cd cold_bot/dashboard && npm run dev` | http://localhost:1111 |
| Bot (CLI) | `cd cold_bot && python main.py --dry-run` | Terminal |
| Bot from dashboard | Click “Start bot” in the UI | Same host, streamed output |

---

## 4. Checklist before release

- [ ] `pytest tests/` passes in `cold_bot/`
- [ ] `npm run build` passes in `cold_bot/dashboard/`
- [ ] Config has valid `config.yaml` (and optional `.env` for secrets)
- [ ] Dry-run works: start bot from dashboard, see log output
- [ ] Leads/agents tables exist after a run (`init_leads_db` + `init_db`)

---

## 5. Run tests and build from the dashboard

Use the **Test & build** panel on the dashboard (if available):

- **Run tests** — runs `pytest tests/ -v` in `cold_bot/` and shows output in the live monitor.
- **Build dashboard** — runs `npm run build` in `cold_bot/dashboard/` and shows output.

Same success criteria as above.
