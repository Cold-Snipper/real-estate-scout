from __future__ import annotations

import re
from urllib.parse import quote


_DIGITS = re.compile(r"\d+")


def normalize_phone_e164_like(raw: str, default_country_code: str | None = None) -> str | None:
    """
    Normalize a phone number for wa.me links.

    WhatsApp wa.me expects digits only (country code + national number) without '+'.
    This is a best-effort helper; if the number cannot be normalized, returns None.
    """
    if not raw or not isinstance(raw, str):
        return None
    digits = "".join(_DIGITS.findall(raw))
    if not digits:
        return None
    # If it already includes a plausible country code (>=11 digits), accept as-is.
    if len(digits) >= 11:
        return digits
    if default_country_code:
        cc = "".join(_DIGITS.findall(default_country_code))
        if cc:
            return cc + digits
    return digits


def build_whatsapp_followup_text(base_message: str) -> str:
    extra = "I also sent you an email and I'm following up on WhatsApp."
    base = (base_message or "").strip()
    if not base:
        return extra
    # Keep it readable: ensure we have a spacer line.
    return base + "\n\n" + extra


def generate_whatsapp_link(phone_digits: str, message_text: str) -> str:
    """
    Create a click-to-chat link.

    Example: https://wa.me/352... ?text=...
    """
    safe_phone = "".join(_DIGITS.findall(phone_digits or ""))
    return f"https://wa.me/{safe_phone}?text={quote(message_text)}"

