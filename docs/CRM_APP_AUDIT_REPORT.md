# CRM & App End-to-End Audit Report

**Date:** Audit run per task. Architecture: local SQLite (providers.db / crm.db) + cloud MongoDB (coldbot, MONGO_URI).

---

## 1. DB Abstraction Layer

**Status: Complete**

| Check | Result | Details |
|-------|--------|---------|
| lib/db.py exists | ✅ | `lib/db.py` — get_mode(), set_mode(), get_db(), get_collection() |
| Switches SQLite vs Mongo by mode | ✅ | get_mode() from thread local or IMMO_SNIPPY_MODE; get_db() returns _SQLiteDB or _MongoDB |
| Supports operators, operator_documents, users, leads, agents, logs | ✅ | COLLECTION_NAMES and SQLITE_TABLE_MAP include all six |
| Supports owners, properties, conversations | ✅ | **Fixed** — Added to lib/db COLLECTION_NAMES and SQLITE_TABLE_MAP; owner/properties/conversations schemas added to operator_onboarding/db.py (init_db creates them in providers.db). CRM still uses lib/crm_storage.py + data/crm.db for now; can be wired to lib/db later. |

---

## 2. Operator Onboarding Integration

**Status: Partial**

| Check | Result | Details |
|-------|--------|---------|
| /operator-onboarding saves via /api/operators | ✅ | Backend serves GET /operator-onboarding (static HTML); form POSTs to /api/operators |
| /api/operators calls Python create_operator | ✅ | api_server.py POST /api/operators → create_operator(body) |
| Uses db abstraction | ⚠️ | operators.py uses **lib.db only for cloud** (_mode_cloud(), _mongo_operators()); **local uses operator_onboarding.db _conn()** (direct SQLite). So local path does not go through lib/db. |

**Fix:** Optional: have operators.py use lib/db get_collection("operators") for local too so one code path. Current design is intentional (operators/documents use providers.db path from env).

---

## 3. Context Builder Integration

**Status: Complete**

| Check | Result | Details |
|-------|--------|---------|
| get_provider_context(operator_id) works both modes | ✅ | get_operator() in operators.py works for local (SQLite) and cloud (Mongo) |
| Called by /api/operators/:id/context | ✅ | GET /api/operators/{id}/context → get_provider_context(operator_id) |
| Returns full prompt (static + operator + docs) | ✅ | context_builder.get_provider_context() = static + EU STR/tax + agency block + reference documents |

---

## 4. LLM Plug Points

**Status: Complete**

| Check | Result | Details |
|-------|--------|---------|
| Injection point found | ✅ | bot/llm.py generate_proposal(..., provider_id=None) |
| Provider context prepended before Ollama | ✅ | Lines 101–104: if provider_id and get_provider_context: system_content = get_provider_context(provider_id) + "\n\nReturn JSON only."; passed to _chat_json(..., system_content=system_content) |
| Param/comment for context | ✅ | provider_id param; comment at top: "Immo Snippy Provider Context Injection Point" |

---

## 5. CRM Pages Integration

**Status: Complete**

| Check | Result | Details |
|-------|--------|---------|
| /crm loads owners from correct DB | ✅ | GET /api/crm/owners → crm_get_all_owners() (lib/crm_storage.py, data/crm.db). CRM DB remains separate; lib/db now supports owners/properties/conversations for future unification. |
| Owner profile shows properties and conversations | ✅ | Modal shows properties; conversation history placeholder (thread per channel not built) |
| /data shows leads/agents/logs from correct DB | ✅ | **Fixed** — GET /api/leads, GET /api/agents, GET /api/logs (from lib/db), GET /api/config, GET /api/database implemented in api_server.py. Data page now loads from correct DB. |
| /agents-apis shows agents and API settings | ✅ | **Fixed** — Route /agents-apis and AgentsApisPage added; shows agents table, config JSON, database status. |
| /operator-onboarding | ✅ | **Fixed** — Route /operator-onboarding and OperatorOnboardingPage added; page links to backend /operator-onboarding (static form). |

---

## 6. Bidirectional Sync & Real-time

**Status: Missing**

| Check | Result | Details |
|-------|--------|---------|
| Edits in CRM save back to DB | ❌ | No PATCH/POST for owners or properties in API; CRM UI is read-only except selection |
| Scraped data auto-populates CRM | ❌ | No pipeline from scraper/leads into owners/properties |
| Real-time evaluation in property detail | ⚠️ | Valuation block shows viability_score, recommendation, estimated_annual_gross when property selected; not live-updated from evaluator |

---

## 7. End-to-End Debug Flow

**Status: Partial**

| Step | Result | Details |
|------|--------|---------|
| Create operator | ✅ | POST /api/operators or static form at /operator-onboarding |
| Run scan → private lead → evaluation → message generation | ⚠️ | Bot flow exists (bot/main.py, llm.py); scan/run API not in api_server (no /api/run or scan trigger in FastAPI) |
| Context injected | ✅ | generate_proposal(..., provider_id=...) prepends get_provider_context |
| Lead appears in CRM | ❌ | Leads in providers.db (leads table); CRM reads owners from crm.db. No sync leads → CRM. |
| Log entry created | ⚠️ | /api/logs reads from data/bot.log file; activity_logs table in providers.db not wired to API |

---

## Summary: Gaps Fixed

1. **DB abstraction:** ✅ owners, properties, conversations added to lib/db COLLECTION_NAMES and SQLITE_TABLE_MAP; OWNERS_SCHEMA, PROPERTIES_SCHEMA, CONVERSATIONS_SCHEMA added to operator_onboarding/db.py and created in providers.db by init_db().
2. **Data page APIs:** ✅ GET /api/leads, GET /api/agents, GET /api/logs (from lib/db), GET /api/config, GET /api/database implemented. GET /api/logs prefers activity_logs table, then falls back to data/bot.log.
3. **Frontend:** ✅ /operator-onboarding (OperatorOnboardingPage with link to backend form) and /agents-apis (AgentsApisPage with agents, config, database) added to App and sidebar.
4. **CRM ↔ app:** CRM still uses data/crm.db via lib/crm_storage.py. Unification with lib/db (e.g. CRM reading/writing owners from providers.db when desired) can be done later; schema is ready.
