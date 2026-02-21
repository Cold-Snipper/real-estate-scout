# Property Valuation (Daily Rental) — Context & LLM Plug

How property valuation is triggered, which contexts are used, and how to plug in the LLM that values properties.

## Context stack (when valuation is pinged)

Every property valuation uses the **same base**:

1. **Market data** — `lib/market_data.py`: `get_city_data(city, neighborhood, listing)`  
   - Source: `data/market_data_cache.json` (or fallback estimation).  
   - Injected into the user prompt: ADR, occupancy, price range, last_updated, source note.

2. **Future context (2026–2031)** — `lib/future_context_loader.py`: `load_future_context()`, `append_future_context(system_prompt)`  
   - Source: `data/future_context_2026_2031.json`.  
   - Prepended to the system prompt: global/EU STR growth, population shifts, regulatory outlook, tech trends.  
   - A short forecast line (Europe STR growth %, CAGR %, population shifts) is also added to the market line in the user prompt.

3. **System prompt** — `ai_lm_content/property_valuation_daily_rental/system_prompt.txt` (via `get_prompt("property_valuation_daily_rental")`).  
   - Optional: `get_reference_context("property_valuation_daily_rental")` (2026 reference data) appended after the prompt.

4. **User prompt** — Market line (with optional forecast) + listing description, price, bedrooms + “Evaluate and return JSON only.”

Both entry points use this stack:

- **Root** `property_evaluator.py`: `evaluate_property(city, neighborhood=..., listing_text=..., listing_price=..., bedrooms=..., listing=..., model=...)`
- **Library** `lib/property_evaluator.py`: `evaluate_property(listing_text, city=..., neighborhood=..., listing=..., model=...)`

So whenever property valuation is “pinged” (from the root script or from any code that imports `lib.property_evaluator`), it connects to the same base: market data cache, future context file, and prompt/reference from `ai_lm_content`. The only difference is argument order and how the listing dict is built.

## LLM plug (not implemented by default)

The actual “LLM that values properties” is behind a **plug** so it can be implemented later or swapped.

- **Module:** `lib/llm_valuation_plug.py`
- **Entry point:** `run_valuation(system_prompt: str, user_prompt: str, model: str = "qwen3") -> dict`

Behavior:

- If **`RUN_VALUATION_LLM`** is set (e.g. to a callable `(user_prompt, model, system_content) -> dict`), that is used.
- Else the plug tries **`bot.llm._chat_json`** (Ollama). If that’s available, valuation runs with the composed system + user prompt.
- If neither is available, the plug returns a **stub** response:  
  `property_valuation_score: 0`, `recommendation: "Avoid"`, `reasoning` explaining that the valuation LLM is not implemented and how to plug one in.

To implement the LLM:

1. **Option A — Use Ollama:** Install `ollama`, pull a model (e.g. `qwen3`), and ensure `bot.llm` is importable. The plug will use `_chat_json` automatically.
2. **Option B — Custom callable:** Set `lib.llm_valuation_plug.RUN_VALUATION_LLM` to a function with signature `(user_prompt: str, model: str, system_content: str) -> dict` that returns the same JSON shape as the schema (e.g. `property_valuation_score`, `recommendation`, `estimated_annual_gross_revenue`, `price_to_earnings_ratio`, `cap_rate`, `key_strengths`, `key_risks`, `suggested_management_fee`, `reasoning`).

## Files

- `data/market_data_cache.json` — City/neighborhood ADR, occupancy, price ranges.  
- `data/future_context_2026_2031.json` — 2026–2031 STR/population/regulatory/tech outlook.  
- `lib/market_data.py` — Load cache, `get_city_data()`, modifiers, fallback.  
- `lib/future_context_loader.py` — Load future context, `append_future_context()`.  
- `lib/llm_valuation_plug.py` — `run_valuation()`; plug for the valuation LLM.  
- `lib/property_evaluator.py` — Library entry: builds context stack, calls plug.  
- `property_evaluator.py` — Root entry: same context stack, calls plug.  
- `ai_lm_content/property_valuation_daily_rental/instructions_context.txt` — Instructions (consider future context, use get_city_data).  
- `ai_lm_content/property_valuation_daily_rental/` — System prompt, schema, reference data.

## Quick debug

From repo root:

```bash
python3 -c "
from property_evaluator import evaluate_property
r = evaluate_property('Paris', listing_text='2-bed apartment near Louvre', bedrooms=2)
print('Score:', r.get('property_valuation_score'))
print('Recommendation:', r.get('recommendation'))
print('Reasoning:', r.get('reasoning')[:200] if r.get('reasoning') else None)
"
```

With Ollama running and a model available, you get a real valuation; otherwise you get the stub and the “not implemented” message in `reasoning`.
