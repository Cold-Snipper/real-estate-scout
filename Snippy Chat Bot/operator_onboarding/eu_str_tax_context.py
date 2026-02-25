"""
operator_onboarding/eu_str_tax_context.py
Static context: EU STR policies, booking policies, and tax policies (2026).
Focus: maximizing legal deductions and minimizing tax for landlords (within the law).
Ready-to-inject for the bot's knowledge base. Include in system prompt after base business model.
"""

# -----------------------------------------------------------------------------
# STRONG DISCLAIMER (Must be included whenever this context is used)
# -----------------------------------------------------------------------------

EU_STR_TAX_DISCLAIMER = """**DISCLAIMER (EU STR & Tax Context)**  
This information is for educational purposes only and is based on publicly available sources as of February 2026. It is **not tax, legal, or financial advice**. Tax laws change frequently. Always advise owners to consult a licensed tax advisor and local lawyer in the specific country before taking any action. Immo Snippy does **not** support or assist with illegal tax evasion, fraud, or non-compliance. All strategies listed are legitimate deductions and optimizations permitted under current law."""

# -----------------------------------------------------------------------------
# EU-Wide Rules (Apply to All 27 Countries – 2026)
# -----------------------------------------------------------------------------

EU_STR_TAX_STATIC_CONTEXT = """
## EU-Wide Rules (Apply to All 27 Countries – 2026)

- **EU Short-Term Rental Regulation (Regulation 2024/1028)**: Effective May 2026. All hosts must register properties and obtain a unique registration number. Platforms (Airbnb, Booking.com) must share booking data with authorities. Non-compliance can lead to listing removal and fines.
- **DAC7 (EU Tax Data Sharing)**: Platforms report host income to tax authorities annually. Hosts must provide tax ID. Applies to all EU residents and properties in the EU.
- **VAT Rules**: Short-term accommodation is generally subject to VAT. Thresholds vary by country. Many countries require VAT registration if turnover exceeds a certain amount (e.g. €10,000–€85,000).
- **Platform Policies**: Airbnb and Booking.com require hosts to comply with local laws, collect tourist taxes where mandated, and display registration numbers.

**Legal Tax Optimization Principle**: Landlords can deduct all **reasonable, necessary, and properly documented expenses** directly related to generating rental income. The goal is to reduce taxable profit to the legal minimum.

---

## Country-by-Country (Maximum Legal Deductions)

### France
- **Tax**: Micro-BIC (simplified) or Réel regime.
- **2026 changes**: Tax allowance reduced (50% for classified, 30% for non-classified with caps). Energy performance requirements stricter.
- **Maximum legal deductions**: 100% of cleaning, utilities (pro-rated), maintenance, repairs, insurance, property tax, mortgage interest (Réel); depreciation on furniture, appliances, renovations; marketing, platform fees, professional fees (accountant, photographer); home office if applicable.
- **Sources**: Service-Public.fr, Impots.gouv.fr, Airbnb Tax Guide France 2026.

### Spain
- **Tax**: Non-residents 19% (EU) or 24% (non-EU) on gross or net. EU residents can deduct expenses; non-EU residents have limited deductions.
- **Maximum legal deductions**: Pro-rated utilities, cleaning, repairs, insurance, community fees, mortgage interest, depreciation (furniture over 10 years); marketing, platform commissions, professional services.
- **Sources**: Agencia Tributaria, Hi Homes Spain 2026 guide.

### Italy
- **Tax**: Cedolare secca flat rate (21% or 26% depending on number of properties). 2026 proposal: unified 26% rate.
- **Maximum legal deductions** (ordinary regime): Full maintenance, cleaning, utilities, insurance, mortgage interest, depreciation, marketing, platform fees. Local tourist tax often passed to guests.
- **Sources**: Agenzia delle Entrate, Rental Scale-Up Italy 2026.

### Germany
- **Tax**: Income tax on rental profit (progressive).
- **Maximum legal deductions**: All operating costs (cleaning, utilities, repairs, insurance, depreciation AfA, advertising, platform fees, accounting, travel for management); home office if applicable; tourist tax often collected by platforms.
- **Sources**: Finanzamt, Airbnb Host Tax Guide Germany.

### Portugal
- **Tax**: NHR regime (e.g. 20% flat in some cases) or progressive.
- **Maximum legal deductions**: Full operating expenses, depreciation, interest, maintenance, cleaning, marketing. Tourist tax passed to guests.
- **Sources**: Autoridade Tributária e Aduaneira, GuestReady Portugal guide.

### Greece
- **Tax**: 15% flat on STR income + VAT.
- **Maximum legal deductions**: Operating costs, depreciation, maintenance, cleaning, insurance, marketing.
- **Sources**: AADE, Airbnb Greece Tax Guide.

### Netherlands
- **Tax**: Box 1 or Box 3 depending on scale.
- **Maximum legal deductions**: All business expenses if registered as business (cleaning, utilities, maintenance, depreciation, marketing). Tourist tax collected by platforms.
- **Sources**: Belastingdienst, Minut Netherlands guide.

### Other (Summary)
- **Croatia**: 10–30% tax + tourist tax. Deduct operating expenses + depreciation.
- **Austria**: Progressive income tax. Full expense deductions if business activity.
- **Belgium**: Progressive + local taxes. Deduct all reasonable expenses.
- **Ireland**: Income tax + USC/PRSI. Deduct expenses, capital allowances.
- **Poland, Hungary, Romania, etc.**: Vary — consult local tax authority (operating costs, depreciation, marketing).

---

## General Legal Maximization Strategies (EU)

- Register as a business (professional regime) where possible for higher deductions.
- Keep meticulous records (receipts, invoices, pro-rated calculations).
- Claim depreciation on furniture, appliances, renovations (accelerated where allowed).
- Deduct: platform fees, cleaning, utilities, insurance, maintenance, marketing, accounting fees, travel for property management.
- Pass tourist taxes to guests where legally allowed.
- Home office deduction if part of property used for management.
- Structure as company (Ltd/SARL) in some countries for better treatment (consult advisor).

**Recommended sources**: Airbnb Host Tax Guides per country; official tax authorities (impots.gouv.fr, agenciatributaria.es, agenziaentrate.gov.it, etc.); EU Regulation 2024/1028; DAC7; local STR associations and accountants.
"""


def get_eu_str_tax_context(include_disclaimer: bool = True) -> str:
    """
    Return the full EU STR/tax static context for injection into the system prompt.
    When include_disclaimer is True (default), the legal disclaimer is prepended.
    """
    disclaimer = (EU_STR_TAX_DISCLAIMER + "\n\n") if include_disclaimer else ""
    return (disclaimer + EU_STR_TAX_STATIC_CONTEXT.strip()).strip()
