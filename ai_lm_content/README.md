# AI LM Content — Immo Snippy

This folder is **distinct and self-contained**: it holds all AI/LLM prompts and output schemas used by Immo Snippy. You can version it in git and sync it to a **dedicated MongoDB database** so it can be pushed and pulled by itself (e.g. for deployment or backup).

## Structure

```
ai_lm_content/
├── README.md           # This file
├── __init__.py
├── loader.py           # Load prompts and reference data; push/pull to MongoDB
├── cli.py              # CLI: push / pull / show
├── .gitignore
└── property_valuation_daily_rental/   # Property Valuation Context for Daily Rental
    ├── system_prompt.txt
    ├── output_schema.json
    ├── reference_business_sources_2026.md   # Part 2A: AirDNA, Airbtics, Eurostat, local regs
    └── reference_city_stats_2026.md         # Part 2B: city ADR, occupancy, metrics
```

## Database (distinct “folder” in MongoDB)

- **Database name:** `immosnippy_ai_content` (override with `MONGO_AI_CONTENT_DB`).
- **Collection:** `prompts`.
- This DB is **separate** from your main app DB (e.g. `coldbot`). You can back up, restore, or deploy this content independently.

## Usage in code

```python
from ai_lm_content import get_prompt, get_schema_path, get_reference_context

# Load Property Valuation Context for Daily Rental system prompt (default content_id)
prompt = get_prompt("property_valuation_daily_rental")
schema_path = get_schema_path("property_valuation_daily_rental")

# 2026 reference data (business sources + city stats) — append to system when calling LLM
reference = get_reference_context("property_valuation_daily_rental")
system_with_data = f"{prompt}\n\n---\n2026 Reference Data:\n{reference}" if reference else prompt
```

## Push / Pull (CLI)

From the repo root (with `MONGO_URI` set, e.g. in `backend/.env`):

```bash
# Push this folder’s content to MongoDB
python -m ai_lm_content.cli push property_valuation_daily_rental

# Pull from MongoDB into this folder (overwrites local files)
python -m ai_lm_content.cli pull property_valuation_daily_rental

# Show current prompt (no DB needed)
python -m ai_lm_content.cli show property_valuation_daily_rental
```

Optional: `--version` to tag the version when pushing, or to pull a specific version.

## Adding new content

1. Create a subfolder under `ai_lm_content/`, e.g. `ai_lm_content/my_prompt/`.
2. Add `system_prompt.txt` and optionally `output_schema.json`.
3. Register it in `loader.py`: add an entry to `_CONTENT_IDS`, e.g. `"my_prompt": "my_prompt"`.
4. Use `get_prompt("my_prompt")` and push/pull as above.

## Property Valuation Context for Daily Rental (property_valuation_daily_rental)

- **Role:** Expert European investment analyst for Immo Snippy — Property Valuation Context for Daily Rental (2026).
- **Task:** Evaluate a single property listing for daily/short-term rental management viability.
- **Output:** JSON with `property_valuation_score`, `recommendation`, `estimated_annual_gross_revenue`, `price_to_earnings_ratio`, `key_strengths`, `key_risks`, `suggested_management_fee`, `reasoning`.

Evaluation weights: Location & Demand 40%, Property 30%, Financial 20%, Regulatory & Risk 10%.
