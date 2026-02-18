# Real Estate Scout upgrade plan — summary

This doc summarizes the phased upgrade implemented for the Real Estate Scout (Lovable) frontend and Cold Bot dashboard backend. **Do not push to git** was a constraint; all work is local.

---

## Implemented (13 steps)

1. **Design tokens and visual identity** — `--scarlet` in CSS (sparingly), Tailwind `scarlet`, `modal-in`/`modal-out`, `accordion`/`collapsible` keyframes, `duration-menu`/`panel`.
2. **Menu/nav design and animations** — Active section from IntersectionObserver, nav buttons with primary/15 bg and left border, 150ms transitions, active scale.
3. **API base + CORS** — `VITE_API_BASE` in frontend, `credentials: "include"` on fetches; Next.js CORS headers for `/api/*` with `ALLOWED_ORIGIN`.
4. **Run status on load, refresh, API error banner** — `getRunStatus()` on mount in `useRunBot`, manual Refresh in DataPanels, sticky API error banner when config fetch fails.
5. **Lead/agent detail modals + stages** — `LeadDetailModal`, `AgentDetailModal` (Dialog, 200ms open/close), `STAGES` in `src/data/stages.ts`, `StagesDetail` in PipelineOverview; DataPanels row click opens modal.
6. **Backend GET /api/immo-listings** — Route reads SQLite from `IMMO_SNIP_LISTINGS_DB`; returns `{ listings }` (or empty + message).
7. **LU Listings preview UI** — Collapsible “LU Listings (immo-snip)” in DataPanels; `useImmoListings`; collapsible section uses Radix + collapsible-down/up animation.
8. **OAuth backend** — `GET /api/auth/login` (redirect to Google), `GET /api/auth/callback`, `GET /api/auth/me`, `POST /api/auth/logout`; signed session cookie (`AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`).
9. **Login UI and nav auth state** — `useAuth`, Log in / Log out and user name in header; `auth_error` query param handling.
10. **User preferences API** — SQLite in `data/preferences.db` (users + user_preferences); `GET/POST /api/preferences` (auth required); merge keys: website, facebook, default_dry_run.
11. **User preferences in UI** — `usePreferences(!!user)`, `PreferencesPanel` (website, facebook), debounced save; shown when logged in.
12. **Config editor and diff preview** — `ConfigEditor` in Data section: editable start URLs + source type, “Preview diff” payload, Save (POST partial config).
13. **Docs** — `LOVABLE_FRONTEND_SPEC.md` updated with CORS, auth, preferences, immo-listings, and new UI requirements/types. This `UPGRADE_PLAN_REAL_ESTATE_SCOUT.md` added.

---

## Env (backend)

- **ALLOWED_ORIGIN** — Frontend origin for CORS and post-login redirect (e.g. `http://localhost:8080`).
- **AUTH_SECRET** — Min 16 chars for session signing; if unset, auth routes return 401/400.
- **GOOGLE_CLIENT_ID**, **GOOGLE_CLIENT_SECRET** — For Google OAuth login.
- **IMMO_SNIP_LISTINGS_DB** — Optional path to immo-snip SQLite (e.g. `.../immo-snip-lu-main/listings.db`).

---

## Env (frontend)

- **VITE_API_BASE** — API base URL (e.g. `http://localhost:1111/api` when API runs on 1111).

---

## KIPMI style guide

The sequenced plan referenced `KIPMI_Style_Guide_Adaptation_Playbook.md`. If that file is added under `docs/`, apply it in design tokens and menu/panel steps (golden beige primary, scarlet sparingly, angular font, motion as above).
