# CRM Implementation Status

Maps each item in [CRM_FUNCTIONAL_SPEC.md](CRM_FUNCTIONAL_SPEC.md) to the codebase. **Done** = implemented; **Partial** = partly in place; **Not done** = not started.

| # | Spec section | Status | Where / notes |
|---|----------------|--------|----------------|
| 1 | Core data fields (property & owner) | **Partial** | Schema: `lib/crm_storage.py` (owners, properties). Has: title, price, bedrooms, bathrooms, size_sqm, location, description, source_url, contact_*, listing_type; owner name, email, phone, notes. Added: address, source_platform, rental_terms, photos. |
| 2 | Two pipelines (Acquisition + Chatbot) | **Partial** | Schema: `sales_pipeline_stage`, `chatbot_pipeline_stage` on properties. UI: Process Flow tab shows acquisition stages; chatbot pipeline view not yet separate. |
| 3 | Owner-based architecture | **Done** | Schema: owners primary, properties.owner_id. UI: owner list, modal shows all properties for owner, properties clickable. |
| 4 | Viability and scoring fields | **Partial** | Schema: viability_score, recommendation, estimated_annual_gross, price_to_earnings, degree_of_certainty. Added: estimated_operating_costs, cash_flow_projection, risk_indicators. UI: valuation block in modal (score, recommendation, est. revenue). Full panel (scrollable, uncertainty) partial. |
| 5 | Scraped data + two-way sync | **Not done** | No scraper→CRM sync nor CRM→DB edit persistence for scraped fields yet. Design: CRM_INTERFACE_DESIGN.md §2–3. |
| 6 | Communication channels | **Partial** | Schema: `conversations.channel` (email, whatsapp, messenger, etc.). UI: channel-specific thread view not built. |
| 7 | Conversation history | **Partial** | Schema: conversations (property_id, channel, message_text, sender, timestamp). No-delete policy not enforced in API. UI: “Thread view per channel (coming soon)”. |
| 8 | AI automation toggle + stop stage | **Partial** | Schema: `automation_enabled`, `ai_stop_stage` on properties (or owner). UI/API: not yet exposed. AI logic integration pending. |
| 9 | AI context source | **Done** | Existing chatbot/operator context; no separate template library. |
| 10 | Attention flags and notifications | **Not done** | No flagging nor push notifications yet. |
| 11 | Automation levels | **Partial** | Operator onboarding has automation_level in agency_context_ext. CRM-level automation config (manual / semi / auto until stage / full) not in CRM UI. |
| 12 | Lead creation and messaging control | **Not done** | Auto-create profile on new lead + “no message until approval” config not implemented. |
| 13 | Real-time property evaluation panel | **Partial** | UI: valuation block (score, recommendation, est. revenue). Scrollable, uncertainty-explicit, cash flow/risk panel to be expanded. |
| 14 | Bulk actions | **Not done** | No bulk select, send, update stage, mark contacted, export in UI. |
| 15 | Automatic pipeline movement | **Not done** | No event-based auto-move (reply received, call booked, etc.). |
| 16 | Reporting and export | **Not done** | No export of property, owner, or chat history yet. |
| 17 | User roles | **Done** | Single-user; no roles. |
| 18 | Compliance features | **N/A** | None required at this stage. |
| 19 | Manual lead entry | **Not done** | No manual entry UI; no duplicate detection/merge. Spec: mandatory Email + Source URL; store in DB. |
| 20 | Additional features | **N/A** | None required. |

---

## Code references

- **Schema & init:** `lib/crm_storage.py` (owners, properties, conversations; migrations for new columns).
- **API:** `operator_onboarding/api_server.py` — `GET /api/crm/owners`.
- **UI:** `real-estate-scout/src/pages/CRMPage.tsx` (owner list, process flow tab, owner modal with properties + valuation stub).
- **Design:** `docs/CRM_INTERFACE_DESIGN.md` (plugs, DBs, flows).
- **Spec:** `docs/CRM_FUNCTIONAL_SPEC.md` (this checklist’s source).

---

## Next implementation priorities

1. **API:** POST/PATCH owners and properties; GET/POST conversations; PATCH pipeline stages and automation_enabled/ai_stop_stage.
2. **UI:** Conversation thread by channel; AI toggle and stop-stage dropdown; manual lead entry (email + source URL); export (property, owner, chat).
3. **Logic:** Auto-create owner/property on new lead; optional “no message until approval”; pipeline auto-move on events; duplicate detection/merge.
