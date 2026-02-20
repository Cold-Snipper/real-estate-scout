"""
Immo Snippy — Property Valuation Context for Daily Rental.
Uses Market Data Matrix (get_city_data) and property_valuation_daily_rental prompt + reference data.
Returns full evaluation including price_to_earnings_ratio and cap_rate.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from lib import market_data, future_context_loader
from lib.llm_valuation_plug import run_valuation
try:
    from ai_lm_content import get_prompt, get_reference_context
except ImportError:
    get_prompt = get_reference_context = None  # type: ignore[assignment]


def _extract_json(text: str) -> dict[str, Any] | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


def evaluate_property(
    city: str,
    neighborhood: str | None = None,
    listing_text: str | None = None,
    listing_price: int | float | None = None,
    bedrooms: int | None = None,
    listing: dict[str, Any] | None = None,
    model: str = "qwen3",
) -> dict[str, Any]:
    """
    Evaluate a property for daily rental viability (Property Valuation Context for Daily Rental).
    First calls market_data.get_city_data(city, neighborhood, listing), then injects
    market data (with modifiers when listing provided) and returns full evaluation including
    price_to_earnings_ratio and cap_rate.
    """
    if listing is None:
        listing = {}
        if listing_text:
            listing["description"] = listing_text
        if listing_price is not None:
            listing["price"] = listing_price
            listing["sale_price"] = listing_price
        if bedrooms is not None:
            listing["bedrooms"] = bedrooms
    # 1) Get market data (cache or fallback; modifiers applied if listing provided)
    market = market_data.get_city_data(city, neighborhood, listing=listing if listing else None)
    adr = market.get("adr", 0)
    occupancy = market.get("occupancy", 0.7)
    price_range = market.get("price_range", [0, 0])
    last_updated = market.get("last_updated", "")
    from_fallback = market.get("from_fallback", False)
    source_note = "from fallback estimation" if from_fallback else "from cache"

    # Future context summary for prompt (2026–2031 Europe STR CAGR, population shifts)
    ctx = future_context_loader.load_future_context()
    forecast_line = ""
    if ctx:
        eu = ctx.get("europe_str_market") or {}
        pop = ctx.get("population_trends") or {}
        g = ctx.get("global_str_market") or {}
        forecast_line = (
            f"2026–2031 outlook: Europe STR growth {eu.get('growth_rate', 0)}%, global CAGR {g.get('cagr', 0)}%. "
            f"Population moving to mid-sized cities, Southern Europe, suburbs. "
        )
        shift = (pop.get("population_centers_shift") or [])[:2]
        if shift:
            forecast_line += f"Key shifts: {', '.join(shift)}. "

    market_line = (
        f"Market data for this city: ADR €{adr}, occupancy {occupancy * 100:.0f}%, "
        f"typical price range €{price_range[0]:,}–€{price_range[1]:,} "
        f"(last_updated: {last_updated}). {source_note}. {forecast_line}"
    ).strip()

    # 2) Build system prompt (Future Context 2026–2031 + Property Valuation + 2026 reference)
    if get_prompt and get_reference_context:
        system = get_prompt("property_valuation_daily_rental")
        ref = get_reference_context("property_valuation_daily_rental")
        if ref:
            system = f"{system}\n\n---\n2026 Reference Data:\n{ref}"
        system = future_context_loader.append_future_context(system)
    else:
        system = (
            "You are an expert European investment analyst for Immo Snippy — Property Valuation Context for Daily Rental (2026). "
            "Evaluate the property for daily rental management viability. "
            "Output ONLY valid JSON with: property_valuation_score (1-10), recommendation, "
            "estimated_annual_gross_revenue, price_to_earnings_ratio, cap_rate, "
            "key_strengths, key_risks, suggested_management_fee, reasoning."
        )
        system = future_context_loader.append_future_context(system)

    # 3) Build user prompt
    parts = [market_line]
    if listing_text:
        parts.append(f"Listing description:\n{listing_text}")
    if listing_price is not None:
        parts.append(f"Listing/asking price: €{listing_price:,.0f}")
    if bedrooms is not None:
        parts.append(f"Bedrooms: {bedrooms}")
    parts.append("\nEvaluate and return JSON only (include cap_rate).")
    user_prompt = "\n\n".join(parts)

    # 4) Call LLM via plug (bot.llm when available, else stub)
    out = run_valuation(system, user_prompt, model=model)
    if not isinstance(out, dict):
        out = {}
    out.setdefault("price_to_earnings_ratio", "N/A")
    out.setdefault("cap_rate", "N/A")
    out["market_data"] = market
    return out
