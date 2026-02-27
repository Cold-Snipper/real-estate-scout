"""
Full expanded schema (80 fields) for Operator Onboarding.
Used by the form UI and context_builder for consistent labels/options.
Reference: docs/OPERATOR_ONBOARDING_EXPANDED_SCHEMA.md
"""

# 1.1 Outreach & automation toggles (20)
TOGGLE_OUTREACH = [
    ("mention_guarantee_in_messages", "Mention guarantee in messages", "e.g. 1.5× or we work free"),
    ("include_social_proof_first_2", "Include social proof in first 2 messages", "Specific numbers, local examples"),
    ("offer_free_audit_opener", "Offer free audit/report in opener", ""),
    ("send_calendly_first_message", "Send Calendly link in first message", ""),
    ("use_risk_reversal_phrasing", "Use risk reversal phrasing", "try risk-free"),
    ("focus_outcome_over_fee", "Focus on outcome over fee %", "you do nothing, we handle everything"),
    ("mention_eu_compliance", "Mention EU compliance when relevant", "Legal protection"),
    ("emphasize_warm_tone", "Emphasize warm tone in cold outreach", ""),
    ("enlarge_the_pie_every_reply", "Enlarge the pie in every reply", "let's make the whole pie bigger"),
    ("start_with_empathy", "Start with empathy for owner's pain", ""),
    ("highlight_zero_effort", "Always highlight zero effort for owner", ""),
    ("performance_guarantee_language", "Use performance-based guarantee language", ""),
    ("mention_local_24_7", "Mention local presence / 24/7 support", ""),
    ("avoid_competitors", "Avoid mentioning competitors", ""),
    ("offer_30_days_reduced_fee", "Offer first 30 days reduced fee as closing tool", ""),
    ("host_success_kit_bonus", "Include Host Success Kit as bonus in follow-ups", ""),
    ("use_scarcity_phrasing", "Use scarcity phrasing", "limited spots this month"),
    ("focus_passive_income_every_message", "Focus on passive income in every message", ""),
    ("mention_no_tenant_drama_openers", "Mention no tenant drama in openers", ""),
    ("always_end_with_next_step", "Always end with clear next step (call or audit)", ""),
]

# 1.2 Reporting & compliance toggles (10)
TOGGLE_REPORTING = [
    ("allow_export_property_csv", "Allow export of all property information (CSV)", ""),
    ("allow_export_owner_csv", "Allow export of all owner information (CSV)", ""),
    ("allow_export_chat_history", "Allow export of all chat history (CSV or ZIP)", ""),
    ("track_compliance_per_property", "Track compliance status per property", "e.g. registered, tourist tax paid"),
    ("require_owner_consent_before_scraping", "Require owner consent before scraping their website", ""),
    ("log_every_ai_message_audit", "Log every AI message sent for audit trail", ""),
    ("notify_when_interested", "Notify user when conversation reaches Interested stage", ""),
    ("notify_when_call_booked", "Notify user when call is booked", ""),
    ("notify_when_contract_signed", "Notify user when contract is signed (manual input)", ""),
    ("allow_manual_override_viability_score", "Allow manual override of AI-generated viability score", ""),
]

# All toggle keys for iteration
ALL_TOGGLE_KEYS = [t[0] for t in TOGGLE_OUTREACH] + [t[0] for t in TOGGLE_REPORTING]

# 2. Dropdowns: key -> [(value, label), ...]
DROPDOWNS = {
    "primary_tone": [
        ("professional_trustworthy", "Professional and trustworthy"),
        ("friendly_approachable", "Friendly and approachable"),
        ("luxurious_premium", "Luxurious and premium"),
        ("direct_results", "Direct and results-oriented"),
        ("empathetic_supportive", "Empathetic and supportive"),
    ],
    "target_owner_type": [
        ("busy_professionals_expat", "Busy professionals / expats (time-poor, value convenience)"),
        ("investors_portfolio", "Real estate investors / portfolio owners (yield-focused)"),
        ("retirees_second_home", "Retirees / second-home owners (want hassle-free)"),
        ("first_time_hosts", "First-time hosts (need guidance)"),
        ("inherited_owners", "Inherited property owners (often overwhelmed)"),
    ],
    "property_type_focus": [
        ("urban_apartments", "Urban apartments (high turnover, easy management)"),
        ("family_houses_villas", "Family houses / villas (longer stays, premium)"),
        ("luxury_unique", "Luxury / unique properties (higher ADR)"),
        ("rural_countryside", "Rural / countryside homes (niche demand)"),
        ("no_preference", "No strong preference (all types OK)"),
    ],
    "fee_structure": [
        ("20_25_percent", "20–25% commission (scales with revenue)"),
        ("15_20_percent", "15–20% commission (more competitive)"),
        ("flat_monthly", "Flat monthly fee (predictable for owner)"),
        ("hybrid", "Hybrid (base + percentage)"),
        ("performance_based_min", "Performance-based minimum (low risk for owner)"),
    ],
    "call_booking_preference": [
        ("15_min_first", "Always offer 15-min call first (fast close)"),
        ("30_min_discovery", "Always offer 30-min discovery call (deep dive)"),
        ("qualify_then_call", "Qualify then offer call (higher conversion)"),
        ("audit_before_call", "Send audit before asking for call"),
        ("never_auto_call", "Never mention call automatically (manual follow-up)"),
    ],
    "risk_reversal_style": [
        ("strong_guarantee", "Strong guarantee (1.5× or free)"),
        ("soft_guarantee", "Soft guarantee (cancel anytime)"),
        ("trial_period", "Trial period (first 30 days reduced)"),
        ("no_guarantee", "No guarantee mentioned"),
    ],
    "social_proof_emphasis": [
        ("heavy", "Heavy (specific numbers in every message)"),
        ("medium", "Medium (in follow-ups only)"),
        ("light", "Light (only when asked)"),
    ],
    "objection_handling_style": [
        ("value_add", "Value-add (more bonuses)"),
        ("empathy_proof", "Empathy + proof"),
        ("direct_counter", "Direct counter"),
        ("enlarge_the_pie", "Enlarge the pie"),
    ],
    "urgency_scarcity_style": [
        ("strong", "Strong (limited spots this month)"),
        ("medium", "Medium (properties moving fast)"),
        ("light", "Light (no urgency)"),
    ],
    "compliance_mention": [
        ("always", "Always mention EU/local compliance"),
        ("if_asked", "Mention only if asked"),
        ("never", "Never mention"),
    ],
    "bonus_stack_priority": [
        ("photography_first", "Photography + listing optimization first"),
        ("profit_audit_first", "Profit audit first"),
        ("reduced_first_month_first", "Reduced first month first"),
    ],
    "message_length_preference": [
        ("short_direct", "Short & direct"),
        ("medium_150_250", "Medium (150–250 words)"),
        ("longer_value_bomb", "Longer (value bomb style)"),
    ],
    "follow_up_frequency": [
        ("aggressive", "Aggressive (every 2–3 days)"),
        ("balanced", "Balanced (every 5–7 days)"),
        ("conservative", "Conservative (every 10+ days)"),
    ],
    "objection_rebuttal_style": [
        ("add_value", "Add more value"),
        ("social_proof", "Use social proof"),
        ("enlarge_the_pie", "Enlarge the pie"),
        ("risk_reversal", "Risk reversal"),
    ],
    "first_message_style": [
        ("pain_plus_offer", "Pain + offer"),
        ("value_bomb_first", "Value bomb first"),
        ("question_empathy", "Question + empathy"),
        ("direct_benefit", "Direct benefit"),
    ],
    "follow_up_tone": [
        ("persistent_polite", "Persistent but polite"),
        ("gentle_reminder", "Gentle reminder"),
        ("value_reemphasis", "Value re-emphasis"),
        ("urgency_increase", "Urgency increase"),
    ],
    "closing_style": [
        ("direct_ask_call", "Direct ask for call"),
        ("soft_calendly", "Soft Calendly link"),
        ("free_audit_first", "Offer free audit first"),
        ("risk_reversal_close", "Risk reversal close"),
    ],
    "email_vs_messenger_style": [
        ("formal_email", "Formal for email"),
        ("casual_messenger", "Casual for Messenger"),
        ("same_both", "Same style for both"),
    ],
    "photo_mention": [
        ("always", "Always mention professional photos"),
        ("only_if_asked", "Only if owner asks"),
        ("never", "Never mention"),
    ],
    "revenue_projection_style": [
        ("conservative", "Conservative estimates"),
        ("optimistic", "Optimistic estimates"),
        ("range_only", "Range only"),
    ],
    "legal_mention": [
        ("always", "Always mention compliance"),
        ("when_relevant", "Mention only when relevant"),
        ("never", "Never mention"),
    ],
    "bonus_emphasis": [
        ("heavy", "Heavy bonus stacking"),
        ("light", "Light bonus mention"),
        ("none", "No bonuses"),
    ],
    "call_to_action_strength": [
        ("strong", "Strong (Let's book now)"),
        ("medium", "Medium (Would you like to see numbers?)"),
        ("soft", "Soft (Happy to send audit if interested)"),
    ],
    "primary_negotiation_style": [
        ("enlarge_the_pie", "Enlarge the Pie (expand total value)"),
        ("value_add", "Value-Add (add bonuses)"),
        ("empathy_proof", "Empathy + Proof (mirror pain + show results)"),
        ("direct_counter", "Direct Counter (address objection head-on)"),
        ("risk_reversal_first", "Risk Reversal First (lead with guarantee)"),
    ],
    "call_booking_aggressiveness": [
        ("very_aggressive", "Very aggressive (Let's book now)"),
        ("balanced", "Balanced (after value bomb)"),
        ("gentle", "Gentle (after qualification)"),
        ("very_gentle", "Very gentle (only if owner asks)"),
    ],
    # 2.26–2.35 Reporting & workflow
    "export_format_preference": [
        ("csv", "CSV (simple table)"),
        ("excel", "Excel (with formatting)"),
        ("json", "JSON (for developers)"),
        ("pdf_report", "PDF report (summary)"),
    ],
    "notification_delivery": [
        ("toast_only", "In-app toast only"),
        ("email_toast", "Email + toast"),
        ("whatsapp_toast", "WhatsApp + toast"),
        ("all_channels", "All channels"),
    ],
    "viability_certainty_threshold": [
        ("high_8", "High (≥8/10)"),
        ("medium_6", "Medium (≥6/10)"),
        ("low_4", "Low (≥4/10)"),
        ("not_certain", "Not Certain (<4/10)"),
    ],
    "conversation_flagging_level": [
        ("legal_compliance_only", "Flag only legal/compliance questions"),
        ("price_negotiations", "Flag price negotiations"),
        ("objections", "Flag objections"),
        ("all_replies", "Flag all replies"),
    ],
    "automation_level": [
        ("fully_auto", "Fully auto (until user-defined stage)"),
        ("semi_auto", "Semi-auto (approval per message)"),
        ("manual_review_before_send", "Manual review before every send"),
        ("manual_only", "Manual only"),
    ],
    "pipeline_movement_trigger": [
        ("auto_on_reply", "Auto on reply received"),
        ("auto_on_positive_reply", "Auto on positive reply"),
        ("manual_only", "Manual only"),
        ("ai_suggest_user_confirm", "AI suggested, user confirms"),
    ],
    "bulk_action_default": [
        ("send_same_message", "Send same message"),
        ("mark_contacted", "Mark as Contacted"),
        ("export_selected", "Export selected"),
        ("delete_selected", "Delete selected"),
    ],
    "report_frequency": [
        ("daily_summary", "Daily summary email"),
        ("weekly_summary", "Weekly summary email"),
        ("on_demand_only", "On-demand only"),
    ],
    "data_retention_policy": [
        ("keep_forever", "Keep forever"),
        ("delete_12_months", "Delete after 12 months"),
        ("delete_24_months", "Delete after 24 months"),
    ],
    "backup_preference": [
        ("daily_local", "Daily local backup"),
        ("weekly_local", "Weekly local backup"),
        ("manual_only", "Manual only"),
    ],
}

# Value -> label mapping for context builder (DROPDOWN_LABELS dict of dicts)
DROPDOWN_LABELS = {k: dict(v) for k, v in DROPDOWNS.items()}

# 3. Text questions in agency_context_ext
TEXT_KEYS = [
    ("long_company_description", "Long company description"),
    ("properties_managed_count", "How many properties do you manage?"),
    ("main_hub_city", "Main office / hub city"),
    ("ideal_owner_pain_points", "What pain points do ideal owners have?"),
    ("results_to_highlight", "What results to highlight? (e.g. 2.3× income)"),
    ("call_booking_phrasing", "Exact phrasing when asking for a call"),
    ("countries_cities_different", "Countries/cities to treat differently"),
    ("strict_rules", "Strict rules AI must always follow"),
    ("ideal_close_rate", "Ideal close rate for discovery calls?"),
    ("target_monthly_new_properties", "Target monthly new properties under management?"),
    ("avg_time_to_signed_contract", "Average time from first message to signed contract?"),
    ("biggest_competitive_advantage", "Biggest competitive advantage over other managers?"),
    ("biggest_weakness_avoid", "Biggest weakness or area for AI to avoid mentioning?"),
    ("success_stories_case_studies", "Success stories or case studies the AI should reference?"),
]

# AGENCY_EXT_LABELS: key -> human-readable label (for context builder)
AGENCY_EXT_LABELS = {}
for key, label in TEXT_KEYS:
    AGENCY_EXT_LABELS[key] = label
for key in DROPDOWNS:
    AGENCY_EXT_LABELS[key] = key.replace("_", " ").title()
for key in ALL_TOGGLE_KEYS:
    lbl = next((t[1] for t in TOGGLE_OUTREACH + TOGGLE_REPORTING if t[0] == key), key.replace("_", " ").title())
    AGENCY_EXT_LABELS[key] = lbl
