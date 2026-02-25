# Recap: Operator Onboarding + Context (Session)

## What's in place and working

### 1. Operator onboarding (UI)
- **Route:** `/operator-onboarding` → `OperatorOnboardingPage.tsx`
- **Create operator:** 3-step form with progress bar → **POST /api/operators**
  - Step 1: Company name, website, tagline, countries (multi-select)
  - Step 2: Tone, target owner type, property type, fee structure, call booking preference
  - Step 3: Calendly link, notes
- **Documents:** Pick operator → add document (type + content) → list/delete
- **Rules:** Pick operator → add up to 50 sentence rules → list/delete

### 2. Backend (Node)
- **GET/POST /api/operators**, **GET/PATCH /api/operators/:id**
- **GET/POST /api/operators/:id/documents**, **DELETE …/documents/:docId**
- **GET /api/operators/:id/context** → full system prompt (calls Python `view_context.py`)
- Requires **OPERATORS_DB** pointing at `operator_onboarding/providers.db`

### 3. Database (SQLite)
- Tables: `operators`, `operator_documents`; `operators.rules` (JSON, max 50)
- Init/migration: `cd operator_onboarding && python3 db.py`

### 4. Static context (Python)
- **Option A + 2026 Europe model** in `airbnb_static_context.py`
- **EU STR/tax** (disclaimer + country deductions) in `eu_str_tax_context.py`
- **6 message templates** (cold opener → call booked) in `message_templates.py`

### 5. Context builder
- **`get_provider_context(operator_id)`** in `context_builder.py`: static + EU tax + agency block (from operator + rules) + reference documents → one system prompt string

### 6. LLM plug point
- **`operator_onboarding/llm_integration.py`**: `get_system_prompt_for_operator(operator_id)` + comment to use it as system prompt before Ollama/LLM

### 7. Integration test / CLI
- **`operator_onboarding/view_context.py`**: prints full context for an operator
- One-line check: `cd operator_onboarding && python3 view_context.py 1`

### 8. Audit
- **`operator_onboarding/AUDIT_OPERATOR_ONBOARDING.md`** — checklist and status for onboarding + context

---

## What's not done / limitations

- **DB column name:** Schema uses **`ideal_client`**; audit checklist said `ideal_client_profile`. Behavior is the same; only naming differs.
- **No in-app LLM call:** No code in this repo actually calls Ollama with the built context; the backend has no message-generation flow. You have the **injection point** (Python helper + **GET …/context**) and must wire it into your bot.
- **Context API depends on Python:** **GET /api/operators/:id/context** runs `python3 operator_onboarding/view_context.py <id>`. It will 503 if Python isn't on the path or the script path is wrong.
- **manage_providers CLI:** README mentions `manage_providers.py` (add/list/view); that script doesn't exist. Creating/editing operators is via the UI or **POST/PATCH /api/operators**.
- **No Streamlit** for operator management.

---

## Quick checks

| Check | Command / action |
|-------|------------------|
| DB init | `cd operator_onboarding && python3 db.py` |
| View context for operator 1 | `cd operator_onboarding && python3 view_context.py 1` |
| Create operator in UI | Open app → `/operator-onboarding` → fill 3 steps → Save operator |
| Fetch context via API | `curl http://localhost:3000/api/operators/1/context` (backend + OPERATORS_DB + Python on path) |
