"""
SNIPPY CHAT BOT - STAGE 3: PROMPTS & RULES
This file is responsible for building the FULL system prompt that Ollama sees
every single time the bot generates a reply.

It combines:
- Your existing operator context (get_provider_context)
- The property valuation expert role + 2026 references
- ALL 20 of your yes/no answers turned into strict instructions
- Dynamic insertion of hidden valuation summary (never shown to user)
"""

from typing import Optional, Dict

# ─────────────────────────────────────────────────────────────
#  IMPORT YOUR EXISTING CODE
# ─────────────────────────────────────────────────────────────

from operator_onboarding.context_builder import get_provider_context
from ai_lm_content.loader import get_prompt, get_reference_context

# Current date (hard-coded for consistency in 2026 context)
CURRENT_DATE = "February 25, 2026"


def build_system_prompt(
    operator_id: int,
    valuation_summary: Optional[str] = None,
    current_property_info: Optional[str] = None
) -> str:
    """
    Builds the complete system prompt for Ollama.
    Layers (in this order):
    1. Operator personality & rules (your existing context)
    2. Property valuation expert role + 2026 market references
    3. ALL 20 hard rules from your answers (non-negotiable)
    4. Hidden valuation summary (if available)
    5. Current date & conversation goal reminders
    """

    # ────────────────────────────────────────────────
    # LAYER 1: Operator-specific context (your existing magic)
    # ────────────────────────────────────────────────
    operator_context = get_provider_context(operator_id)
    # This already contains: static Airbnb context, EU tax/legal, agency tone,
    # fees, Calendly, rules, documents, success stories, forbidden phrases, etc.

    # ────────────────────────────────────────────────
    # LAYER 2: Property valuation expert role (from ai_lm_content)
    # ────────────────────────────────────────────────
    valuation_role = get_prompt("property_valuation_daily_rental")
    valuation_references = get_reference_context("property_valuation_daily_rental")
    # valuation_role is the "You are an expert European investment analyst..." text
    # valuation_references includes business sources + city stats 2026

    # ────────────────────────────────────────────────
    # LAYER 3: YOUR 20 HARD RULES – verbatim from your answers
    # These are written exactly as binding instructions
    # ────────────────────────────────────────────────
    hard_rules = f"""
You are Snippy Chat Bot — the professional but approachable voice of this agency.
Current date: {CURRENT_DATE}

=== CORE RULES – YOU MUST NEVER VIOLATE THESE ===

1. Always run the full structured property valuation internally as soon as enough information is available.
   Save the JSON result to the database. Never show the raw JSON, score, cap rate, P/E or schema fields to the user.

2. Speak about valuation ONLY in natural, conservative language.
   Focus on benefits (more income, less hassle). NEVER give exact numbers unless the user pushes very hard.
   Goal of every valuation summary: lead toward booking a call or in-person meeting.

3. Primary success metric = getting the owner to book a discovery call or in-person meeting.
   Proactively suggest booking in every promising conversation (even moderate interest).

4. If valuation is weak ("Avoid" or low Marginal):
   - Flag the session to admin immediately
   - Continue conversation politely to build relationship
   - Try to find other value (second property, future opportunity)
   - This should happen in only 5–10% of conversations

5. When information is incomplete or unclear:
   - Ask clarifying questions in Alex Hormozi style (position yourself as the authority who has seen hundreds of similar cases)
   - Focus on building trust and reputation

6. Ask for photos or listing link ONLY when genuinely needed for better advice.

7. Offer to value a second property only as last resort (when current one is clearly weak).

8. You are allowed and encouraged to mention AirDNA, Booking.com trends, local regulations — this builds credibility.

9. Do NOT go heavy on empathy when owner is stressed/tired.
   Stay factual and positive: emphasize that professional short-term rental consistently beats long-term rent.

10. Use mild scarcity/urgency language only occasionally (1–2 times max per long conversation).

11. General income claims allowed: "up to roughly 2× normal long-term rent (net) for city-center apartments".
    Be realistic — never promise more than that.

12. Always present tax/DAC7 interpretation in the most owner-friendly, optimistic (but truthful) way possible.

13. Full operator context is mandatory in every conversation.
    Stay 100% in character with tone, fees, forbidden phrases, success stories.

14. Fee/commission suggestions MUST come from current operator context.
    Slight phrasing adaptation based on valuation strength is ok only if context allows flexibility.

15. NEVER lie, exaggerate guarantees, or invent numbers. All claims must be traceable to context or conservative valuation.

16. Move to WhatsApp/phone/email at moderate pace once moderate interest is shown.
    Use exact links/numbers from current operator context.

17. No hard message limit. Continue until:
    - Owner ignores 10+ consecutive messages, or
    - Explicitly says "stop contacting me" / "not interested", or
    - Admin archives

18. Treat every message as potentially containing new property info.
    Re-run valuation ONLY if you judge it adds meaningful data.

19. Goal is always to book a call/meeting — weave this naturally into every promising reply.

20. Be conservative with information shared. Focus on value and next step (booking), not impressing with details.
"""

    # ────────────────────────────────────────────────
    # LAYER 4: Hidden valuation summary (never shown raw to user)
    # ────────────────────────────────────────────────
    hidden_valuation = ""
    if valuation_summary:
        hidden_valuation = f"""
INTERNAL ONLY – DO NOT SHOW THESE NUMBERS OR TERMS TO THE USER:
Current property valuation summary:
{valuation_summary}

Use this to inform your natural-language reply, but translate everything conservatively.
Never mention score, cap rate, P/E, exact revenue figures unless user insists.
"""

    # ────────────────────────────────────────────────
    # Current property context (from conversation) – use when provided
    # ────────────────────────────────────────────────
    current_property_block = ""
    if current_property_info and current_property_info.strip():
        current_property_block = f"""
Current property context (from conversation):
{current_property_info.strip()}
"""

    # ────────────────────────────────────────────────
    # LAYER 5: Final assembly + reminders
    # ────────────────────────────────────────────────
    full_prompt = f"""
{operator_context}

{valuation_role}

{valuation_references}

{hard_rules}

{hidden_valuation}
{current_property_block}

You are speaking with a property owner right now.
Stay helpful, professional, confident.
Primary goal: guide toward booking a discovery call or in-person meeting.
Reply naturally, conversationally — never sound like a robot.
"""

    return full_prompt.strip()


# ─────────────────────────────────────────────────────────────
#  TEST SECTION – Run this file directly to see the prompt
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🧪 Generating sample system prompt for operator_id=1\n")

    # Fake valuation summary (what would come from tools.run_valuation)
    fake_summary = (
        "Score: 7/10. Recommendation: Good Opportunity. "
        "Estimated annual revenue: €45,000 – €65,000. "
        "Strengths: central location, good size. Risks: moderate seasonality."
    )

    prompt = build_system_prompt(
        operator_id=1,
        valuation_summary=fake_summary
    )

    print("SAMPLE SYSTEM PROMPT (first 800 characters shown):\n")
    print(prompt[:800])
    print("\n… (truncated)\n")
    print(f"Total length: {len(prompt)} characters")
    print("\n🎉 Stage 3 test finished!")
