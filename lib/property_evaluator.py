"""
Immo Snippy — Property Valuation Context for Daily Rental (Phase 2).
Uses ai_lm_content/property_valuation_daily_rental prompt and schema only.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from ai_lm_content import get_prompt, get_reference_context
from ai_lm_content.loader import get_schema
from lib import market_data, future_context_loader
from lib.llm_valuation_plug import run_valuation


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


def _validate_against_schema(data: dict[str, Any], schema: dict[str, Any]) -> bool:
    """Check that data has all required keys from schema. Does not validate types in depth."""
    required = schema.get("required") or []
    if not required:
        return True
    for key in required:
        if key not in data:
            return False
        if data[key] is None and key in ("property_valuation_score", "recommendation", "reasoning"):
            return False
    return True


def evaluate_property(
    listing_text: str,
    city: str | None = None,
    neighborhood: str | None = None,
    listing: dict[str, Any] | None = None,
    model: str = "qwen3",
) -> dict[str, Any]:
    """
    Evaluate a listing for daily rental viability using ai_lm_content/property_valuation_daily_rental.
    First calls market_data.get_city_data(city, neighborhood, listing); injects market line into prompt.
    Uses market data (with modifiers when listing provided) for price_to_earnings_ratio and property_valuation_score. Returns JSON.
    """
    system_prompt = get_prompt("property_valuation_daily_rental")
    ref = get_reference_context("property_valuation_daily_rental")
    if ref:
        system_prompt = f"{system_prompt}\n\n---\n2026 Reference Data:\n{ref}"
    system_prompt = future_context_loader.append_future_context(system_prompt)
    schema = get_schema("property_valuation_daily_rental")
    if listing is None and listing_text:
        listing = {"description": listing_text, "title": ""}

    market_line = ""
    md = None
    if city:
        md = market_data.get_city_data(city, neighborhood, listing=listing)
        adr = md.get("adr", 0)
        occ = md.get("occupancy", 0.7)
        pr = md.get("price_range") or [0, 0]
        occ_pct = int(occ * 100)
        market_line = (
            f"Market data for {city}: ADR €{adr}, occupancy {occ_pct}%, "
            f"typical price €{pr[0]:,}-€{pr[1]:,}. "
        )
        if md.get("from_fallback"):
            market_line += "(Estimate; city not in cache.) "
        ctx = future_context_loader.load_future_context()
        if ctx:
            eu = ctx.get("europe_str_market") or {}
            g = ctx.get("global_str_market") or {}
            pop = ctx.get("population_trends") or {}
            market_line += (
                f"2026–2031 outlook: Europe STR growth {eu.get('growth_rate', 0)}%, global CAGR {g.get('cagr', 0)}%. "
                f"Population shifts: {', '.join((pop.get('population_centers_shift') or [])[:2])}. "
            )

    user_content = listing_text.strip()
    if market_line:
        user_content = market_line.strip() + "\n\n" + user_content
    elif city:
        user_content = f"City: {city}\n\n{user_content}"

    try:
        out = run_valuation(system_prompt, user_content, model=model)
        if not isinstance(out, dict):
            out = {}
        if not _validate_against_schema(out, schema):
            for key in schema.get("required") or []:
                out.setdefault(key, "N/A" if key != "property_valuation_score" else 0)
            if "property_valuation_score" not in out or out.get("property_valuation_score") is None:
                out["property_valuation_score"] = 0
            if "recommendation" not in out or not out.get("recommendation"):
                out["recommendation"] = "Marginal"
        if md is not None:
            out["market_data"] = md
        return out
    except Exception as e:
        result = {
            "property_valuation_score": 0,
            "recommendation": "Error",
            "estimated_annual_gross_revenue": "N/A",
            "price_to_earnings_ratio": "N/A",
            "cap_rate": "N/A",
            "key_strengths": [],
            "key_risks": [],
            "suggested_management_fee": "N/A",
            "reasoning": f"Evaluation failed: {e}",
        }
        if md is not None:
            result["market_data"] = md
        return result
