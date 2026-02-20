# CRM Functional Specification

**Canonical requirements.** These 20 points are the basic premises for the Immo Snippy CRM: structured, exhaustive, and authoritative. Implementation status is tracked in [CRM_20_SPEC_STATUS.md](CRM_20_SPEC_STATUS.md).

---

## 1. Core Data Fields for Property and Owner Profiles

The CRM prioritizes structured data extractable from rental property listings:

**Property**
- Property address
- Price and rental terms
- Bedrooms, bathrooms, size
- Property type
- Listing title and description
- Photos where possible
- Source platform and URL
- Owner name
- Owner contact information

Only relevant, extractable rental listing data should be emphasized at this stage.

---

## 2. Custom Status Pipelines

Each profile includes **two separate pipelines**:

### A. Property Acquisition Pipeline

Reflects the real acquisition and onboarding process of rental property owners. Stages are tailored to the property acquisition model (not a generic sales CRM).

### B. Chatbot / Communication Pipeline

A separate pipeline for conversation tracking only. Conversation progress is monitored independently from acquisition stages.

Acquisition process and communication process are **logically separated but connected**.

---

## 3. Owner-Based CRM Architecture

The CRM is **owner-centric**, not property-centric.

- One owner may have multiple properties.
- Database structure centers around the owner.
- When opening a property in the CRM, the system displays **all properties** for the same owner.
- Those properties are clickable and easily navigable.
- Internally: **owner data is primary**; properties are instances under the owner.

---

## 4. Viability and Scoring Fields

Intelligent evaluation fields based on best-practice property analysis:

- Viability score
- Estimated revenue
- Estimated operating costs
- Cash flow projection
- Revenue potential rating
- Risk indicators
- Confidence or certainty level

These metrics support decision-making, not just raw data display.

---

## 5. Scraped Data and Two-Way Synchronization

The CRM must:

- Automatically pull listing data from the original source.
- Display scraped data in structured format.
- Store all scraped data in the database.
- Store all edits made in the CRM in the same database.
- Maintain **bidirectional data consistency**.

All communication and profile updates persist at database level.

---

## 6. Communication Channels

Support and track all major channels:

- Email
- WhatsApp
- Facebook Messenger
- Facebook Group comments
- Website forms
- Phone
- SMS

Each channel is structured separately in the interface (enterprise CRM style). When unclear, enterprise CRM standards guide design.

---

## 7. Conversation History

Each profile must include:

- Full conversation history
- Thread view format
- Channel identification
- Sender identification
- Complete timestamps
- **No deletion of messages** (permanent communication log)

---

## 8. AI Conversation Control

### A. Prominent AI Automation Toggle

Clearly visible control:

- Enable AI automatic continuation
- Disable AI automatic continuation

### B. AI Stop Stage Control

Dropdown to define when AI stops automatically engaging, e.g.:

- After contact is established
- After interest is expressed
- After full agreement
- Never

This must be **integrated into AI logic**, not visual-only.

---

## 9. AI Context Source

The AI uses the **existing local chatbot context** based on the Airbnb business model. No separate stage-based template library is required.

---

## 10. Attention Flags and Notifications

- Flag conversations requiring human attention.
- Push notifications to the account owner.

Notifications triggered by: objections, negotiation signals, legal concerns, or complex responses.

---

## 11. Automation Levels

Graded automation levels. Users can define:

- Fully manual mode
- Semi-automated mode with approval
- Automated until a specific pipeline stage
- Fully automated mode

Automation is configurable and **stage-aware**.

---

## 12. Lead Creation and Messaging Control

When a new lead is identified:

- The system **automatically creates the profile**.
- Messaging does **not** begin until approval, unless user settings allow automatic outreach.
- Configurable at user level.

---

## 13. Real-Time Property Evaluation Panel

Each property has a dedicated evaluation section:

- Real-time property evaluation context
- Cash flow simulation
- Revenue projections
- Risk assessment
- Degree of certainty indicator

If data is incomplete or uncertain, the system **explicitly displays** that the evaluation is uncertain. The section is **scrollable and visually distinct** in the property view.

---

## 14. Bulk Actions

Standard CRM bulk functionality:

- Select multiple leads
- Send message
- Update pipeline stage
- Mark as contacted
- Export data

---

## 15. Automatic Pipeline Movement

Leads move automatically between stages based on defined events, e.g.:

- Reply received
- Call booked
- Agreement confirmed
- Contract signed

Automation reflects **real acquisition workflow logic**.

---

## 16. Reporting and Export

Allow exporting:

- All property data
- All owner/user data
- All chat history

No advanced dashboards required at this stage.

---

## 17. User Roles

**Single-user system** for now. No multi-role or permission structure at this stage.

---

## 18. Compliance Features

No specific compliance features defined at this stage.

---

## 19. Manual Lead Entry

- Manual entry interface in the CRM.
- **Mandatory fields:** Email, Source URL.
- All manually entered data feeds directly into the Mongo database.
- Duplicate detection and merging capability should be supported.

---

## 20. Additional Features

No additional must-have features at this time.
