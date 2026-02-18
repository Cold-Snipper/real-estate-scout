# Plan: Larger, Smarter, Faster, More Integrated, Better

Roadmap to scale Cold Bot, improve intelligence and speed, deepen integration, and raise quality.

---

## 1. LARGER

### 1.1 More sources and sites
- **Add scraper subclasses** for more portals: Immoscout24, Logic-Immo, SeLoger, Rightmove, Zoopla; register in `get_scraper_for_source()` and config `target_sites_by_country`.
- **Unify discovery**: single config section (e.g. `sources.websites[]`, `sources.facebook.marketplace`, `sources.facebook.groups`) driving both phase2 URL generation and scraper selection.
- **Per-site config**: selectors, URL templates, and rate limits per domain in config or a small `sites/` YAML/JSON registry.

### 1.2 Scale and parallelism
- **Parallel URLs**: scrape multiple URLs concurrently (e.g. `concurrent.futures.ThreadPoolExecutor` or `asyncio` + async Playwright); cap concurrency (e.g. 2–3 browsers) to avoid bans.
- **Parallel listings**: batch LLM calls (eligibility, private/agent, contact, viability) where the API supports it; or a small queue with N workers.
- **Sharded/cursor-based runs**: for very large feeds, process in pages (e.g. “next 50”) and persist cursor; resume on next run.

### 1.3 Data volume and storage
- **Single DB schema**: one `listings` (or `leads`) table with `source`, `source_id`, `raw_json`; analysis and CRM read from it; scraper writes only; no duplicate “scraped_listings” vs “leads” logic long term.
- **Blob/archive**: optional store for raw HTML or snapshot per listing for replay and re-extraction.
- **Retention and cleanup**: configurable TTL or max rows per source; archive or drop old rows to keep DB small and fast.

---

## 2. SMARTER

### 2.1 Extraction and classification
- **Structured LLM extraction**: one prompt (or small pipeline) that returns `{title, price, location, description, contact, is_private, agency_name, listing_type, bedrooms, size}` in one call to cut round-trips and keep fields consistent.
- **Confidence and fallback**: every LLM field has a confidence or “extraction_method” (keyword vs LLM); low confidence triggers regex/secondary extraction or human review flag.
- **Deduplication**: semantic dedup (embedding similarity or fuzzy match on title+location+price) in addition to exact URL/hash; store “canonical” listing id and link duplicates to it.

### 2.2 Prioritization and scoring
- **Unified score**: single “priority” or “viability” score combining: Airbnb viability, private vs agent, contact quality, freshness, and (optional) manual boost; use for sort order and “top N” in UI and for outreach order.
- **Relevance model**: optional small model or rules (keywords + LLM) to predict “likely to respond” or “high intent”; feed into priority.
- **Adaptive throttling**: reduce frequency for domains that return 4xx/5xx or captchas; back off per-domain in config or in-memory state.

### 2.3 Learning and feedback
- **Outcome logging**: record “contacted / responded / converted / dead” per listing or lead; persist in DB and (optionally) export for training.
- **Prompt and model tuning**: A/B test prompts or models (e.g. eligibility, contact extraction) and compare success metrics; version prompts in `prompts/` and reference by name in config.

---

## 3. FASTER

### 3.1 Async and I/O
- **Async scraper path**: optional `silos/scraper_async.py` using `playwright.async_api` and `asyncio`; one event loop for multiple pages; sync scraper remains for simple runs.
- **Non-blocking LLM**: queue listing ids, process LLM in background workers; main loop only does scrape and enqueue; or use async HTTP for Ollama/LLM so the loop doesn’t block on each call.

### 3.2 Caching and reuse
- **Browser reuse**: one browser (or pool) per run; reuse context/page for multiple URLs where same domain; only restart on crash or config change.
- **LLM response cache**: cache by (prompt_template_hash, input_text_hash) for eligibility, contact, viability to avoid repeated identical calls during development and re-runs.
- **Config and static data**: load config and site registry once; pass through or use a small cache so no repeated file reads in hot paths.

### 3.3 Batch and bulk
- **Batch DB writes**: `executemany` or transaction around many inserts instead of one-by-one; same for `scraped_listings` and lead/CRM tables.
- **Batch LLM**: where the provider allows, send multiple items in one request (e.g. “classify these N listings”) and parse N results.

---

## 4. MORE INTEGRATED

### 4.1 Single pipeline
- **One config, one flow**: `config.yaml` (and phase1/phase2) define sources, URLs, selectors, limits, and LLM settings; `main.py` has one loop: build URLs → scrape (per source_type) → normalize to common listing dict → dedup → classify → score → (optional) contact → log to DB and CRM.
- **Scraper as first-class source**: scraper module output is the only “raw” listing input; remove or deprecate duplicate paths (e.g. old `extract_listings`-only path) once scraper is default and stable.

### 4.2 UI ↔ backend
- **Java UI / Next dashboard**: every scan action (website, FB, “run all”) calls the same backend API that runs the same scraper + analysis pipeline; live log streamed from backend; no duplicate “mock” or local-only logic in UI.
- **Config from UI**: save “target site”, “Sale/Rent”, “rooms min”, “start URLs” from UI into a runtime config or override that the backend reads so one source of truth.

### 4.3 Scraper ↔ analysis ↔ CRM
- **Shared schema**: scraper outputs a canonical listing dict; analysis (eligibility, private/agent, contact, viability) reads and writes the same dict; CRM/leads table is just a view over “listings + status + comms”.
- **IDs and traceability**: each listing has a stable `id` (or `url_hash`) from scrape; all logs, leads, and comms reference it so you can trace from “scraped” → “qualified” → “contacted” → “client”.

### 4.4 Config and env
- **Single entrypoint**: one `config.yaml` (plus env for secrets); phase1/phase2 write it; main, scraper, UI, and dashboard read it (or a validated subset). No scattered defaults.
- **Secrets**: all tokens and passwords from env or a secret store; documented in `.env.example`.

---

## 5. BETTER

### 5.1 Reliability
- **Retries and backoff**: scraper and LLM calls use retries with exponential backoff; mark listing as “failed” after N failures and optionally retry later.
- **Graceful shutdown**: on SIGINT/SIGTERM, finish current listing or URL, flush DB, then exit; no half-written state.
- **Health checks**: a small `/health` or `--check` that verifies DB, config, and (optionally) Ollama/Playwright so scripts and UI can show “ready” or “degraded”.

### 5.2 Observability
- **Structured logs**: JSON or key-value logs (level, message, listing_id, url, duration, error); one log file or stream for the whole process so it’s easy to grep and monitor.
- **Metrics**: counters (listings_scraped, listings_qualified, contacts_sent, errors_per_domain); optional export to Prometheus or a simple metrics file for dashboards.
- **Tracing**: optional request_id or run_id through scrape → analysis → contact so one run is traceable end-to-end.

### 5.3 Testing
- **Scraper tests**: fixtures with saved HTML; test `extract_listing_data` and `collect_listings` (mocked page) for AtHome, Immotop, FB; no live browser in CI.
- **Integration test**: one “full run” test: load config, run one URL through scraper (or fixture), run through main loop with mocked LLM, assert DB state and logs.
- **Contract tests**: API routes (Java UI or Next) return expected shape; test with mock data.

### 5.4 Security and safety
- **Rate limits**: enforce per-domain and global limits in config; never exceed (e.g. requests per minute) to avoid bans.
- **Input validation**: all URLs and selectors from config validated (allowlist schemes and hosts); no user input directly into `page.goto` or raw SQL.
- **Secrets**: no tokens in config or code; use env; document in README and `.env.example`.

### 5.5 UX and docs
- **UI**: loading and error states for every action; clear “last run” and “last error” in Website Bot and Stages; tooltips or short help for filters and buttons.
- **Docs**: one README with “quick start”, “config reference”, and “run modes” (dry-run, live, setup); link to this plan and to MISSING_ANALYSIS / UPGRADE_PLAN for historical context.
- **Changelog**: keep a short CHANGELOG or “Recent changes” so users know what’s new after updates.

---

## 6. Implementation order (suggested)

| Phase | Focus            | Items |
|-------|------------------|--------|
| 1     | Integration      | Single pipeline in main (scraper → analysis → CRM); shared listing schema; config fixes (phase2 URLs, validation). |
| 2     | Smarter          | Unified LLM extraction; confidence; persistent dedup; priority score. |
| 3     | Faster           | Browser reuse; batch DB; optional LLM cache; then async scraper if needed. |
| 4     | Larger           | More site subclasses; parallel URLs (with cap); single DB schema and retention. |
| 5     | Better           | Retries, shutdown, health; structured logs; scraper + integration tests; rate limits and validation. |
| 6     | Polish           | UI feedback and errors; README and config reference; optional metrics. |

---

## 7. Out of scope (for now)

- Full distributed/cloud deployment (e.g. Kubernetes, queue-based workers).
- Custom ML models (train on your data); use only existing LLMs and rules.
- Mobile app or multi-user auth; single-user local or single-tenant server only.
- Paid API integrations (e.g. paid listing APIs) unless explicitly added later.

---

*Reference: MISSING_ANALYSIS.md (gaps), UPGRADE_PLAN_CLIENT_COMMS_AND_STAGES.md (UI), silos/scraper.py (current scraper), main.py (loop).*
