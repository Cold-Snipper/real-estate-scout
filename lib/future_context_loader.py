"""
Immo Snippy — Future Context (2026–2031) loader.
Offline-first: loads from data/future_context_2026_2031.json. Refresh from web only if missing or stale (>30 days).
Total text data pulled from web capped at 200 MB (tracked in populate script if used).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parent.parent
FUTURE_CONTEXT_PATH = _REPO_ROOT / "data" / "future_context_2026_2031.json"
STALE_DAYS = 30


def load_future_context() -> dict[str, Any]:
    """
    Load Future Context (2026–2031) from data/future_context_2026_2031.json.
    Returns empty dict if file missing or invalid.
    """
    if not FUTURE_CONTEXT_PATH.exists():
        return {}
    try:
        return json.loads(FUTURE_CONTEXT_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def append_future_context(system_prompt: str) -> str:
    """
    Prepend the 2026–2031 future outlook block to the given system prompt.
    Uses local cache from data/future_context_2026_2031.json.
    """
    ctx = load_future_context()
    if not ctx:
        return system_prompt

    lines = ["## Future Context (2026–2031)", ""]
    g = ctx.get("global_str_market") or {}
    if g:
        lines.append(
            f"- Global STR: 2026 revenue ~${g.get('2026_revenue', 0)}B, 2031 ~${g.get('2031_revenue', 0)}B "
            f"(CAGR {g.get('cagr', 0)}%)."
        )
    eu = ctx.get("europe_str_market") or {}
    if eu:
        lines.append(
            f"- Europe STR: growth {eu.get('growth_rate', 0)}%; supply growth {eu.get('supply_growth', 0)}%, "
            f"demand growth {eu.get('demand_growth', 0)}%."
        )
        drivers = eu.get("key_drivers") or []
        if drivers:
            lines.append("- Key drivers: " + "; ".join(drivers[:3]) + ".")
    pop = ctx.get("population_trends") or {}
    if pop:
        lines.append(f"- EU population: growth rate {pop.get('eu_growth_rate', 0)}%; migration drivers: {', '.join(pop.get('migration_drivers', [])[:3])}.")
        shift = pop.get("population_centers_shift") or []
        if shift:
            lines.append(f"- Population shifts: {', '.join(shift)}.")
    reg = ctx.get("regulatory_forecast") or {}
    for period in ["2026–2028", "2029–2031"]:
        items = reg.get(period) or []
        if items:
            lines.append(f"- {period}: {items[0]}")
    tech = ctx.get("technology_trends") or {}
    if tech:
        lines.append(f"- Technology: AI pricing {tech.get('AI_pricing', '')}; sustainability: {tech.get('sustainability', '')}.")
        prefs = tech.get("guest_preferences") or []
        if prefs:
            lines.append(f"- Guest preferences: {', '.join(prefs)}.")
    lines.append("")
    lines.append("Consider the above when scoring long-term viability (population shifts, regulation, demand).")
    lines.append("")
    return "\n".join(lines) + "\n---\n\n" + system_prompt
