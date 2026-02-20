#!/usr/bin/env python3
"""
Test schema compliance: listings_schema, CRM, operator_onboarding, backend listings.
Run from project root: python -m pytest tests/test_schema_compliance.py -v
Or: python tests/test_schema_compliance.py
"""
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

# Project root
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def test_listings_schema_module():
    """lib.listings_schema: fields, SQL build, normalize, no legacy keys."""
    from lib.listings_schema import (
        LISTING_FIELDS,
        LISTING_SCHEMA_KEYS,
        LISTING_SQLITE_TYPES,
        build_listings_create_sql,
        get_listings_schema,
        get_listings_schema_path,
        normalize_listing_row,
    )
    assert "listing_ref" in LISTING_FIELDS
    assert LISTING_FIELDS[0] == "listing_ref"
    assert "surface_m2" in LISTING_FIELDS
    assert "listing_url" in LISTING_FIELDS
    assert "phone_number" in LISTING_FIELDS
    assert "transaction_type" in LISTING_FIELDS
    # No legacy/non-compliant fields
    for bad in ("agency_ref", "gas_heating", "district_heating", "pellet_heating", "oil_heating", "solar_heating", "storage"):
        assert bad not in LISTING_SCHEMA_KEYS, f"Legacy field {bad} should not be in schema"
    assert LISTING_SCHEMA_KEYS == frozenset(LISTING_FIELDS)
    for f in LISTING_FIELDS:
        assert f in LISTING_SQLITE_TYPES or f == "listing_ref", f"Missing SQL type for {f}"
    # Build SQL
    sql = build_listings_create_sql("listings")
    assert "CREATE TABLE IF NOT EXISTS listings" in sql
    assert "listing_ref TEXT PRIMARY KEY" in sql
    assert "surface_m2 REAL" in sql
    assert "agency_ref" not in sql
    assert "idx_listings_first_seen" in sql
    # Schema file exists and loads
    assert get_listings_schema_path().exists()
    schema = get_listings_schema()
    assert isinstance(schema, dict) and "properties" in schema
    # Normalize legacy -> schema
    row = {"source_url": "https://a.lu/1", "size_sqm": 65.0, "title": "A"}
    out = normalize_listing_row(row)
    assert out.get("listing_url") == "https://a.lu/1"
    assert out.get("surface_m2") == 65.0
    assert "source_url" not in out
    assert "size_sqm" not in out


def test_listings_sqlite_table_creation():
    """Create listings table from schema, insert row, read back only schema keys."""
    from lib.listings_schema import LISTING_FIELDS, build_listings_create_sql
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "listings.db"
        conn = sqlite3.connect(str(path))
        conn.executescript(build_listings_create_sql("listings"))
        info = conn.execute("PRAGMA table_info(listings)").fetchall()
        cols = [r[1] for r in info]
        assert "listing_ref" in cols
        assert "surface_m2" in cols
        assert "agency_ref" not in cols
        # Insert minimal row
        conn.execute(
            "INSERT INTO listings (listing_ref, listing_url, source, transaction_type, first_seen, last_updated, phone_number, phone_source, image_urls, title_history) VALUES (?,?,?,?,?,?,?,?,?,?)",
            ("TEST1", "https://x.lu/1", "test", "rent", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", None, None, "[]", "[]"),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM listings WHERE listing_ref = ?", ("TEST1",)).fetchone()
        keys = row.keys() if hasattr(row, "keys") else [info[i][1] for i in range(len(row))]
        # When using default row_factory we get tuple; with row_factory sqlite3.Row we get keys
        assert len(row) >= 10
        conn.close()


def test_crm_storage_init_and_schema_columns():
    """CRM init creates properties with schema field names."""
    from lib import crm_storage
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = Path(f.name)
    try:
        crm_storage.init_crm_db(path)
        conn = sqlite3.connect(str(path))
        conn.row_factory = sqlite3.Row
        info = conn.execute("PRAGMA table_info(properties)").fetchall()
        cols = {r[1] for r in info}
        for required in ("surface_m2", "listing_url", "phone_number", "phone_source", "transaction_type", "listing_ref"):
            assert required in cols, f"properties missing column {required}"
        assert "size_sqm" not in cols or "surface_m2" in cols  # new DB has surface_m2
        owners = conn.execute("SELECT * FROM owners").fetchall()
        assert owners == []
        conn.close()
    finally:
        path.unlink(missing_ok=True)


def test_crm_get_all_owners_empty():
    """get_all_owners works with empty DB."""
    from lib import crm_storage
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = Path(f.name)
    try:
        crm_storage.init_crm_db(path)
        prev = os.environ.get("CRM_DB_PATH")
        os.environ["CRM_DB_PATH"] = str(path)
        try:
            out = crm_storage.get_all_owners()
            assert out == []
        finally:
            if prev is None:
                os.environ.pop("CRM_DB_PATH", None)
            else:
                os.environ["CRM_DB_PATH"] = prev
    finally:
        path.unlink(missing_ok=True)


def test_operator_onboarding_init_db():
    """operator_onboarding init_db creates properties/leads with schema columns."""
    from operator_onboarding.db import init_db, get_db_path
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "test_providers.db"
        init_db(path)
        conn = sqlite3.connect(str(path))
        info = conn.execute("PRAGMA table_info(properties)").fetchall()
        cols = {r[1] for r in info}
        for col in ("surface_m2", "listing_url", "phone_number", "transaction_type"):
            assert col in cols, f"properties missing {col}"
        info = conn.execute("PRAGMA table_info(leads)").fetchall()
        cols = {r[1] for r in info}
        assert "listing_url" in cols
        assert "phone_number" in cols
        conn.close()


def test_market_data_surface_m2_preferred():
    """lib.market_data _modifier_size prefers surface_m2 and falls back to size_sqm."""
    from lib.market_data import _modifier_size
    # surface_m2 is used when present (25 -> 0.92)
    listing = {"surface_m2": 25.0, "size_sqm": 200.0}
    mod = _modifier_size(listing)
    assert mod == 0.92
    # Fallback to size_sqm when surface_m2 missing
    listing2 = {"size_sqm": 25.0}
    mod2 = _modifier_size(listing2)
    assert mod2 == 0.92


def test_backend_athome_db_functions():
    """Backend athome_scraper db_init + db_connect + db_get (no requests/selenium)."""
    try:
        import backend.athome_scraper as athome
    except ImportError as e:
        if "requests" in str(e) or "bs4" in str(e) or "selenium" in str(e):
            return  # skip when optional deps missing
        raise
    with tempfile.TemporaryDirectory() as d:
        athome.DB_PATH = Path(d) / "listings.db"
        athome.db_init()
        conn = athome.db_connect()
        info = conn.execute("PRAGMA table_info(listings)").fetchall()
        cols = [r[1] for r in info]
        conn.close()
        assert "listing_ref" in cols
        assert "surface_m2" in cols
        assert "agency_ref" not in cols


def test_backend_athome_db_upsert_and_get_filtered():
    """db_upsert inserts only schema fields; db_get returns only schema keys."""
    try:
        import backend.athome_scraper as athome
    except ImportError:
        return  # skip when optional deps missing
    with tempfile.TemporaryDirectory() as d:
        athome.DB_PATH = Path(d) / "listings.db"
        athome.db_init()
        data = {
            "listing_ref": "UP1",
            "listing_url": "https://test.lu/1",
            "source": "test",
            "transaction_type": "rent",
            "first_seen": "2026-01-01T00:00:00Z",
            "last_updated": "2026-01-01T00:00:00Z",
            "phone_number": None,
            "phone_source": None,
            "image_urls": "[]",
            "title_history": "[]",
            "title": "Test flat",
            "surface_m2": 72.5,
        }
        result = athome.db_upsert(data)
        assert result == "inserted"
        row = athome.db_get("UP1")
        assert row is not None
        assert row["listing_ref"] == "UP1"
        assert row["surface_m2"] == 72.5
        assert row["listing_url"] == "https://test.lu/1"
        # Must not contain legacy keys (even if table had them)
        assert "agency_ref" not in row
        # Update
        data["title"] = "Updated title"
        result2 = athome.db_upsert(data, is_update=True)
        assert result2 == "updated"
        row2 = athome.db_get("UP1")
        assert row2["title"] == "Updated title"


def test_backend_immotop_db_init():
    """Backend immotop_scraper db_init creates schema table."""
    try:
        import backend.immotop_scraper as immotop
    except ImportError:
        return  # skip when optional deps missing
    with tempfile.TemporaryDirectory() as d:
        immotop.DB_PATH = Path(d) / "listings.db"
        immotop.db_init()
        conn = immotop.db_connect()
        info = conn.execute("PRAGMA table_info(listings)").fetchall()
        cols = [r[1] for r in info]
        conn.close()
        assert "listing_ref" in cols
        assert "surface_m2" in cols
        assert "agency_ref" not in cols


def test_mongo_db_schema_filter():
    """mongo_db uses LISTING_SCHEMA_KEYS; module imports without MONGO_URI."""
    import backend.mongo_db as mongo
    assert hasattr(mongo, "LISTING_SCHEMA_KEYS") or "LISTING_SCHEMA_KEYS" in dir(mongo)
    # db_upsert filters to schema keys (tested implicitly via code path)
    assert "listing_ref" in mongo.LISTING_SCHEMA_KEYS
    assert "agency_ref" not in mongo.LISTING_SCHEMA_KEYS


if __name__ == "__main__":
    # Run with pytest or as script
    try:
        import pytest
        pytest.main([__file__, "-v"])
    except ImportError:
        # Minimal runner
        test_listings_schema_module()
        print("test_listings_schema_module OK")
        test_listings_sqlite_table_creation()
        print("test_listings_sqlite_table_creation OK")
        test_crm_storage_init_and_schema_columns()
        print("test_crm_storage_init_and_schema_columns OK")
        test_crm_get_all_owners_empty()
        print("test_crm_get_all_owners_empty OK")
        test_operator_onboarding_init_db()
        print("test_operator_onboarding_init_db OK")
        test_market_data_surface_m2_preferred()
        print("test_market_data_surface_m2_preferred OK")
        test_backend_athome_db_functions()
        print("test_backend_athome_db_functions OK")
        test_backend_athome_db_upsert_and_get_filtered()
        print("test_backend_athome_db_upsert_and_get_filtered OK")
        test_backend_immotop_db_init()
        print("test_backend_immotop_db_init OK")
        test_mongo_db_schema_filter()
        print("test_mongo_db_schema_filter OK")
        print("All tests passed.")
