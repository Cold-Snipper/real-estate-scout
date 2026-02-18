# Silo Analysis — Status & Dependencies

Per-silo status for the Cold Bot pipeline. **main.py** is the only entry point; it wires all silos.

---

## 1. config_loader

| Aspect | Status |
|--------|--------|
| **Working** | Yes |
| **Used by** | main.py (ConfigLoader.load_config), setup/phase2 |
| **Dependencies** | PyYAML |
| **Exports** | `ConfigLoader.load_config`, `validate_config`; internal `_derive_start_urls` |
| **Notes** | Validates and sets defaults (database, selectors, limits). Derives `start_urls` from phase2 when `source_type` is set. |

---

## 2. browser_automation

| Aspect | Status |
|--------|--------|
| **Working** | Yes |
| **Used by** | main.py |
| **Dependencies** | playwright, playwright-stealth (optional), utils (rotate_ua, random_delay) |
| **Exports** | `init_browser`, `scroll_and_navigate`, `close_browser` |
| **Notes** | Returns (playwright_instance, browser, context, page). Stealth is optional; retries on Playwright Error. Close calls `p.stop()`. |

---

## 3. data_scraper

| Aspect | Status |
|--------|--------|
| **Working** | Yes |
| **Used by** | main.py |
| **Dependencies** | beautifulsoup4, lxml, playwright (page), urllib.parse |
| **Exports** | `extract_listings(page, selector, site?)` |
| **Notes** | Playwright selector first; falls back to BeautifulSoup. Returns list of `{text, hash, url}`. Handles TimeoutError. |

---

## 4. llm_integration

| Aspect | Status |
|--------|--------|
| **Working** | Yes (if Ollama or configured provider is available) |
| **Used by** | main.py |
| **Dependencies** | ollama, httpx, os (prompts dir, env), utils.parse_json_with_retry |
| **Exports** | `classify_eligible`, `extract_contact`, `generate_proposal`, `is_airbnb_viable`; internal `load_prompt` |
| **Notes** | Provider: auto / ollama / xai / llama_cpp. Reads prompts from `prompts/*.txt`. Can fail if model missing or API key not set. |

---

## 5. email_sender

| Aspect | Status |
|--------|--------|
| **Working** | Yes (if SMTP credentials valid) |
| **Used by** | main.py (init_db, is_contacted, upsert_lead), contacting (send_email, log_contact) |
| **Dependencies** | sqlite3, yagmail |
| **Exports** | `init_db`, `is_contacted`, `log_contact`, `send_email`, `check_recent_sends`, `upsert_lead`, `get_viable_leads`, `update_lead_status`, `reset_db` |
| **Notes** | Single DB for contacts + leads. Rate limit via `check_recent_sends`. get_viable_leads/update_lead_status/reset_db used by gui.py. |

---

## 6. contacting

| Aspect | Status |
|--------|--------|
| **Working** | Yes |
| **Used by** | main.py |
| **Dependencies** | silos.email_sender (send_email, log_contact) |
| **Exports** | `send_all(contacts, message, source, config)` |
| **Notes** | Email path implemented; dry_run respected. WhatsApp/form/FB stubs return "Not implemented yet". |

---

## 7. analysis

| Aspect | Status |
|--------|--------|
| **Working** | Yes |
| **Used by** | main.py |
| **Dependencies** | hashlib, re, time, ollama, silos.logging (seen_listing_hash), utils.parse_json_with_retry |
| **Exports** | `deduplicated`, `agent_private_check`, `verify_qualifies`, `extract_agent_details` |
| **Notes** | Keyword + LLM fallback for agent/private. Dedup uses session set + DB. |

---

## 8. logging

| Aspect | Status |
|--------|--------|
| **Working** | Yes |
| **Used by** | main.py, analysis (seen_listing_hash) |
| **Dependencies** | sqlite3, json, time, pathlib, openpyxl |
| **Exports** | `seen_listing_hash`, `init_leads_db`, `log_lead`, `log_agent_listing` |
| **Notes** | lead_logs + agent_logs; optional agents.txt and agents.xlsx. All use db_path from config. |

---

## Summary

| Silo | Working | Blocker / note |
|------|---------|----------------|
| config_loader | Yes | — |
| browser_automation | Yes | Playwright browsers must be installed (`playwright install`) |
| data_scraper | Yes | — |
| llm_integration | Yes* | *Ollama running and model present, or XAI/llama_cpp configured |
| email_sender | Yes* | *SMTP credentials in config |
| contacting | Yes | Email only; other channels stubbed |
| analysis | Yes | — |
| logging | Yes | — |

**Optional / standalone (not in main loop):** athome_scraper (used by athome_scan.py), gui.py (uses email_sender get_viable_leads, etc.).
