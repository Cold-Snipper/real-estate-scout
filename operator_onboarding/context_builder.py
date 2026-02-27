"""
operator_onboarding/context_builder.py
Builds full LLM system prompt: Static (general + specific sales) + Specific Agency Context from operator onboarding.
"""

try:
    from .operators import get_operator
    from .airbnb_static_context import get_full_static_context
    from .eu_str_tax_context import get_eu_str_tax_context
    from .documents import get_documents, DOCUMENT_TYPE_LABELS
except ImportError:
    from operators import get_operator
    from airbnb_static_context import get_full_static_context
    from eu_str_tax_context import get_eu_str_tax_context
    from documents import get_documents, DOCUMENT_TYPE_LABELS

# Max chars per document and total for documents section (avoid blowing context)
MAX_DOC_CHARS = 6000
MAX_DOCUMENTS_TOTAL_CHARS = 18000

# Full expanded schema (80 fields) — use extended options from expanded_options.py
try:
    from .expanded_options import DROPDOWN_LABELS as EXPANDED_DROPDOWN_LABELS
    from .expanded_options import AGENCY_EXT_LABELS as EXPANDED_AGENCY_EXT_LABELS
except ImportError:
    EXPANDED_DROPDOWN_LABELS = {}
    EXPANDED_AGENCY_EXT_LABELS = {}

# Legacy dropdown labels for root columns (tone_style, ideal_client_profile, etc.)
LEGACY_DROPDOWN_LABELS = {
    "tone_style": EXPANDED_DROPDOWN_LABELS.get("primary_tone", {}),
    "target_owner_type": EXPANDED_DROPDOWN_LABELS.get("target_owner_type", {}),
    "preferred_property_type": EXPANDED_DROPDOWN_LABELS.get("property_type_focus", {}),
    "ideal_client_profile": EXPANDED_DROPDOWN_LABELS.get("target_owner_type", {}),
}
DROPDOWN_LABELS = {**EXPANDED_DROPDOWN_LABELS, **LEGACY_DROPDOWN_LABELS}
AGENCY_EXT_LABELS = EXPANDED_AGENCY_EXT_LABELS


def _format_agency_ext(ext: dict) -> str:
    """Format agency_context_ext dict into readable lines for the LLM."""
    if not ext or not isinstance(ext, dict):
        return ""
    lines = []
    for key, value in ext.items():
        if value is None or value == "":
            continue
        label = AGENCY_EXT_LABELS.get(key, key.replace("_", " ").title())
        if isinstance(value, bool):
            lines.append(f"- {label}: {'Yes' if value else 'No'}.")
        elif isinstance(value, str) and value.strip():
            # Use dropdown label if available so the LLM sees informative text
            display = DROPDOWN_LABELS.get(key, {}).get(value, value.strip())
            lines.append(f"- {label}: {display}")
    if not lines:
        return ""
    return "Extended agency context (from onboarding):\n" + "\n".join(lines)


def build_operator_context(operator: dict) -> str:
    """
    Build the Specific Agency Context string from one operator record (from onboarding).
    Ready to inject into the LLM system prompt.
    """
    company = operator.get("company_name") or "the agency"
    tagline = operator.get("tagline") or ""
    countries = operator.get("countries") or ""
    services = operator.get("services")
    if isinstance(services, list):
        services = ", ".join(str(s) for s in services)
    elif isinstance(services, dict):
        services = ", ".join(f"{k}: {v}" for k, v in services.items())
    else:
        services = str(services) if services else ""
    usps = operator.get("usps")
    if isinstance(usps, list):
        usps = "; ".join(str(u) for u in usps)
    elif isinstance(usps, dict):
        usps = "; ".join(f"{k}: {v}" for k, v in usps.items())
    else:
        usps = str(usps) if usps else ""
    tone_raw = operator.get("tone_style") or "professional_trustworthy"
    tone = DROPDOWN_LABELS.get("tone_style", {}).get(tone_raw, str(tone_raw).replace("_", " "))
    ideal_client_raw = operator.get("ideal_client_profile") or ""
    ideal_client_profile = DROPDOWN_LABELS.get("target_owner_type", {}).get(ideal_client_raw, ideal_client_raw) or ideal_client_raw
    preferred_property_raw = operator.get("preferred_property_types") or ""
    preferred_property_types = DROPDOWN_LABELS.get("preferred_property_type", {}).get(preferred_property_raw, preferred_property_raw) or preferred_property_raw
    key_phrases = operator.get("key_phrases")
    if isinstance(key_phrases, list):
        key_phrases = ", ".join(str(p) for p in key_phrases)
    else:
        key_phrases = str(key_phrases) if key_phrases else ""
    call_mins = operator.get("call_length_minutes") or 30
    calendly = operator.get("calendly_link") or ""
    qual_rules = operator.get("qualification_rules")
    if isinstance(qual_rules, dict):
        qual_rules = "; ".join(f"{k}: {v}" for k, v in qual_rules.items())
    elif isinstance(qual_rules, list):
        qual_rules = "; ".join(str(r) for r in qual_rules)
    else:
        qual_rules = str(qual_rules) if qual_rules else "property and motivation fit"

    rules_list = operator.get("rules")
    if isinstance(rules_list, list) and rules_list:
        rules_list = [str(r).strip() for r in rules_list if str(r).strip()]
    else:
        rules_list = []

    parts = [
        f"You are speaking as {company}.",
        f"Operating in: {countries}." if countries else "",
        f"Tagline: \"{tagline}\"." if tagline else "",
        f"You specialize in: {services}." if services else "",
        f"Key differentiators (USPs): {usps}." if usps else "",
        f"Your tone is {tone}.",
        f"Target owner type: {ideal_client_profile}." if ideal_client_profile else "",
        f"Preferred property focus: {preferred_property_types}." if preferred_property_types else "",
        f"Use these key phrases where natural: {key_phrases}." if key_phrases else "",
        f"Always aim to book a {call_mins}-minute discovery call.",
        f"Only offer the call if: {qual_rules}.",
        f"Use this link for booking: {calendly}." if calendly else "",
    ]
    if rules_list:
        parts.append("Rules you must follow (from operator onboarding):")
        for i, r in enumerate(rules_list, 1):
            parts.append(f"  {i}. {r}")

    ext = operator.get("agency_context_ext")
    if isinstance(ext, dict) and ext:
        ext_block = _format_agency_ext(ext)
        if ext_block:
            parts.append("")
            parts.append(ext_block)

    return "\n".join(p for p in parts if p).strip()


def build_documents_context(operator_id: int) -> str:
    """Build the reference documents block for this operator (draft contract, payout examples, etc.)."""
    docs = get_documents(operator_id)
    if not docs:
        return ""
    parts = []
    total = 0
    for d in docs:
        if total >= MAX_DOCUMENTS_TOTAL_CHARS:
            break
        label = DOCUMENT_TYPE_LABELS.get(d.get("document_type"), d.get("document_type", "Document"))
        name = d.get("name") or label
        content = (d.get("content") or "").strip()
        if not content:
            continue
        chunk = content[:MAX_DOC_CHARS]
        if len(content) > MAX_DOC_CHARS:
            chunk += "\n[... truncated for context length ...]"
        block = f"### {name} ({label})\n{chunk}"
        parts.append(block)
        total += len(block)
    if not parts:
        return ""
    return "## Reference documents (use for accuracy when answering)\n\n" + "\n\n".join(parts)


def get_provider_context(operator_id: int, include_eu_str_tax: bool = True) -> str:
    """
    Return full system prompt for the LLM:
    Static (Option A + real model) + EU STR/tax context + Specific Agency Context + Reference documents.
    Use this when generating messages for a lead; inject the returned string as the system prompt.
    Set include_eu_str_tax=False to omit the EU policies/tax block.
    """
    static = get_full_static_context()
    operator = get_operator(operator_id)
    if not operator:
        if include_eu_str_tax:
            return f"{static}\n\n---\n\n## EU STR & Tax Context (2026)\n\n{get_eu_str_tax_context()}"
        return static
    agency_block = build_operator_context(operator)
    docs_block = build_documents_context(operator_id)
    out = static
    if include_eu_str_tax:
        out += f"\n\n---\n\n## EU STR & Tax Context (2026)\n\n{get_eu_str_tax_context()}"
    out += f"\n\n---\n\n## Specific Agency Context (Operator Onboarding)\n\n{agency_block}"
    if docs_block:
        out += f"\n\n---\n\n{docs_block}"
    return out


def get_provider_context_agency_only(operator_id: int) -> str:
    """Return only the Specific Agency Context (from onboarding), no static block."""
    operator = get_operator(operator_id)
    if not operator:
        return ""
    return build_operator_context(operator)
