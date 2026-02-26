# B2C Module — Implementation Plan

Plan to build the full B2C layer (Lovable spec) **without breaking existing visuals**. Stack: **Next.js App Router**, existing **Tailwind + shadcn/ui**, **embla-carousel-react**, **react-hook-form + zod**. Routes stay under **`/b2c-snippy`** (no `/b2c` rename to avoid breaking admin sidebar link).

---

## Visual & Tech Guardrails (do not change)

- **Theme:** Keep existing `app/globals.css` — primary amber (`hsl(40 72% 50%)`), `--success` green, warm background. Do **not** replace with new palette; optional: add a single B2C accent (e.g. soft sage) only in B2C components via local classes.
- **Layout:** B2C stays **outside** `(dashboard)`; only `app/b2c-snippy/layout.tsx` (B2CLayout) wraps B2C routes. No admin sidebar on B2C pages.
- **Components:** Use only existing **shadcn/ui** components and **lucide-react**. Add new B2C components under `frontend/b2c-snippy/components/`.
- **Responsive:** Mobile-first; bottom tab bar on mobile, **same** B2C sidebar on desktop (already in place). No layout swap that would break current sidebar.

---

## Route & Navigation Map

| Spec path      | Our path (Next.js)              | Page component / content              |
|----------------|---------------------------------|----------------------------------------|
| `/b2c`         | `/b2c-snippy` (landing when not logged in) | **B2CLanding** or redirect             |
| `/b2c/onboarding` | `/b2c-snippy/onboarding`     | **B2COnboarding** (5-step wizard)      |
| `/b2c/discover`   | `/b2c-snippy/discover`      | **B2CDiscover** (swipe feed)           |
| `/b2c/property/:id` | `/b2c-snippy/property/[id]` | **B2CPropertyDetail**                  |
| `/b2c/saved`   | `/b2c-snippy/saved`            | **B2CSaved** (tabs: All / Interested / Contacted / Viewings) |
| `/b2c/alerts`  | `/b2c-snippy/alerts`           | **B2CAlerts**                          |
| `/b2c/profile` | `/b2c-snippy/profile`          | **B2CProfile** (was “Settings”)        |

- **Landing vs Discover:**  
  - `/b2c-snippy` (root): if **not** logged in → show **B2CLanding**; if logged in → redirect to `/b2c-snippy/discover`.  
  - `/b2c-snippy/discover`: main feed (swipe). Consider this the “home” after login.
- **Sidebar:** Update `B2CSidebar` nav items to: **Discover** (home), **Saved**, **Alerts**, **Profile**. Keep **Onboarding** as entry point (or gate from landing). No duplicate “Feed” vs “Discover”; use one label (e.g. “Discover”).

---

## Phase 1 — Foundation (no UI change to existing pages)

**Goal:** Routes, layout, and shared building blocks. Existing B2C pages (feed table, saved placeholder, etc.) keep current look.

1. **Routes**
   - Add `app/b2c-snippy/discover/page.tsx` → Discover (placeholder content for now).
   - Add `app/b2c-snippy/property/[id]/page.tsx` → Property detail (placeholder).
   - Add `app/b2c-snippy/alerts/page.tsx` → Alerts (placeholder).
   - Add `app/b2c-snippy/profile/page.tsx` → Profile (can replace or coexist with current `settings` — plan: **rename** Settings to Profile and use one route `/b2c-snippy/profile`).
   - Decide landing behaviour: either **new** `app/b2c-snippy/page.tsx` that shows B2CLanding when anonymous and redirects when logged in, or keep current feed as default and add a separate “Landing” route (e.g. `/b2c-snippy/welcome`). **Recommendation:** Root `/b2c-snippy` = landing (hero + CTA); “Start Free Search” → onboarding or discover; after onboarding, redirect to `/b2c-snippy/discover`.

2. **B2C sidebar**
   - Update `b2c-snippy/components/B2CSidebar.tsx`:  
     Discover (home), Saved, Alerts, Profile. Remove “Feed” and “Onboarding” from sidebar (onboarding linked from landing only). Optional: “Onboarding” as first-time or “Edit preferences” in Profile.
   - Ensure active state uses `pathname.startsWith(href)` where needed (e.g. `/b2c-snippy/discover`).

3. **Bottom tab bar (mobile)**
   - Add `b2c-snippy/components/B2CBottomNav.tsx`: same 4 items (Discover, Saved, Alerts, Me). Render only when `pathname.startsWith('/b2c-snippy')` and viewport is mobile (e.g. `useMobile()` or media query). Use existing `hooks/use-mobile.ts` if present.
   - In `B2CLayout.tsx`: render `B2CBottomNav` in a fixed bottom slot on mobile; keep sidebar for desktop. Do **not** change desktop layout.

4. **Shared card component**
   - Add `b2c-snippy/components/B2CPropertyCard.tsx`: props for listing, compact vs expanded, optional match % and “Why this fits” line. Use **Card**, **Badge**, **Button**; photo area with **embla-carousel-react** for gallery. Use existing Tailwind/shadcn styles so it matches current list/drawer look.

5. **API / data**
   - Add `b2c-snippy/lib/b2c-api.ts` (or hooks): stub functions for `getFeed()`, `getProperty(id)`, `getSaved()`, `getAlerts()`, `savePreferences()`. Call `fetch('/api/b2c/...')` or return mock data so UI can be built without backend.

**Deliverables:** All routes exist; sidebar + bottom nav show correct labels; B2CPropertyCard used in one place (e.g. discover placeholder); no visual change to existing table/drawer yet.

---

## Phase 2 — Landing & Onboarding

**Goal:** Public landing and 5-step onboarding with existing visuals (forms, buttons, cards).

6. **Landing page**
   - `app/b2c-snippy/page.tsx`: if no auth → render **B2CLanding** (hero: “Find your perfect home in Luxembourg with AI”, “Start Free Search” → `/b2c-snippy/onboarding` or `/b2c-snippy/discover` if already has preferences). If logged in and has preferences → redirect to `/b2c-snippy/discover`. Reuse existing **Button**, **Card**; keep typography and spacing consistent with rest of app.

7. **Onboarding wizard**
   - Replace/implement `app/b2c-snippy/onboarding/page.tsx` with **B2COnboarding** (multi-step).
   - **Step 1:** Account (reuse existing auth UI if available; else email + optional Google).
   - **Step 2:** Rent/Buy toggle (RadioGroup or Tabs), budget slider (Slider), move-in date (existing date picker / calendar).
   - **Step 3:** Structured filters: grid of checkboxes/chips — bedrooms, surface m², parking, balcony, elevator, pets, energy class, furnished, new build. Use **Checkbox**, **Slider**, **Label**; same card and spacing as rest of app.
   - **Step 4:** Location: multi-select communes (Popover + Checkbox list or Command), free-text “near …”, optional **voice note** button (browser `SpeechRecognition` API, fallback to Textarea).
   - **Step 5:** Summary card + “Generate My Matches” / “Find My Perfect Matches” button → call `savePreferences` stub → redirect to `/b2c-snippy/discover`.
   - Use **react-hook-form** + **zod** for validation; **Steps** or simple state + **Progress** for step indicator. No new design system — only existing components.

**Deliverables:** Landing and full onboarding flow; preferences saved (stub); redirect to Discover.

---

## Phase 3 — Discover (Swipe Feed)

**Goal:** Swipeable cards and filter drawer without changing global styles.

8. **Discover page**
   - `app/b2c-snippy/discover/page.tsx`: top bar with search (Input) + “Refine filters” (opens Drawer/Sheet). Main area: **stack of swipeable cards** (B2CPropertyCard). Swipe: left = pass, right = save; bottom bar: ❌ Pass | ❤️ Save | Info (opens detail modal or `/b2c-snippy/property/[id]`). Use **embla-carousel-react** for card stack or simple touch handlers + CSS transform; avoid heavy new libs so visuals stay consistent.
   - Each card: large photo carousel (top ~60%), price + title, 4–5 spec badges, **green match % badge** (“92% Perfect Match”), one-line “Why this fits you” (from stub or real LLM later). Fetch list from `getFeed()` (stub).

9. **Filter drawer**
   - Reuse/adapt existing filter concepts from `listing-filters.tsx` (locations, price, bedrooms, etc.) inside a **Sheet** or **Drawer**; “Apply” closes and refreshes feed. Same form controls and tokens as current B2C filters.

10. **Property detail**
    - `app/b2c-snippy/property/[id]/page.tsx`: gallery (Embla), specs table, map placeholder, “Contact with Bot” / “Let Bot Help” button. Reuse **B2CPropertyCard** data shape; add **Dialog** for “Let Bot Help” with pre-filled message (stub `generate_proposal` or copy from existing CRM if any).

**Deliverables:** Discover feed with swipe, match badge, “Why this fits”; filter drawer; property detail + “Let Bot Help” dialog.

---

## Phase 4 — Saved, Alerts, Profile

**Goal:** Saved pipeline, early-warning alerts, profile/settings — same look as existing B2C pages.

11. **Saved**
    - `app/b2c-snippy/saved/page.tsx`: **Tabs** — All | Interested | Contacted | Viewings Scheduled. Each tab shows list of **B2CPropertyCard** (compact); status updater (Select or inline), notes field, conversation log preview. Reuse existing card and form styles; match current “Saved Apartments” placeholder tone.

12. **Alerts**
    - `app/b2c-snippy/alerts/page.tsx`: list of high-match new listings; each row/card: “View” + “Let Bot Contact”. Reuse B2CPropertyCard (compact) and same “Let Bot Help” dialog as Discover.

13. **Profile**
    - `app/b2c-snippy/profile/page.tsx`: edit preferences (same fields as onboarding in a form), update voice note, **bot settings** (Manual / Semi-auto / Full auto with confirmation), account settings. Replace or merge current “Settings” content; keep one route (profile). Use **Tabs** or sections; same **Card**, **Switch**, **Select** as elsewhere.

**Deliverables:** Saved with status tabs; Alerts list with actions; Profile with preferences and bot mode.

---

## Phase 5 — Polish & Integration

**Goal:** Auth gate, loading/empty states, and “Let Bot Help” consistency.

14. **Auth**
    - Optional: gate B2C routes (e.g. middleware or layout) so Discover / Saved / Alerts / Profile require login; redirect to landing or onboarding. Landing remains public.

15. **Loading & empty states**
    - Skeleton or spinner for feed, saved, alerts; empty states (no matches, no saved, no alerts) with clear copy and CTA. Use existing **Skeleton**, **empty** patterns from the app.

16. **“Let Bot Help” everywhere**
    - Same **Dialog** + pre-filled message + “Edit / Send / Cancel” on Discover cards, property detail, and Alerts. Stub API: `POST /api/b2c/draft-message` or reuse existing proposal generator; wire later.

17. **Tooltip after first save**
    - After first “Save” in Discover: gentle tooltip (“Your matches are now personalised”). Use **Tooltip** or **Sonner** toast once per session.

**Deliverables:** Consistent auth and empty/loading states; single “Let Bot Help” flow; one personalisation tooltip.

---

## File Checklist (add/change)

- **New pages (App Router):**  
  `app/b2c-snippy/page.tsx` (landing + redirect),  
  `app/b2c-snippy/discover/page.tsx`,  
  `app/b2c-snippy/property/[id]/page.tsx`,  
  `app/b2c-snippy/alerts/page.tsx`,  
  `app/b2c-snippy/profile/page.tsx`  
  (onboarding and saved already exist; replace content as above.)

- **New components:**  
  `B2CLanding.tsx`,  
  `B2COnboarding.tsx` (multi-step),  
  `B2CDiscover.tsx`,  
  `B2CPropertyDetail.tsx` (or inline in property/[id]),  
  `B2CSaved.tsx`,  
  `B2CAlerts.tsx`,  
  `B2CProfile.tsx`,  
  `B2CPropertyCard.tsx`,  
  `B2CBottomNav.tsx`,  
  optional: `B2CFilterDrawer.tsx`, `LetBotHelpDialog.tsx`.

- **Updates:**  
  `B2CSidebar.tsx` (nav items),  
  `B2CLayout.tsx` (bottom nav on mobile),  
  `b2c-snippy/lib/b2c-api.ts` (or hooks) stubs.

- **Remove/redirect:**  
  If we merge Settings into Profile, remove or redirect `app/b2c-snippy/settings/page.tsx` → `/b2c-snippy/profile`.

---

## Order of Work (to avoid breaking visuals)

1. Phase 1 (routes, sidebar, bottom nav, B2CPropertyCard, API stubs).  
2. Phase 2 (landing, onboarding).  
3. Phase 3 (discover, filters, property detail, “Let Bot Help”).  
4. Phase 4 (saved, alerts, profile).  
5. Phase 5 (auth, loading/empty, tooltip).

Do **not** change `app/globals.css` or shared layout outside `b2c-snippy`; keep all new UI inside B2C components and B2C routes so the rest of the app stays unchanged.
