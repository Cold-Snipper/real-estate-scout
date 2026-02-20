# CRM — 16 Functions Implementation Status

**Note:** The canonical requirements are the **20-point functional spec** in [CRM_FUNCTIONAL_SPEC.md](CRM_FUNCTIONAL_SPEC.md). Status aligned to those 20 points is in [CRM_20_SPEC_STATUS.md](CRM_20_SPEC_STATUS.md). This 16-function list remains as a legacy implementation checklist.

Maps each required function to current implementation. **Done** = implemented; **Partial** = partly in place; **Missing** = not started.

| # | Function | Status | Where / Notes |
|---|----------|--------|----------------|
| 1 | **Owner-Centric Lead Management** | **Partial** | **Done:** list, search/filter, profile, properties as cards, create owner, **edit owner (PATCH + Save in UI)**. **Missing:** auto-create from scraper. |
| 2 | **Property Profile Management** | **Partial** | **Done:** display, valuation, Re-evaluate Now, **"Not Certain" badge**, **cash flow placeholder**. **Missing:** auto-populate from scraper. |
| 3 | **Custom Pipeline Tracking** | **Partial** | **Done:** pipelines, counts, manual stage (PATCH). **Missing:** auto-move on events. |
| 4 | **Multi-Channel Conversation Management** | **Partial** | **Done:** GET/POST conversations API, thread list in UI, **"Messages cannot be deleted"** note. **Missing:** searchable history; full thread per channel. |
| 5 | **AI Automation Controls** | **Partial** | **Done:** per-property toggle + AI Stops At (PATCH). **Missing:** global toggle, AI logic integration. |
| 6 | **Real-Time Property Valuation** | **Done** | Score, recommendation, revenue, P/E, strengths, risks, certainty, Re-evaluate Now, cash flow placeholder. |
| 7 | **Bulk Actions** | **Done** | **Done:** checkboxes, Select all/Clear, **Mark as Contacted**, **Change status**, **Export selected**; POST /api/crm/bulk-update. **Missing:** bulk Send message, bulk Delete. |
| 8 | **Manual Lead/Owner Entry** | **Partial** | **Done:** Add owner with **email, name, phone, notes, listing_url, price, bedrooms, location**. **Missing:** duplicate detection/merge. |
| 9 | **Exports** | **Done** | **Done:** All Owners CSV, **All Properties CSV**, **Single Owner CSV**, **All Chat History CSV**. |
| 10 | **Notifications & Flagging** | **Missing** | Flag conversations, toast + bell. |
| 11 | **Data Synchronization** | **Partial** | CRM SQLite. **Missing:** scraper → CRM auto-create; bidirectional sync. |
| 12 | **Single-User System** | **Done** | No roles. |
| 13 | **Process Flow Visibility** | **Done** | **Done:** Process Flow tab with **6-step panel** (Onboarding, Database, Context, LLM, Outreach, Logging) + pipeline stage counts. |
| 14 | **Search & Filters** | **Done** | **Done:** search, status, channel, **min viability**, **city**. **Missing:** date range. |
| 15 | **Audit & Logging** | **Partial** | Recent Logs tab. **Missing:** log CRM actions from API. |
| 16 | **Integration Points** | **Partial** | Valuation API; operator context. **Missing:** scanner → CRM; CRM → scanner. |

---

## Implemented this pass

1. **PATCH owner** — `update_owner()` in crm_storage; `PATCH /api/crm/owners/:id`; editable owner details in profile dialog with Save.  
2. **Conversations API** — `get_conversations`, `add_conversation`; `GET/POST /api/crm/properties/:id/conversations`; thread list in property detail with "Messages cannot be deleted".  
3. **Bulk actions** — Checkboxes per owner, Select all / Clear; bulk bar: Mark as Contacted, Change status (dropdown), Export selected, Clear; `POST /api/crm/bulk-update`.  
4. **Exports** — All Owners CSV, All Properties CSV (`GET /api/crm/properties/export`), Single Owner CSV (`GET /api/crm/owners/:id/export`), All Chat History CSV (`GET /api/crm/conversations/export`).  
5. **Process flow panel** — 6 steps (Onboarding, Database, Context, LLM, Outreach, Logging) with counts (operators, db status, leads, logs).  
6. **Filters** — Min viability (1–10), City (client-side).  
7. **Manual entry** — Add owner form: price, bedrooms, location.  
8. **Not Certain** — Badge in property detail when degree_of_certainty indicates not certain.  
9. **Cash flow** — Placeholder line in valuation block.  

## Still missing (later)

- Audit: log every CRM action from API to activity_logs or file.  
- Notifications & flagging (toast + bell, keyword-based).  
- Scraper → CRM auto-create; bidirectional sync.  
- Auto-move pipeline on events.  
- Global AI toggle; AI logic integration.  
