# Contexts, Bots, Phrasing Guide — System & Process

Single guide for Immo Snippy: how context is built, how bots use it, and how to phrase outreach (tone, tactics, templates, process).

---

## 1. System overview

- **Contexts** = everything the LLM sees as "system" knowledge before generating a message: static business model, EU rules, agency details, rules, and reference documents.
- **Bots** = the scanning loop (e.g. `archive/old_root_stack/main.py`) that finds leads, qualifies them, and calls message generation with an optional **provider (operator) id**.
- **Phrasing** = the style and tactics baked into static context + templates + operator rules so messages stay on-brand and effective.

**Flow:** Onboard operator → build context with `get_provider_context(operator_id)` → inject that string into the system prompt → generate message (e.g. via Ollama). Config sets `active_provider_id` so the bot knows which operator to use.

---

## 2. Context layers (what the LLM receives)

The full system prompt is built in this order:

| Layer | Source | Purpose |
|-------|--------|--------|
| **1. Base static** | `operator_onboarding/airbnb_static_context.py` | Option A: role, 2026 Europe relationship model, Grand Slam Offer, value equation, negotiation tactics, pipeline goal, Europe rules. |
| **2. EU STR & tax** | `operator_onboarding/eu_str_tax_context.py` | Disclaimer + EU regulation, DAC7, country-level deductions; legal phrasing and compliance. |
| **3. Agency (operator)** | `context_builder.build_operator_context(operator)` | Company name, tagline, countries, tone, target owner type, Calendly, qualification rules, **rules** (up to 50 sentence-form rules). |
| **4. Reference documents** | `operator_documents` table | Draft contract, summary agreement, payout examples, etc.; truncated per doc and in total to avoid context overflow. |

**Single entry point:** `get_provider_context(operator_id)` in `operator_onboarding/context_builder.py` returns the concatenated string. Use this (or `get_system_prompt_for_operator(operator_id)` in `llm_integration.py`) as the system prompt before calling the LLM.

---

## 3. Phrasing guide

### 3.1 Principles (from static context)

- **Enlarge the pie** — Don't argue over %; emphasise total income growth. E.g. *"Let's make the whole pie much bigger — you keep most of a 2–3× larger income."*
- **Build rapport first** — Acknowledge pain (low rent, bad tenants, vacancies), then offer the solution.
- **Social proof** — Use concrete numbers and locale. E.g. *"One owner in your area went from €950 long-term to €2,400 average monthly."*
- **Risk reversal** — Include guarantee-style phrasing in important messages.
- **Outcome focus** — E.g. *"You do nothing. We handle everything. You just collect more money."*
- **Pipeline goal** — Move owner: discovery → reply → value bomb + trust → **booked discovery call**. Do not try to close the contract in chat; hand off when the call is booked.

### 3.2 Tone and voice

- **Professional and friendly** (default); can be set per operator (e.g. warm and consultative, direct and high-energy).
- Stay in character as the **agency**, never mention being an AI or bot.
- Use the operator's **key phrases** and **rules** (from onboarding) so phrasing matches the brand.

### 3.3 Message templates (acquisition steps)

Templates in `operator_onboarding/message_templates.py` follow the real acquisition flow. Use `get_template(name)` and `fill_template(name, **placeholders)`.

| Step | Template key | Use when |
|------|----------------|----------|
| 1 | `cold_opener` | First outreach; hook + pain + value bomb. |
| 2 | `after_reply` | After owner replies; enlarge the pie + social proof. |
| 3 | `value_bomb_risk_reversal` | Share numbers + guarantee. |
| 3 | `objection_handler` | Price or hassle objections. |
| 4 | `call_booking` | Ask for discovery call; include Calendly. |
| 5 | `call_booked_confirmation` | Call booked; confirm and hand off. |

**Placeholders** (examples): `owner_name`, `property_type`, `city_area`, `area`, `calendly_link`, `call_minutes`, `your_name`, `company_name`, `tagline`, `x` (number of owners/properties).

### 3.4 Do's and don'ts

- **Do:** Mirror pain, use local examples, offer free audit, mention compliance when relevant, ask for the call with the provider's Calendly.
- **Don't:** Fight over fee %, close the contract in chat, break character, or ignore operator rules.

---

## 4. Process (end-to-end)

1. **Onboard operator** — UI (`/operator-onboarding`) or CLI (`manage_providers.py add`): company name, website, tagline, countries, tone, target owner type, property type, fee structure, call booking preference, Calendly, notes. Optionally add **documents** and up to **50 rules**.
2. **Store** — Data lives in SQLite (`operators`, `operator_documents`). DB path: **OPERATORS_DB_PATH** or **PROVIDERS_DB**.
3. **Build context** — For a given `operator_id`, call `get_provider_context(operator_id)`. Used by the bot and by the Streamlit dashboard / test script.
4. **Config** — In the main bot, `config.yaml` sets **active_provider_id** (e.g. `1`). The scanning loop passes this into message generation.
5. **Inject** — When generating a message (e.g. `generate_proposal(..., provider_id=active_provider_id)`), the code prepends `get_provider_context(provider_id)` to the system prompt, then calls the LLM (e.g. Ollama).
6. **Send** — The generated message is used (e.g. email or in-app); no contract closing in chat.

---

## 5. Bots and where context is used

- **Scanning loop** (`archive/old_root_stack/main.py`): Loads `active_provider_id` from config; for each qualified lead, calls `generate_proposal(text, model=model, provider_id=active_provider_id)`.
- **Message generation** (`archive/old_root_stack/llm.py`): `generate_proposal(..., provider_id=None)`. If `provider_id` is set, loads `get_provider_context(provider_id)` and prepends it to the existing system prompt (e.g. "Return JSON only.") before calling Ollama.
- **Test / dashboard** — `operator_onboarding/test_context_injection.py` and `operator_onboarding/dashboard.py` build context for a chosen operator and optionally run one test message with sample listing text.

---

## 6. File reference

| Role | Path |
|------|------|
| Context builder | `operator_onboarding/context_builder.py` — `get_provider_context(operator_id)` |
| Static base + tactics | `operator_onboarding/airbnb_static_context.py` |
| EU STR/tax | `operator_onboarding/eu_str_tax_context.py` |
| Templates | `operator_onboarding/message_templates.py` |
| LLM injection helper | `operator_onboarding/llm_integration.py` — `get_system_prompt_for_operator(operator_id)` |
| Bot config | `config.yaml` — `active_provider_id` |
| Bot loop + proposal | `archive/old_root_stack/main.py`, `archive/old_root_stack/llm.py` |
| Test script | `operator_onboarding/test_context_injection.py` |
| Streamlit dashboard | `operator_onboarding/dashboard.py` |

---

## 7. Quick checks

```bash
# Context for operator 1 (full string)
cd operator_onboarding && python3 view_context.py 1

# Test injection (first 500 chars + one message if Ollama available)
cd operator_onboarding && python3 test_context_injection.py

# Streamlit: list operators, preview context, Test Message Generation
streamlit run operator_onboarding/dashboard.py
```

Use this doc as the single reference for **contexts**, **bots**, **phrasing guide**, and **process**.
