#!/usr/bin/env python3
"""
Seed data/market_data_cache.json with 20 major European cities.
Uses realistic 2026-style numbers (AirDNA/Airbtics inspired).
Run from repo root: python3 tools/populate_initial_market_data.py
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from lib.market_data import load_cache, save_cache, update_city_data

# 20 cities: Paris, Barcelona, Amsterdam, Lisbon, Berlin, London, Rome, Madrid,
# Prague, Vienna, Budapest, Warsaw, Zagreb, Dubrovnik, Luxembourg City,
# Brussels, Milan, Florence, Porto, Athens
# Format: (city_name, average_adr, occupancy_rate, typical_price_range_low, typical_price_range_high, optional neighborhoods)
SEED = [
    ("Paris", 190, 0.79, 650000, 1200000, {"Le Marais": (212, 0.82, 800000, 1500000), "Montmartre": (180, 0.77, 550000, 950000)}),
    ("Barcelona", 165, 0.76, 480000, 720000, {"Eixample": (175, 0.78, 520000, 780000), "Gothic Quarter": (195, 0.80, 600000, 900000)}),
    ("Amsterdam", 248, 0.80, 700000, 1050000, {"Jordaan": (265, 0.82, 750000, 1150000), "De Pijp": (230, 0.79, 650000, 980000)}),
    ("Lisbon", 145, 0.83, 400000, 610000, {"Alfama": (165, 0.85, 450000, 680000), "Chiado": (180, 0.84, 500000, 750000)}),
    ("Berlin", 125, 0.72, 350000, 530000, {"Mitte": (145, 0.75, 420000, 630000), "Kreuzberg": (115, 0.71, 320000, 480000)}),
    ("London", 220, 0.78, 750000, 1150000, {"Westminster": (280, 0.82, 900000, 1400000), "Shoreditch": (195, 0.76, 650000, 980000)}),
    ("Rome", 155, 0.81, 420000, 630000, {"Centro": (175, 0.83, 500000, 750000), "Trastevere": (165, 0.82, 480000, 720000)}),
    ("Madrid", 140, 0.83, 380000, 570000, {"Salamanca": (165, 0.84, 450000, 680000), "Malasaña": (125, 0.80, 350000, 530000)}),
    ("Prague", 118, 0.78, 320000, 480000, {"Old Town": (145, 0.82, 380000, 570000), "Vinohrady": (105, 0.75, 280000, 420000)}),
    ("Vienna", 135, 0.77, 420000, 630000, {"Innere Stadt": (165, 0.80, 520000, 780000), "Leopoldstadt": (120, 0.75, 380000, 570000)}),
    ("Budapest", 95, 0.75, 250000, 380000, {"District V": (115, 0.78, 300000, 450000), "District VII": (88, 0.73, 220000, 330000)}),
    ("Warsaw", 98, 0.70, 280000, 420000, {"Śródmieście": (115, 0.73, 320000, 480000), "Mokotów": (85, 0.68, 240000, 360000)}),
    ("Zagreb", 82, 0.68, 220000, 330000, {}),
    ("Dubrovnik", 185, 0.72, 450000, 680000, {}),  # High seasonality
    ("Luxembourg City", 165, 0.74, 750000, 1100000, {}),
    ("Brussels", 125, 0.73, 350000, 530000, {"EU Quarter": (145, 0.76, 420000, 630000)}),
    ("Milan", 150, 0.76, 450000, 680000, {"Centro": (175, 0.79, 520000, 780000), "Navigli": (135, 0.74, 400000, 600000)}),
    ("Florence", 165, 0.82, 420000, 630000, {"Historic Centre": (195, 0.85, 520000, 780000)}),
    ("Porto", 120, 0.80, 320000, 480000, {"Ribeira": (145, 0.83, 380000, 570000)}),
    ("Athens", 115, 0.78, 280000, 420000, {"Plaka": (135, 0.82, 350000, 530000), "Kolonaki": (125, 0.79, 320000, 480000)}),
]


def main() -> None:
    cache = load_cache()
    for item in SEED:
        if len(item) == 6:
            city, adr, occ, plo, phi, neighborhoods = item
        else:
            city, adr, occ, plo, phi = item[:5]
            neighborhoods = {}
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
    save_cache(load_cache())  # ensure file is written
    print(f"Seeded {len(SEED)} cities into {REPO_ROOT / 'data' / 'market_data_cache.json'}")


if __name__ == "__main__":
    main()
