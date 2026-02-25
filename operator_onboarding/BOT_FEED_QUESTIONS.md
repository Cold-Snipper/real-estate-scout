# Questions to Add to Operator Onboarding (So Bot Data Is Properly Fed)

The Snippy Chat Bot uses **operator_onboarding** for: (1) full system context via `get_provider_context(operator_id)`, and (2) contact links via `get_operator(operator_id)` (Calendly, phone, email, WhatsApp). Below are questions to add to the onboarding flow so the bot has the data it needs. Fields that already exist in the DB/API but are **not** asked in the current 3-step form are marked with **[not in form]**.

---

## 1. Contact data (critical for bot)

The bot generates WhatsApp, phone, and email links from the operator. It currently reads **phone and email from `notes`** (regex). To feed the bot reliably, add explicit questions and either store in structured fields or in a parseable way in notes.

| # | Question | Purpose | Suggested field / storage |
|---|----------|---------|---------------------------|
| 1 | **Contact phone number** (for WhatsApp and calls) | Bot uses this for `generate_contact_links`; exact link is sent to owners. | Add `contact_phone` to operators table and form, or ask "Phone (with country code, e.g. +352 661 123 456)" and store in `notes` in a clear line like `Phone: +352...` so parsing works. |
| 2 | **Contact email** (for owners to reach you) | Bot uses this in contact links when moving conversation off-chat. | Add `contact_email` to operators table and form, or ask and store in `notes` (e.g. `Email: contact@agency.lu`) so parsing works. |

**Note:** The form already has **Calendly link** and **Website URL**. The bot uses `calendly_link` and `website_url`; phone and email are currently parsed from `notes` only.

---

## 2. Call booking (critical for bot)

Bot’s main goal is to book a discovery call. Context builder uses `call_length_minutes` and can use explicit call phrasing.

| # | Question | Purpose | Suggested field / storage |
|---|----------|---------|---------------------------|
| 3 | **Discovery call length (minutes)** | Injected as: "Always aim to book a {X}-minute discovery call." | **[not in form]** `call_length_minutes` (integer, default 30). Add to form. |
| 4 | **Exact phrasing when asking for the call** (optional) | Bot can use this verbatim when suggesting booking (rule 16: "Use exact links/numbers from current operator context"). | **[not in form]** `agency_context_ext.call_phrasing` (e.g. "Book a quick 15-min slot here" or "Let's find 20 minutes this week—here's my calendar."). Add one text input. |
| 5 | **When should the bot offer the call?** (e.g. after first reply, after valuation, only when strong interest) | Drives bot behaviour. | **[not in form]** `agency_context_ext.when_offer_call` (dropdown: after_first_reply, after_audit, strong_interest, never_auto). Add to form. |

---

## 3. Forbidden phrases & success stories (bot rules 13–14)

Bot hard rules say: "Stay 100% in character with tone, fees, **forbidden phrases**, **success stories**" and "Fee/commission suggestions MUST come from current operator context."

| # | Question | Purpose | Suggested field / storage |
|---|----------|---------|---------------------------|
| 6 | **Phrases the bot must NEVER use** (one per line or comma-separated) | So the bot stays on-brand and compliant. | **[not in form]** `agency_context_ext.forbidden_phrases` (text or JSON array) or a dedicated `forbidden_phrases` column. Add textarea. |
| 7 | **1–3 short success stories or results to mention** (e.g. "Owner X got 2× long-term rent in 6 months") | Bot can weave these into replies for social proof. | **[not in form]** `agency_context_ext.results_highlight` or `success_stories` (text). Add textarea. |
| 8 | **Fee/commission summary for the bot** (one short sentence or bullet) | So the bot never invents numbers; "Fee/commission suggestions MUST come from current operator context." | Form has `pricing_model` dropdown; add optional **"Fee summary (exact wording for chatbot)"** e.g. "We take 18% of booking revenue; no setup fee." Store in `agency_context_ext.fee_summary_for_bot` or in notes. |

---

## 4. Rules and tone (context builder)

Context builder injects `rules` (list) and uses `qualification_rules`, `key_phrases`, `services`, `usps`. Form currently has **qualification_rules** and **tone_style**; missing:

| # | Question | Purpose | Suggested field / storage |
|---|----------|---------|---------------------------|
| 9 | **Rules the bot must always follow** (one per line, e.g. "Never promise a specific occupancy %", "Always mention DAC7 in Luxembourg") | Injected as "Rules you must follow (from operator onboarding): 1. ... 2. ..." | **[not in form]** `rules` (JSON array of strings). Add textarea, one rule per line, saved as list. |
| 10 | **Key phrases to use where natural** (comma- or line-separated) | Injected as "Use these key phrases where natural: ..." | **[not in form]** `key_phrases` (text or JSON array). Add textarea. |
| 11 | **Services you offer** (short description) | Injected as "You specialize in: ..." | **[not in form]** `services` (text or list). Add textarea or multi-line. |
| 12 | **Key differentiators / USPs** (bullet points) | Injected as "Key differentiators (USPs): ..." | **[not in form]** `usps` (text or list). Add textarea. |

---

## 5. Extended agency context (optional but valuable)

These map to `agency_context_ext` keys and give the bot clearer instructions. Add as needed.

| # | Question | Purpose | Suggested key in agency_context_ext |
|---|----------|---------|-------------------------------------|
| 13 | **Long description of your company** (what you tell owners) | Richer system context. | `long_description` |
| 14 | **Number of properties managed** (e.g. "50+") | Social proof. | `properties_managed` |
| 15 | **Main office / hub city** | Location credibility. | `main_office` |
| 16 | **Do you offer a revenue guarantee?** (yes/no + short wording) | Bot can mention only if true. | `revenue_guarantee` (or boolean + text) |
| 17 | **Strict rules the AI must always follow** (free text) | Extra hard constraints. | `strict_rules` |
| 18 | **Additional notes or guidelines for the AI** | Catch-all for tone, edge cases, countries. | `additional_notes_ai` |

---

## 6. Summary table: already in DB vs need to add to form

| Field / data | In DB? | In current form? | Action |
|--------------|--------|------------------|--------|
| company_name, website_url, tagline, countries | Yes | Yes | Keep. |
| tone_style, ideal_client_profile, preferred_property_types, pricing_model | Yes | Yes | Keep. |
| calendly_link, qualification_rules, notes | Yes | Yes | Keep. Add **phone** and **email** either as dedicated fields or clear instructions in notes. |
| call_length_minutes | Yes | No | Add question. |
| services, usps, key_phrases, rules | Yes | No | Add questions (4 new inputs). |
| agency_context_ext (primary_service_package only sent) | Yes | Partially | Add: call_phrasing, when_offer_call, forbidden_phrases, results_highlight/success_stories, fee_summary_for_bot, optional long_description, strict_rules, additional_notes_ai. |
| contact_phone / contact_email | No (parsed from notes) | No | Add questions; add columns to operators table **or** document that phone/email must be in notes in format "Phone: +352... Email: ...". |

---

## 7. Minimal set to “properly feed” the bot

If you add only a **minimal set** first:

1. **Contact phone** (for WhatsApp/calls)  
2. **Contact email**  
3. **Discovery call length (minutes)**  
4. **Exact call phrasing** (one line)  
5. **Forbidden phrases** (textarea)  
6. **1–3 success stories / results** (textarea)  
7. **Fee summary for bot** (one short sentence)  
8. **Rules the bot must follow** (one per line)

Then the bot has: correct contact links, correct call length and phrasing, no forbidden phrases, success stories and fee wording from context, and explicit rules. The rest (services, USPs, key_phrases, when_offer_call, extended agency_context_ext) can be added in a second pass.

---

## 8. Schema change suggestion

To support contact data without parsing notes:

- Add to **operators** table: `contact_phone TEXT`, `contact_email TEXT`.
- In **tools.generate_contact_links**: use `op.get("contact_phone")` and `op.get("contact_email")` with fallback to current notes parsing.

Then add the two questions to the form and store values in these columns.
