# Mailer (Snippy) — atHome + Immotop contact automation

This module automates **contact form submissions** for listings already stored in Snippy’s CRM database (`data/crm.db`), using:

- **Playwright** browser automation
- The existing **operator context injection** via `bot.llm.generate_proposal(... provider_id=operator_id)`
- A **WhatsApp follow-up link** generated from the listing phone number

> Important: this module is designed for **low-volume, human-like cadence** and should only be used where you are allowed to contact the listing owner/agent.

---

## What it does

For each pending listing in CRM (`properties` table):

1. Builds a short listing text (title/location/description/url)
2. Generates a personalized message via existing chatbot logic
3. Submits the contact form on:
   - `athome.lu` (multi-step guest flow)
   - `immotop.lu` (inline form)
4. Appends a WhatsApp follow-up message into CRM conversations.
   - If WhatsApp Web automation is enabled, it **sends** the WhatsApp message.
   - Otherwise it prints a **wa.me** link for manual follow-up.
5. Marks the property as sent:
   - `sent_via_email=1`
   - `sent_via_whatsapp=1` (only when WhatsApp Web send succeeds)

---

## Database integration

### Source of listings

Mailer reads from **CRM SQLite** at `data/crm.db`, table `properties`.

Selection:
- `listing_url` contains `athome.lu` / `immotop.lu`
- `sent_via_email` is missing or `0`

### Flags (auto-migrated)

Mailer will add these columns to `properties` if missing:
- `sent_via_email INTEGER DEFAULT 0`
- `sent_via_whatsapp INTEGER DEFAULT 0`
- `mailer_last_error TEXT`
- `mailer_last_run_at INTEGER`

---

## Operator contact details (required for form fill)

Operator onboarding in this repo does not have dedicated fields for first/last/email/phone.

So **you must provide them** using either:

### Option A (recommended): environment variables

```bash
export MAILER_OPERATOR_FIRST_NAME="John"
export MAILER_OPERATOR_LAST_NAME="Doe"
export MAILER_OPERATOR_EMAIL="john@agency.com"
export MAILER_OPERATOR_PHONE="+352 661 123 456"
```

Optional:

```bash
export MAILER_DEFAULT_COUNTRY_CODE="352"
```

### Option B: store them in operator onboarding JSON

Put into the operator’s `agency_context_ext` JSON:
- `contact_first_name`
- `contact_last_name`
- `contact_email`
- `contact_phone`

---

## Install / setup

From repo root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r mailer/requirements.txt
python -m playwright install chromium
```

---

## Run (CLI)

Dry run (recommended first):

```bash
python -m mailer --operator-id 1 --source athome --limit 5 --dry-run --headed
```

Real run (headless):

```bash
python -m mailer --operator-id 1 --source immotop --limit 10
```

Enable WhatsApp Web sending (requires a persistent profile directory that is logged in once):

```bash
# one-time login init
python -m mailer --whatsapp-login --whatsapp-profile-dir data/whatsapp_profile --headed

# then runs can send WhatsApp automatically
python -m mailer --operator-id 1 --limit 5 --whatsapp-web-send --whatsapp-profile-dir data/whatsapp_profile --headed
```

Notes:
- `--headed` shows the browser for debugging.
- On failures, screenshots are written to `data/mailer_screens/`.

---

## Site flows implemented

### atHome.lu

Sequence:
- Open listing URL
- Click “Contact”
- Click “Continue as guest”
- Click “More info”
- Fill textarea with message
- Fill email, first name, last name, phone
- Click “Send”

### Immotop.lu

Sequence:
- Open listing URL
- Fill message into textarea
- Fill first name + last name
- Check “I am an adult”
- Click “Send”

---

## Optional FastAPI integration

`mailer/api.py` exports a router at `/api/mailer`.

To mount it in `operator_onboarding/api_server.py`, add:

```python
from mailer.api import router as mailer_router
app.include_router(mailer_router)
```

Endpoints:
- `POST /api/mailer/run`
- `GET /api/mailer/status`

> **Source of truth note**  
> In this repo, the `mailer/` package (this folder) and the Contacter frontend page
> (`frontend/frontend/app/(dashboard)/contacter/page.tsx`) are the **canonical,
> up‑to‑date implementation** of the contact automation. Older scripts and bots
> elsewhere in the repo may be outdated — prefer these entry points when wiring
> new functionality.

---

## Where to look first (for other developers)

- **Backend entrypoints**
  - `mailer/main.py` — core batch runner used by CLI and the FastAPI API.
  - `mailer/api.py` — FastAPI router mounted under `/api/mailer/*` (status, properties,
    run, live feed, integration tests, spectator).
  - `mailer/flow.md` — high‑level 10‑step business/technical flow for this module.
- **Frontend**
  - `frontend/frontend/app/(dashboard)/contacter/page.tsx` — “Contacter” dashboard page
    that calls `/api/mailer/*` and shows:
    - listings ready for contact,
    - mass actions,
    - live run progress (SSE),
    - live bot feed (SSE),
    - spectator screenshots,
    - embedded atHome/Immotop windows.

If you are only interested in the contact automation, you can work almost
exclusively inside `mailer/` + the Contacter page and ignore other legacy
automation code in the repo.

---

## Disclaimers

- Respect each website’s ToS and privacy rules.
- Use low volume to avoid bans and spam reports.
- Do not automate logins/credentials unless you have explicit permission.

