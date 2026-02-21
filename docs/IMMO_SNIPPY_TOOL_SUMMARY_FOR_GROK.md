# IMMO SNIPPY — Tool Summary for Grok (Full Reference)

**Purpose:** Dense, comprehensive context for Grok (or any AI) on what IMMO SNIPPY does, how it does it, business model, MongoDB, AWS/cloud, and where every major function lives. **Deployment and cloud-first;** dev/local run details minimized.

---

## 1. What IMMO SNIPPY Is — Product & Business Model

- **Product:** Real-estate lead generation and outreach for agencies (short-term rental / Airbnb-style management). Find leads (listings, FSBO, marketplace), qualify them with an LLM, generate on-brand outreach using **operator (agency) context**, and move owners toward a discovery call.
- **Business model:** Agencies are “operators” onboarded via Operator Onboarding. Each operator has: company name, website, tagline, countries, tone, target owner type, property types, fee structure, Calendly, notes, and up to **50 sentence-form rules** plus reference documents (draft contract, summary agreement, payout examples). The LLM uses this context so messages sound like the agency, not a generic bot. Pipeline goal: **discovery → reply → value bomb + trust → booked discovery call** (do not close the contract in chat).
- **Backend:** No Node/Express. Operator Onboarding and API are **FastAPI** (Python). Listings backend is **immo-snip-lu** (Python scrapers). Bot is Python (Playwright, Ollama).

---

## 2. Outreach Bot — Purpose, Objectives, Principles (Business)

From REAL_ESTATE_OUTREACH_BOT.md and master reference:

- **Purpose:** Continuously browse public real estate listings; identify FSBO/owner listings that match criteria; extract contact details (email/phone); generate personalized outreach using a local LLM; send emails/messages with anti-spam and compliance safeguards.
- **Core objectives (ranked):** (1) Find motivated private sellers automatically; (2) Extract contact information with minimal human intervention; (3) Generate and send polite, personalized outreach; (4) Run mostly hands-free (“set and forget”); (5) Stay local and private (Ollama); (6) Minimize bans/reports (stealth, delays, rate limits).
- **Operating principles:** Low volume, human-like cadence; respect site ToS and public data; avoid duplicate contact; prioritize safety, compliance, explainability.
- **Stack (2026):** Browser automation (Playwright), stealth/anti-detection, local LLM (Ollama), storage (SQLite for dedupe/history or MongoDB for leads), email (SMTP / yagmail).
- **Key design choices:** Playwright for modern JS-heavy sites (e.g. Facebook Marketplace); randomized delays, human-like scrolling, UA rotation; local LLM for classification + drafting; modular architecture and prompt files.

---

## 3. Architecture — Layers and Responsibilities

| Layer | Location | Role |
|-------|----------|------|
| **Frontend** | `real-estate-scout/` (Vite/React) | UI: Operator Onboarding, CRM, pipeline, data, agents. Calls API via proxy or `VITE_API_BASE`. |
| **API** | `operator_onboarding/api_server.py` (FastAPI) | Operators, documents, context, CRM, auth, settings, valuation, leads, config, logs. CORS enabled for frontend. |
| **Operator logic** | `operator_onboarding/` (Python) | SQLite CRUD, context builder, static context, EU STR/tax, message templates. No HTTP; used by API and bot. |
| **Listings backend** | `backend/` (immo-snip-lu) | Scrapers (athome.lu, immotop.lu). Writes to **MongoDB** when `MONGO_URI` set, else SQLite. Schedulers: `mongo_scheduler.py`, `parallel_scheduler.py`. |
| **Bot** | `bot/` (Python) | Config-driven loop: load `config.yaml`, `active_provider_id`; qualify leads; `generate_proposal(..., provider_id=...)` with `get_provider_context`; send email. |
| **Config** | `config.yaml` (repo root) | active_provider_id, start_urls, criteria, ollama model, email, limits, selectors, database path, facebook. |
| **DB abstraction** | `lib/db.py` | Mode: **local** (SQLite) or **cloud** (MongoDB). `set_mode("cloud")` from auth/session; `get_collection(name)` for unified CRUD. Collections: operators, operator_documents, users, leads, agents, logs, owners, properties, conversations. |

---

## 4. MongoDB — Atlas, AWS, Collections, and Code

### 4.1 When MongoDB Is Used

- **Listings backend:** When `MONGO_URI` is set, the listings backend (`backend/`) and any services that read/write listings, leads, or config use **MongoDB Atlas** instead of SQLite.
- **API/Data:** `/api/leads`, `/api/agents`, `/api/logs`, `/api/database` use `lib.db` abstraction. When mode is **cloud** (e.g. user authenticated via OAuth), `get_collection("leads")`, `get_collection("agents")`, `get_collection("logs")` hit MongoDB. When `MONGO_URI` is set, the API’s database status endpoint reports Atlas connection.
- **Connection identity (from master reference):** Cluster host pattern `cluster0.*.mongodb.net`; username/password from env only; **never** hardcode in code or docs.

### 4.2 Connection String and Environment

- **Format:** SRV. Example: `MONGO_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"`. Replace `PASSWORD`; do not commit `.env`.
- **Env vars:** `MONGO_URI` — when set, code uses MongoDB; when unset, falls back to SQLite for listings. `MONGO_DB_NAME` (optional) — default `coldbot` (or project choice, e.g. `realestate`).
- **Atlas setup (from MONGODB_SETUP.md):** Free tier 512MB (~50k listings). Provider: **AWS** (recommended) or Google Cloud / Azure. Region: e.g. **eu-west-1 (Ireland)** for Luxembourg. Create cluster → database user (read/write any database) → Network Access (whitelist IP or 0.0.0.0/0 for servers) → get connection string → set `MONGO_URI`. Use `pymongo`; on startup: `client.admin.command('ping')` and log success/failure.

### 4.3 Database and Collections (MongoDB)

- **Database name:** `coldbot` or value of `MONGO_DB_NAME` (e.g. `realestate` in backend docs).
- **Collections and purpose:**

| Collection | Used by / purpose |
|------------|-------------------|
| **config** | Backend and bot: runtime config (sources, limits, keys). |
| **leads** | Bot and backend: contacted leads, status, follow-ups. |
| **agents** | Backend: exported agent/contact lists (e.g. agents.txt / agents.xlsx source). |
| **logs** | Backend and bot: action logs, errors, scan results. |
| **listings** | Backend scrapers: raw and processed listings (athome.lu, immotop.lu). 40+ fields: listing_ref, source, transaction_type, listing_url, title, location, description, sale_price, rent_price, surface_m2, bedrooms, bathrooms, phone_number, image_urls, first_seen, last_updated, etc. |
| **operators** | Optional: if operator data is mirrored to Mongo; otherwise operators stay in SQLite only. |

### 4.4 Code Rules When Using MongoDB

- Prefer MongoDB when `MONGO_URI` is present; otherwise use SQLite.
- Use `pymongo` (sync) or `motor` (async). Backend uses `mongo_db.py` + monkey-patching scrapers’ `db_*` so same code path writes to Atlas.
- On startup or first use: test with `client.admin.command('ping')` and log connection success or failure.
- **lib/db.py:** When `set_mode("cloud")` is called (e.g. from API auth dependency after OAuth), `get_collection(name)` returns a MongoDB collection interface; when mode is `"local"`, it uses SQLite tables. `IMMO_SNIPPY_MODE` env can force mode.

### 4.5 Scaling, Limits, Security (Atlas)

- **Free tier (M0):** 512MB storage, shared RAM, up to 500 connections. Upgrade to M2/M5 for more storage.
- **Security:** Strong password; whitelist IPs where possible; store connection string in env only; 2FA on Atlas account; rotate passwords periodically. Optional: **MONGODB-AWS** auth (pymongo) for IAM-based auth when running on AWS.

### 4.6 Migration SQLite → MongoDB

- Backend docs describe script: read from SQLite `listings` table, loop and `db_upsert(listing)` into Mongo. Same schema; backend `mongo_db` exposes `db_init`, `db_upsert`, `find_by_filter`, `find_new_since`, `db_stats`.

---

## 5. AWS & Cloud Deployment

- **MongoDB Atlas:** Listings backend supports MongoDB Atlas (cloud). Atlas can be hosted on **AWS** (recommended in setup docs), Google Cloud, or Azure; choice is infrastructure, not application logic.
- **AWS region:** For Luxembourg/Europe, Atlas region **eu-west-1 (Ireland)** is recommended.
- **What is NOT in this repo:** No implementation of “AWS bots” (Lambda, ECS, S3 for bot logic). The only AWS-related mentions are: (1) MongoDB Atlas provider choice (e.g. AWS as region), (2) pymongo’s optional **MONGODB-AWS** auth in the environment for IAM-based connection to Atlas when running on AWS.
- **Operator onboarding:** Can remain SQLite-only for operator data; no cloud required. If operators are mirrored to Mongo (optional), then cloud mode applies.
- **Deployment:** Frontend and API can be deployed to any host (e.g. VPS, container, or future ECS/Lambda). Set `API_BASE_URL` for OAuth callbacks; `AUTH_FRONTEND_URL` for redirect after login; `MONGO_URI` and optionally `MONGO_DB_NAME` for cloud data. No localhost assumptions in production.

---

## 6. Context System — What the LLM Sees (Phrasing & Templates)

### 6.1 Context Layers (order of assembly)

| Layer | Source | Purpose |
|-------|--------|--------|
| **1. Base static** | `operator_onboarding/airbnb_static_context.py` | Option A: role, 2026 Europe relationship model, Grand Slam Offer, value equation, negotiation tactics, pipeline goal, Europe rules. |
| **2. EU STR & tax** | `operator_onboarding/eu_str_tax_context.py` | Disclaimer, EU regulation, DAC7, country-level deductions; legal phrasing and compliance. |
| **3. Agency (operator)** | `context_builder.build_operator_context(operator)` | Company name, tagline, countries, tone, target owner type, Calendly, qualification rules, **rules** (up to 50). |
| **4. Reference documents** | `operator_documents` table | Draft contract, summary agreement, payout examples, etc.; truncated per doc and in total. |

**Single entry point:** `get_provider_context(operator_id)` in `operator_onboarding/context_builder.py`. Used by the bot (`bot/llm.py` → `generate_proposal(..., provider_id=...)`) and by `GET /api/operators/:id/context`.

### 6.2 Phrasing Principles (from static context)

- **Enlarge the pie** — Emphasise total income growth, not fee %. E.g. “Let’s make the whole pie much bigger — you keep most of a 2–3× larger income.”
- **Build rapport first** — Acknowledge pain (low rent, bad tenants, vacancies), then offer the solution.
- **Social proof** — Concrete numbers and locale. E.g. “One owner in your area went from €950 long-term to €2,400 average monthly.”
- **Risk reversal** — Guarantee-style phrasing where appropriate.
- **Outcome focus** — “You do nothing. We handle everything. You just collect more money.”
- **Pipeline goal** — Discovery → reply → value bomb + trust → **booked discovery call**. Do not close the contract in chat.

### 6.3 Tone and Voice

- Professional and friendly (default); per-operator tone (e.g. warm and consultative, direct and high-energy).
- Stay in character as the **agency**; never mention AI or bot.
- Use the operator’s **key phrases** and **rules** from onboarding.

### 6.4 Message Templates (acquisition flow)

- **File:** `operator_onboarding/message_templates.py`. `get_template(name)`, `fill_template(name, **placeholders)`.
- **Steps:** cold_opener → after_reply → value_bomb_risk_reversal / objection_handler → call_booking → call_booked_confirmation.
- **Placeholders (examples):** owner_name, property_type, city_area, area, calendly_link, call_minutes, your_name, company_name, tagline, x.

### 6.5 Do's and Don'ts

- **Do:** Mirror pain, use local examples, offer free audit, mention compliance when relevant, ask for the call with the provider’s Calendly.
- **Don’t:** Fight over fee %, close the contract in chat, break character, or ignore operator rules.

---

## 7. immo-snip-lu vs COLD BOT (Backend Comparison)

| | **immo-snip-lu (backend in IMMO SNIPPY)** | **Former COLD BOT** |
|---|------------------------------------------|----------------------|
| **Goal** | Luxembourg listing discovery & storage (athome.lu + immotop.lu) | End-to-end lead pipeline: scrape → qualify → contact (email/WhatsApp) |
| **Output** | Listings in **MongoDB or SQLite** (40+ fields) | Scraped listings → LLM → leads DB → outreach |
| **Sites** | athome.lu, immotop.lu | athome, immotop, nextimmo, Facebook Marketplace, etc. |
| **Browser** | Selenium + Chrome | Playwright |
| **DB** | **SQLite or MongoDB Atlas** | SQLite (leads, scraped_listings) |
| **Config** | Env (MONGO_URI) + constants in schedulers | YAML config.yaml |

**immo-snip-lu has:** Rich schema (40+ fields, energy/heating, agency/agent, image URLs, phone extraction); dedicated Luxembourg focus; **MongoDB Atlas** as first-class option; simple run (one scheduler, SQLite or Mongo).  
**COLD BOT had:** Multi-site, Playwright, LLM pipeline, outreach (email/WhatsApp), config-driven YAML, dashboard & API.  
In IMMO SNIPPY, the **listings backend** is immo-snip-lu; the **bot** in `bot/` is the scanning/outreach loop (config-driven, provider context), separate from scrapers.

---

## 8. CRM — Business and Functional Spec

### 8.1 Core Concepts

- **Owner-centric:** One owner may have multiple properties. Database centers around the owner; when opening a property, display all properties for that owner.
- **Two pipelines:** (A) **Property Acquisition Pipeline** — stages for acquisition/onboarding; (B) **Chatbot / Communication Pipeline** — conversation tracking. Acquisition and communication are logically separate but connected.
- **Data:** Property (address, price, rental terms, bedrooms, bathrooms, size, type, title, description, source, URL, owner name, contact). Owner (name, email, phone, notes). Conversations per property (channel, sender, message_text, timestamps; no deletion of messages).

### 8.2 CRM Functional Requirements (from CRM_FUNCTIONAL_SPEC.md)

- Custom status pipelines (acquisition + chatbot).
- Viability and scoring: viability score, estimated revenue, operating costs, cash flow, revenue potential, risk indicators, confidence level.
- Scraped data and two-way sync: pull from source, store scraped + edits, bidirectional consistency.
- Communication channels: Email, WhatsApp, Facebook Messenger, website forms, phone, SMS — structured per channel.
- Conversation history: full thread, channel/sender/timestamps, permanent log (no deletion).
- AI conversation control: prominent automation toggle; AI stop stage control (e.g. after contact, after interest, after agreement, never).
- AI context source: existing chatbot context (Airbnb business model); no separate stage-based template library.
- Attention flags and notifications (objections, negotiation, legal, complex responses).
- Automation levels: fully manual, semi-automated with approval, automated until stage, fully automated — stage-aware.
- Lead creation: auto-create profile when new lead identified; messaging does not begin until approval unless settings allow.
- Real-time property evaluation panel: evaluation context, cash flow simulation, revenue projections, risk assessment, certainty indicator.
- Bulk actions: select multiple leads; send message; update stage; mark contacted; export.
- Automatic pipeline movement based on events (reply received, call booked, agreement confirmed, contract signed).
- Reporting and export: export property data, owner data, chat history.
- Manual lead entry: mandatory email + source URL; data feeds into database; duplicate detection/merging.

### 8.3 CRM in This Repo

- **Storage:** `lib/crm_storage.py` — SQLite (`data/crm.db`) for owners, properties, conversations. API exposes full CRUD and CSV exports; valuation endpoint calls `lib.property_evaluator.evaluate_property`.

---

## 9. Frontend Routes & API Endpoints (Reference)

**Frontend (real-estate-scout):** `/` RunPage; `/website-bot`, `/facebook-bot`, `/pipeline`, `/test-build`, `/data`; `/crm` CRMPage; `/operator-onboarding` OperatorOnboardingPage; `/agents-apis` AgentsApisPage. React Router, TanStack Query, shadcn/ui. API base: `VITE_API_BASE` or `/api` proxy.

**API (FastAPI):** Health: `GET /`, `GET /health`. Operators: `GET/POST /api/operators`, `GET/PATCH/DELETE /api/operators/:id`, `GET/POST /api/operators/:id/documents`, `DELETE /api/operators/:id/documents/:docId`, `GET /api/operators/:id/context`, `POST /api/operators/:id/test-message`, `POST /api/operators/reset-defaults`. Settings: `GET/POST /api/settings`, `GET/POST /api/config`. CRM: `GET/POST /api/crm/owners`, `PATCH /api/crm/owners/:id`, `GET /api/crm/owners/export`, `GET /api/crm/owners/:id/export`, `GET /api/crm/properties/export`, `GET/POST /api/crm/properties/:id/conversations`, `GET /api/crm/conversations/export`, `PATCH /api/crm/properties/:id`, `POST /api/crm/bulk-update`, `POST /api/crm/valuate`. Data: `GET /api/leads`, `GET /api/agents`, `GET /api/database`, `GET /api/logs`. Auth: `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/local`, `GET /api/auth/google/login`, `GET /api/auth/google/callback`, `GET /api/auth/linkedin/login`, `GET /api/auth/linkedin/callback`.

---

## 10. Operator Onboarding — Flow and Functions

- **UI:** Create/edit operator; 3-step form (company basics → tone/target/fee → Calendly/notes); documents and rules (up to 50). POST/PATCH to API.
- **Context build:** `get_provider_context(operator_id)` → static + EU tax + agency block + documents. Used by bot and `GET /api/operators/:id/context`.
- **Key modules:** `context_builder.py` (get_provider_context, build_operator_context, build_documents_context); `operators.py` (create_operator, get_operator, get_all_operators, update_operator, delete_operator); `documents.py` (create_document, get_documents, get_document, delete_document); `airbnb_static_context.py`, `eu_str_tax_context.py`, `message_templates.py`, `llm_integration.get_system_prompt_for_operator`.

---

## 11. Bot — Flow and Config

- **Entry:** `python -m bot.main`. Reads `config.yaml`. Uses `active_provider_id` for context.
- **Flow:** For each start_url (e.g. Facebook Marketplace): init browser (Playwright), scroll, collect cards → `is_eligible(text, criteria, model)` → optionally `evaluate_property` → `extract_contact` → `generate_proposal(text, model, provider_id=active_provider_id)` (injects `get_provider_context(provider_id)` into system prompt) → `send_email`. Storage: init_db, already_contacted, log_contacted, count_contacts_since (SQLite or can be backed by Mongo if leads in cloud).
- **Config keys:** start_urls, criteria, ollama.model, email (from, app_password, smtp_host), limits (max_contacts_per_hour, scroll_depth, delay_min/max, cycle_cooldown_seconds), selectors.listing, database (leads DB path), facebook (login_url, storage_state, allow_manual_login).

---

## 12. Property Valuation (Daily Rental)

- **Entry:** `lib.property_evaluator.evaluate_property(listing_text, city=..., neighborhood=..., listing=..., model=...)` or root `property_evaluator.evaluate_property`. API: `POST /api/crm/valuate` (body: title, description, location, price, bedrooms, surface_m2).
- **Context stack:** Market data (`lib/market_data.get_city_data`, `data/market_data_cache.json`); future context 2026–2031 (`lib/future_context_loader`, `data/future_context_2026_2031.json`); system prompt from `ai_lm_content/property_valuation_daily_rental/`; user prompt with market line + listing. LLM plug: `lib/llm_valuation_plug.run_valuation`; stub if no Ollama/custom plug.

---

## 13. Databases Summary (Where Data Lives)

| Data | Where | Technology |
|------|--------|------------|
| Operators, operator_documents | operator_onboarding/providers.db | SQLite (path: OPERATORS_DB_PATH or PROVIDERS_DB) |
| CRM (owners, properties, conversations) | data/crm.db | SQLite (lib/crm_storage) |
| Auth users | operator_onboarding (auth.py) | SQLite (users table) |
| Listings | backend / lib.db | **MongoDB** when MONGO_URI set, else SQLite |
| Leads, agents, logs | lib.db get_collection | **MongoDB** when mode=cloud and MONGO_URI set, else SQLite |
| Bot contacted leads | config.yaml → database | SQLite (bot/storage) or could be Mongo |

---

## 14. Key File Reference

| Role | Path |
|------|------|
| API server | operator_onboarding/api_server.py |
| Context builder | operator_onboarding/context_builder.py |
| Static context | operator_onboarding/airbnb_static_context.py |
| EU STR/tax | operator_onboarding/eu_str_tax_context.py |
| Templates | operator_onboarding/message_templates.py |
| Operators CRUD | operator_onboarding/operators.py |
| Documents CRUD | operator_onboarding/documents.py |
| Operator DB | operator_onboarding/db.py |
| Auth | operator_onboarding/auth.py |
| LLM integration | operator_onboarding/llm_integration.py |
| Bot loop / LLM / browser / sender | bot/main.py, bot/llm.py, bot/browser.py, bot/sender.py |
| Property valuation | lib/property_evaluator.py, lib/market_data.py, lib/future_context_loader.py, lib/llm_valuation_plug.py |
| CRM storage | lib/crm_storage.py |
| DB abstraction (local vs cloud) | lib/db.py |
| Listings backend (Mongo/SQLite) | backend/mongo_db.py, backend/mongo_scheduler.py, backend/athome_scraper*.py, backend/immotop_scraper*.py |
| Config | config.yaml |
| MongoDB setup guide | backend/MONGODB_SETUP.md |
| Frontend | real-estate-scout/ |

---

## 15. Environment Variables (Deployment / Cloud)

- **MONGO_URI** — MongoDB Atlas connection string (SRV). When set, listings and (when mode=cloud) leads/agents/logs use Mongo.
- **MONGO_DB_NAME** — Database name (default coldbot).
- **IMMO_SNIPPY_MODE** — `local` or `cloud` for lib/db (default local).
- **OPERATORS_DB_PATH** / **PROVIDERS_DB** — Override path to operator SQLite DB.
- **API_BASE_URL** — Base URL for API (OAuth callbacks).
- **AUTH_FRONTEND_URL** — Frontend URL for post-login redirect.
- **SESSION_SECRET** — Session middleware secret.
- **GOOGLE_CLIENT_ID**, **GOOGLE_CLIENT_SECRET** / **LINKEDIN_CLIENT_ID**, **LINKEDIN_CLIENT_SECRET** — Optional OAuth.
- **VITE_API_BASE** — Frontend API base (e.g. production API URL).

---

# PART II — INLINED DOCUMENTATION (RELEVANT MDs PASTED)

The following sections are full or substantial copies of relevant markdown files from this repo, for maximum context.

---

## INLINED: docs/CONTEXTS_AND_BOTS.md

# Contexts, Bots, Phrasing Guide — System & Process

Single guide for Immo Snippy: how context is built, how bots use it, and how to phrase outreach (tone, tactics, templates, process).

### 1. System overview

- **Contexts** = everything the LLM sees as "system" knowledge before generating a message: static business model, EU rules, agency details, rules, and reference documents.
- **Bots** = the scanning loop that finds leads, qualifies them, and calls message generation with an optional **provider (operator) id**.
- **Phrasing** = the style and tactics baked into static context + templates + operator rules so messages stay on-brand and effective.

**Flow:** Onboard operator → build context with `get_provider_context(operator_id)` → inject that string into the system prompt → generate message (e.g. via Ollama). Config sets `active_provider_id` so the bot knows which operator to use.

### 2. Context layers (what the LLM receives)

| Layer | Source | Purpose |
|-------|--------|--------|
| **1. Base static** | `operator_onboarding/airbnb_static_context.py` | Option A: role, 2026 Europe relationship model, Grand Slam Offer, value equation, negotiation tactics, pipeline goal, Europe rules. |
| **2. EU STR & tax** | `operator_onboarding/eu_str_tax_context.py` | Disclaimer + EU regulation, DAC7, country-level deductions; legal phrasing and compliance. |
| **3. Agency (operator)** | `context_builder.build_operator_context(operator)` | Company name, tagline, countries, tone, target owner type, Calendly, qualification rules, **rules** (up to 50 sentence-form rules). |
| **4. Reference documents** | `operator_documents` table | Draft contract, summary agreement, payout examples, etc.; truncated per doc and in total to avoid context overflow. |

**Single entry point:** `get_provider_context(operator_id)` in `operator_onboarding/context_builder.py`. Use this (or `get_system_prompt_for_operator(operator_id)` in `llm_integration.py`) as the system prompt before calling the LLM.

### 3. Phrasing guide — Principles

- **Enlarge the pie** — Don't argue over %; emphasise total income growth.
- **Build rapport first** — Acknowledge pain (low rent, bad tenants, vacancies), then offer the solution.
- **Social proof** — Use concrete numbers and locale.
- **Risk reversal** — Include guarantee-style phrasing in important messages.
- **Outcome focus** — "You do nothing. We handle everything. You just collect more money."
- **Pipeline goal** — Move owner: discovery → reply → value bomb + trust → **booked discovery call**. Do not try to close the contract in chat.

### 4. Process (end-to-end)

1. Onboard operator — UI (`/operator-onboarding`) or CLI (`manage_providers.py add`).
2. Store — Data in SQLite (`operators`, `operator_documents`). DB path: **OPERATORS_DB_PATH** or **PROVIDERS_DB**.
3. Build context — For a given `operator_id`, call `get_provider_context(operator_id)`.
4. Config — `config.yaml` sets **active_provider_id** (e.g. `1`).
5. Inject — When generating a message, prepend `get_provider_context(provider_id)` to the system prompt, then call the LLM (e.g. Ollama).
6. Send — Generated message used (e.g. email or in-app); no contract closing in chat.

### 5. Message templates (acquisition steps)

| Step | Template key | Use when |
|------|----------------|----------|
| 1 | `cold_opener` | First outreach; hook + pain + value bomb. |
| 2 | `after_reply` | After owner replies; enlarge the pie + social proof. |
| 3 | `value_bomb_risk_reversal` | Share numbers + guarantee. |
| 3 | `objection_handler` | Price or hassle objections. |
| 4 | `call_booking` | Ask for discovery call; include Calendly. |
| 5 | `call_booked_confirmation` | Call booked; confirm and hand off. |

**Placeholders:** owner_name, property_type, city_area, area, calendly_link, call_minutes, your_name, company_name, tagline, x.

---

## INLINED: docs/REAL_ESTATE_OUTREACH_BOT.md (full)

# Real Estate Outreach Bot (Local Reference)

This document captures the refined, production-oriented proposal for a fully automatic real-estate outreach bot (set-and-forget style) and is intended as a local, persistent reference for implementation and future iteration.

### Purpose
- Continuously browse public real estate listings
- Identify FSBO/owner listings that match criteria
- Extract contact details (email/phone)
- Generate personalized outreach using a local LLM
- Send emails/messages with strong anti-spam and compliance safeguards

### Purpose (Expanded Summary)
Cold Bot is an automated, privacy-focused, local-AI-powered cold outreach tool whose main goal is to help a real estate agent or agency find and contact private sellers (FSBO) on public online marketplaces (Facebook Marketplace, Craigslist, local classifieds, etc.) and send them personalized partnership / listing takeover proposals via email.

### Core Objectives — ranked by importance
1. Find motivated private sellers automatically — Scroll listing feeds → identify owner listings → classify with local Llama
2. Extract contact information with almost no human intervention — Pull email/phone from listing text or seller snippets
3. Generate and send polite, personalized outreach emails — Offer help selling faster/for more, with no upfront costs
4. Run mostly hands-free ("set and forget") — Use config (locations, price hints, search URLs) and keep scanning
5. Stay local and private — All LLM decisions run via local Ollama
6. Minimize bans / reports — Stealth browsing, random delays, rate limits, optional manual approval

### In plain English — the dream end-state
You run: `python main.py --config miami-homes.yaml`. Then 20–60 minutes later, you start receiving replies from owners who posted "House for sale by owner – $420k – text me" …without manually scrolling, copying emails, or writing the same message 40 times.

### Local UI & Database (Testing)
A lightweight localhost UI (Java) exists for testing scan actions, monitoring output, and managing a local leads database (`data/leads.csv`) before automating outreach.

### atHome.lu Test Scanner (Text-only)
For safe, local testing against atHome.lu, a simple scanner can pull listing URLs and text fields (title, price, location, description, contact info) and store them in SQLite. It deliberately does **not** save photos.

### CRM + Browser Outreach (Current Build)
The current build includes: A CRM-style dashboard for leads/clients (pipeline stages, automation toggles). A browser-driven outreach layer (Playwright): FB Messenger send for queued URLs; Website contact form submission for website leads.

### Operating Principles
- Low volume, human-like cadence
- Respect site ToS and public data boundaries
- Avoid duplicate contact or re-sending
- Prioritize safety, compliance, and explainability

### Core Stack (2026 Context)
- **Browser Automation:** Playwright (Python)
- **Stealth / Anti-Detection:** playwright-stealth or stealth plugins + randomized behavior
- **Local LLM:** Ollama + Llama 3.1/3.2
- **Storage:** SQLite for dedupe and history
- **Email:** SMTP (Gmail/Outlook app password) or `yagmail`

### Key Design Choices
- Playwright for modern JS-heavy sites (Facebook Marketplace)
- Randomized delays, human-like scrolling, and UA rotation
- Local LLM for classification + drafting to reduce API costs
- Modular architecture and prompt files for easy iteration

### Suggested Project Structure
```
project/
├── main.py              # CLI entry + infinite loop orchestrator
├── config.yaml          # URLs, criteria, email creds, limits
├── browser.py           # Playwright setup, stealth, scroll/navigate
├── scraper.py           # Site-specific: extract listings → parse → eligibility
├── llm.py               # Ollama calls: classify + generate email
├── sender.py            # SMTP email sending + logging
├── storage.py           # SQLite: contacted leads, history
└── ai_lm_content/       # Prompts and reference docs (e.g. property_valuation_daily_rental)
```

### Main Loop (High-Level)
Load config + prompts → Launch Playwright with stealth context → Iterate URLs → Scroll, collect listing cards → Filter + classify → Extract contact → Generate proposal → Send email → Log and sleep.

### Pseudocode Snapshot
```
def main():
    config = load_config()
    model = "llama3.1"  # or 3.2
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800}, user_agent=rotate_ua())
        page = context.new_page()
        while True:
            for url in config["start_urls"]:
                page.goto(url, wait_until="networkidle")
                scroll_and_collect(page, config, model)
            sleep_random(1800, 3600)

def scroll_and_collect(page, config, model):
    seen = set()
    for _ in range(30):
        cards = page.query_selector_all(config["listing_selector"])
        for el in cards:
            text = el.inner_text().lower()
            fingerprint = hash(text)
            if fingerprint in seen: continue
            seen.add(fingerprint)
            if is_eligible(text, config["criteria"], model):
                contact = extract_contact(text, model)
                if contact and not already_contacted(contact):
                    proposal = generate_proposal(text, contact, model)
                    send_email(contact, proposal)
                    log_contacted(contact, proposal)
        human_scroll(page)
```

### Prompts (Templates)
**1) Eligibility Classification:** You are a real estate lead qualifier. Given this listing text: """{text}""" Criteria: {criteria} Output JSON only: {"eligible": true/false, "reason": "...", "property_summary": "..."}

**2) Contact Extraction:** Extract any email or phone from this text: """{text}""" Return JSON: {"email": "...", "phone": "..."} or null if none.

**3) Proposal Generation:** Write a short, polite email (150-220 words) proposing a real estate agency partnership. From: Local licensed agent [Your Name/Agency]. To: Owner of {property_summary}. Key points: Compliment listing, offer help selling faster/higher price, no upfront fees. Tone: friendly, professional. Include call-to-action. Subject line first, then body.

### Configuration (Suggested config.yaml Keys)
start_urls, listing_selector, criteria, max_actions_per_hour, min_delay_seconds / max_delay_seconds, email, log_db_path.

### Anti-Detection Checklist
Randomized waits (5–45s); Mouse movement + scroll variability; User-Agent rotation; Headless vs. headed testing; Proxy rotation optional (later).

### Safety / Compliance
Public data only; Respect ToS and privacy; Avoid mass outreach; Provide opt-out messaging if needed.

### Incremental Build Steps
1. Prototype Craigslist (simpler HTML); 2. Add FB Marketplace scroll + selector tuning; 3. Add Ollama classify + contact extraction; 4. Add proposal generation; 5. Add SQLite dedupe; 6. Add SMTP send + logging.

### Next Refinements
Better prompt calibration and temperature tuning; Add structured logging and observability; Add account/proxy rotation hooks; Add "dry-run mode" for testing.

### Predevelopment Package (Cursor-Oriented Notes)
**Research Highlights:** Playwright v2.x+ stealth via playwright-stealth. Ollama Python v0.6.1 supports format="json" and structured outputs. Ethical FB Marketplace scraping: public data only, 3–12s delays, 8–12 req/min. yagmail supports OAuth2 (oauth2_file="creds.json") or app passwords.

**Config Stub (Baseline):**
```
start_urls:
  - "https://www.facebook.com/marketplace/[city]/propertyforsale?query=owner"
criteria: "FSBO, owner selling, no agent, home for sale"
ollama: { model: "qwen3" }
email: { from: "youragency@gmail.com", app_password: "your_app_pw", smtp_host: "smtp.gmail.com" }
limits: { max_contacts_per_hour: 5, scroll_depth: 30, delay_min: 3, delay_max: 12 }
selectors: { listing: '[data-testid="marketplace_feed_card"]' }
database: "leads.db"
```

**Prompt Targets:** Add proxy rotation, keep login manual-only. Qwen3 prompts with strict JSON parsing retries. Main loop: 3–12s delay, max 5/hour, SQLite logging. yagmail with retries and OAuth2 fallback.

### Development Plan (Modular Silos)
**Integration Strategy:** Central main.py orchestrates all silos. Data flow: Config → Browser → Scraper → LLM → Sender → Storage. Testing pyramid: unit → integration → end-to-end. Dependencies shared via requirements.txt. Build sequence: silos 1–5, then integrate in silo 6.

**Silo 1: Configuration Loader** — YAML load + schema validation. Exports load_config(path) -> dict. PyYAML dependency.

**Silo 2: Browser Automation** — Playwright init + stealth + scroll. Inputs: URL, depth, delay range.

**Silo 3: Data Extraction/Scraping** — Extract listing text and hashes from selectors. Optional BeautifulSoup fallback.

**Silo 4: LLM Integration** — Ollama classify + contact extraction + proposal. Strict JSON output with retry.

**Silo 5: Email Sender & Logging** — yagmail send + SQLite dedupe/log.

**Silo 6: Main Orchestrator** — Loop: navigate → scrape → classify → send/log → cooldown.

---

## INLINED: docs/IMMO_SNIP_VS_COLD_BOT.md (excerpts)

**immo-snip-lu:** Goal = Luxembourg listing discovery & storage (athome.lu + immotop.lu). Output = Listings in MongoDB or SQLite (40+ fields, phone, images). Sites = athome.lu, immotop.lu only. Browser = Selenium + Chrome. DB = SQLite or MongoDB Atlas. Config = Env (MONGO_URI) + constants.

**COLD BOT:** Goal = End-to-end lead pipeline: scrape → qualify → contact (email/WhatsApp). Output = Scraped listings → LLM → leads DB → outreach. Sites = athome, immotop, nextimmo, bingo, propertyweb, wortimmo, rightmove, Facebook Marketplace. Browser = Playwright. DB = SQLite (leads, scraped_listings). Config = YAML config.yaml.

**immo-snip-lu has:** Very rich schema (40+ fields), dedicated Luxembourg focus, phone extraction (regex + "Show phone" button), MongoDB Atlas first-class, simple run (one scheduler). **COLD BOT has:** Multi-site (8+ sources), Playwright, LLM pipeline, outreach (email/WhatsApp), config-driven YAML, dashboard & API, leads/agent logic.

**Architecture immo-snip:** mongo_scheduler.py / parallel_scheduler.py → athome_scraper.py, immotop_scraper.py (or _mongo wrappers) → Selenium → index → detail pages → db_upsert (SQLite or Mongo). MongoDB: mongo_db.py + monkey-patching scrapers' db_* so same code path writes to Atlas.

**Data model immo-snip:** listing_ref, source, transaction_type, listing_url, title, location, description, sale_price, rent_price, surface_m2, rooms, bedrooms, bathrooms, energy/heating flags, phone_number, phone_source, agency/agent, image_urls, first_seen, last_updated, title_history. Early-exit: stops index when it hits a known listing with unchanged title.

**How similar is the code:** Conceptually similar (same 2 LU sites), implemented differently — no shared code. Parsing = same (BeautifulSoup + lxml). Browser different (Selenium vs Playwright). Structure different (2 large files vs base class + per-site classes). Reusing immo-snip in COLD BOT = port ideas (CHAR_MAP, "Show phone" click, early-exit), not merge files.

---

## INLINED: backend/MONGODB_SETUP.md (full)

# MongoDB Atlas Setup Guide

Why MongoDB Atlas: Free tier 512MB (~50,000 listings); cloud hosted; no server maintenance; better for scaling; query flexibility (rich queries, aggregations, indexes).

Setup: (1) Create Atlas account — Shared free tier, provider **AWS** (recommended) or Google Cloud / Azure, region **eu-west-1 (Ireland)** for Luxembourg. (2) Create free cluster (e.g. name realestate). (3) Database user — Password, username e.g. scraper, privileges Read and write to any database. (4) Network Access — Add current IP or 0.0.0.0/0 for servers. (5) Connection string — Connect your application, Python 3.12+, copy SRV string, replace <password>. (6) Set MONGO_URI in environment (export or .bashrc / setx on Windows). (7) pip install pymongo. (8) Test: python mongo_db.py. (9) Run: python mongo_scheduler.py.

File structure (MongoDB version): mongo_db.py (Atlas adapter), mongo_scheduler.py, athome_scraper_mongo.py, immotop_scraper_mongo.py, athome_scraper.py, immotop_scraper.py, requirements.txt.

Viewing data: Atlas UI (Browse Collections), MongoDB Compass, or Python (mongo_db.db_stats(), find_by_filter, find_new_since).

MongoDB vs SQLite: Setup (Zero vs 5 min), Cost (Free both), Location (Local file vs Cloud), Access (Same machine vs Anywhere), Queries (SQL vs MongoDB), Scaling (Limited vs Easy), Backups (Manual vs Automatic).

Example queries: find_by_filter({"source": "athome", "bedrooms": {"$gte": 2}}); rentals in Luxembourg under €2500; energy class A or B; title_history not empty.

Troubleshooting: MongoServerSelectionTimeoutError (connection, whitelist, ping); Authentication failed (reset password); pymongo not installed (pip install pymongo); Database user not authorized (edit user, Atlas admin or Read and write to any database).

Migration SQLite → MongoDB: Read SQLite SELECT * FROM listings, loop db_upsert(listing), same schema.

Free tier limits M0: 512MB storage, shared RAM, 500 connections, ~50k listings. Upgrade M2 ($9/mo 2GB) or M5 ($25/mo 5GB).

Security: Strong password (20+ chars), whitelist specific IPs, store URI in env only, enable 2FA, rotate passwords 3–6 months.

---

## INLINED: docs/PROPERTY_VALUATION.md (full)

# Property Valuation (Daily Rental) — Context & LLM Plug

Context stack: (1) Market data — lib/market_data.get_city_data(city, neighborhood, listing); source data/market_data_cache.json; injected into user prompt (ADR, occupancy, price range). (2) Future context 2026–2031 — lib/future_context_loader.load_future_context(), append_future_context(system_prompt); source data/future_context_2026_2031.json; prepended to system prompt; forecast line in user prompt. (3) System prompt — ai_lm_content/property_valuation_daily_rental/system_prompt.txt via get_prompt("property_valuation_daily_rental"); optional get_reference_context. (4) User prompt — Market line + listing description, price, bedrooms + "Evaluate and return JSON only."

Entry points: Root property_evaluator.evaluate_property(city, neighborhood=..., listing_text=..., ...); Library lib.property_evaluator.evaluate_property(listing_text, city=..., neighborhood=..., listing=..., model=...).

LLM plug: lib/llm_valuation_plug.run_valuation(system_prompt, user_prompt, model="qwen3"). If RUN_VALUATION_LLM set (callable), use that; else try bot.llm._chat_json (Ollama); else stub (property_valuation_score: 0, recommendation: "Avoid", reasoning with "not implemented" message). Option A: Install ollama, pull model, bot.llm importable. Option B: Set RUN_VALUATION_LLM to function (user_prompt, model, system_content) -> dict with schema shape.

Files: data/market_data_cache.json, data/future_context_2026_2031.json, lib/market_data.py, lib/future_context_loader.py, lib/llm_valuation_plug.py, lib/property_evaluator.py, property_evaluator.py, ai_lm_content/property_valuation_daily_rental/.

---

## INLINED: docs/CRM_FUNCTIONAL_SPEC.md (full 20 points)

1. Core data: Property (address, price, rental terms, bedrooms, bathrooms, size, type, title, description, source, URL, owner name, contact). Owner (name, email, phone, notes).
2. Two pipelines: (A) Property Acquisition Pipeline (acquisition/onboarding stages); (B) Chatbot/Communication Pipeline (conversation tracking). Logically separated but connected.
3. Owner-based CRM: One owner, multiple properties. DB centers on owner. Opening a property shows all properties for that owner.
4. Viability and scoring: Viability score, estimated revenue, operating costs, cash flow projection, revenue potential, risk indicators, confidence level.
5. Scraped data and two-way sync: Pull from source, display structured, store scraped + edits, bidirectional consistency.
6. Communication channels: Email, WhatsApp, Facebook Messenger, Facebook Group comments, Website forms, Phone, SMS. Structured per channel.
7. Conversation history: Full thread, channel/sender/timestamps, no deletion of messages (permanent log).
8. AI conversation control: Prominent automation toggle (enable/disable AI continuation); AI stop stage control (after contact, after interest, after agreement, never) — integrated into AI logic.
9. AI context source: Existing chatbot context (Airbnb business model). No separate stage-based template library.
10. Attention flags and notifications: Flag conversations needing human attention; push notifications; triggers: objections, negotiation, legal, complex responses.
11. Automation levels: Fully manual, semi-automated with approval, automated until stage, fully automated; stage-aware.
12. Lead creation and messaging: Auto-create profile when new lead identified; messaging does not begin until approval unless settings allow; configurable per user.
13. Real-time property evaluation panel: Evaluation context, cash flow simulation, revenue projections, risk assessment, certainty indicator; explicitly show when uncertain; scrollable, visually distinct.
14. Bulk actions: Select multiple leads; send message; update stage; mark contacted; export.
15. Automatic pipeline movement: Leads move by events (reply received, call booked, agreement confirmed, contract signed); reflects real acquisition workflow.
16. Reporting and export: Export all property data, all owner data, all chat history. No advanced dashboards required at this stage.
17. User roles: Single-user system for now.
18. Compliance features: No specific compliance defined at this stage.
19. Manual lead entry: Mandatory Email + Source URL; data feeds into database; duplicate detection and merging.
20. Additional features: None at this time.

---

## INLINED: docs/OPERATOR_ONBOARDING_EXPANDED_SCHEMA.md (summary)

All expanded fields in **operators.agency_context_ext** (JSON). Existing columns unchanged.

**30 Yes/No toggles:** 20 outreach & automation (mention_guarantee_in_messages, include_social_proof_first_2, offer_free_audit_opener, send_calendly_first_message, use_risk_reversal_phrasing, focus_outcome_over_fee, mention_eu_compliance, etc.); 10 reporting & compliance (allow_export_property_csv, allow_export_owner_csv, allow_export_chat_history, track_compliance_per_property, require_owner_consent_before_scraping, log_every_ai_message_audit, notify_when_interested, notify_when_call_booked, notify_when_contract_signed, allow_manual_override_viability_score).

**30 Dropdowns:** primary_tone, target_owner_type, property_type_focus, fee_structure, call_booking_preference, risk_reversal_style, social_proof_emphasis, objection_handling_style, urgency_scarcity_style, compliance_mention, bonus_stack_priority, message_length_preference, follow_up_frequency, objection_rebuttal_style, first_message_style, follow_up_tone, closing_style, email_vs_messenger_style, photo_mention, revenue_projection_style, legal_mention, bonus_emphasis, call_to_action_strength, primary_negotiation_style, call_booking_aggressiveness; plus reporting & workflow: export_format_preference, notification_delivery, viability_certainty_threshold, conversation_flagging_level, automation_level, etc.

**20 Text fields:** long_description, properties_managed, main_office, pain_points, results_highlight, onboarding_fee, call_phrasing, countries_special_rules, strict_rules, additional_notes_ai, etc.

---

## INLINED: docs/RECAP_OPERATOR_ONBOARDING_AND_CONTEXT.md (full)

What's in place: (1) Operator onboarding UI — route /operator-onboarding, 3-step form POST /api/operators (company, website, tagline, countries; tone, target, property type, fee, call preference; Calendly, notes). Documents and rules (up to 50). (2) Backend — GET/POST /api/operators, GET/PATCH /api/operators/:id, GET/POST /api/operators/:id/documents, DELETE documents/:docId, GET /api/operators/:id/context. (3) Database SQLite — operators, operator_documents; operators.rules JSON max 50. Init: cd operator_onboarding && python3 db.py. (4) Static context — airbnb_static_context.py (Option A + 2026 Europe), eu_str_tax_context.py, message_templates.py (6 templates). (5) Context builder — get_provider_context(operator_id). (6) LLM plug — llm_integration.get_system_prompt_for_operator(operator_id). (7) view_context.py for operator 1. (8) AUDIT_OPERATOR_ONBOARDING.md.

What's not done: DB column ideal_client vs ideal_client_profile (same behavior). No in-app LLM call (injection point only). Context API depends on Python. manage_providers CLI exists (list, add, view, delete). Streamlit dashboard exists.

---

## INLINED: operator_onboarding/AUDIT_OPERATOR_ONBOARDING.md (full)

Operator Onboarding Page: Path real-estate-scout/src/pages/OperatorOnboardingPage.tsx, route /operator-onboarding. Current state: page exists with documents and rules; multi-step create form added in audit.

Database: operator_onboarding/db.py OPERATORS_SCHEMA. Columns: id, company_name, website_url, tagline, countries, services, usps, ideal_client, preferred_property_types, min_property_value, pricing_model, tone_style, key_phrases, languages, calendly_link, call_length_minutes, qualification_rules, logo_path, notes, rules, created_at, updated_at. ideal_client vs ideal_client_profile naming only. Status fully correct.

Static general context: airbnb_static_context.py — Option A, 2026 Europe model, Grand Slam Offer, Value Equation, negotiation tactics. Fully present.

Context builder: get_provider_context(operator_id, include_eu_str_tax=True) — static + EU STR/tax + agency + documents. Fully working.

LLM plug points: Added llm_integration.py and GET /api/operators/:id/context. Integration test: view_context.py (cd operator_onboarding && python view_context.py 1).

---

## INLINED: backend/README.md (excerpts)

immo-snip-lu: Production-ready scraper for Luxembourg real estate (athome.lu, immotop.lu). Dual-site scraping, smart early-exit, title-change detection, 40+ fields, MongoDB Atlas or SQLite. Data: location, title, description, sale/rent price, surface_m2, rooms, bedrooms, bathrooms, energy class, heating, agency/agent, phone (description + "Show phone" button), image_urls, first_seen, last_updated, title_history. Option A SQLite: python simple_scheduler.py → listings.db. Option B MongoDB: export MONGO_URI, python mongo_scheduler.py. Project structure: athome_scraper.py, immotop_scraper.py, simple_scheduler.py, mongo_db.py, mongo_scheduler.py, athome_scraper_mongo.py, immotop_scraper_mongo.py, parallel_scheduler.py. Scheduler settings: MAX_PAGES_PER_INDEX, SAVE_IMAGES, HEADLESS, DELAY_SECONDS, SCAN_EVERY_MINUTES. Database schema: listing_ref, source, transaction_type, listing_url, title, location, description, sale_price, rent_price, surface_m2, rooms, bedrooms, bathrooms, phone_number, agency_name, image_urls, first_seen, last_updated, title_history, etc. Security: MONGO_URI in env, strong password, whitelist IPs, 2FA.

---

## INLINED: bot/README.md (full)

Bot (moved from COLD BOT archive). Scanning loop: finds leads, qualifies with LLM, sends outreach using operator context (config.yaml → active_provider_id → get_provider_context()). Run from repo root: python -m bot.main (config from repo root config.yaml). Note: main.py imports storage (init_db, already_contacted, log_contacted, count_contacts_since). Add storage module in bot/ (SQLite contacted table) if you need to run the bot.

---

## INLINED: docs/00-INDEX.md (full)

Instructional docs: LOVABLE_FRONTEND_SPEC.md (API contract), GET_LOVABLE_UI_ON_1950.md, REAL_ESTATE_SCOUT_LOCAL.md, REAL_ESTATE_SCOUT_REDESIGN_PLAN.md, UPGRADE_PLAN_REAL_ESTATE_SCOUT.md, IMMO_SNIP_VS_COLD_BOT.md, BOT_STATUS.md, TEST_LOCALHOST.md, REAL_ESTATE_OUTREACH_BOT.md, BUSINESS_DOCUMENTATION_LIST.md, WORK_LOG.md, silos_status.md. Root README.md describes repo layout.

---

## INLINED: docs/CRM_INTERFACE_DESIGN.md (excerpts)

Plugs: Inbound — Leads feed, Contact events, Listings context, Operator context. Outbound — Clients API, Communications API, Pipeline state, Automation rules. Optional: external CRM sync (webhook/export).

Databases: Single pipeline store (SQLite or Mongo) — leads (read new leads, write status), clients (CRM source of truth), communications (CRM + bot append), activity_logs (read), agents (read). CRM reads from Listings and Operators; does not write. Bot contacted store: same pipeline DB or sync job into clients/communications.

Flows: Lead → Client (first contact); Scraper produces leads → Bot/manual first contact → "Lead X contacted" → Create or link client, append communication. Pipeline state and automation rules drive bot (who to contact/exclude).

---

## INLINED: docs/IMMO_SNIPPY_MASTER_REFERENCE.md (sections 7–17)

### 7. Bot (Scanning Loop & Provider Context)
- **Location:** `bot/` (main.py, llm.py, browser.py, sender.py). Config: repo root `config.yaml`.
- **Flow:** Load `config.yaml` → read `active_provider_id` → for each qualified lead call `generate_proposal(text, model=..., provider_id=active_provider_id)`. `bot/llm.py` imports `get_provider_context` from `operator_onboarding.context_builder` and injects it into the Ollama system prompt.
- **Run:** From repo root: `python -m bot.main`. Config path: `config.yaml` at repo root.
- **Note:** `main.py` imports `storage` (init_db, already_contacted, log_contacted, count_contacts_since). Add a `storage` module in `bot/` (e.g. SQLite for contacted leads) if you want to run the loop.

### 8. Config (config.yaml)
- **Path:** Repo root `config.yaml`. **Key for context:** `active_provider_id: 1`.
- **Other:** start_urls, criteria, ollama model, email (from, app_password, oauth2_file), limits (max_contacts_per_hour, scroll_depth, delays, cycle_cooldown_seconds), selectors.listing, database (path for leads/contacted DB), proxies, facebook (login_url, storage_state, allow_manual_login).

### 9. Server & Run Commands
| What | Command (from repo root unless stated) |
|------|----------------------------------------|
| Operator Onboarding API | `uvicorn operator_onboarding.api_server:app --reload --port 8000` |
| Frontend | `cd frontend && npm install && npm run dev` (e.g. port 8080). Set `VITE_API_BASE=http://localhost:8000`. |
| Listings scrapers (MongoDB) | `cd backend && export MONGO_URI="..." && python mongo_scheduler.py` |
| Listings scrapers (SQLite) | `cd backend && python simple_scheduler.py` or mongo_scheduler with SQLite adapter. |
| Bot | `python -m bot.main` (after adding `bot/storage.py` if needed) |
| Operator DB init | `cd operator_onboarding && python3 db.py` |
| View context for operator 1 | `cd operator_onboarding && python3 view_context.py 1` |
| Streamlit dashboard | `streamlit run operator_onboarding/dashboard.py` |
| Test Operator API | `curl -s http://localhost:8000/api/operators` |

### 10. API Endpoints (Operator Onboarding)
All served by `operator_onboarding/api_server.py` (FastAPI). GET /health; GET/POST /api/operators; GET/PATCH /api/operators/:id; GET/POST /api/operators/:id/documents; DELETE /api/operators/:id/documents/:docId; GET /api/operators/:id/context.

### 11. File Reference (All Paths)
Context builder: operator_onboarding/context_builder.py. Static: operator_onboarding/airbnb_static_context.py. EU STR/tax: operator_onboarding/eu_str_tax_context.py. Templates: operator_onboarding/message_templates.py. LLM helper: operator_onboarding/llm_integration.py. API: operator_onboarding/api_server.py. DB: operator_onboarding/db.py. Operators/Documents CRUD: operators.py, documents.py. Bot: config.yaml, bot/main.py, bot/llm.py, bot/browser.py, bot/sender.py. Test: view_context.py, test_context_injection.py. Dashboard: dashboard.py. CLI: manage_providers.py. Listings: backend/ (mongo_db.py, mongo_scheduler.py, athome_scraper*.py, immotop_scraper*.py). Frontend: frontend/ (real-estate-scout).

### 12. Migration from COLD BOT
Moved into IMMO SNIPPY: operator_onboarding, frontend, config.yaml, docs, bot (archive → bot/), backend replaced by immo-snip-lu. Removed: Node/Express backend. Operator Onboarding is FastAPI; no Node server. Backend base: immo-snip-lu (Python). Safe to delete COLD BOT folder after verification.

### 13. AWS & Cloud (Master Reference)
MongoDB Atlas supported; set MONGO_URI, MONGO_DB_NAME. No AWS bots implementation. Operator onboarding: 100% local SQLite.

### 14. Quick Checks
Operator DB init: cd operator_onboarding && python3 db.py. View context: python3 view_context.py 1. Start API: uvicorn operator_onboarding.api_server:app --reload --port 8000. Test: curl -s http://localhost:8000/api/operators. Create operator: frontend → /operator-onboarding → 3 steps → Save. Context API: curl http://localhost:8000/api/operators/1/context.

### 15–17. Outreach Bot, immo-snip vs COLD BOT, Other Docs
See sections 2 and 3 of this summary; IMMO_SNIP_VS_COLD_BOT inlined above; Other docs: LOVABLE_FRONTEND_SPEC, REAL_ESTATE_SCOUT_*, REAL_ESTATE_OUTREACH_BOT, IMMO_SNIP_VS_COLD_BOT, BOT_STATUS, CONTEXTS_AND_BOTS, RECAP_OPERATOR_ONBOARDING_AND_CONTEXT.

---

## INLINED: OPERATOR_ONBOARDING_EXPANDED_SCHEMA — Storage shape

**Table:** `operators`. **Column:** `agency_context_ext` TEXT (JSON).

**Example JSON (subset):**
```json
{
  "mention_guarantee_in_messages": true,
  "include_social_proof_first_2": false,
  "use_scarcity_phrasing": true,
  "always_end_with_next_step": true,
  "primary_tone": "professional_trustworthy",
  "target_owner_type": "busy_professionals_expat",
  "first_message_style": "value_bomb_first",
  "follow_up_tone": "persistent_polite",
  "closing_style": "direct_ask_call",
  "call_to_action_strength": "medium",
  "long_company_description": "We are a full-service...",
  "properties_managed_count": "120",
  "main_hub_city": "Luxembourg City",
  "ideal_owner_pain_points": "No time, fear of regulations...",
  "results_to_highlight": "2.3× income in first year",
  "call_booking_phrasing": "Let's book a 15-min call to see if we're a fit.",
  "countries_cities_different": "Germany: more formal tone.",
  "strict_rules": "Never promise exact revenue numbers.",
  "ideal_close_rate": "40%",
  "target_monthly_new_properties": "5",
  "avg_time_to_signed_contract": "2–3 weeks",
  "biggest_competitive_advantage": "Local 24/7 team",
  "biggest_weakness_avoid": "Don't mention our small team size",
  "success_stories_case_studies": "Luxembourg City 2.3× case study",
  "allow_export_property_csv": true,
  "allow_export_owner_csv": true,
  "log_every_ai_message_audit": true,
  "notify_when_call_booked": true,
  "export_format_preference": "excel",
  "notification_delivery": "email_toast",
  "automation_level": "semi_auto",
  "data_retention_policy": "keep_forever"
}
```
Form and API merge these keys into `agency_context_ext` on create/update (PATCH `/api/operators/:id` with body including `agency_context_ext`). Context builder reads `agency_context_ext` and injects toggle/dropdown/text values into the LLM system prompt.

**Dropdowns (reporting & workflow):** export_format_preference (csv, excel, json, pdf_report), notification_delivery (toast_only, email_toast, whatsapp_toast, all_channels), viability_certainty_threshold (high_8, medium_6, low_4, not_certain), conversation_flagging_level (legal_compliance_only, price_negotiations, objections, all_replies), automation_level (fully_auto, semi_auto, manual_review_before_send, manual_only), pipeline_movement_trigger (auto_on_reply, auto_on_positive_reply, manual_only, ai_suggest_user_confirm), bulk_action_default, report_frequency, data_retention_policy, backup_preference.

---

*End of IMMO SNIPPY Tool Summary for Grok. Use as primary context for what this tool does, business model, MongoDB, AWS/cloud, and how it works. Part II contains inlined copies of relevant docs for maximum context.*
