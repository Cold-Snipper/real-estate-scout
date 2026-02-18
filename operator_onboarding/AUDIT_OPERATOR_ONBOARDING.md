# Operator Onboarding + Context System — Audit Report

## 1. Operator Onboarding Page

- **Path:** `real-estate-scout/src/pages/OperatorOnboardingPage.tsx` (route `/operator-onboarding`). No `/app/operator-onboarding/page.tsx` (this repo uses React Router, not Next.js App Router).
- **Current state:** Page exists with "Add a document" and "Rules" sections (operator dropdown + CRUD). It does **not** have a multi-step form to **create** a new operator with Company Name, Website URL, Tagline, Countries (multi-select), the 5 dropdowns, Calendly, Notes, progress bar, and Save → POST /api/operators.
- **Status:** ❌ **Partial** — multi-step create-operator form added in this audit.

---

## 2. Database Table

- **Path:** `operator_onboarding/db.py` — `OPERATORS_SCHEMA` defines table `operators`.
- **Columns present:** id, company_name, website_url, tagline, countries (TEXT), services (TEXT), usps (TEXT), **ideal_client** (TEXT), preferred_property_types (TEXT), min_property_value (INTEGER), pricing_model (TEXT), tone_style (TEXT), key_phrases (TEXT), languages (TEXT), calendly_link (TEXT), call_length_minutes (INTEGER), qualification_rules (TEXT), logo_path (TEXT), notes (TEXT), rules (TEXT), created_at (INTEGER), updated_at (INTEGER).
- **Checklist asked for:** ideal_client**profile** — schema uses **ideal_client**. No refactor; form and API use `ideal_client`.
- **Status:** ✅ **Fully correct** (naming difference only: ideal_client vs ideal_client_profile).

---

## 3. Static General Context

- **Path:** `operator_onboarding/airbnb_static_context.py`
- **Content:** Option A base system prompt including real 2026 Europe model, Hormozi Grand Slam Offer, Value Equation, negotiation tactics (enlarge the pie, social proof, risk reversal), pipeline goal, Europe-specific rules.
- **Status:** ✅ **Fully present.**

---

## 4. Specific Provider Context Builder

- **Path:** `operator_onboarding/context_builder.py`
- **Function:** `get_provider_context(operator_id: int, include_eu_str_tax: bool = True) -> str` — loads operator from DB, combines static context (Option A) + EU STR/tax block + agency block (from operator) + reference documents, returns one system prompt string.
- **Status:** ✅ **Fully working.** (Checklist said provider_id; code uses operator_id — same concept.)

---

## 5. LLM Plug Points

- **Current state:** No active message-generation flow in the repo injects provider context. `archive/old_root_stack/llm.py` has no provider context. Backend has no Ollama/LLM call.
- **Status:** ❌ **Missing** — added: `operator_onboarding/llm_integration.py` (injection helper + comment) and optional GET /api/operators/:id/context.

---

## 6. Integration Test

- **Current state:** No CLI or Streamlit to "add a provider and view its context". README mentions `manage_providers.py` (list, view) but that CLI was not implemented.
- **Status:** ❌ **Missing** — added: `operator_onboarding/view_context.py` (run with operator id to print full context).
- **One-line check:** `cd operator_onboarding && python view_context.py 1`

---

## Summary

| Stage | Status | Action |
|-------|--------|--------|
| 1. Operator Onboarding Page | Partial | Multi-step create-operator form added |
| 2. Database Table | Fully correct | None |
| 3. Static General Context | Fully present | None |
| 4. Context Builder | Fully working | None |
| 5. LLM Plug Points | Missing | llm_integration.py + GET :id/context |
| 6. Integration Test | Missing | view_context.py CLI |
