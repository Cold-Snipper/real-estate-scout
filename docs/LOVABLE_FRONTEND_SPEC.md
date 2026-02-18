# Lovable frontend spec — Immo Snippy (real-estate-scout)

This document gives **Lovable** (or any frontend builder) everything needed to build or extend the **Immo Snippy** dashboard: API contracts, data shapes, backend context, and UI requirements.

---

## 1. Backend context

- **App (Immo Snippy)**: Real estate listing discovery and lead pipeline: scrape sites (athome, immotop, Facebook, etc.) → classify → contact (email/WhatsApp) → log leads. LU Listings (immo-snip) optional.
- **Frontend**: Vite + React app in **real-estate-scout/**. It calls backend APIs (see below). No backend code lives in this repo; run your own API server that implements the contract.
- **How to run frontend**: From repo root, `cd real-estate-scout && npm install && npm run dev`. Set `VITE_API_URL` (or equivalent) to your API base URL (e.g. `http://localhost:1111`). Use relative paths like `/api/leads` when frontend and API are same origin.
- **CORS**: When frontend is on a different origin (e.g. Vite on port 8080, API on 1111), the dashboard sets `Access-Control-Allow-Origin` from env `ALLOWED_ORIGIN` (default `http://localhost:8080`), `Allow-Credentials: true`, and allows GET/POST/PUT/DELETE and `Content-Type`, `Authorization`. Use `credentials: "include"` on fetch.
- **Auth (optional)**: If `AUTH_SECRET` and Google OAuth env vars are set, `GET /api/auth/login` redirects to Google; `GET /api/auth/callback` sets session cookie; `GET /api/auth/me` returns current user; `POST /api/auth/logout` clears session. Session cookie is same-site; for cross-origin frontends, ensure cookie behavior is acceptable or run same-origin.

---

## 2. API reference

All responses are JSON unless noted. Errors: `{ "error": "string" }` with status 4xx/5xx.

### 2.1 GET `/api/config`

**Response:** Full config object (YAML parsed to JSON).

**Shape (main keys):**
```ts
{
  start_urls?: string[];
  source_type?: "website" | "facebook";
  countries?: string[];
  target_sites_by_country?: Record<string, string[]>;
  database?: string;           // e.g. "leads.db"
  headless?: boolean;
  ollama_model?: string;
  llm_provider?: string;
  email?: { from?: string; app_password?: string; smtp_host?: string };
  message_templates?: { email?: { subject?: string; body?: string }; whatsapp?: { body?: string } };
  limits?: {
    max_contacts_per_hour?: number;
    parallel_urls?: number;
    requests_per_minute?: number;
    scroll_depth?: number;
    delay_min?: number; delay_max?: number;
    cooldown_min?: number; cooldown_max?: number;
    cycle_cooldown_seconds?: number;
    fb_requests_per_minute?: number;
    fb_delay_min?: number; fb_delay_max?: number;
    fb_max_urls_per_run?: number;
    fb_max_scroll_depth?: number;
  };
  selectors?: { listing?: string };
  facebook?: {
    marketplace_enabled?: boolean;
    marketplace_url_template?: string;
    messaging_enabled?: boolean;
    groups_database?: string;
    groups_by_country?: Record<string, string[]>;
    headless?: boolean;
  };
  criteria?: string;
  airbnb_criteria?: string;
  manual_approve?: boolean;
  // ... other optional keys
}
```

### 2.2 POST `/api/config`

**Body (partial updates):**
```ts
{
  start_urls?: string[];
  source_type?: "website" | "facebook";
  facebook?: Record<string, unknown>;  // merged into config.facebook
}
```

**Response:** `{ "ok": true, "message": "Config updated" }` or `{ "error": "string" }`.

---

### 2.3 GET `/api/leads`

**Response:** Array of lead records (last 500).

**Row shape:**
```ts
{
  id: number;
  listing_hash: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source_url: string | null;
  is_private: number;      // 0 | 1
  confidence: number;
  reason: string | null;
  status: string | null;
  message_subject: string | null;
  message_body: string | null;
  channel: string | null;
  timestamp: number;      // Unix seconds
}
```

### 2.4 GET `/api/agents`

**Response:** Array of agent listing records (last 500).

**Row shape:**
```ts
{
  id: number;
  agency_name: string | null;
  listing_title: string | null;
  price: string | null;
  location: string | null;
  url: string | null;
  contact: string | null;
  reason: string | null;
  timestamp: number;     // Unix seconds
}
```

### 2.5 GET `/api/logs`

**Response:** Array of log rows (last 200), with `time` added.

**Row shape:**
```ts
{
  id: number;
  listing_hash: string | null;
  contact_email: string | null;
  source_url: string | null;
  status: string | null;
  channel: string | null;
  timestamp: number;
  time: string;           // ISO date string (timestamp * 1000)
}
```

---

### 2.6 GET `/api/run`

**Response:** `{ "running": boolean }` — whether the bot process is currently running.

### 2.7 POST `/api/run`

**Body:** `{ "dryRun"?: boolean }` — default `true` (no emails sent).

**Response:** **Stream** (not JSON). `Content-Type: application/x-ndjson`. Each line is JSON:
```ts
{ "type": "status" | "stdout" | "stderr" | "exit", "data": string }
```
- `exit`: `data` is exit code string (e.g. `"0"`). Stream ends after this.
- If bot already running: HTTP 409, body `{ "error": "Bot already running" }`.

**Frontend:** Use `fetch()` with `response.body.getReader()`, decode chunks, split by `\n`, parse each line as JSON, and update UI (e.g. append to log view). When `type === "exit"`, stop reading and mark run as stopped.

### 2.8 DELETE `/api/run`

**Response:** `{ "ok": true, "message": "Stop requested" }` or `{ "ok": true, "message": "No process running" }`. Stops the running bot (SIGINT).

---

### 2.9 GET `/api/targets`

**Response:** Static JSON for website scan (countries + sites per country + listing types).

**Shape:**
```ts
{
  countries: string[];
  defaultListingTypes?: Array<{ value: string; label: string; path: string }>;
  sitesByCountry: Record<string, Array<{
    id: string;
    label: string;
    baseUrl: string;
    listingTypes?: Array<{ value: string; label: string; path: string }>;
  }>>;
}
```

**Example:** For Luxembourg, `sitesByCountry["Luxembourg"]` includes `{ id: "athome", label: "atHome.lu", baseUrl: "https://www.athome.lu/", listingTypes: [...] }`. Start URL = `baseUrl` + chosen `listingTypes[].path`.

**Frontend fallback:** The dashboard bundles a static copy of EU targets (`src/data/targets_eu.json`) so the Website Bot form always shows all countries and sites even when the API is unavailable. On load, the form prefills **Luxembourg** and **atHome.lu** as defaults.

---

### 2.10 GET `/api/database`

**Response:** MongoDB status (optional feature; main DB is SQLite).

**Shape:**
```ts
{ "configured": false, "message": "MONGO_URI is not set. ..." }
// or
{ "configured": true, "cluster"?: string, "user"?: string, "message"?: string }
```
Password is never exposed.

---

### 2.11 POST `/api/test`

**Response:** **Stream** (`Content-Type: application/x-ndjson`). Same line format as `/api/run`: `{ "type": "status" | "stdout" | "stderr" | "exit", "data": string }`. Runs backend tests (e.g. pytest) via the API; implementation is server-side.

### 2.12 POST `/api/build`

**Response:** **Stream** (same NDJSON format). Runs `npm run build` in the dashboard directory. Use same streaming read pattern as `/api/run`.

### 2.12a POST `/api/test/website`

**Response:** **Stream** (same NDJSON format). Runs website-bot-specific tests. Frontend calls this from Test & Build → Test Website Bot.

### 2.12b POST `/api/test/facebook`

**Response:** **Stream** (same NDJSON format). Runs Facebook-bot-specific tests. Frontend calls this from Test & Build → Test Facebook Bot.

### 2.12c Website bot stubs (optional)

The dashboard calls these; backend may implement or return 501:

- **POST `/api/website/test-single-page`** — Test single page scrape.
- **POST `/api/website/preview`** — Return extracted listings preview.
- **POST `/api/website/send-forms`** — Send via website forms.

### 2.12d Facebook bot stubs (optional)

The dashboard calls these; backend may implement or return 501:

- **POST `/api/facebook/analyze-feed`** — Analyze feed.
- **POST `/api/facebook/mark-contacted`** — Mark item as contacted.
- **POST `/api/facebook/clear-queue`** — Clear queue.
- **POST `/api/facebook/send-browser`** — Send via browser.

### 2.12e Lead and agent mutations

- **PATCH `/api/leads/:id`** — Body: `{ "status": string }` (e.g. `"contacted"`). Update lead status.
- **DELETE `/api/leads/:id`** — Delete lead.
- **POST `/api/leads/:id/resend`** — Resend message to lead.
- **DELETE `/api/agents/:id`** — Delete agent listing.

---

### 2.13 GET `/api/auth/login`

**Response:** Redirects to Google OAuth (if `GOOGLE_CLIENT_ID` and `AUTH_SECRET` are set), or 400 with `{ "error": "message" }`.

### 2.14 GET `/api/auth/callback`

**Query:** `code` (from OAuth). **Response:** Sets session cookie and redirects to `ALLOWED_ORIGIN` (e.g. frontend). On error, redirects to `ALLOWED_ORIGIN?auth_error=...`.

### 2.15 GET `/api/auth/me`

**Response (200):** `{ "user": { "id": string, "email": string, "name": string | null } }`. **Response (401):** `{ "error": "Unauthorized" }`. Send cookies (`credentials: "include"`).

### 2.16 POST `/api/auth/logout`

**Response:** `{ "ok": true }`. Clears session cookie.

---

### 2.17 GET `/api/preferences`

**Auth:** Required (session cookie). **Response (200):** `{ "preferences": Record<string, string | number | boolean | null> }`. **Response (401):** Unauthorized.

### 2.18 POST `/api/preferences`

**Auth:** Required. **Body:** `{ "website"?: string, "facebook"?: string, "default_dry_run"?: boolean }` (partial merge). **Response (200):** `{ "preferences": Record<...> }`.

---

### 2.19 GET `/api/immo-listings`

**Response (200):** `{ "listings": Array<ImmoListing>, "message"?: string }`. Listings from immo-snip SQLite when `IMMO_SNIP_LISTINGS_DB` is set to the DB path. If not set or file missing, returns `listings: []` and optional `message`.

**ImmoListing shape:** `{ listing_ref, source, title, location, listing_url, transaction_type, sale_price, rent_price, first_seen, last_updated, agency_name }`.

---

## 3. Data model summary

| Entity    | Source        | Key fields for UI |
|----------|----------------|-------------------|
| **Leads** | `GET /api/leads` | contact_email, contact_phone, source_url, status, channel, timestamp; optional reason, message_subject, message_body |
| **Agents** | `GET /api/agents` | agency_name, listing_title, price, location, url, contact, timestamp |
| **Logs**  | `GET /api/logs`  | time, status, contact_email, source_url, channel (recent activity) |
| **Config** | `GET /api/config` | start_urls, source_type, limits, facebook, email, message_templates |
| **Targets** | `GET /api/targets` | countries, sitesByCountry, defaultListingTypes (for building start URLs) |
| **Auth** | `GET /api/auth/me` | user.id, user.email, user.name (when logged in) |
| **Preferences** | `GET /api/preferences` | website, facebook, default_dry_run (per user) |
| **LU Listings** | `GET /api/immo-listings` | listings[] from immo-snip DB (optional) |

---

## 4. UI requirements (current behavior)

- **Run & live monitor**: Toggle “Dry run” (default on), button “Start bot”, button “Stop”. Show live process output (stdout/stderr) in a scrollable terminal-style area; parse NDJSON stream from `POST /api/run`. Show status badge: idle | starting | running | stopped | error.
- **Website scan**: Dropdowns: Country (from targets) → Site (from sitesByCountry[country]) → Listing type (from site.listingTypes or defaultListingTypes). Display computed “Start URL”. Button “Update config & start scan”: `POST /api/config` with `{ source_type: "website", start_urls: [webStartUrl] }`, then call `POST /api/run` (same streaming UX).
- **Facebook scan**: Toggle Marketplace vs Groups. Marketplace: city, radius (km), keywords → build URL like `https://www.facebook.com/marketplace/{city}/propertyforsale?query=...&radius=...`. Groups: textarea of group URLs (one per line). Button “Update config & start scan”: `POST /api/config` with `source_type: "facebook"` and `start_urls` or `facebook` payload, then start bot.
- **Pipeline**: Display pipeline steps (Config → Browser → Scroll → Extract → Dedup → Classify → Contact → Cooldown) as a simple horizontal or list overview.
- **Stages**: Optional detailed list of stages with inputs/outputs/status (can stay as static content).
- **Test & build**: Buttons “Run tests” and “Build dashboard” that call `POST /api/test` and `POST /api/build`, streaming output into the same live log area.
- **Database**: Collapsible section showing MongoDB status from `GET /api/database` (configured vs not, cluster/user if configured; no password).
- **Config**: Collapsible JSON view of full config (`GET /api/config`).
- **Leads**: Collapsible list; show at least contact_email and status; link to source_url if present.
- **Agents**: Collapsible list; show agency_name and listing_title.
- **Recent activity**: Collapsible list of recent logs (time, status).

**Refresh:** Manual refresh button that refetches config, leads, agents, logs, database, immo-listings. Polling (e.g. 15–30s) optional.

**Auth UI:** When auth is configured: "Log in" (navigate to `API_BASE/auth/login`) and "Log out" (POST `/api/auth/logout`). Show user name/email when logged in. Handle `?auth_error` on load after callback.

**Preferences:** When logged in, collapsible "Preferences" with website URL and Facebook default; debounced save to `POST /api/preferences`.

**Config editor:** Editable start URLs and source type with "Preview diff" and "Save" (POST partial config).

**LU Listings:** Collapsible "LU Listings (immo-snip)" table when `GET /api/immo-listings` returns data (source, title, location, type, price, seen).

---

## 5. Tech stack (current)

- **Framework:** Next.js (App Router).
- **Location:** `real-estate-scout/` (src/, pages, components, hooks).
- **Styling:** Tailwind (e.g. `min-h-screen`, `bg-stone-50`, `rounded-xl`, `border-stone-200`). No component library required; plain HTML + Tailwind is enough.
- **Fonts:** layout uses Geist, Geist_Mono (from `next/font/google`).
- **State:** React useState for run status, live log lines, config, leads, agents, logs, targets, database info, and form fields (dry run, FB/website options). useCallback/useEffect for fetch and polling.

---

## 6. TypeScript types (copy-paste for Lovable)

```ts
// API response types
export type Config = Record<string, unknown>; // or refine with optional keys above

export type Lead = {
  id: number;
  listing_hash: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source_url: string | null;
  is_private: number;
  confidence: number;
  reason: string | null;
  status: string | null;
  message_subject: string | null;
  message_body: string | null;
  channel: string | null;
  timestamp: number;
};

export type Agent = {
  id: number;
  agency_name: string | null;
  listing_title: string | null;
  price: string | null;
  location: string | null;
  url: string | null;
  contact: string | null;
  reason: string | null;
  timestamp: number;
};

export type ActivityLog = {
  id: number;
  listing_hash: string | null;
  contact_email: string | null;
  source_url: string | null;
  status: string | null;
  channel: string | null;
  timestamp: number;
  time: string;
};

export type RunStatusResponse = { running: boolean };

export type StreamLine = { type: "status" | "stdout" | "stderr" | "exit"; data: string };

export type TargetsData = {
  countries: string[];
  defaultListingTypes?: { value: string; label: string; path: string }[];
  sitesByCountry?: Record<string, { id: string; label: string; baseUrl: string; listingTypes?: { value: string; label: string; path: string }[] }[]>;
};

export type DatabaseInfo = {
  configured: boolean;
  cluster?: string;
  user?: string;
  message?: string;
};

export type AuthUser = { id: string; email: string; name: string | null };

export type UserPreferences = Record<string, string | number | boolean | null>;

export type ImmoListing = {
  listing_ref: string;
  source: string | null;
  title: string | null;
  location: string | null;
  listing_url: string | null;
  transaction_type: string | null;
  sale_price: number | null;
  rent_price: number | null;
  first_seen: string | null;
  last_updated: string | null;
  agency_name: string | null;
};
```

---

## 7. Important implementation notes

1. **Streaming:** For `POST /api/run`, `POST /api/test`, `POST /api/build`, do not `await response.json()`. Use `response.body.getReader()` and decode text; split by newline; `JSON.parse(line)` per line; handle `type === "exit"` to end the run state.
2. **Run conflict:** If `POST /api/run` returns 409, show “Bot already running” and do not replace the current stream.
3. **Paths:** The frontend uses `VITE_API_URL` (or similar) for the API base. Your backend serves `/api/*` and reads config/DB/scripts from its own cwd.
4. **Targets file:** `GET /api/targets` reads `java_ui/static/targets_eu.json` (path relative to project layout). If file is missing, API returns 500; frontend can show a friendly “Targets not available”.

Use this spec to build or redesign the Cold Bot frontend in Lovable while keeping compatibility with the existing APIs.

---

## 8. Functionality implemented (preserve after Lovable redesign)

When pushing a new frontend from Lovable, **keep these behaviors**. Aesthetics (colors, layout, components) can change; functionality below must be preserved.

### 8.1 Routes and layout

- **Routes:** `/` (Run), `/website-bot`, `/facebook-bot`, `/pipeline`, `/test-build`, `/data`, and catch-all `*` → NotFound.
- **Layout:** One shared layout wrapping all routes: left sidebar (desktop) + hamburger overlay (mobile), main content area, sticky header with logo + dark toggle + user when logged in.
- **Sidebar nav:** Run, Website Bot, Facebook Bot, Pipeline, Test & Build, Data. Active route highlighted. Bottom: API warning box when config fetch fails; auth error banner when `?auth_error` present; Log in / Log out (or user name + Log out).
- **API base:** `VITE_API_BASE` env (default `/api`). All fetch use `credentials: "include"`.

### 8.2 Run (home page)

- **RunMonitor:** Dry run toggle (persisted in `localStorage` key `immo-snippy-dry-run`, default true). Start Bot (POST `/api/run` with `{ dryRun }`), Stop (DELETE `/api/run` + abort stream), Clear (clear log only). Status badge: idle | starting | running | stopped | error. Live terminal log from same stream (NDJSON).
- **Run state is global:** Provided by `RunBotContext` so that Run page and Pipeline page show the **same** run status and log lines when a run is active.

### 8.3 RunBotContext (shared run state)

- **Provider** wraps the app. Exposes: `status`, `lines`, `start(dryRun?)`, `stop()`, `clearLog()`.
- On mount: GET `/api/run` to set `running` → status "running" if already running.
- **start:** POST `/api/run` with body `{ dryRun }`. If 409 → show "Bot already running" in log, set status "running". Otherwise stream response body: decode NDJSON lines, append to `lines`, on `type === "exit"` set status stopped/error and stop reading. AbortController used so Stop can abort the fetch.
- **stop:** Abort controller + DELETE `/api/run`, then set status "stopped".

### 8.4 Website Bot page

- **Targets:** Country (EU) → Target site → Sale/Rent (listing type). Start URL = site baseUrl + listingType path. Optional "Start URLs override" textarea (one per line); if set, these URLs are used instead of the single computed start URL.
- **Filters:** Criteria (keywords), City, Rooms min, Max price.
- **Advanced:** Listing selector (e.g. CSS selector for cards).
- **Outreach:** Message template (email body), Send limit (per hour), Headless checkbox.
- **Actions:** "Update Config & Start Scan" → POST `/api/config` with `source_type: "website"`, `start_urls`, and optionally `criteria`, `selectors.listing`, `message_templates.email.body`, `limits.max_contacts_per_hour`, `headless`; then call `start(true)` from context. "Pause Scan" → stop(). "Test Single Page" → POST `/api/website/test-single-page`. "Preview Results" → POST `/api/website/preview`. "Send via Website Forms" → POST `/api/website/send-forms`. Toast on success/failure.
- **Targets data:** From GET `/api/targets`. **Fallback:** If API fails, use bundled `src/data/targets_eu.json` so Website Bot always has countries/sites (e.g. Luxembourg, atHome.lu). Prefill: Luxembourg + athome when targets load.
- **Log:** When `lines.length > 0`, show a compact TerminalLog under the actions.

### 8.5 Facebook Bot page

- **Source:** Dropdown: Marketplace | Groups | Both.
- **Marketplace:** City, Radius (km), Category (property/rentals/rooms/commercial/land), Keywords; optional filters: property type, min/max price, bedrooms, bathrooms, size min/max, posted within days, language, FSBO only. Start URL built as `https://www.facebook.com/marketplace/{city|nearby}/{categoryPath}?query=...&radius=...`.
- **Groups:** Textarea of group URLs (one per line).
- **Session:** "Logged-in user" checkbox → sent as `facebook.headless: !loggedInUser`.
- **Actions:** "Update Config & Start Scan" → POST `/api/config` with `source_type: "facebook"`, `start_urls` (marketplace URL and/or group URLs), `facebook: { marketplace_enabled, marketplace_url_template, headless }`; then `start(true)`. "Pause Scan" → stop(). "Analyze Feed" → POST `/api/facebook/analyze-feed`. "Mark Contacted" → POST `/api/facebook/mark-contacted`. "Clear Queue" → POST `/api/facebook/clear-queue`. "Send via Browser" → POST `/api/facebook/send-browser`. Toast on result.
- **Log:** Same as Website Bot when lines exist.

### 8.6 Pipeline page

- **Purpose:** Explain how the bot runs and show the same live run output as the Run page.
- **Content:** Short intro paragraph (bot runs in stages; live log shows real-time output when a run is active). Run status badge. List of **stages** from `src/data/stages.ts`: each stage has id, name, **summary** (plain-English one-liner), inputs, outputs; status pill derived from global run status (Active / Stopped / Ready). Then a **Live run output** section with short explanation and the same `TerminalLog` as Run (same `lines` from RunBotContext).
- **Stages data:** Each stage has `id`, `name`, `summary`, `inputs`, `outputs`. Optional: group stages by phase (setup / scrape / classify / wrapup / app) with phase labels and descriptions for clearer structure.

### 8.7 Test & Build page

- **Three separate panels**, each with its own stream (no mixing):
  1. **Test Website Bot:** Button "Test Website Bot" → POST `/api/test/website`. Dedicated TerminalLog for this stream. Button disabled while running.
  2. **Test Facebook Bot:** Button "Test Facebook Bot" → POST `/api/test/facebook`. Own TerminalLog. Button disabled while running.
  3. **Build:** Button "Build" → POST `/api/build`. Own TerminalLog. Button disabled while running.
- **Hook:** `useStreamAction()` in `useApi.ts`: returns `{ lines, running, run(path) }`. Each panel uses its own `useStreamAction()` instance so streams are independent. Same NDJSON parse pattern as run stream.

### 8.8 Data page

- **Refresh:** Single "Refresh" button that refetches leads, agents, logs, config, database, immo-listings.
- **Summary cards:** Counts for Leads, Agents, Activity logs (from API data).
- **Preferences:** When user is logged in, show PreferencesPanel (collapsible). Fields: default website URL, default Facebook (city or group URLs). Debounced save to POST `/api/preferences` (e.g. 500 ms).
- **Leads:** Collapsible (default open). Filters: Status dropdown (options from distinct lead statuses), Channel dropdown (from distinct channels). Table: email, phone, status, channel, source (link to source_url). Row click → open LeadDetailModal. "Export CSV" for filtered leads (all key columns).
- **Agents:** Collapsible. Table: agency, listing title, price, location. Row click → AgentDetailModal. "Export CSV" for agents.
- **Activity logs:** Collapsible. List of recent logs: time, status, contact_email or source_url.
- **Config:** Collapsible. JSON view of full config. ConfigEditor below: edit start URLs (textarea, one per line) and source type (website/facebook); "Preview diff" shows payload; "Save" → POST `/api/config` partial, then refresh config.
- **LU Listings:** Collapsible. Table from GET `/api/immo-listings`: source, title, location, type, price (sale/rent). Row click → open listing_url in new tab. Message shown when no DB or empty.
- **Database:** Collapsible. GET `/api/database`: show configured (yes/no), cluster, user, message. No password.
- **Polling:** Data page uses 5s polling for leads, agents, logs, config, database, immo-listings when using the hooks with that interval.

### 8.9 Lead detail modal

- **Trigger:** Row click on Leads table. Props: lead, open, onOpenChange, onRefresh.
- **Display:** Email, phone, source URL (link), status, channel, reason, message subject/body, timestamp.
- **Actions:** "Mark as Contacted" → PATCH `/api/leads/:id` `{ status: "contacted" }`, toast, onRefresh. "Delete" → confirm, DELETE `/api/leads/:id`, close modal, onRefresh. "Resend Message" → POST `/api/leads/:id/resend`, toast, onRefresh. "Export" → single lead as CSV download, toast.

### 8.10 Agent detail modal

- **Trigger:** Row click on Agents table.
- **Display:** Agency, listing title, price, location, URL (link), contact, reason, timestamp.
- **Actions:** "Contact Agency" → if contact looks like email use `mailto:`, if phone use `https://wa.me/{digits}`; open in new tab. "Delete" → confirm, DELETE `/api/agents/:id`, close modal, onRefresh. "Export" → single agent as CSV.

### 8.11 Auth and layout

- **Auth:** GET `/api/auth/me` on load. If 401 → user null. Log in = navigate to `API_BASE/auth/login`. Log out = POST `/api/auth/logout`, then clear user. Handle redirect with `?auth_error` (decode and show in sidebar; replaceState to clear query).
- **Dark mode:** Toggle in header. Stored in `localStorage` key `immo-snippy-dark`. Apply class `dark` on document element when on.

### 8.12 API hooks and helpers (useApi.ts)

- **Polling hooks:** useConfig, useLeads, useAgents, useLogs, useDatabase, useImmoListings — each takes optional interval; return `{ data, error, refresh }`. useTargets: same but with static fallback from `targets_eu.json` on API failure.
- **Mutations:** updateConfig(body), updateLeadStatus(id, status), deleteLead(id), resendLeadMessage(id), deleteAgent(id).
- **Auth:** useAuth() → { user, loading, error, logout, loginUrl }.
- **Preferences:** usePreferences(enabled) → { preferences, error, refresh, savePreferences(updates, debounceMs) }. savePreferences debounces POST to `/api/preferences`.
- **Streaming:** useStreamAction() → { lines, running, run(path) } for POST stream endpoints (test/website, test/facebook, build). getRunStatus() for GET `/api/run`.

### 8.13 TerminalLog component

- **Input:** lines (StreamLine[]), maxHeight (optional). Renders each line; apply class by `line.type` (stdout, stderr, status, exit). Auto-scroll to bottom when lines change. Exit line can display as "Process exited (code)".

### 8.14 StatusBadge component

- **Input:** status (RunStatus). Shows Idle | Starting… | Running | Stopped | Error. Running/Starting can show a small pulse dot.

---

## 9. Learnings (implementation details to preserve)

1. **NDJSON streaming:** Never use `response.json()`. Use `response.body.getReader()`, `TextDecoder`, accumulate buffer, split by `\n`, parse each line as JSON. When `type === "exit"`, stop the loop and update final status from `data` (exit code).
2. **409 on POST /api/run:** Treat as "already running". Add a status line "Bot already running" to the log and set status to "running" so UI doesn’t think start failed.
3. **AbortController for run:** When user clicks Stop, abort the fetch and call DELETE `/api/run`. On AbortError, set status "stopped".
4. **Single run state:** One RunBotProvider for the app so that Run page and Pipeline page share the same `lines` and `status`. No duplicate streams.
5. **Targets fallback:** If GET `/api/targets` fails, keep or set data from bundled `targets_eu.json` so Website Bot form always has countries and sites (e.g. Luxembourg, atHome.lu). Prefill country/site on first load.
6. **Config payload for Website Bot:** Can include criteria, selectors.listing, message_templates.email.body, limits.max_contacts_per_hour, headless. Merge into full config on backend.
7. **Config payload for Facebook Bot:** source_type, start_urls, facebook: { marketplace_enabled, marketplace_url_template, headless }.
8. **Test & Build:** Three independent streams (website test, Facebook test, build). Each has its own state and TerminalLog; do not mix lines in one log.
9. **Data page polling:** Use a short interval (e.g. 5s) for leads/agents/logs so the Data page feels fresh; optional manual Refresh that refetches all.
10. **Lead/Agent modals:** Row click opens modal; modal actions call PATCH/DELETE/POST then onRefresh() so the table updates without full page reload.
11. **Contact link in Agent modal:** If contact is email → mailto:; if looks like phone (digits) → wa.me link. No password or sensitive data in Database section.
12. **Preferences:** Only shown when user is logged in. Debounced save (e.g. 500 ms) to avoid flooding the API on every keystroke.
