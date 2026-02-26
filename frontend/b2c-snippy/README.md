# B2C Snippy

B2C frontend lives here. Built from the **new frontend** (Lovable push): same patterns, components, and data layer, scoped to B2C.

## What’s in this folder (new stuff only)

- **`lib/`** – Listing data and context (listings-data.ts, listing-context.tsx)
- **`components/`** – B2C sidebar, layout, dashboard, listing table/filters/drawer
- **`page-content.tsx`** – Feed page content (uses B2CDashboard)
- **`docs/`** – B2C_SPEC.md, UX_PARADIGM.md

## Routes (App Router)

- `/b2c-snippy` – Feed (filterable list + drawer)
- `/b2c-snippy/saved` – Saved Apartments (placeholder)
- `/b2c-snippy/onboarding` – Onboarding (placeholder)
- `/b2c-snippy/settings` – Settings (placeholder)

Layout: `app/(dashboard)/b2c-snippy/layout.tsx` wraps these in **B2CLayout** (B2C sidebar + listing provider).

## Shared deps (outside this folder)

- `@/components/ui/*` – Buttons, cards, sheet, select, etc.
- `@/lib/utils` – cn, etc.

Work on B2C here; add swipe UI, onboarding flow, and Saved Apartments pipeline next.

**Full build plan:** [docs/B2C_IMPLEMENTATION_PLAN.md](docs/B2C_IMPLEMENTATION_PLAN.md) — phased plan to implement the full B2C module (Landing, Onboarding, Discover swipe, Saved, Alerts, Profile, bottom nav, “Let Bot Help”) without changing existing visuals.
