# IMMO SNIPPY

Single codebase consolidating:

- **Frontend** — Real Estate Scout UI (Vite/React, brutalist amber+green on black/white). Lives in `frontend/`.
- **Backend** — immo-snip-lu scrapers and schedulers (athome.lu, immotop.lu, MongoDB/SQLite). Lives in `backend/`.
- **Docs** — Instructional markdown from COLD BOT (specs, run guides, comparison). Lives in `docs/`.

## Run frontend

```bash
cd frontend && npm install && npm run dev
```

Opens on port 8080. Set `VITE_API_BASE` (e.g. in `.env`) if the UI should talk to an API on another origin (see `docs/LOVABLE_FRONTEND_SPEC.md`).

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

## Docs

All instructional docs are in `docs/`. Start with:

- `docs/LOVABLE_FRONTEND_SPEC.md` — API contract and UI context.
- `docs/PROPERTY_VALUATION.md` — Property valuation context stack and LLM plug.
- `docs/IMMO_SNIP_VS_COLD_BOT.md` — How backend and pipeline relate.
- `docs/REAL_ESTATE_SCOUT_LOCAL.md` — Local run and ports.

In these docs, “frontend” = `frontend/`, “backend” = `backend/` in this repo.
