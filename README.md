# IMMO SNIPPY

Single codebase consolidating:

- **Frontend** — Real Estate Scout UI (Vite/React). Lives in **`frontend/`** (this is the only folder for the app).
- **Backend** — immo-snip-lu scrapers and schedulers (athome.lu, immotop.lu, MongoDB/SQLite). Lives in `backend/`.
- **Docs** — Instructional markdown (specs, run guides). Lives in `docs/`.

**→ See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for a clear folder map.**

## Run the full app (one app at http://localhost:8080)

**One command (API + frontend):**
```bash
./start.sh
```
Then open **http://localhost:8080**. CRM: **http://localhost:8080/crm**, Operators: **http://localhost:8080/operator-onboarding**.

**Or two terminals:**  
Terminal 1: `./scripts/run-backend.sh`  
Terminal 2: `cd frontend && npm install && npm run dev`

## Run frontend only

```bash
cd frontend && npm install && npm run dev
```

Opens on port 8080. Set `VITE_API_BASE=http://localhost:8000` (e.g. in `.env`) if the UI should talk to the API on another origin (see `docs/LOVABLE_FRONTEND_SPEC.md`).

## Run backend

```bash
cd backend && pip install -r requirements.txt
# Then e.g.:
python mongo_scheduler.py
# or
python parallel_scheduler.py
```

See `backend/README.md` and `backend/MONGODB_SETUP.md` for DB and env.

## Property valuation (daily rental)

Evaluates listings for short-term rental viability using market data, 2026–2031 future context, and an optional LLM. Entry points: `property_evaluator.evaluate_property(...)` (root) or `lib.property_evaluator.evaluate_property(...)`. The LLM is behind a plug: see `lib/llm_valuation_plug.run_valuation` and `docs/PROPERTY_VALUATION.md`. Without Ollama or a custom plug, valuation returns a stub (score 0, recommendation "Avoid").

## Git push

GitHub token for push is in **`.github_token`** (repo root; in `.gitignore`). Origin is configured to use it, so from repo root: `git push origin master:main` (or `git push origin main` if on `main`).

## Docs

All instructional docs are in `docs/`. Start with:

- `docs/LOVABLE_FRONTEND_SPEC.md` — API contract and UI context.
- `docs/PROPERTY_VALUATION.md` — Property valuation context stack and LLM plug.
- `docs/IMMO_SNIP_VS_COLD_BOT.md` — How backend and pipeline relate.
- `docs/REAL_ESTATE_SCOUT_LOCAL.md` — Local run and ports.

In these docs, “frontend” = `frontend/`, “backend” = `backend/` in this repo.
