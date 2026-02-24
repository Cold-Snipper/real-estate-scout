# Project structure (for developers)

One place for each part of the app. Use this when you clone or open the repo.

## Frontend (UI) — **`real-estate-scout/`**

- **This is the only folder for the React/Vite app.** All UI work goes here.
- Run: `cd real-estate-scout && npm install && npm run dev` → app at **http://localhost:8080**
- Routes: `/`, `/crm`, `/operator-onboarding`, `/pipeline`, `/data`, `/website-bot`, `/facebook-bot`, etc.
- API: set `VITE_API_BASE=http://localhost:8000` (or use proxy) so the UI talks to the backend.

## Backend (API) — **`operator_onboarding/`** and **`backend/`**

- **API server:** `operator_onboarding/api_server.py` (FastAPI). Run: `uvicorn operator_onboarding.api_server:app --reload --port 8000`
- **Operators, context, documents:** `operator_onboarding/` (db, context_builder, dashboard, etc.)
- **Scrapers & schedulers:** `backend/` (athome, immotop, MongoDB/SQLite)

## Run everything (API + frontend)

From repo root:

```bash
./start.sh
```

Then open **http://localhost:8080**. API runs on **http://localhost:8000**.

## Other folders

| Folder | Purpose |
|--------|---------|
| `bot/` | Scanning loop, LLM, outreach (config in root `config.yaml`) |
| `docs/` | Specs, run guides, API contract |
| `lib/` | Shared code (e.g. property evaluator, listings schema) |
| `ai_lm_content/` | Prompts and reference content for LLM |
| `scripts/` | Run scripts, backend scripts |

## Docs to read first

- `docs/LOVABLE_FRONTEND_SPEC.md` — API contract and UI context
- `docs/REAL_ESTATE_SCOUT_LOCAL.md` — Local run and ports
