# Real Estate Scout — Full Redesign Plan

Single source of truth for the dashboard upgrade: everything you asked for, in one place. The app should look like a **modern app**, not an old piece of paper.

---

## 1. Modern app colour palette and visual identity

**Problem:** Current palette is beige/paper-like (warm grays, golden primary, low contrast). It reads as a document, not an app.

**Goal:** Modern SaaS/dashboard feel — clear surfaces, strong contrast, readable typography, one clear accent. No “old piece of paper” look.

**Direction:**
- **Background:** Neutral or cool gray (e.g. slate 50 / zinc 50) for main canvas, or a very light blue-gray. Avoid warm cream/beige.
- **Surfaces / cards:** White or near-white with subtle border or shadow so panels feel like “cards” or “surfaces,” not flat paper.
- **Text:** High contrast — primary text dark (e.g. slate 900 / zinc 900); secondary/muted clearly readable (e.g. slate 600), not washed out.
- **Primary accent:** One clear brand colour for actions and active states — e.g. a single blue/indigo/violet, or a refined amber/gold used sparingly for CTAs only. Not the current “everything golden” look.
- **Scarlet:** Keep only for Run/Stop and destructive actions; ensure it’s distinct and accessible.
- **Borders / inputs:** Neutral grays with enough contrast against background; focus ring uses the primary accent.
- **Sidebar:** Slightly darker or different tone than main content so the nav column is clearly distinct (e.g. slate 100 or white with border).

**Implementation:** Replace or override CSS variables in [real-estate-scout/src/index.css](real-estate-scout/src/index.css) and Tailwind theme in [real-estate-scout/tailwind.config.ts](real-estate-scout/tailwind.config.ts). Use a small set of tokens (e.g. `--background`, `--foreground`, `--primary`, `--card`, `--muted`, `--border`) so the whole UI stays consistent. Optional: support a “light modern” and “dark” theme later via class on `html`.

---

## 2. Typography and density (no “AI” look)

- **Font size:** Base text at least `text-base` (16px); no tiny body copy. Headings one step up (e.g. section `text-lg` or `text-xl`).
- **Scale:** Consistent scale (e.g. `text-sm` for secondary, `text-base` for body, `text-lg` for section titles) so the UI doesn’t feel cramped or “font soup.”
- **Empty space:** Reduce excessive padding/margins that make the layout feel hollow; tighten section spacing and card padding to a balanced density.
- **Feel:** Avoid generic “AI slop” — clear hierarchy, real labels, no unnecessary decorative text. Buttons and controls sized for touch/click (min tap target ~44px where possible).

---

## 3. API warning: small box to the side

- Remove the full-width sticky API error banner.
- Put API status in a **compact box** (e.g. top of sidebar, or top-right of main content): icon + short “API unavailable” + optional “Check backend / VITE_API_BASE.” Small, contained, not dominating the layout.

---

## 4. Nav: left sidebar (desktop) + hamburger (phone)

**Desktop / tablet**
- Navbar is a **fixed left sidebar** (vertical column).
- Contents: logo/brand at top → Run, Website Bot, Facebook Bot, Pipeline, Test & Build, Data → auth (Log in / user + Log out) at bottom. API status can sit in sidebar or in main area.
- Main content is to the right; no top horizontal nav.

**Phone**
- Sidebar hidden by default.
- **Hamburger** (e.g. top-left) toggles sidebar.
- Sidebar opens as overlay/slide-in from the left; link click or backdrop closes it. Hamburger can become close (X) when open.

**Implementation:** Shared Layout: sidebar + main; responsive (sidebar visible on `md+`, hamburger + overlay on small); active route highlighted.

---

## 5. Renames

- **Website** → **Website Bot** (nav, section titles, components).
- **Facebook** → **Facebook Bot** (nav, section titles, components).

---

## 6. Pipeline: its own page (full breakdown + live feed)

- **Route:** `/pipeline`.
- **Content:**
  - **Full stage breakdown:** All stages (from [real-estate-scout/src/data/stages.ts](real-estate-scout/src/data/stages.ts)) with inputs, outputs, status — laid out clearly, in line with the stage docs (MDs).
  - **Live data feed:** Dedicated run output stream on this page (same run stream as Run monitor, e.g. via shared context). Page shows “Live output” and current run status so pipeline execution is visible here too.
- **Layout:** e.g. left column = stage list; right = live feed. No CRM; focus on pipeline and process.

---

## 7. Test & Build: fully flushed out

- **Route:** `/test-build`.
- **Content:**
  - **Test:** Own card/section — “Run tests” button, short description (pytest via backend API), **dedicated** terminal output for test stream only.
  - **Build:** Separate card/section — “Build dashboard” button, short description, **own** terminal output for build stream only.
- No mixing of test and build lines; two clear panels. Buttons disabled while that action is running. Copy explains what each action does.

---

## 8. Data: full view (not CRM)

- **Route:** `/data`.
- **Goal:** Data/analytics view, not CRM. “View and analyze pipeline data,” not “manage clients.”
- **Content:**
  - **Summary:** Counts for leads, agents, logs (optional summary cards).
  - **Leads:** Full table (all key columns from API): sort, optional filters (status, channel), Refresh. Row click → Lead detail modal.
  - **Agents:** Full table with sort/filter and Agent detail modal.
  - **Activity logs:** Recent logs table/list; Refresh.
  - **Database status:** From `GET /api/database`.
  - **Config:** Read-only or existing ConfigEditor; LU Listings (immo-listings) as now. Optional: export (CSV/JSON) for leads/agents.
- **Avoid:** CRM-style stages, progress, client panel, “log communication.” Keep only detail modals for drill-down.

---

## 9. Website Bot: full form and actions (from java_ui)

Replicate the **Website Bot** panel from [java_ui/static/index.html](java_ui/static/index.html) (Targets, Filters, Advanced, Outreach, actions).

**Targets:** Country (EU), Target Site, Sale/Rent (Both, Sale, Rent), Start URLs (textarea, one per line).

**Filters:** Criteria (keywords), City, Rooms (min), Max Price.

**Advanced:** Listing Selector, Single Page URL.

**Outreach:** Message Template, Send Limit, Run headless.

**Actions:** Start Scan, Pause Scan, Stop Scan, Test Single Page, Preview Results, Send via Website Forms (wire or stub per backend).

**Backend:** Extend `POST /api/config` to accept and merge `criteria`, `limits`, `selectors.listing`, etc., as used by the bot.

---

## 10. Facebook Bot: full form and actions (from java_ui)

Replicate the **Facebook** panel from [java_ui/static/index.html](java_ui/static/index.html).

**Source:** Type (Marketplace | Groups).

**Marketplace – Location:** City, Radius (km), Main Category (Property for Sale, Rentals, Rooms, Commercial, Land), Keywords, FB Search URL.

**Groups:** Group URLs (textarea, one per line).

**Marketplace – Filters:** Property Type, Min/Max Price, Bedrooms, Bathrooms, Size min/max, Posted within (days), Language, FSBO Only.

**Session:** Logged-in User (Yes/No).

**Actions:** Analyze Feed, Mark Contacted, Clear Queue; Send via Browser (Message Template, Send Limit, Run headless) — wire or stub per backend.

**Backend:** Ensure `POST /api/config` merges full `facebook` object (marketplace, category, filters, groups, etc.).

---

## 11. Routing and layout summary

- **Routes:** `/` (Run + Website Bot + Facebook Bot), `/pipeline`, `/data`, `/test-build`.
- **Layout:** One shared layout: **left sidebar (desktop) + hamburger (phone)**, main content right, API warning in small box (sidebar or main). All pages use this layout.
- **Active state:** Current route highlighted in sidebar.

---

## 12. Implementation order

1. **Phase 1 — Foundation:** Modern colour palette and tokens; typography and density; API warning → small box; Layout with left sidebar + hamburger; routes; renames (Website Bot, Facebook Bot).
2. **Phase 2 — Pages:** Pipeline page (stages + live feed); Test & Build page (two panels, two streams); Data page (tables, filters, summary, no CRM).
3. **Phase 3 — Bot parity:** Backend config merge for all keys; full Website Bot form and actions; full Facebook Bot form and actions (with stubs where backend doesn’t support yet).

---

## 13. Files to touch (summary)

| Area | Files |
|------|--------|
| **Colour / typography** | `real-estate-scout/src/index.css`, `tailwind.config.ts` |
| **Layout / nav** | New `Layout.tsx` (sidebar + hamburger + main), `App.tsx` (routes) |
| **API warning** | `Index.tsx` or Layout — remove banner; add compact API box |
| **Renames** | `Index.tsx`, `WebsiteScan.tsx`, `FacebookScan.tsx`, nav config |
| **Pipeline** | New `pages/Pipeline.tsx`, stages data, run stream (shared context if needed) |
| **Test & Build** | New `pages/TestBuild.tsx` (two sections, two streams) |
| **Data** | New `pages/Data.tsx`, tables + filters + modals |
| **Website Bot** | `WebsiteScan.tsx` or `WebsiteBot.tsx` — all java_ui fields and buttons |
| **Facebook Bot** | `FacebookScan.tsx` or `FacebookBot.tsx` — all java_ui fields and buttons |
| **Backend** | Your API server — merge criteria, limits, selectors, facebook.* (see LOVABLE_FRONTEND_SPEC) |

---

**Bottom line:** The app should feel like a **modern app** (clear palette, good contrast, proper density, left sidebar, hamburger on phone), with **full feature parity** for Website Bot and Facebook Bot from java_ui, **dedicated pages** for Pipeline (with live feed), Test & Build, and Data (data view, not CRM).
