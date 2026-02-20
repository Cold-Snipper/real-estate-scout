"""
Canonical real estate listing schema — single source of truth from
data/schema-realestate-listings-standard.json.
Use for: backend listings table (SQLite/Mongo), CRM property listing fields.
"""
from __future__ import annotations

import json
from pathlib import Path

_SCHEMA_PATH = Path(__file__).resolve().parent.parent / "data" / "schema-realestate-listings-standard.json"

# Order: listing_ref first (PK), then required, then optional
LISTING_FIELDS = [
    "listing_ref",
    "listing_url",
    "source",
    "transaction_type",
    "first_seen",
    "last_updated",
    "phone_number",
    "phone_source",
    "image_urls",
    "title_history",
    "title",
    "location",
    "description",
    "sale_price",
    "rent_price",
    "monthly_charges",
    "deposit",
    "commission",
    "availability",
    "surface_m2",
    "floor",
    "rooms",
    "bedrooms",
    "year_of_construction",
    "fitted_kitchen",
    "open_kitchen",
    "shower_rooms",
    "bathrooms",
    "separate_toilets",
    "furnished",
    "balcony",
    "balcony_m2",
    "terrace_m2",
    "garden",
    "parking_spaces",
    "energy_class",
    "thermal_insulation_class",
    "electric_heating",
    "heat_pump",
    "basement",
    "laundry_room",
    "elevator",
    "pets_allowed",
    "agency_name",
    "agency_url",
    "agent_name",
    "agency_logo_url",
    "images_dir",
]

# SQLite type per field (schema-compliant; no agency_ref, gas_heating, etc.)
LISTING_SQLITE_TYPES = {
    "listing_ref": "TEXT",
    "listing_url": "TEXT",
    "source": "TEXT",
    "transaction_type": "TEXT",
    "first_seen": "TEXT",
    "last_updated": "TEXT",
    "phone_number": "TEXT",
    "phone_source": "TEXT",
    "image_urls": "TEXT",
    "title_history": "TEXT",
    "title": "TEXT",
    "location": "TEXT",
    "description": "TEXT",
    "sale_price": "REAL",
    "rent_price": "REAL",
    "monthly_charges": "REAL",
    "deposit": "REAL",
    "commission": "TEXT",
    "availability": "TEXT",
    "surface_m2": "REAL",
    "floor": "INTEGER",
    "rooms": "INTEGER",
    "bedrooms": "INTEGER",
    "year_of_construction": "INTEGER",
    "fitted_kitchen": "INTEGER",
    "open_kitchen": "INTEGER",
    "shower_rooms": "INTEGER",
    "bathrooms": "INTEGER",
    "separate_toilets": "INTEGER",
    "furnished": "INTEGER",
    "balcony": "INTEGER",
    "balcony_m2": "REAL",
    "terrace_m2": "REAL",
    "garden": "INTEGER",
    "parking_spaces": "INTEGER",
    "energy_class": "TEXT",
    "thermal_insulation_class": "TEXT",
    "electric_heating": "INTEGER",
    "heat_pump": "INTEGER",
    "basement": "INTEGER",
    "laundry_room": "INTEGER",
    "elevator": "INTEGER",
    "pets_allowed": "INTEGER",
    "agency_name": "TEXT",
    "agency_url": "TEXT",
    "agent_name": "TEXT",
    "agency_logo_url": "TEXT",
    "images_dir": "TEXT",
}


def get_listings_schema_path() -> Path:
    return _SCHEMA_PATH


def get_listings_schema() -> dict:
    if not _SCHEMA_PATH.exists():
        return {}
    with open(_SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def build_listings_create_sql(table_name: str = "listings") -> str:
    """Build CREATE TABLE SQL for listings compliant with schema-realestate-listings-standard.json."""
    pk = "listing_ref"
    parts = [f"{pk} TEXT PRIMARY KEY"]
    for f in LISTING_FIELDS:
        if f == pk:
            continue
        typ = LISTING_SQLITE_TYPES.get(f, "TEXT")
        parts.append(f"{f} {typ}")
    cols = ",\n      ".join(parts)
    return f"""CREATE TABLE IF NOT EXISTS {table_name} (
      {cols}
    );
    CREATE INDEX IF NOT EXISTS idx_listings_first_seen ON {table_name}(first_seen);
    CREATE INDEX IF NOT EXISTS idx_listings_transaction ON {table_name}(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_listings_location ON {table_name}(location);
    CREATE INDEX IF NOT EXISTS idx_listings_source ON {table_name}(source);
    """


# Set of allowed keys for filtering (e.g. MongoDB writes)
LISTING_SCHEMA_KEYS = frozenset(LISTING_FIELDS)


def normalize_listing_row(row: dict) -> dict:
    """Map legacy keys to schema keys (source_url -> listing_url, size_sqm -> surface_m2)."""
    out = dict(row)
    if "source_url" in out and "listing_url" not in out:
        out["listing_url"] = out.pop("source_url", None)
    if "size_sqm" in out and "surface_m2" not in out:
        out["surface_m2"] = out.pop("size_sqm", None)
    return out
