# CRM — 20-Point Spec Implementation Status

Maps each item from [CRM_FUNCTIONAL_SPEC.md](CRM_FUNCTIONAL_SPEC.md) (the canonical basic premises) to current implementation. **Done** = implemented; **Partial** = partly in place; **Missing** = not started.

| # | Spec item | Status | Where / Notes |
|---|-----------|--------|----------------|
| 1 | **Core data fields (property & owner)** | **Partial** | Property: address, price, beds, baths, size, type, title, description, URL, owner ref. Owner: name, email, phone, notes. **Missing:** photos; source platform; full rental terms. |
| 2 | **Custom pipelines (Acquisition + Chatbot)** | **Partial** | **Done:** Sales + Chatbot pipelines, stage dropdowns, manual stage change (PATCH). **Missing:** stages tailored to acquisition workflow; auto-move on events. |
| 3 | **Owner-based architecture** | **Done** | Owner-centric DB; one owner → many properties; property view shows all owner properties as clickable cards/tabs. |
| 4 | **Viability and scoring fields** | **Partial** | **Done:** viability score, estimated revenue, P/E, strengths, risks, certainty. **Missing:** operating costs, cash flow projection, revenue potential rating as distinct fields. |
| 5 | **Scraped data & two-way sync** | **Partial** | **Done:** CRM reads/writes DB; display structured. **Missing:** auto-pull from scraper; bidirectional consistency with scraper. |
| 6 | **Communication channels** | **Partial** | **Done:** channel stored per message (Email, WhatsApp, etc.); list by channel. **Missing:** UI structured per channel (tabs/sections); Phone/SMS as first-class. |
| 7 | **Conversation history** | **Partial** | **Done:** full history, thread view, channel + sender + timestamps, no-delete (API has no delete). **Missing:** searchable history. |
| 8 | **AI conversation control** | **Partial** | **Done:** per-property toggle + “AI Stops At” dropdown (PATCH). **Missing:** prominent global toggle; integration into AI logic (stop at stage). |
| 9 | **AI context source** | **Done** | LLM uses existing operator/context (Airbnb model); no separate template library. |
| 10 | **Attention flags & notifications** | **Missing** | Flag conversations (objection, legal, etc.); push notifications to user; toast + bell. |
| 11 | **Automation levels** | **Partial** | **Done:** “AI Stops At” per property. **Missing:** graded modes (manual / semi / until stage / full); stage-aware config. |
| 12 | **Lead creation & messaging control** | **Partial** | **Done:** manual lead entry; configurable at UI. **Missing:** auto-create profile on lead identified; “no messaging until approval” enforced in AI. |
| 13 | **Real-time property evaluation panel** | **Done** | Evaluation block: score, recommendation, revenue, P/E, strengths, risks, certainty; “Not Certain” when uncertain; cash flow placeholder; scrollable, distinct. |
| 14 | **Bulk actions** | **Partial** | **Done:** select multiple, Mark as Contacted, Update pipeline stage, Export selected. **Missing:** bulk Send message. |
| 15 | **Automatic pipeline movement** | **Missing** | Auto-move on reply received, call booked, agreement, contract signed. |
| 16 | **Reporting and export** | **Done** | Export all properties CSV, all owners CSV, all chat history CSV; single owner CSV. |
| 17 | **User roles** | **Done** | Single-user; no roles/permissions. |
| 18 | **Compliance features** | **N/A** | Not defined at this stage. |
| 19 | **Manual lead entry** | **Partial** | **Done:** manual form with email, source URL (listing_url), name, phone, price, bedrooms, location. **Missing:** mandatory enforcement (Email + Source URL only); duplicate detection/merge; Mongo in cloud mode. |
| 20 | **Additional features** | **N/A** | None required. |

---

## Summary

- **Done:** 3, 9, 13, 16, 17 (and 18/20 N/A).
- **Partial:** 1, 2, 4, 5, 6, 7, 8, 11, 12, 14, 19.
- **Missing:** 10, 15.

The 20-point spec is the source of truth; this table is updated as implementation progresses.
