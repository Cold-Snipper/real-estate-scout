#!/usr/bin/env python3
"""Seed CRM with one owner 'John McTest' and two properties, all fields populated for full UI demo."""
import sys
from pathlib import Path

# Project root
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))

from lib.crm_storage import init_crm_db, get_all_owners, insert_owner, insert_property

def main() -> None:
    init_crm_db()
    owners_before = get_all_owners()
    existing = [o for o in owners_before if (o.get("owner_name") or "").strip() == "John McTest"]
    if existing:
        owner_id = existing[0]["id"]
        props = existing[0].get("properties") or []
        if len(props) >= 2:
            print("John McTest already exists with %d properties. Skipping seed." % len(props))
            return
        print("John McTest exists (id=%s) with %d properties; adding missing properties." % (owner_id, len(props)))
    else:
        props = []
        now_ts = 1739000000  # fixed timestamp for demo
        owner_id = insert_owner(
            owner_name="John McTest",
            owner_email="john.mctest@example.com",
            owner_phone="+32 471 12 34 56",
            owner_notes="Test owner for full CRM UI. Interested in daily rental in Brussels.",
        )
        print("Created owner John McTest (id=%s)" % owner_id)

    now_ts = 1739000000
    # Property 1: Brussels apartment — full fields (skip if already have any)
    if not existing or len(props) < 1:
        insert_property(
            owner_id=owner_id,
            listing_ref="ATH-BXL-001",
            title="Lovely 2BR near Grand-Place, Brussels",
            price=285000.0,
            bedrooms=2,
            bathrooms=1,
            surface_m2=75.5,
            location="Brussels",
            description="Bright apartment with balcony, 10 min walk from Grand-Place. Ideal for daily rental. Fully equipped kitchen, WiFi.",
            listing_url="https://www.athome.lu/example-brussels-001",
            contact_email="john.mctest@example.com",
            phone_number="+32 471 12 34 56",
            phone_source="listing",
            transaction_type="sale",
            viability_score=7.5,
            recommendation="Strong buy",
            estimated_annual_gross=18200,
            price_to_earnings=15.7,
            degree_of_certainty="High",
            sales_pipeline_stage="Interested",
            chatbot_pipeline_stage="Replied",
            last_contact_date=now_ts,
        )
        print("Created property 1: Lovely 2BR near Grand-Place")

    # Property 2: Antwerp studio — different pipeline stages
    if not existing or len(props) < 2:
        insert_property(
            owner_id=owner_id,
            listing_ref="IMM-ANT-002",
            title="Studio in Antwerp city center",
            price=175000.0,
            bedrooms=1,
            bathrooms=1,
            surface_m2=38.0,
            location="Antwerp",
            description="Compact studio, perfect for short stays. Near Central Station.",
            listing_url="https://www.immotop.lu/example-antwerp-002",
            contact_email="john.mctest@example.com",
            phone_number="+32 471 12 34 56",
            phone_source="form",
            transaction_type="sale",
            viability_score=6.0,
            recommendation="Consider",
            estimated_annual_gross=9500,
            price_to_earnings=18.4,
            degree_of_certainty="Medium",
            sales_pipeline_stage="Contacted",
            chatbot_pipeline_stage="First Message Sent",
            last_contact_date=now_ts - 86400,
        )
        print("Created property 2: Studio in Antwerp city center")

    print("Done. Open http://localhost:8080/crm and click John McTest to see the full UI.")

if __name__ == "__main__":
    main()
