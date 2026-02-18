# Immo Snippy — Master Reference (IMMO SNIPPY)

**Single source of truth for business model, server layout, context, operator onboarding, and run instructions.**  
Use this document after deleting the old COLD BOT folder. Everything you need is here or in the paths listed.

---

## Table of contents

1. [What Immo Snippy Is](#1-what-immo-snippy-is)
2. [Architecture (IMMO SNIPPY Only)](#2-architecture-immo-snippy-only)
3. [Databases: MongoDB vs SQLite](#3-databases-mongodb-vs-sqlite)
4. [Operator Onboarding (Business + Technical)](#4-operator-onboarding-business--technical)
5. [Context System (What the LLM Sees)](#5-context-system-what-the-llm-sees)
6. [Phrasing Guide & Message Templates](#6-phrasing-guide--message-templates)
7. [Bot (Scanning Loop & Provider Context)](#7-bot-scanning-loop--provider-context)
8. [Config (config.yaml)](#8-config-configyaml)
9. [Server & Run Commands](#9-server--run-commands)
10. [API Endpoints (Operator Onboarding)](#10-api-endpoints-operator-onboarding)
11. [File Reference (All Paths in This Repo)](#11-file-reference-all-paths-in-this-repo)
12. [Migration from COLD BOT (What Was Moved / Removed)](#12-migration-from-cold-bot-what-was-moved--removed)
13. [AWS & Cloud](#13-aws--cloud)
14. [Quick Checks](#14-quick-checks)

---

## 1. What Immo Snippy Is

- **Product:** Real-estate lead generation and outreach for agencies (e.g. short-term rental / Airbnb management). Find leads (listings, FSBO, marketplace), qualify them with an LLM, generate on-brand outreach using **operator (agency) context**, and move owners toward a discovery call.
- **Business model:** Agencies are “operators” onboarded via the Operator Onboarding flow. Each operator has company name, tagline, tone, Calendly, **rules** (up to 50 sentence-form guidelines), and reference documents. The LLM uses this context so messages sound like the agency, not a generic bot.
- **Local-first:** Operator data is in SQLite (`operator_onboarding/providers.db`). Listings can be MongoDB Atlas (cloud) or SQLite (local). No dependency on the old COLD BOT codebase.

---

## 2. Architecture (IMMO SNIPPY Only)

| Layer | Location | Role |
|-------|----------|------|
| **Frontend** | `frontend/` (Vite/React, real-estate-scout) | UI: Operator Onboarding (`/operator-onboarding`), pipeline pages, data views. Talks to Operator Onboarding API and (if you add one) any listings/run API. |
| **Operator Onboarding API** | `operator_onboarding/api_server.py` (FastAPI) | HTTP bridge for the UI: GET/POST/PATCH operators, documents, GET context. Calls existing Python modules only. |
| **Operator Onboarding logic** | `operator_onboarding/` (Python) | SQLite CRUD, context builder, static context, EU STR/tax, message templates. No HTTP here; used by api_server and by the bot. |
| **Listings backend** | `backend/` (immo-snip-lu Python) | Scrapers for athome.lu + immotop.lu. Writes to MongoDB (if `MONGO_URI` set) or SQLite. Schedulers: `mongo_scheduler.py`, `parallel_scheduler.py`. |
| **Bot** | `bot/` (Python) | Scanning loop (e.g. Facebook marketplace): load config, qualify leads, generate proposal with **provider context** via `get_provider_context(active_provider_id)`, send email. Uses `config.yaml` at repo root. |
| **Config** | `config.yaml` (repo root) | Bot and operator context: `active_provider_id`, ollama model, email, limits, start_urls, criteria, etc. |

There is **no Node/Express backend** in this repo. The old COLD BOT Node server was removed; the backend base for listings is **immo-snip-lu** (Python). Operator Onboarding is served by **FastAPI** (`api_server.py`).

---

## 3. Databases: MongoDB vs SQLite

| Data | Where | Technology |
|------|--------|------------|
| **Operators + documents** | `operator_onboarding/providers.db` | SQLite only. Path: set `OPERATORS_DB_PATH` or `PROVIDERS_DB` or use default next to `db.py`. |
| **Listings** | Optional MongoDB Atlas or local SQLite | Backend (immo-snip-lu): `MONGO_URI` → MongoDB; else SQLite `listings.db`. |
| **Bot “contacted” leads** | `leads.db` (path from `config.yaml` → `database`) | SQLite. Requires a `storage` module (e.g. in `bot/`) that implements `init_db`, `already_contacted`, `log_contacted`, `count_contacts_since`; not present in the archived bot copy. |

Operator onboarding is **100% local SQLite**. Listings pipeline supports **MongoDB base** when `MONGO_URI` is set.

---

### 3.1 MongoDB Atlas — Overview

When `MONGO_URI` is set in the environment, the **listings backend** (`backend/`, immo-snip-lu) and any future services that read/write listings, leads, or config use MongoDB Atlas instead of local SQLite. This section describes connection details and how each part feeds into the codebase.

---

#### Connection identity (cluster + user)

- **Username:** `karlo`
- **Cluster host:** `cluster0.unaaqbqbds.mongodb.net`

**Feeds into:** Any Python code that builds the connection string (e.g. `backend/` scripts, schedulers). Used only to form `MONGO_URI`; the password is supplied via environment, never stored in this doc or in code.

---

#### Connection string and environment

- Use the **SRV format**. Password must **never** be hardcoded or committed.
- **Env file (e.g. `backend/.env`):**  
  `MONGO_URI="mongodb+srv://karlo:<PASSWORD>@cluster0.unaaqbqbds.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"`  
  Replace `<PASSWORD>` with the real password; do not commit `.env`.
- **Env vars:**  
  - `MONGO_URI` — when set, code uses MongoDB; when unset, code falls back to local SQLite.  
  - `MONGO_DB_NAME` (optional) — default is `coldbot`.

**Feeds into:** Backend entrypoints and any module that calls `os.getenv("MONGO_URI")` to get a Mongo client (e.g. `backend/` DB helpers, schedulers). If `MONGO_URI` is missing, those same code paths use SQLite instead.

---

#### Database and collections

- **Database:** `coldbot` (or the value of `MONGO_DB_NAME`).
- **Collections (when using Mongo):** `config`, `leads`, `agents`, `logs`, `listings`, `operators` (if added).

**Feeds into:**

| Collection   | Used by / purpose |
|-------------|--------------------|
| `config`    | Backend and bot: runtime config (sources, limits, keys). |
| `leads`     | Bot and backend: contacted leads, status, follow-ups. |
| `agents`    | Backend: exported agent/contact lists (e.g. agents.txt / agents.xlsx source). |
| `logs`      | Backend and bot: action logs, errors, scan results. |
| `listings`  | Backend scrapers: raw and processed listings (athome.lu, immotop.lu, etc.). |
| `operators` | Optional: if operator data is mirrored to Mongo (else stays in SQLite only). |

---

#### Code rules when using MongoDB

- Prefer MongoDB when `MONGO_URI` is present; otherwise use SQLite.
- Use `pymongo` (sync) or `motor` (async).
- On startup or first use: test with `client.admin.command('ping')` and log connection success or failure.

**Feeds into:** All backend and bot code that opens a Mongo connection. Ensures one consistent pattern: env-based URI, ping on connect, and clear logging so deployment and debugging stay simple.

---

## 4. Operator Onboarding (Business + Technical)

### 4.1 What it is

- **Operators** = agencies. Each has: company name, website, tagline, countries, tone, target owner type, property types, fee structure, Calendly, notes, and up to **50 sentence-form rules**.
- **Documents** = draft contract, summary agreement, payout examples, other. Stored per operator and injected into the LLM context (truncated to avoid overflow).
- **Flow:** Onboard in UI or via CLI → data in SQLite → `get_provider_context(operator_id)` builds one system prompt string for the LLM.

### 4.2 UI (Frontend)

- **Route:** `/operator-onboarding` → `OperatorOnboardingPage.tsx`.
- **Create operator:** 3-step form (company + basics → tone + target + fee → Calendly + notes) → **POST /api/operators**.
- **Documents:** Select operator → add document (type + content) → **POST /api/operators/:id/documents** → list/delete.
- **Rules:** Select operator → add/edit/delete up to 50 rules → **PATCH /api/operators/:id** with `rules` array.

### 4.3 API (FastAPI)

- **File:** `operator_onboarding/api_server.py`.
- **Endpoints:** See [§10 API Endpoints](#10-api-endpoints-operator-onboarding).
- **Run:** From repo root: `uvicorn operator_onboarding.api_server:app --reload --port 8000`.
- **CORS:** Enabled so the frontend on another port can call it. Point the frontend at `http://localhost:8000` (e.g. `VITE_API_BASE=http://localhost:8000`) or proxy `/api` to 8000.

### 4.4 Database (SQLite)

- **Tables:** `operators`, `operator_documents`. Column `operators.rules` = JSON array (max 50 items).
- **Init:** `cd operator_onboarding && python3 db.py` (creates `providers.db` if missing).
- **Env:** `OPERATORS_DB_PATH` or `PROVIDERS_DB` overrides default DB path.

### 4.5 CLI & Streamlit

- **manage_providers.py:** `list`, `add`, `view <id>`, `delete <id>`. From `operator_onboarding/`: `python manage_providers.py list`, etc.
- **view_context.py:** Print full context for an operator: `cd operator_onboarding && python3 view_context.py 1`.
- **dashboard.py:** Streamlit UI to list operators, preview context, test message generation: `streamlit run operator_onboarding/dashboard.py`.

---

## 5. Context System (What the LLM Sees)

The system prompt for message generation is built in this order:

| Layer | Source | Purpose |
|-------|--------|--------|
| **1. Base static** | `operator_onboarding/airbnb_static_context.py` | Option A: role, 2026 Europe relationship model, Grand Slam Offer, value equation, negotiation tactics, pipeline goal, Europe rules. |
| **2. EU STR & tax** | `operator_onboarding/eu_str_tax_context.py` | Disclaimer, EU regulation, DAC7, country-level deductions; legal phrasing and compliance. |
| **3. Agency (operator)** | `context_builder.build_operator_context(operator)` | Company name, tagline, countries, tone, target owner type, Calendly, qualification rules, **rules** (up to 50). |
| **4. Reference documents** | `operator_documents` table | Draft contract, summary agreement, payout examples, etc.; truncated per doc and in total. |

**Single entry point:** `get_provider_context(operator_id)` in `operator_onboarding/context_builder.py`. Used by the bot (`bot/llm.py` → `generate_proposal(..., provider_id=...)`) and by the FastAPI endpoint `GET /api/operators/:id/context`.

---

## 6. Phrasing Guide & Message Templates

### 6.1 Principles (from static context)

- **Enlarge the pie** — Emphasise total income growth, not fee %.
- **Build rapport first** — Acknowledge pain (low rent, bad tenants), then offer the solution.
- **Social proof** — Concrete numbers and locale.
- **Risk reversal** — Guarantee-style phrasing where appropriate.
- **Outcome focus** — “You do nothing. We handle everything. You just collect more money.”
- **Pipeline goal** — Discovery → reply → value bomb + trust → **booked discovery call**. Do not close the contract in chat.

### 6.2 Tone and voice

- Professional and friendly (default); per-operator tone (e.g. warm and consultative).
- Stay in character as the **agency**; never mention AI or bot.
- Use the operator’s **key phrases** and **rules** from onboarding.

### 6.3 Message templates

- **File:** `operator_onboarding/message_templates.py`. Use `get_template(name)` and `fill_template(name, **placeholders)`.
- **Steps:** cold_opener → after_reply → value_bomb_risk_reversal / objection_handler → call_booking → call_booked_confirmation.
- **Placeholders (examples):** owner_name, property_type, city_area, area, calendly_link, call_minutes, your_name, company_name, tagline, x.

### 6.4 Do's and don'ts

- **Do:** Mirror pain, use local examples, offer free audit, mention compliance when relevant, ask for the call with the provider’s Calendly.
- **Don’t:** Fight over fee %, close the contract in chat, break character, or ignore operator rules.

---

## 7. Bot (Scanning Loop & Provider Context)

- **Location:** `bot/` (main.py, llm.py, browser.py, sender.py). Config: repo root `config.yaml`.
- **Flow:** Load `config.yaml` → read `active_provider_id` → for each qualified lead call `generate_proposal(text, model=..., provider_id=active_provider_id)`. `bot/llm.py` imports `get_provider_context` from `operator_onboarding.context_builder` and injects it into the Ollama system prompt.
- **Run:** From repo root: `python -m bot.main`. Config path: `config.yaml` at repo root.
- **Note:** `main.py` imports `storage` (init_db, already_contacted, log_contacted, count_contacts_since). A `storage` module was not part of the moved archive; add one in `bot/` (e.g. SQLite for contacted leads) if you want to run the loop.

---

## 8. Config (config.yaml)

- **Path:** Repo root `config.yaml`.
- **Key for context:** `active_provider_id: 1` — operator id passed into `get_provider_context` / `generate_proposal`.
- **Other:** start_urls, criteria, ollama model, email (from, app_password, oauth2_file), limits (max_contacts_per_hour, scroll_depth, delays, cycle_cooldown_seconds), selectors.listing, database (path for leads/contacted DB), proxies, facebook (login_url, storage_state, allow_manual_login).

---

## 9. Server & Run Commands

| What | Command (from repo root unless stated) |
|------|----------------------------------------|
| **Operator Onboarding API** | `uvicorn operator_onboarding.api_server:app --reload --port 8000` |
| **Frontend** | `cd frontend && npm install && npm run dev` (e.g. port 8080). Set `VITE_API_BASE=http://localhost:8000` so UI calls the FastAPI server. |
| **Listings scrapers (MongoDB)** | `cd backend && export MONGO_URI="mongodb+srv://..." && python mongo_scheduler.py` |
| **Listings scrapers (SQLite)** | `cd backend && python simple_scheduler.py` (if that file exists) or use mongo_scheduler with SQLite adapter. See `backend/README.md`. |
| **Bot** | `python -m bot.main` (after adding `bot/storage.py` if needed) |
| **Operator DB init** | `cd operator_onboarding && python3 db.py` |
| **View context for operator 1** | `cd operator_onboarding && python3 view_context.py 1` |
| **Streamlit dashboard** | `streamlit run operator_onboarding/dashboard.py` |
| **Test Operator API** | `curl -s http://localhost:8000/api/operators` |

---

## 10. API Endpoints (Operator Onboarding)

All served by `operator_onboarding/api_server.py` (FastAPI) when run on port 8000.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check; returns `{"status":"ok"}`. |
| GET | `/api/operators` | List all operators. |
| POST | `/api/operators` | Create operator; body: company_name, website_url, tagline, countries, tone_style, ideal_client_profile, preferred_property_types, pricing_model, qualification_rules, calendly_link, notes, etc. Returns `{ "id": <id>, "ok": true }`. |
| GET | `/api/operators/:id` | Get one operator. |
| PATCH | `/api/operators/:id` | Update operator (including `rules` array). |
| GET | `/api/operators/:id/documents` | List documents for operator. |
| POST | `/api/operators/:id/documents` | Add document; body: name, document_type, content. Returns `{ "id": <id>, "ok": true }`. |
| DELETE | `/api/operators/:id/documents/:docId` | Delete document (must belong to operator). |
| GET | `/api/operators/:id/context` | Full system prompt for operator (plain text). |

---

## 11. File Reference (All Paths in This Repo)

| Role | Path |
|------|------|
| Context builder | `operator_onboarding/context_builder.py` — `get_provider_context(operator_id)` |
| Static base + tactics | `operator_onboarding/airbnb_static_context.py` |
| EU STR/tax | `operator_onboarding/eu_str_tax_context.py` |
| Templates | `operator_onboarding/message_templates.py` |
| LLM injection helper | `operator_onboarding/llm_integration.py` — `get_system_prompt_for_operator(operator_id)` |
| Operator Onboarding API | `operator_onboarding/api_server.py` |
| Operator DB & schema | `operator_onboarding/db.py` |
| Operators CRUD | `operator_onboarding/operators.py` |
| Documents CRUD | `operator_onboarding/documents.py` |
| Bot config | `config.yaml` (repo root) |
| Bot loop | `bot/main.py` |
| Bot message generation + context | `bot/llm.py` |
| Bot browser/sender | `bot/browser.py`, `bot/sender.py` |
| Test context CLI | `operator_onboarding/view_context.py` |
| Test context injection | `operator_onboarding/test_context_injection.py` |
| Streamlit dashboard | `operator_onboarding/dashboard.py` |
| Manage operators CLI | `operator_onboarding/manage_providers.py` |
| Listings backend | `backend/` — mongo_db.py, mongo_scheduler.py, athome_scraper*.py, immotop_scraper*.py |
| Frontend | `frontend/` — real-estate-scout (Vite/React) |

---

## 12. Migration from COLD BOT (What Was Moved / Removed)

- **Moved into IMMO SNIPPY:** operator_onboarding (all Python), frontend (real-estate-scout), config.yaml, docs (CONTEXTS_AND_BOTS, RECAP, etc.), bot (archive/old_root_stack → bot/), and backend replaced by **immo-snip-lu** (Python scrapers from Downloads immo-snip-lu-main).
- **Removed and not replaced here:** The **Node/Express backend** (server.js, db/mongo.js, /api/operators, /api/config, /api/leads, etc.). Operator Onboarding is now served by **FastAPI** in this repo; there is no Node server.
- **Backend base:** Listings and scheduler logic is **immo-snip-lu** (Python), not the old COLD BOT Node backend. Operator Onboarding is **100% Python** (SQLite + FastAPI).
- **Safe to delete:** The entire COLD BOT folder once you have confirmed IMMO SNIPPY runs as you need. This master reference and the repo contents are the single source of truth.

---

## 13. AWS & Cloud

- **MongoDB:** Listings backend supports **MongoDB Atlas** (cloud). Set `MONGO_URI` (and optionally `MONGO_DB_NAME`). Atlas can be hosted on AWS (or other providers); that is infrastructure choice, not application logic.
- **AWS bots:** There is **no** implementation of “AWS bots” (Lambda, ECS, S3 for bot logic, etc.) in this repo. The only AWS-related mentions are (1) MongoDB Atlas provider choice (e.g. “AWS” as region) and (2) pymongo’s optional MONGODB-AWS auth in the environment.
- **Operator onboarding:** 100% local SQLite; no cloud or AWS required.

---

## 14. Quick Checks

| Check | Command / action |
|-------|-------------------|
| Operator DB init | `cd operator_onboarding && python3 db.py` |
| View context for operator 1 | `cd operator_onboarding && python3 view_context.py 1` |
| Start Operator Onboarding API | `uvicorn operator_onboarding.api_server:app --reload --port 8000` |
| Test API | `curl -s http://localhost:8000/api/operators` |
| Create operator in UI | Open frontend → `/operator-onboarding` → complete 3 steps → Save |
| Fetch context via API | `curl http://localhost:8000/api/operators/1/context` |

---

## 15. Outreach Bot Purpose & Principles (Business)

- **Purpose:** Continuously browse public real estate listings, identify FSBO/owner listings that match criteria, extract contact details (email/phone), generate personalized outreach using a local LLM, send emails/messages with anti-spam and compliance safeguards.
- **Core objectives (ranked):** (1) Find motivated private sellers automatically; (2) Extract contact information with minimal human intervention; (3) Generate and send polite, personalized outreach; (4) Run mostly hands-free (“set and forget”); (5) Stay local and private (Ollama); (6) Minimize bans/reports (stealth, delays, rate limits).
- **Operating principles:** Low volume, human-like cadence; respect site ToS and public data; avoid duplicate contact; prioritize safety, compliance, explainability.
- **Stack (2026):** Browser automation (Playwright), stealth/anti-detection, local LLM (Ollama), storage (SQLite for dedupe/history), email (SMTP / yagmail).

---

## 16. immo-snip-lu vs Former COLD BOT (Saved Comparison)

| | **immo-snip-lu (backend in IMMO SNIPPY)** | **Former COLD BOT** |
|---|------------------------------------------|----------------------|
| **Goal** | Luxembourg listing discovery & storage (athome.lu + immotop.lu) | End-to-end lead pipeline: scrape → qualify → contact (email/WhatsApp) |
| **Output** | Listings in MongoDB or SQLite (40+ fields) | Scraped listings → LLM → leads DB → outreach |
| **Sites** | athome.lu, immotop.lu | athome, immotop, nextimmo, Facebook Marketplace, etc. |
| **Browser** | Selenium + Chrome | Playwright |
| **DB** | SQLite or MongoDB Atlas | SQLite (leads, scraped_listings) |
| **Config** | Env (MONGO_URI) + constants in schedulers | YAML config.yaml |

In IMMO SNIPPY, the **listings backend** is immo-snip-lu only. The **bot** in `bot/` is the scanning/outreach loop (config-driven, provider context); it is separate from the immo-snip-lu scrapers. There is no Java UI, no Node backend, no cold_bot silos in this repo.

---

## 17. Other Docs in This Repo (Index)

| File | Purpose |
|------|--------|
| **LOVABLE_FRONTEND_SPEC.md** | API contract for frontend (endpoints, shapes). Some endpoints referred to the removed Node backend; Operator Onboarding is now FastAPI. |
| **REAL_ESTATE_SCOUT_LOCAL.md** | Run real-estate-scout locally. |
| **REAL_ESTATE_SCOUT_REDESIGN_PLAN.md** | UI redesign and structure plan. |
| **REAL_ESTATE_OUTREACH_BOT.md** | Outreach bot proposal and principles (local reference). |
| **IMMO_SNIP_VS_COLD_BOT.md** | Detailed comparison immo-snip vs COLD BOT (useful for context; COLD BOT code is gone). |
| **BOT_STATUS.md** | Described Cold Bot’s *then* current behavior (Java UI, cold_bot/). Obsolete for IMMO SNIPPY; kept for history. |
| **CONTEXTS_AND_BOTS.md** | Context layers, phrasing, process (duplicated into this master). |
| **RECAP_OPERATOR_ONBOARDING_AND_CONTEXT.md** | Operator onboarding recap (duplicated into this master). |
| **cold_bot/** (subfolder under docs) | Old Cold Bot planning docs (THE DEVELOPMENT PLAN, SILO_ANALYSIS, etc.). Can be archived or removed with COLD BOT. |

---

*End of Immo Snippy Master Reference. Keep this file in IMMO SNIPPY; you can delete the old COLD BOT folder after verifying everything runs from this repo.*
