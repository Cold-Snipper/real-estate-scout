# CRM in Immo Snippy — Design & Build Recap

This doc is the **in-depth recap** of everything designed and built for the CRM in Immo Snippy (owner-centric, pipelines, valuation, channels, AI controls, exports). The CRM page in the app (`/crm`) reflects this scope; items marked *coming soon* are in the design and shown in the UI where applicable.

---

## 1. Overall CRM Vision & Philosophy

The CRM is **owner-centric**, not property-centric.  
One owner can have multiple properties. The main view is an owner list. Clicking an owner opens their profile, which shows all their properties as clickable cards/tabs. Each property has its own detail view with full data, real-time valuation, cash flow simulation, conversation history, and actions.

The CRM is deeply integrated with the rest of Immo Snippy:

- Scraped data from websites/Facebook automatically creates/updates owner + property profiles (bidirectional sync)
- **Real-time Property Valuation Context** (viability score, recommendation, estimated revenue, P/E ratio, strengths, risks, degree of certainty) is displayed on every property view
- AI automation is controlled per owner/property (toggle + "AI stops at" stage)
- All conversations (across all channels) are tracked with full history
- Every action is logged for audit and billing
- Manual overrides and bulk actions are fully supported
- Single user for now (no roles yet)

**Goal:** Give Airbnb management agencies a powerful, clear, owner-focused tool to manage leads, conversations, and conversions while the bot handles the heavy lifting.

---

## 2. Data Model & Fields

**Owner Profile** (central entity)

- owner_name  
- owner_email (mandatory for manual entry)  
- owner_phone  
- owner_notes (internal)  
- created_at, updated_at  

**Property Profile** (linked to owner, multiple per owner)

- title, price, bedrooms, bathrooms  
- surface_m2 (schema; was size_sqm)  
- location (city + neighborhood)  
- description  
- listing_url (schema; was source_url)  
- contact_email, phone_number, phone_source (schema)  
- transaction_type (schema; was listing_type)  
- viability_score (1–10, real-time from evaluator)  
- recommendation ("Strong Buy", "Good", "Marginal", "Avoid")  
- estimated_annual_gross_revenue  
- price_to_earnings_ratio  
- degree_of_certainty ("High", "Medium", "Low", "Not Certain")  
- key_strengths, key_risks  
- sales_pipeline_stage  
- chatbot_pipeline_stage  
- last_contact_date  
- created_at, updated_at  

**Conversation History** (per property, per channel)

- channel (email, whatsapp, messenger, group_comment, form, phone, sms)  
- message_text, sender ("owner", "ai", "user"), timestamp  
- No deletion allowed  

**Viability Evaluation** (real-time, from Property Valuation Context)

- viability_score, recommendation, estimated_annual_gross_revenue, price_to_earnings_ratio  
- key_strengths, key_risks  
- degree_of_certainty (explicitly "Not Certain" when unsure)  

**Activity Logs** (system-wide)

- timestamp, action_type (Scan, Analysis, Send, Log Agent, etc.), details, status  

**Exports**

- All Properties (CSV), All Owners (CSV), All Chat History (CSV or ZIP), Single Owner/Profile (CSV)  

---

## 3. Custom Pipelines

**Sales Pipeline** (property acquisition)

- New Lead → Contacted → Interested → Call Booked → Proposal Sent → Contract Signed → Onboarded → Active Client  

**Chatbot Pipeline** (AI conversation progress)

- No Contact → First Message Sent → Replied → Interested → Call Booked → Closed (AI stops here based on setting)  

---

## 4. Communication Channels

All channels are tracked separately with full threaded history:

- Email, WhatsApp, Facebook Messenger, Facebook Group Comments, Website Forms, Phone / SMS  

Each channel has its own thread view with timestamps and sender. *(Thread UI coming soon.)*

---

## 5. AI Automation Controls

- **Prominent global toggle:** "Allow AI to continue conversations automatically" (on/off)  
- **Per-owner or per-property dropdown:** "AI stops at" — Contact established, Interest expressed, Completely sold, Never (manual only)  
- Logic integrates with the AI (stop auto-replies at the selected stage). *(Backend wiring coming soon.)*  

---

## 6. Real-time Property Evaluation

On every property detail view:

- Scrollable **Property Valuation Context** section  
- Shows: viability_score, recommendation, estimated revenue, cash flow simulation, degree_of_certainty  
- Explicitly states "Not Certain" when the model is unsure  
- Button: **Re-evaluate now** (triggers `evaluate_property` via `POST /api/crm/valuate`)  
- Uses: market data cache, future context 2026–2031, ai_lm_content daily rental prompt + reference  

---

## 7. Key Pages & Functionality

**Main CRM Dashboard (/crm)**

- Owner list (searchable by name/email/phone, filterable by sales stage)  
- Click owner → Owner profile with all properties as cards  
- Each property card shows viability score, recommendation, chatbot stage  
- **Process Flow** tab: Sales pipeline + Chatbot pipeline stage counts  

**Owner Profile View**

- Owner details (name, email, phone, notes)  
- All properties as clickable cards; click property → Property detail in same dialog  
- Full conversation history (all channels, threaded) *(coming soon)*  
- AI automation controls for this owner *(dropdown coming soon)*  

**Property Detail View**

- All property fields (editable in future)  
- Real-time Property Valuation Context section + Re-evaluate now  
- Full conversation history for this property *(coming soon)*  
- Action buttons: Send Message, Mark Contacted, Book Call, Export *(placeholders in UI; coming soon)*  

**Data & CRM Page (/data)**

- Summary cards (Total Leads, Total Agents, Recent Activity)  
- Data panels: Leads, Agents, Activity Logs, Config, LU Listings  
- Leads/Agents tables with filters, Export CSV, row click → detail modal  

**Process Flow Visibility**

- Sales pipeline + Chatbot pipeline stage counts on CRM **Process Flow** tab  

---

## 8. Additional Features

- **Bulk actions:** Select multiple leads → Send Message, Mark as Contacted, Export, Delete, Change Status *(coming soon)*  
- **Manual lead entry:** "Add Manual Lead" with mandatory owner_email, owner_phone, property_url, price, bedrooms, location *(coming soon)*  
- **Exports:** All Properties, All Owners, All Chat History, Single Owner/Profile *(coming soon)*  
- **Notifications:** Flag conversations needing attention (objection, price question, legal query) → toast + bell *(coming soon)*  
- **Bidirectional sync:** Scraped data auto-populates CRM; edits in CRM save back to database  
- **Single user** (no roles yet)  

---

## Implemented in the app today

- Owner-centric list and profile dialog  
- Owner details (name, email, phone, notes)  
- Properties as cards with viability score, recommendation, chatbot stage  
- Search (name, email, phone) and filter (sales stage)  
- Sales + Chatbot pipeline tabs with stage counts  
- Property valuation: Re-evaluate now → market data + 2026–2031 + LLM; full result (score, recommendation, reasoning, strengths, risks, market summary)  
- Full property detail block (all recap fields, including degree_of_certainty)  
- Channels list and AI automation placeholders  
- Action buttons (Send message, Mark contacted, Book call, Export) as placeholders  
- CRM design scope collapsible (recap summary)  
- Schema-aligned fields: surface_m2, listing_url, phone_number, transaction_type  

See **CRM_INTERFACE_DESIGN.md** and **CRM_FUNCTIONAL_SPEC.md** for plugs and data flow; **CRM_IMPLEMENTATION_STATUS.md** for checklist.
