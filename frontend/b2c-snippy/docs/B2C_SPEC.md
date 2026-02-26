# B2C Snippy — Product & System Specification

Structured description of the B2C layer: user types, preference system, ranking, interfaces, contact automation, Saved Apartments, onboarding, and architecture.

---

## 1. User Types

| Type | Description | Scope of this doc |
|------|-------------|-------------------|
| **Admin** | Database access, scraping oversight, moderation, system logic. Same layer for B2B and B2C. | Out of scope (unchanged). |
| **B2B User** | Real estate agencies. Already in the existing CRM. | Out of scope. |
| **B2C User** | Private individuals looking to rent or buy in Luxembourg. | **In scope.** |

---

## 2. Core Concept

- The B2C app **sits on top of the existing scraped real estate database.** No separate B2C database.
- The B2C layer **queries and filters** that database.
- Users define preferences in **two complementary ways**, merged into a single **user preference profile**:
  1. **Structured inputs** (filters, ranges, choices).
  2. **Free-form contextual input** (voice note or text), transcribed and stored as context.

---

## 3. User Preference Input System

### 3.1 Structured Property Filters

Roughly **20 binary or numerical questions**, including:

- Rent or buy  
- Budget range  
- Minimum bedrooms  
- Minimum size (m²)  
- Parking required (Y/N)  
- Balcony required (Y/N)  
- Elevator required (Y/N)  
- Furnished or not  
- New build vs existing  
- Energy class  
- Pet friendly  
- Etc.

**Standard real-estate filters** (atHome / Immotop style):

- Commune selection  
- Property type  
- Availability date  
- Construction year  
- Floor level  
- Monthly charges  
- Outdoor space  
- Distance / radius  

All stored as **binary**, **categorical**, or **numerical** fields.

### 3.2 Voice Note or Text Preference Layer

Users can:

- **Record a voice note** describing their ideal property, or  
- **Write free-text** description.

Examples:

- “Something with character, not too modern.”  
- “Quiet area but still close to nightlife.”  
- “Budget flexible if it feels right.”  
- “Near good cafés.”  
- “Walking distance from Kirchberg.”

- Voice is **transcribed** and stored as text.  
- This text is part of the **user context** used for soft ranking.

---

## 4. Preference Engine Logic

The system combines:

1. **Hard filters**  
   Binary and numerical constraints **strictly filter** the database (must-match).

2. **Soft contextual ranking**  
   An LLM interprets descriptive preferences and **ranks** results by semantic similarity and “vibe” alignment.

**Location logic** supports:

- Exact commune selection  
- Radius from city center  
- Proximity to landmarks  
- Commute time  
- Distance to points of interest  

If the user’s input is ambiguous, the LLM interprets intent and maps it to **structured location constraints** where possible.

**Result:** Each user gets a **dynamically ranked property feed** (most aligned first).

---

## 5. Output Interface Options

### Mode 1: Swipe Interface

- **Tinder-style** interaction.
- On app open, properties are **pre-ranked** (most → least aligned).
- User **swipes Yes or No**.

**On Yes:**

- System asks: **bot reaches out** or **user contacts manually**.
- If bot: it initiates contact (e.g. WhatsApp) with agent/owner.

**Contact goal:** Book a call, book a viewing, or request more information.

### Mode 2: Early Warning System

- When a **newly scraped listing** strongly matches the user’s preferences:
  - User gets a **notification**.
  - Property is **flagged as high relevance**.

User can:

- **Ignore**  
- **View details**  
- **Let bot contact agent**  
- **Contact manually**  

This gives a **speed advantage** in fast markets (e.g. Luxembourg).

---

## 6. Contact Automation Layer

When **bot outreach** is enabled:

- Bot **drafts message** in user’s tone.
- **Optionally** user confirms before send.
- Conversation starts via **WhatsApp**.

Bot can:

- Ask availability for viewings  
- Request documents  
- Confirm pricing  
- Negotiate time slots  

It can also **consult the user** mid-conversation before committing (e.g. confirming a viewing time).

---

## 7. Saved Apartments Module

In B2C, this is **not** called CRM; it is labeled **Saved Apartments**.

Simplified pipeline compared to B2B CRM. For each saved property:

- **Status pipeline**, e.g.:  
  Interested → Contacted → Viewing Scheduled → Offer Submitted → Rejected / Closed  
- **Conversation log**  
- **Notes**  
- **Timeline** of interactions  
- **Documents** (if needed)

---

## 8. B2C Onboarding Module

Lightweight onboarding, **separate from B2B operator onboarding**.

Steps:

1. Account creation  
2. Budget range  
3. Rent or buy  
4. Core filters  
5. Location preference  
6. Voice note or written description (optional)  
7. **Communication preference:**  
   - Manual only  
   - Bot assisted (e.g. with confirmation)  
   - Fully automated outreach with confirmation  

User context is **stored permanently** and **updated over time** (e.g. from swipes and saves).

---

## 9. Continuous Learning Layer

The system **updates the user profile** using:

- Swipe behaviour (Yes/No)  
- Contact decisions (manual vs bot)  
- Viewing attendance  
- Saved properties and their status  
- Rejections  

This **improves ranking** over time.

---

## 10. System Architecture Summary

**Built on top of:**

- Existing B2B real estate app  
- Existing visual identity  
- Existing scraped property database  

**New B2C additions:**

- Client onboarding module  
- Preference engine (hard filters + soft ranking)  
- Swipe interface  
- Early warning system  
- Simplified CRM → **Saved Apartments**  
- WhatsApp conversational bot  
- Context-based ranking engine  

---

## 11. Final Functional Flow

1. User **completes onboarding** (account, budget, filters, location, voice/text, contact preference).  
2. System **builds** structured + contextual preference model.  
3. Database is **filtered** (hard) and **ranked** (soft).  
4. User interacts via **swipe** and/or **notifications** (early warnings).  
5. **Bot** optionally contacts agents (with user consent/confirmation).  
6. All relevant properties are **tracked in Saved Apartments**.  
7. System **continuously refines** the preference model from behaviour.

---

## 12. Related Documents

- [UX_PARADIGM.md](./UX_PARADIGM.md) — UX paradigm, flows, and design principles for the B2C layer.
