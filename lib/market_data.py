"""
Immo Snippy — Market Data Matrix (local-first cache).
Self-populating cache for European cities (100k+ population).
Use get_city_data(city, neighborhood) before evaluation; missing or stale data uses fallback_estimation() and is saved to cache.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# Path to cache file (repo root / data / market_data_cache.json)
_REPO_ROOT = Path(__file__).resolve().parent.parent
CACHE_PATH = _REPO_ROOT / "data" / "market_data_cache.json"

# Seed metadata for fallback_estimation: population in 100k, is_capital (0/1), is_tourist (0/1), tourist_factor (0–1)
# Covers major European cities 100k+; unknown cities get generic fallback.
_CITY_METADATA: dict[str, dict[str, Any]] = {
    "paris": {"population_100k": 21, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.9},
    "barcelona": {"population_100k": 16, "is_capital": 0, "is_tourist_city": 1, "tourist_factor": 0.95},
    "amsterdam": {"population_100k": 8, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.85},
    "lisbon": {"population_100k": 3, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.9},
    "berlin": {"population_100k": 37, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.7},
    "london": {"population_100k": 90, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.9},
    "rome": {"population_100k": 28, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.95},
    "madrid": {"population_100k": 32, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.8},
    "prague": {"population_100k": 13, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.9},
    "vienna": {"population_100k": 19, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.85},
    "budapest": {"population_100k": 17, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.8},
    "warsaw": {"population_100k": 18, "is_capital": 1, "is_tourist_city": 0, "tourist_factor": 0.5},
    "zagreb": {"population_100k": 8, "is_capital": 1, "is_tourist_city": 0, "tourist_factor": 0.4},
    "dubrovnik": {"population_100k": 0, "is_capital": 0, "is_tourist_city": 1, "tourist_factor": 0.95},
    "luxembourg city": {"population_100k": 1, "is_capital": 1, "is_tourist_city": 0, "tourist_factor": 0.5},
    "brussels": {"population_100k": 12, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.7},
    "milan": {"population_100k": 13, "is_capital": 0, "is_tourist_city": 1, "tourist_factor": 0.75},
    "florence": {"population_100k": 4, "is_capital": 0, "is_tourist_city": 1, "tourist_factor": 0.95},
    "porto": {"population_100k": 2, "is_capital": 0, "is_tourist_city": 1, "tourist_factor": 0.85},
    "athens": {"population_100k": 31, "is_capital": 1, "is_tourist_city": 1, "tourist_factor": 0.85},
}

# Stale threshold: refresh if older than this many days
CACHE_STALE_DAYS = 30


def _normalize_city(name: str) -> str:
    return name.strip().lower() if name else ""


def load_cache() -> dict[str, Any]:
    """Load the market data cache from disk. Returns empty dict if file missing or invalid."""
    if not CACHE_PATH.exists():
        return {}
    try:
        data = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_cache(data: dict[str, Any]) -> None:
    """Write the market data cache to disk. Creates data/ if needed."""
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def estimate_city_data(city_name: str) -> dict[str, Any]:
    """
    Estimate market data for a city using heuristics (no cache).
    base_adr = 110 + (population_factor) + (tourist_factor) + (capital_bonus)
    occupancy = 0.65 + (tourist_bonus)
    price_range = [adr * 2800, adr * 4200]
    Used when city is missing or stale; result can be saved to cache.
    """
    return _estimate_impl(city_name)


def _estimate_impl(city_name: str) -> dict[str, Any]:
    key = _normalize_city(city_name)
    meta = _CITY_METADATA.get(key)
    if not meta:
        # Generic European city 100k+: assume 1 = 100k, not capital, some tourism
        meta = {"population_100k": 1, "is_capital": 0, "is_tourist_city": 0, "tourist_factor": 0.5}

    pop = max(0, int(meta.get("population_100k", 1)))
    is_tourist = 1 if meta.get("is_tourist_city") else 0
    is_capital = 1 if meta.get("is_capital") else 0
    tourist_factor = float(meta.get("tourist_factor", 0.5))

    base_adr = 110 + (pop * 8) + (is_tourist * 40) + (is_capital * 30)
    base_adr = max(80, min(350, base_adr))  # clamp to plausible range
    occupancy = 0.65 + (tourist_factor * 0.15)
    occupancy = max(0.55, min(0.88, round(occupancy, 2)))
    low = int(base_adr * 2800)
    high = int(base_adr * 4200)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return {
        "adr": base_adr,
        "occupancy": occupancy,
        "price_range": [low, high],
        "last_updated": today,
        "from_fallback": True,
    }


def fallback_estimation(city_name: str) -> dict[str, Any]:
    """Alias for estimate_city_data for backward compatibility."""
    return estimate_city_data(city_name)


def get_city_data(
    city_name: str,
    neighborhood: str | None = None,
    listing: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Get market data for a city (and optionally neighborhood).
    If listing is provided, applies property modifiers (bedrooms, amenities, condition, view, size).
    Returns dict with: adr, occupancy, price_range, last_updated, estimated_annual_gross_revenue; optionally from_fallback.
    """
    if not city_name or not city_name.strip():
        base = estimate_city_data("Unknown")
        return _apply_modifiers(base, listing)

    cache = load_cache()
    city_key = next((k for k in cache if _normalize_city(k) == _normalize_city(city_name)), None)
    if not city_key:
        est = estimate_city_data(city_name)
        _merge_fallback_into_cache(cache, city_name, est)
        return _apply_modifiers(est, listing)

    city = cache[city_key]
    last_updated = city.get("last_updated") or ""
    try:
        from_dt = datetime.strptime(last_updated, "%Y-%m-%d")
        if from_dt.tzinfo is None:
            from_dt = from_dt.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - from_dt > timedelta(days=CACHE_STALE_DAYS):
            est = estimate_city_data(city_name)
            _merge_fallback_into_cache(cache, city_key, est)
            out = _to_result(city_key, None, neighborhood, cache[city_key])
            return _apply_modifiers(out, listing)
        out = _to_result(city_key, None, neighborhood, city)
        return _apply_modifiers(out, listing)
    except (ValueError, TypeError):
        est = estimate_city_data(city_name)
        _merge_fallback_into_cache(cache, city_key, est)
        out = _to_result(city_key, None, neighborhood, cache[city_key])
        return _apply_modifiers(out, listing)


def _city_base(city: dict[str, Any]) -> tuple[float, float]:
    """Get (base_adr, base_occupancy) from city, supporting legacy keys."""
    adr = city.get("base_adr") or city.get("average_adr")
    occ = city.get("base_occupancy") or city.get("occupancy_rate")
    return (float(adr or 0), float(occ or 0.7))


def _nb_base(nb: dict[str, Any], city: dict[str, Any]) -> tuple[float, float]:
    adr = nb.get("base_adr") or nb.get("adr") or city.get("base_adr") or city.get("average_adr")
    occ = nb.get("base_occupancy") or nb.get("occupancy") or city.get("base_occupancy") or city.get("occupancy_rate")
    return (float(adr or 0), float(occ or 0.7))


def _to_result(
    city_key: str,
    fallback: dict[str, Any] | None,
    neighborhood: str | None,
    city: dict[str, Any],
) -> dict[str, Any]:
    """Build result dict from cache city entry (base_adr, base_occupancy); prefer neighborhood if given."""
    if neighborhood:
        neighborhoods = city.get("neighborhoods") or {}
        nb_key = next(
            (k for k in neighborhoods if _normalize_city(k) == _normalize_city(neighborhood)),
            None,
        )
        if nb_key:
            nb = neighborhoods[nb_key]
            adr, occ = _nb_base(nb, city)
            pr = nb.get("price_range") or city.get("typical_price_range") or [0, 0]
            return {
                "adr": adr,
                "occupancy": occ,
                "price_range": list(pr),
                "last_updated": city.get("last_updated", ""),
                "from_fallback": False,
            }
    if fallback:
        return fallback
    adr, occ = _city_base(city)
    return {
        "adr": adr,
        "occupancy": occ,
        "price_range": list(city.get("typical_price_range", [0, 0])),
        "last_updated": city.get("last_updated", ""),
        "from_fallback": False,
    }


# Property modifiers: multipliers for bedrooms, amenities, condition, view, size (applied to base ADR/occupancy)
def _modifier_bedrooms(bedrooms: int | None) -> float:
    if bedrooms is None:
        return 1.0
    if bedrooms <= 1:
        return 0.88
    if bedrooms == 2:
        return 1.0
    if bedrooms == 3:
        return 1.10
    return 1.18  # 4+


def _modifier_amenities(listing: dict[str, Any] | None) -> float:
    if not listing:
        return 1.0
    m = 1.0
    # Keywords in description/title/amenities list
    text = " ".join(
        str(v).lower() for k, v in (listing or {}).items()
        if k in ("amenities", "description", "title", "features") and v
    )
    if "wifi" in text or "wi-fi" in text:
        m += 0.02
    if "ac" in text or "air conditioning" in text or "climate" in text:
        m += 0.03
    if "kitchen" in text or "full kitchen" in text:
        m += 0.02
    if "parking" in text or "garage" in text:
        m += 0.02
    if "balcony" in text or "terrace" in text or "garden" in text:
        m += 0.02
    if "washer" in text or "washing" in text or "laundry" in text:
        m += 0.01
    return min(1.25, m)


def _modifier_condition(listing: dict[str, Any] | None) -> float:
    if not listing:
        return 1.0
    c = (listing.get("condition") or listing.get("property_condition") or "").lower()
    if "renovated" in c or "new" in c or "modern" in c or "refurbished" in c:
        return 1.06
    if "good" in c or "excellent" in c:
        return 1.03
    if "needs" in c or "poor" in c:
        return 0.92
    return 1.0


def _modifier_view(listing: dict[str, Any] | None) -> float:
    if not listing:
        return 1.0
    text = " ".join(str(v).lower() for k, v in (listing or {}).items() if v and k in ("description", "title", "view", "features"))
    if "view" in text or "sea view" in text or "river" in text or "lake" in text or "panoramic" in text:
        return 1.08
    return 1.0


def _modifier_size(listing: dict[str, Any] | None) -> float:
    if not listing:
        return 1.0
    sqm = listing.get("surface_m2") or listing.get("size_sqm") or listing.get("surface") or listing.get("area_sqm") or listing.get("living_area")
    if sqm is None:
        return 1.0
    try:
        s = float(sqm)
        if s < 30:
            return 0.92
        if s < 50:
            return 0.98
        if s <= 90:
            return 1.0
        if s <= 130:
            return 1.05
        return 1.10  # large
    except (TypeError, ValueError):
        return 1.0


def _apply_modifiers(base: dict[str, Any], listing: dict[str, Any] | None) -> dict[str, Any]:
    """Apply property modifiers to base adr/occupancy; add estimated_annual_gross_revenue."""
    out = dict(base)
    adr = out.get("adr") or 0
    occ = out.get("occupancy") or 0.7
    if listing:
        adr = adr * _modifier_bedrooms(listing.get("bedrooms")) * _modifier_amenities(listing) * _modifier_condition(listing) * _modifier_view(listing) * _modifier_size(listing)
        occ = min(0.90, occ * (0.98 + 0.04 * _modifier_amenities(listing) - 0.02))  # slight occupancy bump for amenities
    out["adr"] = round(adr, 1)
    out["occupancy"] = round(min(0.92, max(0.50, occ)), 2)
    rev = adr * 365 * out["occupancy"]
    out["estimated_annual_gross_revenue"] = round(rev, 0)
    return out


def _merge_fallback_into_cache(cache: dict, city_key: str, fallback: dict) -> None:
    """Write fallback result into cache for city_key (base_adr, base_occupancy) and save."""
    cache[city_key] = {
        "last_updated": fallback.get("last_updated", ""),
        "base_adr": fallback["adr"],
        "base_occupancy": fallback["occupancy"],
        "typical_price_range": fallback["price_range"],
        "neighborhoods": cache.get(city_key, {}).get("neighborhoods", {}),
    }
    save_cache(cache)


def update_city_data(city_name: str, new_data: dict[str, Any]) -> None:
    """Update cache with new_data for city_name and save. new_data can include base_adr, base_occupancy, typical_price_range, neighborhoods, last_updated (legacy average_adr/occupancy_rate also accepted)."""
    cache = load_cache()
    city_key = next((k for k in cache if _normalize_city(k) == _normalize_city(city_name)), None)
    if not city_key:
        city_key = city_name.strip()
    existing = cache.get(city_key, {})
    existing.update(new_data)
    existing.setdefault("last_updated", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    existing.setdefault("neighborhoods", existing.get("neighborhoods", {}))
    cache[city_key] = existing
    save_cache(cache)


def update_from_listing(listing: dict[str, Any]) -> None:
    """
    When a new listing is processed, update the cache for that city/neighborhood.
    Extracts city, neighborhood, and price from listing; merges into cache (expand price range, update last_updated).
    Auto-adds city via estimate_city_data if missing.
    """
    city = _listing_city(listing)
    neighborhood = _listing_neighborhood(listing)
    price = _listing_price(listing)
    if not city:
        return
    cache = load_cache()
    city_key = next((k for k in cache if _normalize_city(k) == _normalize_city(city)), None)
    if not city_key:
        est = estimate_city_data(city)
        city_key = city.strip()
        cache[city_key] = {
            "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "base_adr": est["adr"],
            "base_occupancy": est["occupancy"],
            "typical_price_range": list(est["price_range"]),
            "neighborhoods": {},
        }
    else:
        cache[city_key] = dict(cache[city_key])
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache[city_key]["last_updated"] = today
    _adr = cache[city_key].get("base_adr") or cache[city_key].get("average_adr")
    _occ = cache[city_key].get("base_occupancy") or cache[city_key].get("occupancy_rate")
    if price is not None and price > 0:
        pr = cache[city_key].get("typical_price_range") or [0, 0]
        low, high = min(pr[0], price), max(pr[1], price)
        cache[city_key]["typical_price_range"] = [low, high]
    if neighborhood and neighborhood.strip():
        nb_key = next(
            (k for k in (cache[city_key].get("neighborhoods") or {}) if _normalize_city(k) == _normalize_city(neighborhood)),
            None,
        )
        if not nb_key:
            nb_key = neighborhood.strip()
        neighborhoods = cache[city_key].get("neighborhoods") or {}
        neighborhoods = dict(neighborhoods)
        nb_prev = neighborhoods.get(nb_key, {})
        nb_adr = nb_prev.get("base_adr") or nb_prev.get("adr") or _adr
        nb_occ = nb_prev.get("base_occupancy") or nb_prev.get("occupancy") or _occ
        nb_pr = list(nb_prev.get("price_range", [0, 0]))
        if price is not None and price > 0:
            nb_pr = [min(nb_pr[0], price) if nb_pr[0] else price, max(nb_pr[1], price) if nb_pr[1] else price]
        neighborhoods[nb_key] = {"base_adr": nb_adr, "base_occupancy": nb_occ, "price_range": nb_pr}
        cache[city_key]["neighborhoods"] = neighborhoods
    save_cache(cache)


def _listing_city(listing: dict[str, Any]) -> str:
    """Extract city from listing (location, city, or title/description fallback)."""
    loc = listing.get("location") or {}
    if isinstance(loc, dict):
        c = loc.get("city") or loc.get("city_name")
        if c:
            return str(c).strip()
    c = listing.get("city") or listing.get("city_name") or listing.get("location_city")
    if c:
        return str(c).strip()
    title = (listing.get("title") or "") + " " + (listing.get("description") or "")
    # Optional: simple keyword fallback for "in CityName" patterns
    return ""


def _listing_neighborhood(listing: dict[str, Any]) -> str:
    """Extract neighborhood from listing."""
    loc = listing.get("location") or {}
    if isinstance(loc, dict):
        n = loc.get("neighborhood") or loc.get("district") or loc.get("area")
        if n:
            return str(n).strip()
    n = listing.get("neighborhood") or listing.get("district") or listing.get("area")
    return str(n).strip() if n else ""


def _listing_price(listing: dict[str, Any]) -> int | float | None:
    """Extract numeric price from listing (sale or rent)."""
    p = listing.get("sale_price") or listing.get("price") or listing.get("rent_price") or listing.get("asking_price")
    if p is None:
        return None
    try:
        return int(float(p))
    except (TypeError, ValueError):
        return None
