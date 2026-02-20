# Cursor prompt: Implement expanded Operator Onboarding form

**Copy-paste the block below into Cursor** to implement the full expanded onboarding form (**30 toggles, 30 dropdowns, 20 text questions**) as specified in `docs/OPERATOR_ONBOARDING_EXPANDED_SCHEMA.md`.

---

```
You are building Immo Snippy's Operator Onboarding. Implement the **expanded onboarding form** exactly as specified.

**Reference:** Read `docs/OPERATOR_ONBOARDING_EXPANDED_SCHEMA.md` for:
- All 30 yes/no toggle keys and labels: 20 outreach & automation (section 1.1) + 10 reporting & compliance (section 1.2: allow_export_property_csv, allow_export_owner_csv, allow_export_chat_history, track_compliance_per_property, require_owner_consent_before_scraping, log_every_ai_message_audit, notify_when_interested, notify_when_call_booked, notify_when_contract_signed, allow_manual_override_viability_score).
- All 30 dropdown keys and options: 2.1–2.25 negotiation & sales tactics + 2.26–2.35 reporting & workflow (export_format_preference, notification_delivery, viability_certainty_threshold, conversation_flagging_level, automation_level, pipeline_movement_trigger, bulk_action_default, report_frequency, data_retention_policy, backup_preference).
- All 20 text question keys (existing columns + agency_context_ext text keys as in schema section 3).

**Rules:**
1. **Storage:** New fields live in `operators.agency_context_ext` (JSON). Existing fields stay on the operator root. Merge all toggles, dropdowns, and new text keys into `agency_context_ext` on create/update.
2. **API:** Accept and return `agency_context_ext` in PATCH/POST/GET operator. Include full `agency_context_ext` so the form can prefill.
3. **UI:** Build one cohesive form (multi-step or long single page) with:
   - **Section: Outreach & automation preferences** – 20 yes/no toggles (labels + tooltips from schema 1.1).
   - **Section: Reporting & compliance preferences** – 10 yes/no toggles (schema 1.2: exports, compliance tracking, consent, audit log, notifications, viability override).
   - **Section: Negotiation & sales tactics** – 25 dropdowns (schema 2.1–2.25).
   - **Section: Reporting & workflow** – 10 dropdowns (schema 2.26–2.35: export format, notification delivery, viability threshold, flagging level, automation level, pipeline trigger, bulk action default, report frequency, data retention, backup).
   - **Section: Agency & sales process** – 20 text questions (existing columns + agency_context_ext keys). Mark required (company name, website URL) with *.
4. **Context builder:** Read `agency_context_ext` and append “Agency preferences” (toggles as yes/no, dropdowns as labels, text as value). Use labels for dropdowns so the bot gets human-readable instructions.
5. **No refactors:** Only extend request/response and form UI; keep existing operator CRUD and route structure.

**Deliverables:**
- Form UI with all 30 toggles, 30 dropdowns, and 20 text inputs, with labels and tooltips as in the schema.
- API accepts and returns `agency_context_ext` with all new keys.
- Context builder includes `agency_context_ext` in the generated system prompt with readable labels.
- Optional: shared constant for dropdown option values and labels (e.g. `operator_onboarding/expanded_options.py`).
```

---

**After implementation, verify:**
- Create or edit an operator; all toggles, dropdowns, and text fields save and reload.
- `GET /api/operators/:id/context` (or the context endpoint) returns a system prompt that includes the new preferences from `agency_context_ext` in readable form.
