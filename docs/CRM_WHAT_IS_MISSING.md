# What’s missing in the CRM

This list is derived from **CRM_FUNCTIONAL_SPEC.md**, **CRM_IMPLEMENTATION_STATUS.md**, and **CRM_RECAP_DESIGN_AND_BUILD.md**. The Grok share link could not be read (content loads client-side), so gaps are inferred from these docs.

---

## Already in place

- Owner-centric list and profile dialog; owner details; properties as cards with viability, recommendation, chatbot stage
- Search (name/email/phone) and filter by sales stage
- Sales + Chatbot pipeline tabs with stage counts
- Property valuation: Re-evaluate now (market data + 2026–2031 + LLM)
- Full property detail block; channels list and AI automation **placeholders**
- Action buttons (Send message, Mark contacted, Book call, Export) as **placeholders**
- Schema-aligned fields (surface_m2, listing_url, phone_number, transaction_type)

---

## Missing or partial (by spec)

### 1. **Manual lead / owner entry** (Spec §19)

- **Missing:** UI to add an owner (and optional property) with mandatory **email** and **source URL** (listing_url).
- **Missing:** Backend `POST /api/crm/owners` to create owner + optional property; duplicate detection (e.g. by email) and merge not implemented.

### 2. **Conversation history (thread view)** (Spec §6, §7)

- **Partial:** Schema has `conversations` (property_id, channel, message_text, sender, timestamp). No API to list/post conversations; UI shows “Thread view per channel (coming soon)”.

### 3. **AI automation controls (real)** (Spec §8)

- **Partial:** Schema has `automation_enabled`, `ai_stop_stage` on properties. UI shows labels only; no toggle/dropdown that PATCHes the backend; AI logic does not read these yet.

### 4. **Exports** (Spec §16)

- **Missing:** Export All Properties CSV, All Owners CSV, All Chat History. Buttons are placeholders; no `GET /api/crm/.../export` or equivalent.

### 5. **Bulk actions** (Spec §14)

- **Missing:** Select multiple owners/properties; bulk Send message, Mark contacted, Update stage, Export.

### 6. **Scraped data + two-way sync** (Spec §5)

- **Missing:** Scraper → CRM auto-create/update; CRM edits persisting back to DB (PATCH owner/property).

### 7. **Pipeline stage / property updates from UI** (Spec §2, §15)

- **Missing:** Changing sales_pipeline_stage or chatbot_pipeline_stage from the UI and persisting (PATCH property). Automatic pipeline movement on events (reply, call booked) not implemented.

### 8. **Attention flags and notifications** (Spec §10)

- **Missing:** Flagging conversations that need human attention; push/toast notifications.

### 9. **Lead creation and messaging control** (Spec §12)

- **Missing:** Auto-create owner/property when a new lead is identified; “no message until approval” setting.

### 10. **Real-time evaluation panel (full)** (Spec §13)

- **Partial:** Valuation block exists; cash flow simulation and richer risk/uncertainty display could be expanded.

---

## Next implementation priorities (from CRM_IMPLEMENTATION_STATUS)

1. **API:** POST/PATCH owners and properties; GET/POST conversations; PATCH pipeline stages and automation_enabled/ai_stop_stage.
2. **UI:** Conversation thread by channel; AI toggle and stop-stage dropdown; manual lead entry (email + listing URL); export (property, owner, chat).
3. **Logic:** Auto-create owner/property on new lead; “no message until approval”; pipeline auto-move on events; duplicate detection/merge.

---

## One-line check after adding missing pieces

```bash
# Manual entry: POST /api/crm/owners with { owner_email, owner_name?, listing_url?, ... }
# Export: GET /api/crm/owners/export → CSV
# Pipeline update: PATCH /api/crm/properties/:id { sales_pipeline_stage, chatbot_pipeline_stage }
```
