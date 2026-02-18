"""
operator_onboarding/message_templates.py
Message templates aligned with the real 2026 Europe acquisition flow:
  Step 1 Discovery → cold_opener
  Step 2 First Reply → after_reply (value bomb + social proof)
  Step 3 Trust Building → value_bomb_risk_reversal, objection_handler
  Step 4 Call Booking → call_booking
  Step 5 Hand-off → call_booked_confirmation (when call is booked)
Placeholders: [Owner Name], [property type], [city/area], [X], [city/country], [nearby area], [area], [calendly_link], [15/30], etc.
"""

# Template names for lookup
COLD_OPENER = "cold_opener"
AFTER_REPLY = "after_reply"
VALUE_BOMB_RISK_REVERSAL = "value_bomb_risk_reversal"
CALL_BOOKING = "call_booking"
OBJECTION_HANDLER = "objection_handler"
CALL_BOOKED_CONFIRMATION = "call_booked_confirmation"

MESSAGE_COLD_OPENER = """Hi [Owner Name],

I saw your [property type] in [city/area] — beautiful place!

I know long-term renting can feel like a constant headache — low rents, bad tenants, maintenance calls, vacancies...

Most owners we speak to are tired of exactly that.

Quick question: Would you be open to seeing how much more your property could earn as a short-term rental — completely passively, with zero work on your end?

We've helped [X] owners in [city/country] 2× or more their income in the last 6 months.

Happy to send you a free profit & pricing audit if you're curious — takes 2 minutes.

Interested?

Best,
[Your Name]
[Company Name]
[Tagline]"""

MESSAGE_AFTER_REPLY = """Thanks for replying, [Owner Name]!

Most owners start with the same concern: "What about the hassle / risk?"

The reality is: we handle 100% of it — dynamic pricing, guest communication, cleaning coordination, payouts, reviews, compliance.

You keep 75–80% of a much larger pie.

For example, one owner in [nearby area] went from €950 long-term to €2,400 average monthly — same property, zero extra work.

Would you like me to run a quick free audit on your place to show you the exact potential?

No pressure — just numbers.

Let me know!"""

MESSAGE_VALUE_BOMB_RISK_REVERSAL = """[Owner Name],

Here's a quick preview of what we see for properties like yours in [area]:

- Current long-term rent: ~€[X]
- Realistic short-term potential: €[2–3×X] average monthly
- Your take-home after our fee: still 75–80% more than now

We guarantee at least 1.5× your current rent equivalent in the first 90 days — or we manage free until it does.

Plus free professional photos/listing optimization and first month reduced fee.

Ready to see your exact numbers? Takes 2 minutes.

Just say yes and I'll send the audit."""

MESSAGE_CALL_BOOKING = """[Owner Name],

The numbers look really strong for your place — I think you'd be surprised how much more it could earn passively.

I'd love to walk you through the exact plan in a quick [15/30]-minute call — no pressure, just clarity.

Here's my Calendly: [calendly_link]

A lot of owners in [area] are switching right now — spots are filling up fast.

Which time works for you this week?

Looking forward to helping you unlock more income!"""

MESSAGE_OBJECTION_HANDLER = """Totally understand — many owners start with the same worry.

Here's the thing: long-term rent feels safe but caps your income. Short-term creates a much bigger pie — you keep most of it while we handle every detail (guests, cleaning, pricing, compliance).

We've done this for [X] properties in [area] — average increase 2.1× with zero owner involvement.

If it doesn't work, you lose nothing — we manage free until it does.

Worth 15 minutes to see your exact numbers?"""

MESSAGE_CALL_BOOKED_CONFIRMATION = """Perfect, [Owner Name] — you're all set!

You're booked for [call_slot]. Our team will call you at the time you chose.

We'll walk you through your exact numbers and the full plan — no pressure, just clarity.

If anything changes, just reply to this message or use the link in the calendar invite.

Talk soon!"""

# All templates by name (for iteration and lookup)
TEMPLATES = {
    COLD_OPENER: MESSAGE_COLD_OPENER,
    AFTER_REPLY: MESSAGE_AFTER_REPLY,
    VALUE_BOMB_RISK_REVERSAL: MESSAGE_VALUE_BOMB_RISK_REVERSAL,
    CALL_BOOKING: MESSAGE_CALL_BOOKING,
    OBJECTION_HANDLER: MESSAGE_OBJECTION_HANDLER,
    CALL_BOOKED_CONFIRMATION: MESSAGE_CALL_BOOKED_CONFIRMATION,
}

# Human-readable labels for UI (aligned with acquisition flow steps)
TEMPLATE_LABELS = {
    COLD_OPENER: "Step 1: Cold Opener (Discovery / Outreach)",
    AFTER_REPLY: "Step 2: After Reply (Value Bomb + Social Proof)",
    VALUE_BOMB_RISK_REVERSAL: "Step 3: Value Bomb + Risk Reversal",
    CALL_BOOKING: "Step 4: Call Booking (Discovery Call CTA)",
    OBJECTION_HANDLER: "Step 3: Objection Handler (Trust Building)",
    CALL_BOOKED_CONFIRMATION: "Step 5: Call Booked (Hand-off Confirmation)",
}


def get_template(name: str) -> str | None:
    """Return raw template text by name, or None."""
    return TEMPLATES.get(name)


def get_all_template_names() -> list[str]:
    """Return list of template keys."""
    return list(TEMPLATES.keys())


# Map kwarg-friendly names to template placeholder text (e.g. [city/area])
_PLACEHOLDER_ALIASES = {
    "owner_name": "Owner Name",
    "property_type": "property type",
    "city_area": "city/area",
    "city_country": "city/country",
    "nearby_area": "nearby area",
    "area": "area",
    "calendly_link": "calendly_link",
    "call_minutes": "15/30",
    "call_slot": "call_slot",
    "your_name": "Your Name",
    "company_name": "Company Name",
    "tagline": "Tagline",
    "x": "X",
}


def fill_template(name: str, **placeholders: str) -> str:
    """
    Return template with placeholders filled. Placeholders in templates use [key] format (e.g. [Owner Name], [city/area]).
    Pass kwargs with underscores: Owner_Name, property_type, city_area, city_country, nearby_area, area,
    calendly_link, call_minutes, Your_Name, Company_Name, Tagline, X.
    """
    text = TEMPLATES.get(name)
    if not text:
        return ""
    result = text
    for key, value in placeholders.items():
        # Normalize: owner_name -> "Owner Name", city_area -> "city/area" (via alias)
        bracket_key = _PLACEHOLDER_ALIASES.get(key.replace("-", "_").lower()) or key.replace("_", " ")
        result = result.replace(f"[{bracket_key}]", str(value))
    return result
