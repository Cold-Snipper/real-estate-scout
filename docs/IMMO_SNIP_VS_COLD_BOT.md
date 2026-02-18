# immo-snip-lu vs COLD BOT — Comparison

This document compares the **immo-snip-lu** project (in `immo-snip/`) with the former **COLD BOT** pipeline. The Cold Bot backend has been removed from this repo; the only frontend is **real-estate-scout** (immo-snip–oriented).

---

## 1. Purpose & scope

| | **immo-snip-lu** | **COLD BOT** |
|---|------------------|--------------|
| **Goal** | Luxembourg real estate **listing discovery & storage** (athome.lu + immotop.lu) | **End-to-end lead pipeline**: scrape → qualify → contact (email/WhatsApp) for FSBO / Airbnb-style deals |
| **Output** | Listings in MongoDB or SQLite (40+ fields, phone extraction, images) | Scraped listings → LLM analysis → leads DB → outreach (email/WhatsApp) |
| **Sites** | athome.lu, immotop.lu only | athome, immotop, nextimmo, bingo, propertyweb, wortimmo, rightmove, Facebook Marketplace |

---

## 2. Tech stack

| | **immo-snip-lu** | **COLD BOT** |
|---|------------------|--------------|
| **Browser** | Selenium + Chrome/Chromium | Playwright (sync) |
| **Parsing** | BeautifulSoup + lxml | BeautifulSoup + lxml |
| **DB** | SQLite (`listings.db`) or **MongoDB Atlas** (via `mongo_db.py`) | SQLite (`leads.db`, `scraped_listings`) |
| **Scheduling** | `schedule` (every 5 min), `mongo_scheduler.py` / `parallel_scheduler.py` | Custom: `main.py` with configurable limits, phase1/phase2 setup, cycle cooldowns |
| **Config** | Constants in scheduler/scraper files | YAML `config.yaml` (URLs, limits, email, LLM, selectors) |
| **Extra** | — | LLM (Ollama/auto), email sender, WhatsApp (Twilio), Next.js dashboard, Java UI server |

---

## 3. Site coverage

**immo-snip-lu**

- **athome.lu**: vente + location (newest-first), full detail scrape, “Show phone” click, 40+ fields.
- **immotop.lu**: same schema, shared SQLite/Mongo, consent “Tout refuser” then “Tout accepter”.

**COLD BOT**

- **athome**, **immotop**: integrated as silo scrapers (`cold_bot/silos/scrapers/athome.py`, `immotop.py`) with consent, language, section handling; **Playwright**; lighter schema (title, price, location, description, contact, bedrooms, bathrooms, size, etc.).
- **Also**: nextimmo, bingo, propertyweb, wortimmo, rightmove, Facebook Marketplace (separate limits/cooldowns).

---

## 4. Data model

**immo-snip-lu**

- One rich schema: `listing_ref`, `source`, `transaction_type`, `listing_url`, `title`, `location`, `description`, `sale_price`, `rent_price`, `monthly_charges`, `deposit`, `surface_m2`, `rooms`, `bedrooms`, `bathrooms`, energy/heating flags, `phone_number`, `phone_source`, agency/agent, `image_urls`, `first_seen`, `last_updated`, `title_history`, etc.
- Stored in SQLite `listings` table or MongoDB with same field set.
- Early-exit: stops index when it hits a known listing with unchanged title.

**COLD BOT**

- **Scraper output**: `LISTING_SCHEMA` in `base.py` — `title`, `price`, `location`, `description`, `contact`, `is_private`, `agency_name`, `url`, `bedrooms`, `bathrooms`, `size`, `listing_type`, `image_url`; saved to `scraped_listings` (url_hash, url, title, price, …).
- **Pipeline**: `LISTING_KEYS` in `pipeline.py` adds `confidence`, `extraction_method`, `priority_score`.
- **Leads**: separate leads DB for contacted/qualified leads (email, WhatsApp, logging).

---

## 5. Architecture (high level)

**immo-snip-lu**

```
mongo_scheduler.py / parallel_scheduler.py
  → athome_scraper.py, immotop_scraper.py (or _mongo wrappers)
  → Selenium → index pages → detail pages → db_upsert (SQLite or Mongo)
  → Optional: image download, phone from “Show phone” button
```

- Two big monolithic scrapers (~1,233 + ~790 lines for athome/immotop) with inline DB (or Mongo swap).
- MongoDB: `mongo_db.py` + monkey-patching scrapers’ `db_*` so same code path writes to Atlas.

**COLD BOT**

```
config.yaml → main.py
  → phase1/phase2 (setup)
  → data_scraper.extract_listings → get_scraper_for_source() → site-specific Scraper (Playwright)
  → save_to_db (scraped_listings) → LLM (classify, extract_contact, proposal)
  → analysis (priority, agent/private) → email_sender / contacting → leads DB + dashboard/API
```

- Modular: one base scraper + one class per site; config-driven URLs and limits; pipeline + LLM + contacting in separate modules.

---

## 6. What each has that the other doesn’t

**immo-snip-lu has**

- **Very rich schema**: 40+ fields, energy/heating, agency/agent, image URLs (and optional local download).
- **Dedicated Luxembourg focus**: athome + immotop only, newest-first, early-exit, title-change detection.
- **Phone extraction**: regex in description + Selenium click on “Afficher le numéro” / “Show phone”.
- **MongoDB Atlas** as first-class option (with `MONGO_URI`).
- **Simple run**: one scheduler script, SQLite or Mongo, no LLM/config complexity.

**COLD BOT has**

- **Multi-site**: 8+ sources (athome, immotop, nextimmo, bingo, propertyweb, wortimmo, rightmove, FB Marketplace).
- **Playwright** instead of Selenium.
- **LLM pipeline**: classify eligible, extract contact, generate proposal, Airbnb viability.
- **Outreach**: email (SMTP) and WhatsApp (Twilio), “already contacted” checks, templates.
- **Config-driven**: YAML for URLs, limits, messaging, LLM model.
- **Dashboard & API**: Next.js app + API routes (leads, config, run, logs, etc.).
- **Leads/agent logic**: priority score, FSBO/agent detection, deduplication.

---

## 7. Summary

- **immo-snip-lu**: best for “max data from athome + immotop only” (Luxembourg listings, 40+ fields, phone, Mongo or SQLite, minimal setup).
- **COLD BOT**: best for “many sources → qualify → contact” (scrape many sites, LLM + rules, email/WhatsApp, dashboard, leads DB).

If you want to **reuse immo-snip ideas inside COLD BOT**, the most useful parts are:

1. **Field mapping**: immo-snip’s CHAR_MAP and detail-page parsing (energy, heating, agency, phone button) could inspire extra fields in `LISTING_SCHEMA` or a “luxembourg_detail” enrichment step.
2. **Phone extraction**: “Show phone” button click + `tel:` href could be added to `cold_bot/silos/scrapers/athome.py` (and optionally immotop) while keeping Playwright.
3. **Early-exit**: stop index when first known-unchanged listing is seen (by ref/title) to speed up recurring runs.

The codebases are **complementary**: immo-snip is a focused LU scraper with rich schema; COLD BOT is a multi-source pipeline with LLM and outreach. No need to merge them fully; you can cherry-pick logic (e.g. phone button, extra fields) into COLD BOT’s scrapers if you want that level of detail for LU.

---

## 8. How similar is the code?

**Short answer: conceptually similar (same sites, same idea), but implemented differently — no shared code.**

| Aspect | Similarity | Notes |
|--------|------------|--------|
| **Sites** | Same 2 for LU | Both target athome.lu + immotop.lu (COLD BOT adds 6+ other sources). |
| **Parsing** | Same stack | Both use **BeautifulSoup + lxml** to parse listing HTML. |
| **Consent** | Same idea | Both dismiss cookies (e.g. “Tout refuser” then accept); immo-snip uses Selenium clicks, COLD BOT uses Playwright + shared `try_accept_consent`. |
| **Browser** | Different | immo-snip: **Selenium + Chrome**. COLD BOT: **Playwright**. No shared driver/page code. |
| **Structure** | Different | immo-snip: 2 large files (~1,233 + 790 lines), DB + helpers inside each. COLD BOT: base class (~234 lines) + small per-site classes (~72–269 lines), config-driven. |
| **Data flow** | Different | immo-snip: index → get refs → **per-listing detail page** → full 40+ field parse → upsert. COLD BOT: one page → consent → scroll → **list of cards** → extract from card HTML → save (optional detail later). |
| **Schema** | Different | immo-snip: 40+ fields, CHAR_MAP (FR/EN/DE), energy/heating/agency. COLD BOT: ~12 fields (title, price, location, contact, bedrooms, etc.). |
| **Phone** | Different | immo-snip: regex + **Selenium click “Show phone”** then read `tel:` href. COLD BOT: regex or LLM from text only (no button click). |
| **Helpers** | Similar in spirit | Both have price/int/float parsing, phone regex; immo-snip has more (bool, energy). **No copy-paste** between repos. |

**Line counts (approx.)**

- **immo-snip**: athome_scraper 1,233, immotop_scraper 790, rest (schedulers, mongo_db) ~900 → **~2,900 lines** of Python for scraping + storage.
- **COLD BOT** (silos only): scrapers ~1,088 (base + 8 sites), data_scraper, pipeline, browser_automation, etc. → **~2,500+ lines** for scraping; plus **main, LLM, email, analysis, dashboard** (~3k+ more).

**Verdict:** The two codebases are **not forks** of each other. They share the same **domain** (Luxembourg athome/immotop) and **tools** (BeautifulSoup, cookie handling), but **different automation** (Selenium vs Playwright), **different depth** (full detail scrape vs list/card scrape), and **different goals** (rich storage vs lead pipeline). Reusing immo-snip logic in COLD BOT would mean porting ideas (e.g. CHAR_MAP, “Show phone” click, early-exit) into COLD BOT’s Playwright scrapers, not merging files.
