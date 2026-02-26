# B2C Snippy — UX Paradigm

This document defines the **user experience paradigm** for the B2C layer: mental model, primary flows, interaction patterns, and design principles.

---

## 1. Mental Model

**What the user believes they are doing**

- **“My preferences in one place, my matches in one feed.”**  
  The app is a single place to set “what I want,” then see properties that fit—ranked for them—and act (save, contact, ignore).

- **“I stay in control; the bot helps when I want it.”**  
  Automation (bot outreach, early warnings) is an optional layer. The user chooses manual-only, bot-assisted, or fully automated and can change this at any time.

- **“Nothing slips through.”**  
  Early warnings and the ranked feed ensure that good matches are visible and actionable instead of buried in listings.

**What the system is actually doing (transparent where useful)**

- Combining **hard filters** (must-haves) and **soft ranking** (vibe, location nuance) so the feed is both correct and personally relevant.
- Optionally acting on the user’s behalf (contact agent, request viewing) with clear consent and, when configured, confirmation before sending.

---

## 2. Primary User Flows

### 2.1 First-time: Onboarding → First feed

```
Account → Budget & Rent/Buy → Core filters → Location → Voice/Text “vibe” → Communication preference → Done
                                                                                    ↓
                                                                            First ranked feed (Swipe or List)
```

- **Progressive disclosure:** One clear step per screen; no long forms.
- **Escape hatches:** Skip optional steps (e.g. voice note); refine preferences later in Settings.
- **Immediate payoff:** Right after onboarding, show the first batch of ranked results (swipe or list) so the value is visible.

### 2.2 Recurring: Daily use

**Mode A — Swipe-first**

- Open app → See next card (pre-ranked).
- **Swipe Yes** → Choose: “Contact myself” / “Bot contact (with/without confirm)” → Optionally add to Saved.
- **Swipe No** → Next card; implicit signal for learning.
- **Saved** → Shortcut to Saved Apartments pipeline.

**Mode B — Notification-first (early warning)**

- New listing matches strongly → Push/in-app notification.
- User: **Ignore** | **View** | **Bot contact** | **Contact myself**.
- From “View” → Same contact and save options as swipe.

Both modes converge on: **View → Decide (contact/save/ignore) → Optionally let bot handle contact.**

### 2.3 Managing pipeline: Saved Apartments

- List/cards of saved properties with **status** (Interested, Contacted, Viewing Scheduled, Offer, Rejected, Closed).
- Per property: **timeline**, **notes**, **conversation log**, **documents**.
- Actions: Update status, add note, open conversation, request viewing.

**Paradigm:** Simplified CRM for private users—no “CRM” label; use **“Saved Apartments”** and status names that feel personal (e.g. “Viewing scheduled” not “Stage 3”).

---

## 3. Interaction Patterns

### 3.1 Swipe interface (Tinder-style)

- **One property per card** as the default view; key info above the fold (price, location, main photo, 1–2 highlights).
- **Single primary gesture:** Swipe right = Yes, left = No. Buttons (Yes/No) for accessibility and desktop.
- **On Yes:** Bottom sheet or modal: “How do you want to proceed?” → Manual contact | Bot (with confirm) | Bot (auto). Then “Add to Saved” optional.
- **No confirmation on No** to keep pace; optional “Undo last swipe” for mis-taps.

### 3.2 Early warning

- **Trigger:** New listing passes hard filters and scores above a relevance threshold.
- **Notification:** Short, actionable (“New match: 2-bed in Limpertsberg, €1,800”).
- **In-app:** Dedicated “New for you” or “Early alerts” area so users can review all recent matches in one place.

### 3.3 Preference input

- **Structured:** Binary/multi-choice and ranges (budget, bedrooms, commune, etc.). Group by theme (Budget, Size, Location, Amenities, …).
- **Free-form:** One optional step—voice or text. Clear prompt: “Describe your ideal place in a few words (e.g. quiet but near cafés, character not too modern).”
- **Location:** Commune picker + optional radius / “Near [landmark]” / commute time. LLM turns fuzzy input into structured constraints where possible.

### 3.4 Bot and contact

- **Explicit choice** at onboarding and per action: Manual only | Bot with confirm | Bot fully automated.
- **When “confirm” is on:** Show draft message and “Edit / Send / Cancel.”
- **Transparency:** In Saved Apartments, show that “Bot contacted on [date]” and link to conversation log if available.

---

## 4. Design Principles

| Principle | Application |
|----------|-------------|
| **Clarity over cleverness** | Labels and statuses in plain language (Saved Apartments, “Viewing scheduled”). No internal jargon. |
| **One primary action per screen** | Swipe screen = decide on one property. Onboarding = one step. Contact modal = one choice (manual vs bot). |
| **Progressive disclosure** | Onboarding in short steps. Advanced filters behind “More filters.” Bot options behind “How should we contact?” |
| **Control and consent** | User chooses contact mode. Bot confirmation when selected. Easy way to turn off early warnings or bot. |
| **Speed in hot markets** | Early warnings and ranking put best matches first so users can act quickly. |
| **Trust through transparency** | Show why a listing matched (e.g. “Matches your budget and area”), what the bot sent, and what stage each saved property is in. |

---

## 5. Cross-cutting UX Rules

- **Reuse existing identity:** Same visual system and tone as the B2B app; B2C feels like a dedicated “client” mode, not a different product.
- **Mobile-first, desktop-usable:** Swipe and notifications matter most on mobile; list and Saved Apartments must work well on desktop (e.g. table or cards + filters).
- **Accessibility:** Swipe alternatives (buttons), clear focus order, readable contrast, and support for reduced motion where applicable.
- **Off-ramps:** Every flow has “Save for later,” “Skip,” or “I’ll do it myself” so users never feel forced into bot or extra steps.

---

## 6. Summary: UX in One Sentence

**Set preferences once (structured + free-form), get a ranked feed and optional early alerts; swipe or tap to save and choose how to contact (yourself or bot); track everything in Saved Apartments with full control and transparency.**
