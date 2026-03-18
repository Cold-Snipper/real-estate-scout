# Mailer Flow – Step-by-Step Progression

## Overview
The Mailer (“Contacter”) automates first-contact outreach for scraped listings to convert property owners/agents into **a booked discovery call/meeting** for short‑term rental (STR) management. It does this by generating an on‑brand message using **operator onboarding context**, submitting the listing’s **website contact form** via Playwright, following up via **WhatsApp**, and writing everything back into the CRM so the pipeline remains auditable, conservative, and compliant.

## Business Reasoning Principles
- **Email/website form first**: less intrusive, more professional, and aligns with “high‑trust” acquisition.
- **WhatsApp follow-up improves response rate**: fast channel, but must be framed as a professional follow-up (“I also sent you an email…”).
- **Discovery call is the goal**: the bot should not “close” in chat; it should move the owner toward a call and hand off.
- **Operator context = brand consistency**: messages must sound like the agency (tone, rules, Calendly link, compliance notes).
- **Low volume, human cadence**: reduces bans, spam flags, and protects deliverability and reputation.
- **Everything is logged**: every send attempt must be recorded to CRM (conversation history + sent flags + last error) for transparency.
- **Fail safely**: if automation is uncertain, record evidence (screenshots/logs) and mark the record with `mailer_last_error` instead of silently failing.

## Detailed Flow (numbered steps)

### 1) Fetch listing from scraper / CRM database
- **Action**: Read pending properties from `data/crm.db` (`properties` table), filtered by:
  - `listing_url` contains `athome.lu` or `immotop.lu`
  - `sent_via_email` missing or `0`
- **Integration**: `mailer/db.py` (`fetch_pending_listings`, `fetch_listings_by_ids`, `ensure_mailer_columns`).
- *Reasoning*: Only process listings that are actually actionable and not already contacted.
- **Success**: A list of property IDs + URLs to process.
- **Failure**: If DB missing columns → migrate columns automatically; if DB missing → stop run with explicit error.

### 2) Identify listing and load full data payload
- **Action**: Build a listing payload for message generation:
  - `title`, `location`, `description`, `listing_url`, `phone_number`, `contact_email`, `source`
- **Integration**: `mailer/db.py` (`fetch_listing`, `ListingRow`).
- *Reasoning*: The message quality depends on accurate context; phone/email presence affects WhatsApp follow-up.
- **Success**: Listing dict/row constructed.
- **Failure**: Missing `listing_url` → skip; missing text fields → still proceed with URL + best available text.

### 3) Ping the chatbot to generate the personalized message
- **Action**: Draft outreach message for this listing.
- **Integration (actual repo)**:
  - `mailer/chatbot.py` → `draft_contact_message(...)`
  - which calls `bot/llm.py` → `generate_proposal(... provider_id=operator_id)`
  - which injects `operator_onboarding/context_builder.get_provider_context(operator_id)`
- *Reasoning*: Centralizes voice/tone/rules in operator onboarding and avoids “generic bot” messaging.
- **Success**: `subject` + `body` returned (fallback template if LLM unavailable).
- **Failure**: If LLM fails → fallback message; if both fail → mark attempt error and skip listing.

### 4) Open the listing page in Playwright (stealth + pacing)
- **Action**: Navigate to `listing_url` using hardened Playwright context.
- **Integration**: `mailer/browser.py` (`launch_browser`, stealth init script, locale/timezone, randomized delays).
- *Reasoning*: Reduces automation fingerprints and improves success on modern JS-heavy sites.
- **Success**: Page loaded, DOM reachable.
- **Failure**: Timeout/network → retry (run-level), record screenshot/HTML on failure where applicable.

### 5) Execute website contact form submission (site-specific)
- **Action**:
  - **atHome.lu** flow: Contact → Continue as guest → More info → fill textarea + operator fields → Send
  - **Immotop.lu** flow: fill message + name fields → check adult checkbox → Send
- **Integration**:
  - `mailer/athome_mailer.py` (`send_athome_contact`)
  - `mailer/immotop_mailer.py` (`send_immotop_contact`)
  - operator contact data: `mailer/operator_data.py` (env or `agency_context_ext`)
- *Reasoning*: Website forms are the least “spammy” channel and demonstrate professionalism.
- **Success**: Form submit completes (or confirmation screen reached).
- **Failure**:
  - Take screenshot on failure into `data/mailer_screens/`
  - Update `mailer_last_error` and continue to next listing.

### 6) Extract/confirm phone number
- **Action**: Use `properties.phone_number` if present; normalize to digits for WhatsApp.
- **Integration**: `mailer/whatsapp.py` (`normalize_phone_e164_like`).
- *Reasoning*: WhatsApp follow-up is only possible if we can confidently identify the phone number.
- **Success**: `phone_digits` computed.
- **Failure**: If no phone → skip WhatsApp; still mark email/form success.

### 7) Generate and send WhatsApp follow-up
- **Action**: Build follow-up text: original message + “I also sent you an email…”.
  - If WhatsApp automation is enabled → send via WhatsApp Web.
  - Else → generate `wa.me` link and log it for manual sending (do **not** mark `sent_via_whatsapp`).
- **Integration**:
  - Text/link: `mailer/whatsapp.py`
  - Web send (optional): `mailer/whatsapp_web.py` + persistent profile support in `mailer/browser.py`
  - Optional richer layer: `mailer/whatsapp_automation.py`
- *Reasoning*: Polite follow-up on a faster channel increases response while maintaining trust.
- **Success**: WhatsApp message sent OR link generated and logged.
- **Failure**: If WhatsApp session logged out → record error, keep email status, continue.

### 8) Optionally send email confirmation if not already done
- **Action**: In this implementation, the “email” is the website form submit; there is no separate SMTP send.
  - If later you add SMTP: use `bot/sender.py` (`yagmail`) and mark separately.
- **Integration**: current flow is website form; SMTP is optional future extension.
- *Reasoning*: Avoid duplicate contact; keep a single, conservative first-contact path.

### 9) Update database + CRM conversation history
- **Action**:
  - Append conversations:
    - channel=`email` with message body
    - channel=`whatsapp` with follow-up text (and/or link in logs)
  - Set flags:
    - `sent_via_email` always reflects website form success; `sent_via_whatsapp` only reflects real WhatsApp Web send success
    - `last_contact_date`
    - `chatbot_pipeline_stage="Contacted"`
    - `mailer_last_run_at`, `mailer_last_error`
- **Integration**:
  - Flags/attempt metadata: `mailer/db.py` (`mark_sent`, `mark_attempt`, `ensure_mailer_columns`)
  - Conversations: `lib/crm_storage.py` (`add_conversation`)
- *Reasoning*: CRM is the system of record for pipeline visibility and compliance/auditability.
- **Success**: DB flags updated; conversation history preserved.
- **Failure**: If DB write fails → surface error; do not silently continue without record.

### 10) Move to next listing or end batch
- **Action**: Wait randomized delay, then continue.
- **Integration**: `mailer/browser.py` (`human_delay`) + run loop in `mailer/main.py`.
- *Reasoning*: Human pacing reduces blocks and improves overall run stability.
- **Success**: Batch completes and returns summary stats.
- **Failure**: If run interrupted/disconnected (SSE) → stop and preserve partial results.

## Integration Points with Snippy
- **Chatbot / LLM**
  - `bot/llm.py.generate_proposal(... provider_id=operator_id)` is the single source of truth.
  - Operator context injection is handled via `operator_onboarding/context_builder.get_provider_context`.
- **Operator Data**
  - Form-fill contact details come from:
    - env: `MAILER_OPERATOR_FIRST_NAME/LAST_NAME/EMAIL/PHONE` (recommended)
    - or `operators.agency_context_ext` keys (`contact_first_name`, etc.)
- **CRM Updates**
  - Conversations appended via `lib/crm_storage.add_conversation`.
  - Flags stored on CRM `properties` table (auto-migrated columns).
- **Browser / Stealth**
  - Hardened Playwright context in `mailer/browser.py` (stealth init + locale/timezone + optional persistent context).
  - WhatsApp persistent session uses `user_data_dir` profile.

## Success Metrics & Logging
- **Per-listing success**
  - Website form submission succeeded (`sent_via_email=1`)
  - WhatsApp follow-up sent or link generated (depending on mode)
  - CRM updated with conversation entries and timestamps
- **What is logged**
  - `properties.mailer_last_run_at`, `properties.mailer_last_error`
  - SSE `/api/mailer/status` includes `recent_logs` (capped)
  - UI “Live log” shows per-listing results from SSE stream
- **Where evidence lives**
  - Failure screenshots/HTML snapshots: `data/mailer_screens/` (website form + WhatsApp group diagnostics when enabled)

## Flow Diagram Summary
```
1) Fetch pending listing IDs (CRM DB)
2) Load listing payload (title/location/phone/url)
3) Draft message (bot.llm + operator context)
4) Open listing page (Playwright, stealth)
5) Submit contact form (atHome/Immotop)
6) Confirm/normalize phone
7) WhatsApp follow-up (send via Web or generate wa.me link)
8) (Optional) SMTP email send (future)
9) Update CRM + flags + conversations + logs
10) Delay → next listing → end batch
```

