# CRM interface design

**Status:** In progress. This doc defines plugs, databases, flows, and data sources for the CRM.

- **Functional specification:** [CRM_FUNCTIONAL_SPEC.md](CRM_FUNCTIONAL_SPEC.md) — full 20-point product spec (data fields, pipelines, owner-centric model, viability, sync, channels, conversation history, AI control, notifications, automation, evaluation panel, bulk actions, export, manual entry, etc.).
- **Implementation status:** [CRM_IMPLEMENTATION_STATUS.md](CRM_IMPLEMENTATION_STATUS.md) — checklist of what is done, partial, or not done and where it lives in the codebase.

---

## 1. Plugs (interfaces the CRM should have)

### 1.1 Inbound (CRM consumes)

| Plug | Purpose | Source |
|------|--------|--------|
| **Leads feed** | New or updated leads (post-scan, post-analysis, post–contact extraction). | Scraper pipeline → leads DB or API. |
| **Contact events** | “Email sent”, “Form submitted”, “FB message sent”, “Marked contacted”. | Bot / outreach layer (e.g. `storage.log_contacted`, or equivalent API). |
| **Listings context** | Optional listing details (title, location, price, `listing_ref`) for a lead. | Listings backend (SQLite or MongoDB). |
| **Operator context** | Which agency/operator “owns” the client (multi-tenant). | Operator onboarding DB (`operators` in `providers.db`). |

### 1.2 Outbound (CRM exposes)

| Plug | Purpose | Consumers |
|------|--------|-----------|
| **Clients API** | List/filter clients, get one client, create/update client, update stage/status. | Real-estate-scout UI, Data page, exports. |
| **Communications API** | List comms for a client, append comm (system or manual). | Client Communications tab, client detail panel. |
| **Pipeline state** | Stage, status, automation_enabled, last_contacted_at. | Pipeline view, bot (who to contact / exclude). |
| **Automation rules** | Which clients are in/out of automated follow-up. | Bot / scheduler (e.g. “only contact if automation_enabled and stage = X”). |

### 1.3 Optional: external CRM sync

- **Outbound webhook or export:** Push client/comm changes to an external CRM (e.g. HubSpot, Pipedrive) via webhook or scheduled export.
- **Inbound webhook:** Accept “contact added” or “stage changed” from an external system if you ever mirror from outside.

---

## 2. Databases the CRM should interface with

### 2.1 Recommended: single “pipeline” store (SQLite or Mongo)

Use **one** store for pipeline/CRM entities so the CRM has a single source of truth:

| Data | Table / collection | Owner | CRM role |
|------|--------------------|--------|----------|
| **Leads** | `leads` | Bot + backend | **Read**: new leads. **Write**: status updates from CRM (e.g. “contacted”, “converted”). |
| **Clients** | `clients` (new) | CRM | **Read/Write**: CRM is source of truth. Derived from leads when first contact is made, or created manually. |
| **Communications** | `communications` (new) | CRM + bot | **Read/Write**: CRM and bot both append. |
| **Activity logs** | `activity_logs` / `logs` | Bot + backend | **Read**: CRM shows “last actions” or feed. Optional write for “user logged comm” events. |
| **Agents** | `agents` | Backend | **Read**: CRM may show “agent listings” as non-client records or link to clients. |

Today:

- **SQLite:** `operator_onboarding/providers.db` already has `leads`, `agents`, `activity_logs`. Add `clients` and `communications` there, or introduce a dedicated `pipeline.db` / `crm.db` if you want to keep operator DB strictly for operators/documents.
- **MongoDB (when `MONGO_URI` set):** Collections `leads`, `agents`, `logs` exist. Add collections `clients` and `communications` in the same DB (e.g. `coldbot`).

So: **CRM interfaces to the same DB that already holds leads/agents/logs** — either the existing SQLite DB that has those tables, or MongoDB. No separate “CRM database” unless you explicitly want one for scale or isolation.

### 2.2 Other databases (read-only or reference)

| Database | Path / env | CRM use |
|----------|------------|---------|
| **Listings** | Backend SQLite or Mongo `listings` | Read listing by `listing_ref` or `source_url` to show property context on client/lead. |
| **Operators** | `operator_onboarding/providers.db` → `operators` | Read operator_id / company_name for “which agency” and for filtering clients by operator. |

So: **CRM reads from Listings and Operators**; it does not need to write there.

### 2.3 Bot “contacted” store (leads.db or config)

- **Current design:** Bot uses `config["database"]` (e.g. `leads.db`) and a `storage` module (`already_contacted`, `log_contacted`).
- **CRM alignment:** Either (a) bot writes to the **same** pipeline DB (same `leads` table and new `communications` table), and CRM reads/writes that, or (b) bot keeps writing to `leads.db` and a small **sync job** or **API** copies “contacted” events into the pipeline DB’s `clients` / `communications`. Prefer (a) so there is one place for “who was contacted and when”.

---

## 3. Flows the CRM sits in

### 3.1 Lead → Client (first contact)

1. Scraper / analysis produces **leads** (in `leads` table or CSV today).
2. Bot (or manual action) performs **first contact** (email, form, FB).
3. **Event:** “Lead X contacted at T”.
4. **CRM:** Create or update **client** from that lead (link `client.lead_id` or `client.listing_hash` / `source_url`), set initial stage, append first **communication** row (channel, timestamp, status).
5. Optional: copy useful fields from **listings** (by `listing_ref` / URL) into client or display only in UI.

### 3.2 Ongoing communications

1. Bot sends follow-up → writes to **communications** (or activity_logs) and updates client’s `last_contacted_at` / `last_interaction`.
2. User logs a call or note in CRM → **POST** to Communications API → append row, optionally update client stage/notes.
3. CRM UI reads **communications** by `client_id` for the detail panel.

### 3.3 Pipeline and automation

1. **Pipeline view** reads **clients** (and optionally **leads** not yet clients) with stage/status; filters by operator, source, channel.
2. User moves client to stage “Meeting booked” or “Lost” → **PATCH** client stage/status.
3. User toggles “automation on/off” → **PATCH** client → bot/scheduler **reads** this to decide whether to include in next run.
4. **Data / Export:** Same **clients** and **communications** tables; export CSV/Excel from API or from DB.

### 3.4 Listings and operators (read-only for CRM)

- **Listings:** When showing a client, CRM can **GET** listing by `source_url` or `listing_ref` from the listings backend (or from a shared `listings` table in Mongo) to show title, location, price.
- **Operators:** Filter clients by `operator_id`; show operator name from **operators** table.

---

## 4. Data sources summary

| Source | Direction | Content | Use in CRM |
|--------|-----------|---------|------------|
| **Leads (DB or API)** | Into CRM | contact_email, contact_phone, source_url, status, channel, listing_hash, etc. | New leads list; create client on first contact. |
| **Bot contact events** | Into CRM | “Contacted at T, channel, outcome” | Create/update client; append communication. |
| **Listings backend** | Read | listing_ref, title, location, price, listing_url | Enrich client/lead view. |
| **Operators DB** | Read | operator_id, company_name | Tenant filter; “owned by” display. |
| **User input (UI)** | Into CRM | New client, manual comm, stage change, notes, automation toggle | Clients + Communications APIs. |
| **CRM (clients + comms)** | Out | Client list, comm history, stage, automation | Pipeline UI, Data page, bot, export. |

---

## 5. Minimal API surface (for when you build it)

So the future CRM can be wired without rework:

- **GET/POST** `.../api/clients` — list (with filters: stage, source_type, channel, operator_id, q), create.
- **GET/PATCH** `.../api/clients/:id` — one client, update (including stage, status, automation_enabled, notes).
- **GET/POST** `.../api/clients/:id/communications` — list comms for client, log new comm.
- **Optional:** **GET** `.../api/leads` (existing or from same pipeline DB) and **PATCH** `.../api/leads/:id` for status, so “leads” and “clients” stay in sync where they overlap.

Use the **same** backend that already serves operators and (when present) leads/listings — e.g. FastAPI or Node — and the same DB choice (SQLite or Mongo) as the rest of the pipeline. That gives you one place for databases and one set of flows and data sources for the CRM to interface with.
