# Cleanup and Organization Plan — IMMO SNIPPY

**Completed (first pass):** Removed empty `api/`; removed `SNIPPY/` (had only empty .github_token; root has real token); removed empty `ai_lm_content/str_viability/`; consolidated `tools/populate_initial_market_data.py` into `scripts/` (20-city version) and removed `tools/`; moved `prompts/property_evaluation_context.txt` to `ai_lm_content/property_valuation_daily_rental/instructions_context.txt` and removed `prompts/`. Updated PROPERTY_VALUATION.md and Grok summary to reference new paths.

---

**Goal:** One coherent layout: clear split between frontend and backend, docs in one place and easy to find, no empty or duplicate clutter. This plan is a **checklist** you can execute step by step.

---

## Current problems (summary)

| Problem | Where |
|--------|--------|
| **MDs in many places** | Root (3), docs/ (30+), docs/cold_bot/ (12), frontend/docs/ (20+), backend/, operator_onboarding/, ai_lm_content/, bot/. |
| **Duplicates** | Same doc in root + docs (e.g. BUSINESS_MODEL_CANVAS, IMMO_SNIPPY_TOOL_SUMMARY_FOR_GROK). Same or similar docs in docs/ and frontend/docs/ (REAL_ESTATE_OUTREACH_BOT, BOT_STATUS, LOVABLE_FRONTEND_SPEC, etc.). |
| **Empty or near-empty** | `api/` (empty), `SNIPPY/` (only empty .github_token), some very short MDs. |
| **Duplicate scripts** | `populate_initial_market_data.py` in both `scripts/` and `tools/`. |
| **Outdated index** | `docs/00-INDEX.md` lists only a few docs; many MDs are not categorized. |
| **No clear doc structure** | All MDs flat in docs/ plus a cold_bot subfolder; hard to find “CRM” vs “operator” vs “run guide” vs “archive”. |

---

## Principle: one place for each thing

- **Code:** Backend in `backend/`, operator/API in `operator_onboarding/`, shared lib in `lib/`, bot in `bot/`, **one** frontend app (see below).
- **Docs:** **Single canonical location = `docs/`**. Root keeps only `README.md` (+ optional one-pager links to docs). No duplicate MDs in root; if you want a file “in root for visibility”, use a **symlink** to `docs/...` or a short README that points to docs.
- **Archives:** Legacy / cold_bot / obsolete audits → one `docs/archive/` (or `docs/archive/cold_bot/`) so active docs stay easy to scan.

---

## Phase 1: Documentation

### 1.1 Define canonical doc layout under `docs/`

Proposed structure (you can rename or merge as you like):

```
docs/
├── README.md                    # Short: what’s here + link to 00-INDEX
├── 00-INDEX.md                  # Master list of all docs (updated)
├── reference/                   # Single source of truth / specs
│   ├── IMMO_SNIPPY_MASTER_REFERENCE.md
│   ├── IMMO_SNIPPY_TOOL_SUMMARY_FOR_GROK.md
│   ├── BUSINESS_MODEL_CANVAS_IMMO_SNIPPY.md
│   ├── LOVABLE_FRONTEND_SPEC.md
│   ├── CRM_FUNCTIONAL_SPEC.md
│   ├── CRM_INTERFACE_DESIGN.md
│   ├── OPERATOR_ONBOARDING_EXPANDED_SCHEMA.md
│   ├── CONTEXTS_AND_BOTS.md
│   ├── IMMO_SNIP_VS_COLD_BOT.md
│   └── REAL_ESTATE_OUTREACH_BOT.md
├── guides/                      # How to run / set up
│   ├── REAL_ESTATE_SCOUT_LOCAL.md
│   ├── GET_LOVABLE_UI_ON_1950.md
│   ├── PROPERTY_VALUATION.md
│   └── (backend/README, MONGODB_SETUP → keep in backend or copy here)
├── operator/                    # Operator onboarding & context
│   ├── RECAP_OPERATOR_ONBOARDING_AND_CONTEXT.md
│   ├── CURSOR_PROMPT_OPERATOR_ONBOARDING_EXPANDED_FORM.md
│   └── (operator_onboarding/AUDIT_* → move or link)
├── crm/                         # CRM specs and status
│   ├── CRM_IMPLEMENTATION_STATUS.md
│   ├── CRM_20_SPEC_STATUS.md
│   ├── CRM_16_FUNCTIONS_STATUS.md
│   ├── CRM_APP_AUDIT_REPORT.md
│   ├── CRM_RECAP_DESIGN_AND_BUILD.md
│   └── CRM_WHAT_IS_MISSING.md
├── audits/                      # One-off audits (or merge into archive)
│   ├── AUDIT_ONBOARDING_CONTEXT_2026.md
│   ├── AUDIT_ONBOARDING_CONTEXT_APIS_LLM.md
│   └── AUDIT_REINTEGRATION_8080.md
├── plans/                       # Upgrade / redesign plans
│   ├── UPGRADE_PLAN_REAL_ESTATE_SCOUT.md
│   ├── REAL_ESTATE_SCOUT_REDESIGN_PLAN.md
│   └── BOT_STATUS.md
├── archive/                     # Legacy / cold_bot / obsolete
│   └── cold_bot/
│       ├── README.md
│       ├── THE DEVELOPMENT PLAN.md
│       ├── SILO_ANALYSIS.md
│       ├── ... (all current docs/cold_bot/*)
│       └── (optional: TEST_LOCALHOST, TEST_AND_BUILD_PLAN, etc.)
└── (optional) backend/          # Or leave backend MDs in backend/
    └── (links or copies of MONGODB_SETUP, backend README)
```

**Actions:**

- [ ] Create `docs/reference/`, `docs/guides/`, `docs/operator/`, `docs/crm/`, `docs/audits/`, `docs/plans/`, `docs/archive/`.
- [ ] **Move** (don’t copy) each MD from the flat `docs/` into the right subfolder (see list above).
- [ ] **Move** entire `docs/cold_bot/` into `docs/archive/cold_bot/`.
- [ ] Update **00-INDEX.md** with the new structure and a one-line description per doc (or per folder).
- [ ] Update **docs/README.md** to describe the layout and point to 00-INDEX.

### 1.2 Root: only README + optional symlinks

- [ ] **Remove** from root (they stay only in docs):
  - `BUSINESS_MODEL_CANVAS_IMMO_SNIPPY.md` → keep only in `docs/reference/` (or `docs/` if you skip subfolders).
  - `IMMO_SNIPPY_TOOL_SUMMARY_FOR_GROK.md` → keep only in `docs/reference/`.
- [ ] **Option A:** Delete root copies; add in root `README.md` a “Documentation” section with links to `docs/00-INDEX.md`, `docs/reference/IMMO_SNIPPY_MASTER_REFERENCE.md`, and `docs/reference/BUSINESS_MODEL_CANVAS_IMMO_SNIPPY.md`.
- [ ] **Option B:** Keep root “for visibility” via **symlinks**:  
  `ln -sf docs/reference/BUSINESS_MODEL_CANVAS_IMMO_SNIPPY.md BUSINESS_MODEL_CANVAS_IMMO_SNIPPY.md`  
  (and same for Grok summary if you want it in root). So there is still only one file on disk.

### 1.3 frontend/docs vs main docs

- [ ] **Decide:** Is `frontend/docs/` the source for frontend-only notes, or a duplicate of main docs?
- [ ] If **duplicate:** Remove or archive `frontend/docs/` content that duplicates `docs/` (e.g. REAL_ESTATE_OUTREACH_BOT, BOT_STATUS, LOVABLE_FRONTEND_SPEC, REAL_ESTATE_SCOUT_LOCAL, etc.). Keep in frontend only what is truly frontend-specific (e.g. scripts, snapshots).
- [ ] If **frontend-specific:** Keep a minimal `frontend/docs/` with one README that says “Frontend-specific notes; for full project docs see repo root `docs/`” and leave only non-duplicate files there.
- [ ] Update root README or docs/00-INDEX to mention: “Frontend app lives in `real-estate-scout/` (or `frontend/`); see docs/guides for run instructions.”

### 1.4 Module-level READMEs (keep, but consistent)

- [ ] **backend/README.md**, **operator_onboarding/README.md**, **bot/README.md**, **ai_lm_content/README.md**: Keep as-is; they describe the module. Optionally add one line at the top of each: “Full project docs: `docs/`”.
- [ ] **backend/MONGODB_SETUP.md**: Keep in backend (or add to `docs/guides/` and link from backend README).

---

## Phase 2: Empty and duplicate code areas

### 2.1 Empty folders

- [ ] **api/** — Empty. Either: (a) Remove the folder, or (b) Add `api/README.md` with one sentence: “Reserved for future API gateway or shared API client; currently API lives in operator_onboarding/api_server.py.”
- [ ] **SNIPPY/** — Contains only `.github_token` (and possibly empty). If `.github_token` is still used, move it to root or to a secure location and remove the folder; if unused, delete the folder and token.

### 2.2 Duplicate script

- [ ] **tools/populate_initial_market_data.py** and **scripts/populate_initial_market_data.py**: Compare; if identical or scripts/ is the one used (e.g. by run scripts), **remove** `tools/populate_initial_market_data.py` and keep only `scripts/`. If tools/ has a different role (e.g. “one-off data tools”), keep one and document in scripts/README or root README: “Market data population: `scripts/populate_initial_market_data.py` and `scripts/populate_market_data.py`.”

### 2.3 Root `property_evaluator.py`

- [ ] There is also `lib/property_evaluator.py`. If the root file is a thin wrapper that calls `lib`, keep it for backward compatibility and add a one-line comment at the top: “Entry point; implementation in lib.property_evaluator.” If it’s redundant, remove and point callers to `lib.property_evaluator`.

---

## Phase 3: Frontend vs real-estate-scout

- [ ] **Clarify** in root README: Which is the **primary** UI — `frontend/` or `real-estate-scout/`? (From context it’s real-estate-scout.) Add one sentence: “Main dashboard: `real-estate-scout/`. Legacy or alternate: `frontend/`.”
- [ ] If `frontend/` is deprecated, add `frontend/README.md`: “Legacy frontend; primary app is real-estate-scout/.” and do not add new features there.

---

## Phase 4: Bot folder

- [ ] **bot/** is already lean (README + main, llm, browser, sender). No MDs to move.
- [ ] Ensure **bot/README.md** states: run from repo root, config in root `config.yaml`, and that `storage` module is missing (add link to docs or a stub `storage.py` if you want the bot runnable out of the box).
- [ ] No cleanup of bot code needed for “messy MDs”; the mess is in the repo at large.

---

## Phase 5: Index and READMEs

- [ ] **docs/00-INDEX.md**: Rewrite so it lists (or links to) every doc in the new structure. Group by folder (reference, guides, operator, crm, audits, plans, archive).
- [ ] **docs/README.md**: Short intro + “See 00-INDEX.md for the full list.”
- [ ] **Root README.md**: Add a “Documentation” section: “All project docs live in `docs/`. Start with `docs/00-INDEX.md` or `docs/reference/IMMO_SNIPPY_MASTER_REFERENCE.md`.”

---

## Execution order (suggested)

1. **Phase 1.1** — Create doc subfolders and move MDs (no deletes yet).
2. **Phase 1.2** — Root: remove or symlink the two big MDs; update root README.
3. **Phase 1.3** — Deduplicate or trim frontend/docs.
4. **Phase 1.4** — Add “Full project docs: docs/” to module READMEs.
5. **Phase 2** — Empty folders and duplicate script.
6. **Phase 3** — Frontend vs real-estate-scout in README.
7. **Phase 4** — Bot README clarity.
8. **Phase 5** — 00-INDEX and docs/README.

---

## After cleanup: target layout (summary)

```
IMMO SNIPPY/
├── README.md                    # Entry + link to docs/
├── config.yaml
├── start.sh
├── property_evaluator.py        # Optional; thin wrapper to lib
├── docs/                        # Single place for all MDs
│   ├── README.md
│   ├── 00-INDEX.md
│   ├── reference/               # Master refs, specs, business canvas
│   ├── guides/                  # Run/setup guides
│   ├── operator/                # Operator onboarding
│   ├── crm/                     # CRM specs and status
│   ├── audits/
│   ├── plans/
│   └── archive/cold_bot/
├── backend/                     # Scrapers, Mongo, schedulers
├── operator_onboarding/         # API, context, CRUD
├── bot/                         # Scanning loop, LLM, sender
├── lib/                         # Shared: db, CRM, valuation, market data
├── real-estate-scout/           # Primary frontend (Vite/React)
├── frontend/                    # Legacy or alternate (document which)
├── scripts/                     # Run scripts, market data, seed
├── tools/                       # Optional; or merge into scripts
├── ai_lm_content/               # Prompts, valuation content
├── data/
├── prompts/                     # Or merge into ai_lm_content
└── (api/ or remove)
```

No MDs scattered in root (except README). No duplicate copies of the same doc. Empty folders either removed or explained in a README. One index (00-INDEX) to find everything.

---

*End of Cleanup and Organization Plan. Execute phases in order and tick off items as you go.*
