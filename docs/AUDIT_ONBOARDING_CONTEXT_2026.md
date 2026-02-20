# Deep Audit: Onboarding + Contexting System (2026)

**Date:** 2026-02-20  
**Scope:** Operator onboarding UI, backend API, hybrid DB, context builder, LLM plug, mode switching.

---

## Audit Checklist Results

### 1. Operator Onboarding UI

- **Expected:** `/operator-onboarding/page.tsx` with 3-step form, 5 dropdowns, save to POST /api/operators.
- **Found:** No `page.tsx` or `OperatorOnboardingPage.tsx` in this repo. Docs reference `real-estate-scout/src/pages/OperatorOnboardingPage.tsx` and route `/operator-onboarding`; that frontend is not in this workspace. FastAPI serves the API; any React/Vite app (e.g. Lovable, real-estate-scout) would call it.
- **Status:** ❌ **Missing** (in repo) — API contract is implemented; add minimal standalone HTML form so onboarding can be tested without the external frontend.

---

### 2. Backend API Routes

- **Expected:** /api/operators (GET/POST), /api/operators/:id (GET/PATCH), /api/operators/:id/context in Node, calling Python view_context or context_builder.
- **Found:** Backend is **Python FastAPI** (`operator_onboarding/api_server.py`), not Node. All routes exist:
  - GET/POST `/api/operators`
  - GET/PATCH `/api/operators/{id}`
  - GET `/api/operators/{id}/context` → returns `get_provider_context(operator_id)` (plain text)
  - GET/POST/DELETE documents, DELETE operator, POST reset-defaults, POST test-message
- **Context:** Implemented in-process: `get_operator_context()` calls `get_provider_context(operator_id)` from `context_builder.py`. `view_context.py` is a CLI helper only.
- **Status:** ✅ **Complete** (backend is FastAPI, not Node; behaviour matches spec).

---

### 3. Database (Hybrid)

- **SQLite:** `operator_onboarding/providers.db` — table `operators` with company_name, website_url, tagline, countries, services, usps, ideal_client_profile, preferred_property_types, min_property_value, pricing_model, tone_style, key_phrases, languages, calendly_link, call_length_minutes, qualification_rules, logo_path, notes, rules, agency_context_ext (migration), created_at, updated_at. ✅
- **MongoDB:** `lib/db.py` defines COLLECTION_NAMES including `operators`; when mode is `cloud`, `get_db()` returns MongoDB and `get_collection("operators")` exists. Schema is document-based; no separate sync from SQLite.
- **Gap:** `operator_onboarding/operators.py` CRUD uses only SQLite (`_conn()` → `get_db_path()`). It does **not** use `lib/db.get_collection("operators")` when mode is cloud, so operator data never goes to MongoDB when in cloud mode.
- **Status:** ❌ **Partial** — SQLite and lib/db abstraction are correct; operator CRUD must use lib/db when mode is cloud.

---

### 4. Context Builder

- **Expected:** `get_provider_context(operator_id)` returns full prompt (static + operator + rules + documents); called by /api/operators/:id/context.
- **Found:** `operator_onboarding/context_builder.py` — `get_provider_context(operator_id, include_eu_str_tax=True)` builds static (Option A) + EU STR/tax + agency block (from operator + DROPDOWN_LABELS) + reference documents. GET `/api/operators/{id}/context` returns it as plain text.
- **Status:** ✅ **Complete**.

---

### 5. LLM Plug Points

- **Expected:** Injection point in llm.py / message generation; provider context prepended to system prompt in Ollama call.
- **Found:** `bot/llm.py` — `generate_proposal(..., provider_id=None)`. When `provider_id` is set, it calls `get_provider_context(provider_id)` and passes it as `system_content` to `_chat_json`; Ollama receives it as the system message. Comment at top: "Immo Snippy Provider Context Injection Point".
- **Status:** ✅ **Found & Wired**.

---

### 6. Mode Switching & Hybrid

- **Expected:** User mode (local / cloud) switches on OAuth login; data goes to correct DB by mode.
- **Found:** `lib/db.get_mode()` / `set_mode(mode)` exist (env `IMMO_SNIPPY_MODE` or thread-local). Auth: `/api/auth/local` creates local user; `/api/auth/google/callback` and LinkedIn callback create/update OAuth user. **No code sets `set_mode("cloud")` on OAuth or `set_mode("local")` on local login.** Operator CRUD does not depend on mode (always SQLite).
- **Status:** ❌ **Partial** — Mode must be set from authenticated user (OAuth → cloud, local → local) and operator CRUD must use lib/db when cloud.

---

## Summary

| # | Stage                         | Status   | Action                                      |
|---|-------------------------------|----------|---------------------------------------------|
| 1 | Operator Onboarding UI        | Missing  | Add minimal HTML form + API contract doc   |
| 2 | Backend API Routes            | Complete | None                                        |
| 3 | Database (Hybrid)             | Partial  | Wire operators CRUD to lib/db when cloud     |
| 4 | Context Builder               | Complete | None                                        |
| 5 | LLM Plug Points               | Complete | None                                        |
| 6 | Mode Switching & Hybrid       | Partial  | Set mode from auth; use in operator CRUD    |

---

## Build Order (gaps only) — DONE

1. ✅ Minimal operator onboarding: added `operator_onboarding/static/operator_onboarding.html` (3-step form, 5 dropdowns, POST /api/operators) and route GET `/operator-onboarding` serving it.
2. ✅ Hybrid operators + documents: `operators.py` and `documents.py` use MongoDB (raw collections with integer `id`) when `lib.db.get_mode() == "cloud"`; otherwise SQLite unchanged.
3. ✅ Mode from auth: `_set_mode_from_user(user_type)` and dependency `_mode_dep` on all `/api/operators*` routes; POST `/api/auth/local` sets local; OAuth callbacks set cloud; operator routes run with mode from JWT.
