# Operator Onboarding – Expanded schema (80 fields)

All expanded fields are stored in **`operators.agency_context_ext`** (JSON). Existing columns (`company_name`, `website_url`, `tagline`, `countries`, `qualification_rules`, `notes`, etc.) stay as-is. New toggles, dropdowns, and text questions are stored inside `agency_context_ext` so the bot and context builder can read them.

---

## 1. Yes/No toggles (30 total)

Stored as `agency_context_ext.<key>` boolean (true/false). Default if missing: false.

### 1.1 Outreach & automation preferences (20)

| Key | Label (short) | Tooltip / explanation |
|-----|----------------|------------------------|
| `mention_guarantee_in_messages` | Mention guarantee in messages | e.g. “1.5× or we work free” |
| `include_social_proof_first_2` | Include social proof in first 2 messages | Specific numbers, local examples |
| `offer_free_audit_opener` | Offer free audit/report in opener | |
| `send_calendly_first_message` | Send Calendly link in first message | |
| `use_risk_reversal_phrasing` | Use risk reversal phrasing | “try risk-free” |
| `focus_outcome_over_fee` | Focus on outcome over fee % | “you do nothing, we handle everything” |
| `mention_eu_compliance` | Mention EU compliance when relevant | Legal protection |
| `emphasize_warm_tone` | Emphasize warm tone in cold outreach | |
| `enlarge_the_pie_every_reply` | Enlarge the pie in every reply | “let’s make the whole pie bigger” |
| `start_with_empathy` | Start with empathy for owner’s pain | |
| `highlight_zero_effort` | Always highlight “zero effort” for owner | |
| `performance_guarantee_language` | Use performance-based guarantee language | |
| `mention_local_24_7` | Mention local presence / 24/7 support | |
| `avoid_competitors` | Avoid mentioning competitors | |
| `offer_30_days_reduced_fee` | Offer first 30 days reduced fee as closing tool | |
| `host_success_kit_bonus` | Include Host Success Kit as bonus in follow-ups | |
| `use_scarcity_phrasing` | Use scarcity phrasing | “limited spots this month” |
| `focus_passive_income_every_message` | Focus on passive income in every message | |
| `mention_no_tenant_drama_openers` | Mention “no tenant drama” in openers | |
| `always_end_with_next_step` | Always end with clear next step (call or audit) | |

### 1.2 Reporting & compliance preferences (10)

| Key | Label (short) | Tooltip / explanation |
|-----|----------------|------------------------|
| `allow_export_property_csv` | Allow export of all property information (CSV) | |
| `allow_export_owner_csv` | Allow export of all owner information (CSV) | |
| `allow_export_chat_history` | Allow export of all chat history (CSV or ZIP) | |
| `track_compliance_per_property` | Track compliance status per property | e.g. registered, tourist tax paid |
| `require_owner_consent_before_scraping` | Require owner consent before scraping their website | |
| `log_every_ai_message_audit` | Log every AI message sent for audit trail | |
| `notify_when_interested` | Notify user when conversation reaches “Interested” stage | |
| `notify_when_call_booked` | Notify user when call is booked | |
| `notify_when_contract_signed` | Notify user when contract is signed (manual input) | |
| `allow_manual_override_viability_score` | Allow manual override of AI-generated viability score | |

---

## 2. Dropdowns (30 total)

Stored as `agency_context_ext.<key>` string (option value). Option values are stable; labels/tooltips are for UI and context.

**2.1–2.25** Negotiation & sales tactics · **2.26–2.35** Reporting & workflow

### 2.1 Primary tone of communication  
**Key:** `primary_tone`

| Value | Label | Explanation |
|-------|--------|-------------|
| `professional_trustworthy` | Professional and trustworthy | Builds credibility fast |
| `friendly_approachable` | Friendly and approachable | Builds rapport quickly |
| `luxurious_premium` | Luxurious and premium | Targets high-end owners |
| `direct_results` | Direct and results-oriented | Closes faster |
| `empathetic_supportive` | Empathetic and supportive | Handles objections well |

### 2.2 Main target owner type  
**Key:** `target_owner_type`

| Value | Label |
|-------|--------|
| `busy_professionals_expat` | Busy professionals / expats (time-poor, value convenience) |
| `investors_portfolio` | Real estate investors / portfolio owners (yield-focused) |
| `retirees_second_home` | Retirees / second-home owners (want hassle-free) |
| `first_time_hosts` | First-time hosts (need guidance) |
| `inherited_owners` | Inherited property owners (often overwhelmed) |

### 2.3 Preferred property type focus  
**Key:** `property_type_focus`

| Value | Label |
|-------|--------|
| `urban_apartments` | Urban apartments (high turnover, easy management) |
| `family_houses_villas` | Family houses / villas (longer stays, premium) |
| `luxury_unique` | Luxury / unique properties (higher ADR) |
| `rural_countryside` | Rural / countryside homes (niche demand) |
| `no_preference` | No strong preference (all types OK) |

### 2.4 Management fee structure  
**Key:** `fee_structure`

| Value | Label |
|-------|--------|
| `20_25_percent` | 20–25% commission (scales with revenue) |
| `15_20_percent` | 15–20% commission (more competitive) |
| `flat_monthly` | Flat monthly fee (predictable for owner) |
| `hybrid` | Hybrid (base + percentage) |
| `performance_based_min` | Performance-based minimum (low risk for owner) |

### 2.5 Call booking preference  
**Key:** `call_booking_preference`

| Value | Label |
|-------|--------|
| `15_min_first` | Always offer 15-min call first (fast close) |
| `30_min_discovery` | Always offer 30-min discovery call (deep dive) |
| `qualify_then_call` | Qualify then offer call (higher conversion) |
| `audit_before_call` | Send audit before asking for call |
| `never_auto_call` | Never mention call automatically (manual follow-up) |

### 2.6 Risk reversal style  
**Key:** `risk_reversal_style`

| Value | Label |
|-------|--------|
| `strong_guarantee` | Strong guarantee (“1.5× or free”) |
| `soft_guarantee` | Soft guarantee (“cancel anytime”) |
| `trial_period` | Trial period (first 30 days reduced) |
| `no_guarantee` | No guarantee mentioned |

### 2.7 Social proof emphasis  
**Key:** `social_proof_emphasis`

| Value | Label |
|-------|--------|
| `heavy` | Heavy (specific numbers in every message) |
| `medium` | Medium (in follow-ups only) |
| `light` | Light (only when asked) |

### 2.8 Objection handling style  
**Key:** `objection_handling_style`

| Value | Label |
|-------|--------|
| `value_add` | Value-add (more bonuses) |
| `empathy_proof` | Empathy + proof |
| `direct_counter` | Direct counter |
| `enlarge_the_pie` | Enlarge the pie |

### 2.9 Urgency / scarcity style  
**Key:** `urgency_scarcity_style`

| Value | Label |
|-------|--------|
| `strong` | Strong (“limited spots this month”) |
| `medium` | Medium (“properties moving fast”) |
| `light` | Light (no urgency) |

### 2.10 Compliance mention  
**Key:** `compliance_mention`

| Value | Label |
|-------|--------|
| `always` | Always mention EU/local compliance |
| `if_asked` | Mention only if asked |
| `never` | Never mention |

### 2.11 Bonus stack priority  
**Key:** `bonus_stack_priority`

| Value | Label |
|-------|--------|
| `photography_first` | Photography + listing optimization first |
| `profit_audit_first` | Profit audit first |
| `reduced_first_month_first` | Reduced first month first |

### 2.12 Message length preference  
**Key:** `message_length_preference`

| Value | Label |
|-------|--------|
| `short_direct` | Short & direct |
| `medium_150_250` | Medium (150–250 words) |
| `longer_value_bomb` | Longer (value bomb style) |

### 2.13 Follow-up frequency  
**Key:** `follow_up_frequency`

| Value | Label |
|-------|--------|
| `aggressive` | Aggressive (every 2–3 days) |
| `balanced` | Balanced (every 5–7 days) |
| `conservative` | Conservative (every 10+ days) |

### 2.14 Objection rebuttal style  
**Key:** `objection_rebuttal_style`

| Value | Label |
|-------|--------|
| `add_value` | Add more value |
| `social_proof` | Use social proof |
| `enlarge_the_pie` | Enlarge the pie |
| `risk_reversal` | Risk reversal |

### 2.15 First message style  
**Key:** `first_message_style`

| Value | Label |
|-------|--------|
| `pain_plus_offer` | Pain + offer |
| `value_bomb_first` | Value bomb first |
| `question_empathy` | Question + empathy |
| `direct_benefit` | Direct benefit |

### 2.16 Follow-up tone  
**Key:** `follow_up_tone`

| Value | Label |
|-------|--------|
| `persistent_polite` | Persistent but polite |
| `gentle_reminder` | Gentle reminder |
| `value_reemphasis` | Value re-emphasis |
| `urgency_increase` | Urgency increase |

### 2.17 Closing style  
**Key:** `closing_style`

| Value | Label |
|-------|--------|
| `direct_ask_call` | Direct ask for call |
| `soft_calendly` | Soft Calendly link |
| `free_audit_first` | Offer free audit first |
| `risk_reversal_close` | Risk reversal close |

### 2.18 Email vs Messenger style  
**Key:** `email_vs_messenger_style`

| Value | Label |
|-------|--------|
| `formal_email` | Formal for email |
| `casual_messenger` | Casual for Messenger |
| `same_both` | Same style for both |

### 2.19 Photo mention  
**Key:** `photo_mention`

| Value | Label |
|-------|--------|
| `always` | Always mention professional photos |
| `only_if_asked` | Only if owner asks |
| `never` | Never mention |

### 2.20 Revenue projection style  
**Key:** `revenue_projection_style`

| Value | Label |
|-------|--------|
| `conservative` | Conservative estimates |
| `optimistic` | Optimistic estimates |
| `range_only` | Range only |

### 2.21 Legal mention  
**Key:** `legal_mention`

| Value | Label |
|-------|--------|
| `always` | Always mention compliance |
| `when_relevant` | Mention only when relevant |
| `never` | Never mention |

### 2.22 Bonus emphasis  
**Key:** `bonus_emphasis`

| Value | Label |
|-------|--------|
| `heavy` | Heavy bonus stacking |
| `light` | Light bonus mention |
| `none` | No bonuses |

### 2.23 Call to action strength  
**Key:** `call_to_action_strength`

| Value | Label |
|-------|--------|
| `strong` | Strong (“Let’s book now”) |
| `medium` | Medium (“Would you like to see numbers?”) |
| `soft` | Soft (“Happy to send audit if interested”) |

### 2.24 Primary negotiation style  
**Key:** `primary_negotiation_style`

| Value | Label |
|-------|--------|
| `enlarge_the_pie` | Enlarge the Pie (expand total value) |
| `value_add` | Value-Add (add bonuses) |
| `empathy_proof` | Empathy + Proof (mirror pain + show results) |
| `direct_counter` | Direct Counter (address objection head-on) |
| `risk_reversal_first` | Risk Reversal First (lead with guarantee) |

### 2.25 Call booking aggressiveness  
**Key:** `call_booking_aggressiveness`

| Value | Label |
|-------|--------|
| `very_aggressive` | Very aggressive (“Let’s book now”) |
| `balanced` | Balanced (after value bomb) |
| `gentle` | Gentle (after qualification) |
| `very_gentle` | Very gentle (only if owner asks) |

### 2.26–2.35 Reporting & workflow (10 dropdowns)

### 2.26 Export format preference  
**Key:** `export_format_preference`

| Value | Label |
|-------|--------|
| `csv` | CSV (simple table) |
| `excel` | Excel (with formatting) |
| `json` | JSON (for developers) |
| `pdf_report` | PDF report (summary) |

### 2.27 Notification delivery  
**Key:** `notification_delivery`

| Value | Label |
|-------|--------|
| `toast_only` | In-app toast only |
| `email_toast` | Email + toast |
| `whatsapp_toast` | WhatsApp + toast |
| `all_channels` | All channels |

### 2.28 Viability certainty threshold  
**Key:** `viability_certainty_threshold`

| Value | Label |
|-------|--------|
| `high_8` | High (≥8/10) |
| `medium_6` | Medium (≥6/10) |
| `low_4` | Low (≥4/10) |
| `not_certain` | Not Certain (<4/10) |

### 2.29 Conversation flagging level  
**Key:** `conversation_flagging_level`

| Value | Label |
|-------|--------|
| `legal_compliance_only` | Flag only legal/compliance questions |
| `price_negotiations` | Flag price negotiations |
| `objections` | Flag objections |
| `all_replies` | Flag all replies |

### 2.30 Automation level  
**Key:** `automation_level`

| Value | Label |
|-------|--------|
| `fully_auto` | Fully auto (until user-defined stage) |
| `semi_auto` | Semi-auto (approval per message) |
| `manual_review_before_send` | Manual review before every send |
| `manual_only` | Manual only |

### 2.31 Pipeline movement trigger  
**Key:** `pipeline_movement_trigger`

| Value | Label |
|-------|--------|
| `auto_on_reply` | Auto on reply received |
| `auto_on_positive_reply` | Auto on positive reply |
| `manual_only` | Manual only |
| `ai_suggest_user_confirm` | AI suggested, user confirms |

### 2.32 Bulk action default  
**Key:** `bulk_action_default`

| Value | Label |
|-------|--------|
| `send_same_message` | Send same message |
| `mark_contacted` | Mark as Contacted |
| `export_selected` | Export selected |
| `delete_selected` | Delete selected |

### 2.33 Report frequency  
**Key:** `report_frequency`

| Value | Label |
|-------|--------|
| `daily_summary` | Daily summary email |
| `weekly_summary` | Weekly summary email |
| `on_demand_only` | On-demand only |

### 2.34 Data retention policy  
**Key:** `data_retention_policy`

| Value | Label |
|-------|--------|
| `keep_forever` | Keep forever |
| `delete_12_months` | Delete after 12 months |
| `delete_24_months` | Delete after 24 months |

### 2.35 Backup preference  
**Key:** `backup_preference`

| Value | Label |
|-------|--------|
| `daily_local` | Daily local backup |
| `weekly_local` | Weekly local backup |
| `manual_only` | Manual only |

---

## 3. Text questions (20)

- **1–3, 5, 10, 14** use existing columns: `company_name`, `website_url`, `tagline`, `countries`, `qualification_rules`, `notes`.
- **4, 6–9, 11–13, 15–20** use `agency_context_ext` text keys below.

| # | Key (in agency_context_ext) | Label | Existing column |
|---|------------------------------|--------|-------------------|
| 1 | — | Company full legal name * | `company_name` |
| 2 | — | Website URL * | `website_url` |
| 3 | — | Short tagline / one-liner | `tagline` |
| 4 | `long_company_description` | Long company description | (new in ext) |
| 5 | — | Main countries of operation | `countries` |
| 6 | `properties_managed_count` | How many properties do you manage? | (new in ext) |
| 7 | `main_hub_city` | Main office / hub city | (new in ext) |
| 8 | `ideal_owner_pain_points` | What pain points do ideal owners have? | (new in ext) |
| 9 | `results_to_highlight` | What results to highlight? (e.g. “2.3× income”) | (new in ext) |
| 10 | — | What must be true before AI offers a call? | `qualification_rules` |
| 11 | `call_booking_phrasing` | Exact phrasing when asking for a call | (new in ext) |
| 12 | `countries_cities_different` | Countries/cities to treat differently | (new in ext) |
| 13 | `strict_rules` | Strict rules AI must always follow | (new in ext) |
| 14 | — | Additional notes for the AI | `notes` |
| 15 | `ideal_close_rate` | Ideal close rate for discovery calls? | (new in ext) |
| 16 | `target_monthly_new_properties` | Target monthly new properties under management? | (new in ext) |
| 17 | `avg_time_to_signed_contract` | Average time from first message to signed contract? | (new in ext) |
| 18 | `biggest_competitive_advantage` | Biggest competitive advantage over other managers? | (new in ext) |
| 19 | `biggest_weakness_avoid` | Biggest weakness or area for AI to avoid mentioning? | (new in ext) |
| 20 | `success_stories_case_studies` | Success stories or case studies the AI should reference? | (new in ext) |

---

## 4. Storage shape (summary)

**Table:** `operators`  
**Column:** `agency_context_ext` TEXT (JSON).

**Example JSON (subset):**

```json
{
  "mention_guarantee_in_messages": true,
  "include_social_proof_first_2": false,
  "use_scarcity_phrasing": true,
  "always_end_with_next_step": true,
  "primary_tone": "professional_trustworthy",
  "target_owner_type": "busy_professionals_expat",
  "first_message_style": "value_bomb_first",
  "follow_up_tone": "persistent_polite",
  "closing_style": "direct_ask_call",
  "call_to_action_strength": "medium",
  "long_company_description": "We are a full-service...",
  "properties_managed_count": "120",
  "main_hub_city": "Luxembourg City",
  "ideal_owner_pain_points": "No time, fear of regulations...",
  "results_to_highlight": "2.3× income in first year",
  "call_booking_phrasing": "Let's book a 15-min call to see if we're a fit.",
  "countries_cities_different": "Germany: more formal tone.",
  "strict_rules": "Never promise exact revenue numbers.",
  "ideal_close_rate": "40%",
  "target_monthly_new_properties": "5",
  "avg_time_to_signed_contract": "2–3 weeks",
  "biggest_competitive_advantage": "Local 24/7 team",
  "biggest_weakness_avoid": "Don't mention our small team size",
  "success_stories_case_studies": "Luxembourg City 2.3× case study",
  "allow_export_property_csv": true,
  "allow_export_owner_csv": true,
  "log_every_ai_message_audit": true,
  "notify_when_call_booked": true,
  "export_format_preference": "excel",
  "notification_delivery": "email_toast",
  "automation_level": "semi_auto",
  "data_retention_policy": "keep_forever"
}
```

The form and API should merge these keys into `agency_context_ext` on create/update (PATCH `/api/operators/:id` with body including `agency_context_ext`). Context builder should read `agency_context_ext` and inject toggle/dropdown/text values into the LLM system prompt.
