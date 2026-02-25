"""
SNIPPY CHAT BOT - STAGE 2: TOOLS LAYER
This file contains all the actions the chatbot is allowed to perform.
It is heavily commented so you can understand and adapt it easily.

Main tools:
1. run_valuation          → Uses your EXISTING valuation system
2. save_to_crm            → Saves owner/property to your existing CRM
3. flag_for_admin         → Flags weak valuations for human review
4. generate_contact_links → Creates real WhatsApp/phone/email links from operator context
"""

import json
import logging
import re
from typing import Dict, Any, Optional
from datetime import datetime, timezone

# ─────────────────────────────────────────────────────────────
#  LOGGING SETUP (helpful during development)
# ─────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("snippy_chatbot.tools")

# ─────────────────────────────────────────────────────────────
#  IMPORT YOUR EXISTING CODE HERE
# ─────────────────────────────────────────────────────────────

from lib.property_evaluator import evaluate_property
from lib.crm_storage import insert_owner, insert_property
from operator_onboarding.context_builder import get_provider_context
from operator_onboarding.operators import get_operator
from snippy_chatbot.db import get_db_connection

# ─────────────────────────────────────────────────────────────
#  TOOL 1: RUN VALUATION (Most Important Tool)
#  Reuses your exact existing valuation system
# ─────────────────────────────────────────────────────────────
def run_valuation(
    listing_text: str,
    city: Optional[str] = None,
    operator_id: int = 1,
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Runs the FULL property valuation using your existing ai_lm_content system.
    Saves the result to the valuation_results table.
    Returns both the raw JSON and a natural summary for internal use.
    """
    logger.info(f"Running valuation for operator {operator_id}. Text length: {len(listing_text)}")

    try:
        valuation = evaluate_property(
            listing_text=listing_text,
            city=city or "Luxembourg City",
            neighborhood=None,
            listing=None,
            model="qwen3",
        )

        full_json_str = json.dumps(valuation, ensure_ascii=False, indent=2)

        score_val = valuation.get("property_valuation_score", 0)
        score = int(score_val) if score_val is not None else 0
        rec = valuation.get("recommendation", "Unknown") or "Unknown"
        revenue = valuation.get("estimated_annual_gross_revenue", "N/A")
        strengths = valuation.get("key_strengths") or []
        risks = valuation.get("key_risks") or []

        natural_summary = (
            f"Valuation Score: {score}/10. Recommendation: {rec}. "
            f"Estimated annual revenue: {revenue}. "
            f"Key strengths: {', '.join(str(s) for s in strengths)[:100]}... "
            f"Key risks: {', '.join(str(r) for r in risks)[:100]}..."
        )

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO valuation_results 
            (session_id, full_json, natural_summary, score, recommendation, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            session_id or "TEMP_SESSION",
            full_json_str,
            natural_summary,
            score,
            rec,
            datetime.now(timezone.utc).isoformat()
        ))
        conn.commit()
        conn.close()

        logger.info(f"Valuation completed successfully. Score: {score}/10")
        return {
            "success": True,
            "full_json": valuation,
            "natural_summary": natural_summary,
            "score": score,
        }

    except Exception as e:
        logger.error(f"Valuation failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "natural_summary": "I couldn't run the full valuation yet. Could you tell me more about the property (size, exact location, current rent)?"
        }


# ─────────────────────────────────────────────────────────────
#  TOOL 2: SAVE TO CRM
# ─────────────────────────────────────────────────────────────
def save_to_crm(
    session_id: str,
    owner_email: str,
    owner_name: Optional[str] = None,
    property_title: Optional[str] = None,
    property_location: Optional[str] = None,
    operator_id: int = 1,
) -> Dict[str, Any]:
    """Saves or updates owner and property in your existing CRM."""
    try:
        owner_id = insert_owner(
            owner_name=owner_name or "",
            owner_email=owner_email,
            owner_phone=None,
            owner_notes=None,
        )

        if property_title or property_location:
            insert_property(
                owner_id=owner_id,
                title=property_title or "",
                location=property_location or "",
            )

        logger.info(f"Saved to CRM: {owner_email} for operator {operator_id}")
        return {"success": True, "owner_id": owner_id, "owner_email": owner_email}

    except Exception as e:
        logger.error(f"Failed to save to CRM: {e}")
        return {"success": False, "error": str(e)}


# ─────────────────────────────────────────────────────────────
#  TOOL 3: FLAG FOR ADMIN (Weak valuation cases)
# ─────────────────────────────────────────────────────────────
def flag_for_admin(session_id: str, reason: str = "Weak valuation detected") -> Dict[str, Any]:
    """Flags the conversation for admin review (your 5-10% rule)."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE chat_sessions 
            SET status = 'admin_review', 
                last_message_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (session_id,))
        conn.commit()
        conn.close()

        logger.warning(f"ADMIN FLAG: Session {session_id} flagged - Reason: {reason}")
        return {"success": True, "reason": reason}

    except Exception as e:
        logger.error(f"Failed to flag admin: {e}")
        return {"success": False, "error": str(e)}


def _extract_phone_from_text(text: str) -> Optional[str]:
    """Extract a phone number (E.164-style or with +) from text."""
    if not text:
        return None
    # Match +352... or similar international, or 10+ digits with optional spaces/dashes
    m = re.search(r'\+\s*\d{2,3}[\s\-]?\d{3,}[\s\-]?\d{2,}[\s\-]?\d{2,}', text)
    if m:
        return re.sub(r'[\s\-]', '', m.group(0))
    m = re.search(r'\d{10,}', re.sub(r'[\s\-\.]', '', text))
    if m:
        return m.group(0)
    return None


def _extract_email_from_text(text: str) -> Optional[str]:
    """Extract first email address from text."""
    if not text:
        return None
    m = re.search(r'[\w\.\-]+@[\w\.\-]+\.\w+', text)
    return m.group(0) if m else None


# ─────────────────────────────────────────────────────────────
#  TOOL 4: GENERATE CONTACT LINKS
# ─────────────────────────────────────────────────────────────
def generate_contact_links(operator_id: int) -> Dict[str, str]:
    """
    Returns clean WhatsApp, phone, and email links from the current operator context.
    Uses operator record: calendly_link, website_url, notes (parsed for phone/email).
    """
    try:
        op = get_operator(operator_id)
        if not op:
            return {
                "whatsapp": "https://wa.me/352661234567",
                "phone": "+352661234567",
                "email": "contact@youragency.lu",
                "calendly": "",
            }

        calendly = (op.get("calendly_link") or "").strip()
        website_url = (op.get("website_url") or "").strip()
        notes = (op.get("notes") or "").strip()

        phone = (op.get("contact_phone") or "").strip()
        if not phone:
            phone = _extract_phone_from_text(notes)
        if not phone and website_url:
            phone = _extract_phone_from_text(website_url)
        if not phone:
            phone = "+352661234567"

        email = (op.get("contact_email") or "").strip()
        if not email:
            email = _extract_email_from_text(notes)
        if not email:
            email = "contact@youragency.lu"

        # WhatsApp: strip + for wa.me URL
        wa_digits = re.sub(r'\D', '', phone)
        if not wa_digits.startswith('352') and len(wa_digits) >= 8:
            wa_digits = '352' + wa_digits[-8:] if len(wa_digits) <= 8 else wa_digits
        whatsapp_link = f"https://wa.me/{wa_digits}?text=Hi%2C%20continuing%20our%20conversation%20about%20my%20property"

        return {
            "whatsapp": whatsapp_link,
            "phone": phone,
            "email": email,
            "calendly": calendly,
        }

    except Exception as e:
        logger.error(f"Failed to generate contact links: {e}")
        return {
            "whatsapp": "https://wa.me/352661234567",
            "phone": "+352661234567",
            "email": "contact@youragency.lu",
            "calendly": "",
        }


# ─────────────────────────────────────────────────────────────
#  TEST SECTION - Run this file directly to test
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🧪 Running Stage 2 Tools Test...\n")

    test_text = """2 bedroom apartment in Luxembourg City center, 
                   85 m², long-term rent €1800/month, modern kitchen, balcony."""

    result = run_valuation(test_text, city="Luxembourg City", operator_id=1)
    print("✅ VALUATION TEST:")
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    links = generate_contact_links(operator_id=1)
    print("\n✅ CONTACT LINKS TEST:")
    print(links)

    print("\n🎉 Stage 2 Tools test finished!")
