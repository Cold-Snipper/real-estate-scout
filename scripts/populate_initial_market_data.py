#!/usr/bin/env python3
"""
Seed data/market_data_cache.json with 10 major European cities (2026-style data).
Run from repo root: python3 scripts/populate_initial_market_data.py
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from lib.market_data import load_cache, update_city_data

# 10 cities: Paris, Barcelona, Amsterdam, Lisbon, Berlin, London, Rome, Madrid, Prague, Vienna
SEED = [
    ("Paris", 190, 0.79, 650000, 1200000, {"Le Marais": (212, 0.82, 800000, 1500000), "Montmartre": (180, 0.77, 550000, 950000)}),
    ("Barcelona", 165, 0.76, 480000, 720000, {}),
    ("Amsterdam", 248, 0.80, 700000, 1050000, {}),
    ("Lisbon", 145, 0.83, 400000, 610000, {}),
    ("Berlin", 125, 0.72, 350000, 530000, {}),
    ("London", 220, 0.78, 750000, 1150000, {}),
    ("Rome", 155, 0.81, 420000, 630000, {}),
    ("Madrid", 140, 0.83, 380000, 570000, {}),
    ("Prague", 118, 0.78, 320000, 480000, {}),
    ("Vienna", 135, 0.77, 420000, 630000, {}),
]


def main() -> None:
    for item in SEED:
        city, adr, occ, plo, phi, neighborhoods = item
        nb_dict = {}
        for nb_name, (nb_adr, nb_occ, nb_lo, nb_hi) in neighborhoods.items():
            nb_dict[nb_name] = {"adr": nb_adr, "occupancy": nb_occ, "price_range": [nb_lo, nb_hi]}
        update_city_data(city, {
            "average_adr": adr,
            "occupancy_rate": occ,
            "typical_price_range": [plo, phi],
            "neighborhoods": nb_dict,
            "last_updated": "2026-02-20",
        })
    cache = load_cache()
    print(f"Seeded {len(SEED)} cities into data/market_data_cache.json")
    print("Cities:", list(cache.keys()))


if __name__ == "__main__":
    main()
