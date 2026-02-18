# Operator Onboarding (Immo Snippy)

100% local-first: SQLite + optional Ollama. No cloud, no AWS, no MongoDB.

- **Stage 1:** `db.py` — schema + `init_db()`; `operators.py` — CRUD for `operators`; `documents.py` — CRUD for `operator_documents` (draft contract, summary agreement, payout examples, other).
- **Context:** `airbnb_static_context.py` — **Option A** base system prompt + **real 2026 Europe relationship model**. `eu_str_tax_context.py` — **EU STR/tax static context**. `context_builder.py` — `get_provider_context(operator_id, include_eu_str_tax=True)` returns base + EU STR & tax + **Specific Agency Context** (company, tone, Calendly, **rules**) + **reference documents**. **Rules:** each operator has up to **50 sentence-form rules** (stored in `operators.rules` JSON); injected as “Rules you must follow” in the agency block. `message_templates.py` — 6 templates; `fill_template(name, **placeholders)`.
- **UI:** Operator Onboarding page has **Add a document**: select operator, choose type (Draft contract, Summary agreement, Payout examples, Other), paste content, save. Documents are listed and deletable. Backend needs `OPERATORS_DB` set to `operator_onboarding/providers.db`.
- **CLI:** `manage_providers.py` — `list`, `add` (same questionnaire as UI), `view <id>` (operator + full LLM context), `delete <id>`. DB path: **OPERATORS_DB_PATH** or **PROVIDERS_DB** (default: `operator_onboarding/providers.db`).
- **Streamlit:** `dashboard.py` — list operators, context preview, "Test Message Generation" with sample text. Requires `streamlit` and optionally `ollama`.
- **Stage 2–5:** Integration hook, etc.

## DB path (Step 1)

Set **OPERATORS_DB_PATH** or **PROVIDERS_DB** to override the default DB file (e.g. for a different env or path). Used by `db.py`, `manage_providers.py`, and the Node backend when set as `OPERATORS_DB`.

```bash
export OPERATORS_DB_PATH=/path/to/providers.db
python manage_providers.py list
```

## CLI — manage_providers.py

```bash
cd operator_onboarding

python manage_providers.py list
python manage_providers.py add          # questionnaire (company name, tone, countries, Calendly, etc.)
python manage_providers.py view 1      # print operator + full get_provider_context(1)
python manage_providers.py delete 1    # delete operator (and its documents)

# Override DB path
python manage_providers.py --db /path/to/providers.db list
```

## Streamlit dashboard

```bash
pip install streamlit   # if not already
# From repo root:
streamlit run operator_onboarding/dashboard.py
# Or from operator_onboarding:
cd operator_onboarding && streamlit run dashboard.py
```

Lists operators, shows context preview (first 800 chars), and a **Test Message Generation** button that uses sample listing text and Ollama (qwen3) to generate one outreach message.

## Stage 1 — Test

```bash
cd operator_onboarding && python db.py
```

Check: `providers.db` exists and `sqlite3 providers.db ".schema providers"` shows the `providers` table.

**Operators table (Airbnb Agency):**

```bash
cd operator_onboarding && python3 -c "from db import init_db; init_db(); from operators import create_operator, get_operator, get_all_operators, update_operator; id=create_operator({'company_name':'Test','tagline':'Tag'}); print(get_operator(id)); print('len', len(get_all_operators()))"
```

Check: Output shows the created operator dict and `len 1`. Table: `sqlite3 providers.db ".schema operators"`.
