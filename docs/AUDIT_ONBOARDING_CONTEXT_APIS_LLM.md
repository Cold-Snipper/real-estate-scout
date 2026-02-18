# Immo Snippy — Audit: Onboarding + Context + APIs + LLM Plugs

**Date:** 2026-02-18  
**Scope:** DB mode, connection test, operator APIs, context builder, LLM injection, full flow.

---

## Output Summary

| Item | Result |
|------|--------|
| **Mode** | Local (SQLite) |
| **Connection Test** | PASS (SQLite) |
| **API Endpoints** | All listed; /api/operators* called → 200 |
| **Operator Load** | success |
| **Context Builder** | First 500 chars captured |
| **LLM Plug Point** | Found (wired) |
| **Full Flow Simulation** | pass (context built and would be injected) |

---

## 1. Mode: Local (SQLite) / Cloud (MongoDB)

- **Active:** **Local (SQLite)**
- **Details:** `lib/db.get_mode()` returns `"local"` (env `IMMO_SNIPPY_MODE` not set, so default).
- **Operator API data source:** SQLite at `operator_onboarding/providers.db` via `operator_onboarding/db.py`.  
  **Note:** Operator CRUD (operators, documents, auth) does **not** use `lib/db`; it always uses this SQLite file. So operator APIs are currently local-only regardless of `IMMO_SNIPPY_MODE`. Cloud mode (MongoDB) in `lib/db` is for other collections (e.g. leads, agents, logs) when wired.

---

## 2. Connection Test

- **Result:** **PASS**
- **Details:**
  - **Local:** SQLite file opened at `operator_onboarding/providers.db`.
  - **Tables:** `activity_logs`, `agents`, `leads`, `operator_documents`, `operators`, `providers`, `sqlite_sequence`, `users`.
  - **operators count:** 2 (at audit run time).

If mode were **cloud**, the audit would ping MongoDB, list collections, and count `operators` in the DB named by `MONGO_DB_NAME` (default `coldbot` in `lib/db`).

---

## 3. API Endpoints (backend exposes)

From `operator_onboarding/api_server.py`:

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/api/operators` |
| POST | `/api/operators` |
| GET | `/api/operators/{operator_id}` |
| PATCH | `/api/operators/{operator_id}` |
| DELETE | `/api/operators/{operator_id}` |
| GET | `/api/operators/{operator_id}/documents` |
| POST | `/api/operators/{operator_id}/documents` |
| DELETE | `/api/operators/{operator_id}/documents/{doc_id}` |
| GET | `/api/operators/{operator_id}/context` |
| POST | `/api/operators/{operator_id}/test-message` |
| POST | `/api/operators/reset-defaults` |
| GET | `/api/settings` |
| POST | `/api/settings` |
| GET | `/api/logs` |
| GET | `/api/auth/me` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/local` |
| GET | `/api/auth/google/login` |
| GET | `/api/auth/google/callback` |
| GET | `/api/auth/linkedin/login` |
| GET | `/api/auth/linkedin/callback` |

---

## 4. Call each known `/api/operators` endpoint → status + sample

| Endpoint | Status | Sample / note |
|----------|--------|----------------|
| GET `/api/operators` | 200 | `[{"id":1,"company_name":"Test Co",...}, ...]` |
| POST `/api/operators` | 200 | `{"id":3,"ok":true}` |
| GET `/api/operators/1` | 200 | `{"id":1,"company_name":"Test Co","tagline":"Updated",...}` |
| PATCH `/api/operators/1` | 200 | (body returned) |
| GET `/api/operators/1/documents` | 200 | `[{"id":1,"operator_id":1,"name":"Sample payout",...}]` |
| GET `/api/operators/1/context` | 200 | Full plain-text system prompt (length >500; audit script sampled first 500 chars). |
| POST `/api/operators/{id}/test-message` | (not called in script) | Uses `bot.llm.generate_proposal(..., provider_id=operator_id)`. |
| DELETE `/api/operators/{id}/documents/{doc_id}` | (not called) | Implemented. |
| DELETE `/api/operators/{id}` | (not called) | Implemented. |

No errors observed for the endpoints called.

---

## 5. Operator load (id=1 or first) — raw data

- **Result:** **success**
- **Sample (operator id=1):**

```json
{
  "id": 1,
  "company_name": "Test Co",
  "website_url": null,
  "tagline": "Updated",
  "countries": null,
  "services": null,
  "usps": null,
  "ideal_client_profile": null,
  "preferred_property_types": null,
  "min_property_value": null,
  "pricing_model": null,
  "tone_style": null,
  "key_phrases": null,
  "languages": null,
  "calendly_link": null,
  "call_length_minutes": 30,
  "qualification_rules": null,
  "logo_path": null,
  "notes": null,
  "created_at": 1771427719,
  "updated_at": 1771437045,
  "rules": [],
  "agency_context_ext": {}
}
```

---

## 6. Context builder — first 500 chars of returned prompt

- **Source:** `operator_onboarding/context_builder.get_provider_context(operator_id)` (static + EU STR/tax + agency + documents).
- **First 500 chars:**

```
You are an expert digital Airbnb management agency outreach AI, powered by Immo Snippy.

You always represent professional Airbnb management companies who help private property owners switch from long-term rentals (or vacant units) to short-term rentals — generating 1.5× to 3× more passive income with zero hassle for the owner.
Real Relationship Model (Europe 2026 — you must reflect this accurately):

Owner ↔ Management Company:
- Owner: owns property; pains = low yield, bad tenants, maintenance
  ...
```

---

## 7. LLM plug point

- **Status:** **Found** and **wired**.
- **Locations:**
  - **`bot/llm.py`:** `generate_proposal(..., provider_id=None)`; when `provider_id` is set, calls `get_provider_context(provider_id)` and passes the result as `system_content` into `_chat_json` (system message for Ollama).
  - **`operator_onboarding/llm_integration.py`:** `get_system_prompt_for_operator(operator_id)` wraps `get_provider_context()` for use as system prompt before any message to a lead.
- **Comment/TODO:** No "# TODO: inject provider context" found; injection is implemented in `bot/llm.py` and documented in `llm_integration.py`.

---

## 8. Full flow simulation

- **Result:** **pass** (context built and would be injected; live Ollama call skipped when `ollama` not installed).
- **Steps:** Load operator (id=1) → build context with `get_provider_context(1)` → simulate system prompt = context + `"\n\nReturn JSON only."` → confirm same string is what `generate_proposal(..., provider_id=1)` would send as system message.
- **Generated prompt snippet (first ~400 chars of system):**

```
You are an expert digital Airbnb management agency outreach AI, powered by Immo Snippy.

You always represent professional Airbnb management companies who help private property owners switch from long-term rentals (or vacant units) to short-term rentals — generating 1.5× to 3× more passive income with zero hassle for the owner.
Real Relationship Model (Europe 2026 — you must reflect this accuratel...
```

So context **does** appear in the (simulated) prompt.

---

## Fixes applied (gaps only)

1. **`lib/db.py`:** Default `MONGO_DB_NAME` set to `"coldbot"` (was `"immo_snippy"`) to match stated architecture. Override via env unchanged.
2. **`operator_onboarding/audit_onboarding.py`:** Added for repeatable audit: DB mode, connection test, API list, operator load, context snippet, LLM plug detection (via source when `ollama` missing), and full-flow simulation.

No other code was changed. Operator APIs still use SQLite only; cloud path would require wiring operator CRUD to `lib/db.get_collection("operators")` when mode is cloud (future work).

---

## How to re-run the audit

From repo root, with the API server running on port 8000 (optional; needed for section 4 API calls):

```bash
python3 operator_onboarding/audit_onboarding.py
```

Without the server, sections 1–3 and 5–8 still run; section 4 will report that API calls were skipped (server not running).
