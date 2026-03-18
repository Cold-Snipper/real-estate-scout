# Contacter / Mailer PR notes

Use this as a template when opening a PR so other developers can quickly
understand what is “canonical” vs legacy in this repo.

---

## Summary

- Add/modernize the **Mailer (“Contacter”)** module under `mailer/` for:
  - atHome.lu + Immotop.lu contact form automation (via Playwright)
  - optional WhatsApp Web follow‑up
  - CRM integration (flags + conversation history)
- Expose the mailer via **FastAPI** under `/api/mailer/*`.
- Add a **Contacter** page in the Next.js dashboard at `/contacter` that:
  - lists ready‑to‑contact properties from the CRM,
  - can trigger mailer runs (dry + real),
  - shows live progress and logs (SSE),
  - shows a live “bot screen” (Playwright screenshots),
  - embeds atHome.lu and Immotop.lu for direct viewing.

## Scope / Source of truth

- **This PR’s source of truth for contact automation:**
  - Backend: the `mailer/` package.
  - Frontend: `frontend/frontend/app/(dashboard)/contacter/page.tsx`.
- **Legacy / out‑of‑scope code:**
  - Older scraping/automation scripts elsewhere in the repo may be outdated.
  - Prefer the `/api/mailer/*` endpoints and the Contacter page when adding
    new functionality.

## How to run (local)

### Backend (FastAPI + mailer)

```bash
cd /path/to/repo
python -m venv .venv
source .venv/bin/activate
pip install -r mailer/requirements.txt
python -m playwright install chromium

# operator contact for form fill
export MAILER_OPERATOR_FIRST_NAME="Test"
export MAILER_OPERATOR_LAST_NAME="Operator"
export MAILER_OPERATOR_EMAIL="operator@example.com"
export MAILER_OPERATOR_PHONE="+352 661 999 888"
export MAILER_DEFAULT_COUNTRY_CODE="352"

uvicorn operator_onboarding.api_server:app --reload --port 8000
```

### Frontend (Next.js dashboard)

```bash
cd frontend/frontend
pnpm install    # or npm/yarn, matching the lockfile
pnpm dev -- --port 3000
```

Then open:

- `http://localhost:3000/contacter` — Contacter UI
- `http://localhost:8000/api/mailer/status` — mailer API status

## Key files to review

- `mailer/flow.md` — 10‑step mailer flow (business + technical).
- `mailer/main.py` — core batch runner (used by CLI and API).
- `mailer/api.py` — `/api/mailer/*` endpoints (status, properties, run, live feed, spectator, tests).
- `mailer/athome_mailer.py` / `mailer/immotop_mailer.py` — site‑specific form logic.
- `mailer/whatsapp.py` / `mailer/whatsapp_web.py` — WhatsApp follow‑up generation + optional Web send.
- `mailer/live_feed.py` / `mailer/spectator.py` — live console + screenshot “bot screen” wiring.
- `frontend/frontend/app/(dashboard)/contacter/page.tsx` — Contacter dashboard page.

