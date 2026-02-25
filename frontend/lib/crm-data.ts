export type SalesStage =
  | "New Lead"
  | "Contacted"
  | "Interested"
  | "Call Booked"
  | "Proposal Sent"
  | "Contract Signed"
  | "Onboarded"
  | "Active Client"

export type ChatbotStage =
  | "No Contact"
  | "First Message Sent"
  | "Replied"
  | "Interested"
  | "Call Booked"
  | "Closed"

export type Recommendation = "Strong Buy" | "Good" | "Marginal" | "Avoid"

export interface CrmConversation {
  id: number
  channel: string
  sender: "ai" | "user" | "owner"
  message_text: string
  timestamp: number
}

export interface CrmProperty {
  id: number
  title: string
  location: string
  address: string
  price: number
  rent_price: number | null
  sale_price: number | null
  bedrooms: number
  bathrooms: number
  surface_m2: number
  rooms: number | null
  description: string
  listing_url: string
  transaction_type: string
  contact_email: string
  phone_number: string
  source: string
  source_platform: string | null
  listing_ref: string | null
  first_seen: string
  viability_score: number | null
  recommendation: Recommendation | null
  estimated_annual_gross: number | null
  price_to_earnings: number | null
  degree_of_certainty: string | null
  sales_pipeline_stage: SalesStage
  chatbot_pipeline_stage: ChatbotStage
  deposit: number | null
  monthly_charges: number | null
  last_contact_date: number | null
}

export interface CrmOwner {
  id: number
  owner_name: string
  owner_email: string
  owner_phone: string
  owner_notes: string
  last_contact_date: number | null
  properties: CrmProperty[]
}

export const SALES_STAGES: SalesStage[] = [
  "New Lead",
  "Contacted",
  "Interested",
  "Call Booked",
  "Proposal Sent",
  "Contract Signed",
  "Onboarded",
  "Active Client",
]

export const CHATBOT_STAGES: ChatbotStage[] = [
  "No Contact",
  "First Message Sent",
  "Replied",
  "Interested",
  "Call Booked",
  "Closed",
]

export const CHANNELS = [
  { key: "Email", color: "text-primary" },
  { key: "WhatsApp", color: "text-score-green" },
  { key: "Phone", color: "text-score-orange" },
  { key: "SMS", color: "text-muted-foreground" },
]

// --- Dummy Data ---

const now = Date.now()
const day = 86400000

export const crmConversations: Record<number, CrmConversation[]> = {
  101: [
    { id: 1, channel: "Email", sender: "ai", message_text: "Hi Maria, I noticed your property at Carrer de Mallorca 284 is listed for sale. We represent institutional Airbnb operators and would be interested in scheduling a viewing. Would you be available this week?", timestamp: now - 4 * day },
    { id: 2, channel: "Email", sender: "owner", message_text: "Hello, thank you for your interest. I am available Thursday or Friday afternoon. The apartment is fully renovated and ready to move in.", timestamp: now - 3 * day },
    { id: 3, channel: "Email", sender: "user", message_text: "Perfect, let's schedule for Thursday at 3pm. We'll bring our property assessor. Could you confirm the exact unit number?", timestamp: now - 2 * day },
    { id: 4, channel: "WhatsApp", sender: "ai", message_text: "Hi Maria, just confirming Thursday 3pm viewing at Carrer de Mallorca 284, 3-1. Looking forward to it!", timestamp: now - 1 * day },
  ],
  102: [
    { id: 5, channel: "Email", sender: "ai", message_text: "Dear Mr. Ferreira, we are interested in the Rua Augusta property. Could we arrange a call to discuss the listing details and your timeline?", timestamp: now - 7 * day },
    { id: 6, channel: "Email", sender: "owner", message_text: "Sure. I have some time Wednesday morning. The property is currently tenanted, lease expires in 3 months.", timestamp: now - 5 * day },
    { id: 7, channel: "Phone", sender: "user", message_text: "Called and discussed: lease expires March 2026, owner flexible on price if quick close. Needs 2 weeks for vacating.", timestamp: now - 3 * day },
  ],
  103: [
    { id: 8, channel: "Email", sender: "ai", message_text: "Hello Dimitris, we noticed your Plaka property listing and are interested in learning more about the rooftop terrace and licence status.", timestamp: now - 10 * day },
  ],
  104: [
    { id: 9, channel: "WhatsApp", sender: "ai", message_text: "Olá Ana! Saw your beautiful property on Rua das Flores. Is it still available? We'd love to discuss.", timestamp: now - 6 * day },
    { id: 10, channel: "WhatsApp", sender: "owner", message_text: "Hi! Yes, it's available. Just had it fully restored. Happy to chat anytime.", timestamp: now - 5 * day },
    { id: 11, channel: "WhatsApp", sender: "user", message_text: "Amazing! The heritage tile work looks incredible. Can we schedule a viewing for next week?", timestamp: now - 4 * day },
    { id: 12, channel: "WhatsApp", sender: "owner", message_text: "Of course! Monday or Tuesday work best for me. I can also send over the floor plans.", timestamp: now - 3 * day },
    { id: 13, channel: "Email", sender: "user", message_text: "Ana, thanks for the floor plans. Our team has reviewed and we'd like to proceed to a formal proposal. Sending details shortly.", timestamp: now - 1 * day },
  ],
  201: [
    { id: 14, channel: "Email", sender: "ai", message_text: "Dear Katarina, your Split waterfront property caught our attention. We specialize in premium Airbnb management and acquisition. Would you consider a meeting?", timestamp: now - 2 * day },
  ],
  301: [
    { id: 15, channel: "Email", sender: "ai", message_text: "Hello Carlos, reaching out regarding your Málaga property listing at Calle Alcazabilla. Is it still on the market?", timestamp: now - 30 * day },
    { id: 16, channel: "Email", sender: "owner", message_text: "Yes but we have other interested parties. Price is firm at 275k.", timestamp: now - 28 * day },
    { id: 17, channel: "Email", sender: "user", message_text: "Thank you Carlos. After our analysis we've decided to pass on this property as it doesn't meet our ROI criteria. Wishing you the best with the sale.", timestamp: now - 25 * day },
  ],
}

export const crmOwners: CrmOwner[] = [
  {
    id: 1,
    owner_name: "Maria Garcia Alonso",
    owner_email: "m.garcia@email.es",
    owner_phone: "+34 612 345 678",
    owner_notes: "Responsive, professional. Open to quick close with institutional buyer.",
    last_contact_date: now - 1 * day,
    properties: [
      {
        id: 101,
        title: "Modern Eixample Apartment",
        location: "Barcelona, Spain",
        address: "Carrer de Mallorca 284, 3-1",
        price: 389000,
        rent_price: null,
        sale_price: 389000,
        bedrooms: 2,
        bathrooms: 1,
        surface_m2: 78,
        rooms: 4,
        description: "Bright, fully renovated 2-bedroom in the heart of Eixample. South-facing with balcony overlooking a quiet courtyard. Original modernist details preserved alongside modern fixtures.",
        listing_url: "https://idealista.com/listing/38901234",
        transaction_type: "sale",
        contact_email: "m.garcia@email.es",
        phone_number: "+34 612 345 678",
        source: "Idealista",
        source_platform: "idealista",
        listing_ref: "ID-38901234",
        first_seen: "2026-02-20",
        viability_score: 8.7,
        recommendation: "Strong Buy",
        estimated_annual_gross: 42500,
        price_to_earnings: 9.2,
        degree_of_certainty: "High",
        sales_pipeline_stage: "Call Booked",
        chatbot_pipeline_stage: "Replied",
        deposit: null,
        monthly_charges: 180,
        last_contact_date: now - 1 * day,
      },
    ],
  },
  {
    id: 2,
    owner_name: "João Pedro Ferreira",
    owner_email: "jp.ferreira@sapo.pt",
    owner_phone: "+351 912 876 543",
    owner_notes: "Owner flexible on price for quick close. Tenanted until March 2026.",
    last_contact_date: now - 3 * day,
    properties: [
      {
        id: 102,
        title: "Baixa-Chiado Classic Flat",
        location: "Lisbon, Portugal",
        address: "Rua Augusta 45, 2 Dto",
        price: 425000,
        rent_price: null,
        sale_price: 425000,
        bedrooms: 3,
        bathrooms: 2,
        surface_m2: 95,
        rooms: 5,
        description: "Elegant 3-bedroom apartment in Lisbon's prime tourist zone. High ceilings, azulejo tile accents, and river views from the living room. Currently tenanted.",
        listing_url: "https://idealista.pt/listing/45123",
        transaction_type: "sale",
        contact_email: "jp.ferreira@sapo.pt",
        phone_number: "+351 912 876 543",
        source: "Idealista PT",
        source_platform: "idealista",
        listing_ref: "IP-45123",
        first_seen: "2026-02-16",
        viability_score: 7.6,
        recommendation: "Good",
        estimated_annual_gross: 38900,
        price_to_earnings: 10.9,
        degree_of_certainty: "High",
        sales_pipeline_stage: "Interested",
        chatbot_pipeline_stage: "Replied",
        deposit: null,
        monthly_charges: 220,
        last_contact_date: now - 3 * day,
      },
    ],
  },
  {
    id: 3,
    owner_name: "Dimitris Papadopoulos",
    owner_email: "d.papadopoulos@gmail.com",
    owner_phone: "+30 694 123 4567",
    owner_notes: "First contact sent. No reply yet.",
    last_contact_date: now - 10 * day,
    properties: [
      {
        id: 103,
        title: "Plaka Rooftop Studio",
        location: "Athens, Greece",
        address: "Odos Adrianou 52, Plaka",
        price: 215000,
        rent_price: null,
        sale_price: 215000,
        bedrooms: 1,
        bathrooms: 1,
        surface_m2: 55,
        rooms: 2,
        description: "Charming 1-bedroom with a stunning rooftop terrace overlooking the Acropolis. Compact but well-designed, ideal for premium short-term rentals targeting couples.",
        listing_url: "https://spitogatos.gr/listing/52001",
        transaction_type: "sale",
        contact_email: "d.papadopoulos@gmail.com",
        phone_number: "+30 694 123 4567",
        source: "Spitogatos",
        source_platform: "spitogatos",
        listing_ref: "SG-52001",
        first_seen: "2026-02-12",
        viability_score: 6.8,
        recommendation: "Good",
        estimated_annual_gross: 22100,
        price_to_earnings: 9.7,
        degree_of_certainty: "Medium",
        sales_pipeline_stage: "Contacted",
        chatbot_pipeline_stage: "First Message Sent",
        deposit: null,
        monthly_charges: 95,
        last_contact_date: now - 10 * day,
      },
    ],
  },
  {
    id: 4,
    owner_name: "Ana Luísa Costa",
    owner_email: "ana.costa@outlook.pt",
    owner_phone: "+351 926 789 012",
    owner_notes: "Very enthusiastic. Sent floor plans. Heritage property with original tile work.",
    last_contact_date: now - 1 * day,
    properties: [
      {
        id: 104,
        title: "Historic Flores Heritage Flat",
        location: "Porto, Portugal",
        address: "Rua das Flores 112, 1 Esq",
        price: 298000,
        rent_price: null,
        sale_price: 298000,
        bedrooms: 2,
        bathrooms: 1,
        surface_m2: 82,
        rooms: 4,
        description: "Beautifully restored 2-bedroom in Porto's pedestrian-only Flores Street. Original azulejos, new plumbing and electrics, turnkey ready for STR operation.",
        listing_url: "https://idealista.pt/listing/67890",
        transaction_type: "sale",
        contact_email: "ana.costa@outlook.pt",
        phone_number: "+351 926 789 012",
        source: "Idealista PT",
        source_platform: "idealista",
        listing_ref: "IP-67890",
        first_seen: "2026-02-18",
        viability_score: 8.3,
        recommendation: "Strong Buy",
        estimated_annual_gross: 35200,
        price_to_earnings: 8.5,
        degree_of_certainty: "High",
        sales_pipeline_stage: "Proposal Sent",
        chatbot_pipeline_stage: "Interested",
        deposit: null,
        monthly_charges: 140,
        last_contact_date: now - 1 * day,
      },
    ],
  },
  {
    id: 5,
    owner_name: "Katarina Horvat",
    owner_email: "katarina.horvat@gmail.com",
    owner_phone: "+385 91 234 5678",
    owner_notes: "Premium waterfront property. Initial outreach sent.",
    last_contact_date: now - 2 * day,
    properties: [
      {
        id: 201,
        title: "Riva Waterfront Stone Apartment",
        location: "Split, Croatia",
        address: "Obala Hrvatskog Narodnog 14",
        price: 340000,
        rent_price: null,
        sale_price: 340000,
        bedrooms: 2,
        bathrooms: 1,
        surface_m2: 72,
        rooms: 3,
        description: "Stone-built apartment on Split's famous Riva promenade with sea-view balcony. Fully renovated, move-in ready. Extremely high summer occupancy rates.",
        listing_url: "https://njuskalo.hr/listing/91234",
        transaction_type: "sale",
        contact_email: "katarina.horvat@gmail.com",
        phone_number: "+385 91 234 5678",
        source: "Njuskalo",
        source_platform: "njuskalo",
        listing_ref: "NJ-91234",
        first_seen: "2026-02-22",
        viability_score: 9.1,
        recommendation: "Strong Buy",
        estimated_annual_gross: 48600,
        price_to_earnings: 7.0,
        degree_of_certainty: "High",
        sales_pipeline_stage: "New Lead",
        chatbot_pipeline_stage: "First Message Sent",
        deposit: null,
        monthly_charges: 160,
        last_contact_date: now - 2 * day,
      },
    ],
  },
  {
    id: 6,
    owner_name: "Carlos Ruiz Moreno",
    owner_email: "carlos.ruiz@hotmail.es",
    owner_phone: "+34 678 901 234",
    owner_notes: "Passed - poor ROI. Owner was firm on price, oversaturated area.",
    last_contact_date: now - 25 * day,
    properties: [
      {
        id: 301,
        title: "Old Town Málaga Unit",
        location: "Malaga, Spain",
        address: "Calle Alcazabilla 3, 2B",
        price: 275000,
        rent_price: null,
        sale_price: 275000,
        bedrooms: 2,
        bathrooms: 1,
        surface_m2: 68,
        rooms: 3,
        description: "2-bedroom unit close to Málaga's historic center. North-facing with no outdoor space. Oversaturated micro-area for short-term rentals.",
        listing_url: "https://idealista.com/listing/30145",
        transaction_type: "sale",
        contact_email: "carlos.ruiz@hotmail.es",
        phone_number: "+34 678 901 234",
        source: "Idealista",
        source_platform: "idealista",
        listing_ref: "ID-30145",
        first_seen: "2026-01-20",
        viability_score: 4.5,
        recommendation: "Avoid",
        estimated_annual_gross: 15800,
        price_to_earnings: 17.4,
        degree_of_certainty: "High",
        sales_pipeline_stage: "Contacted",
        chatbot_pipeline_stage: "Closed",
        deposit: null,
        monthly_charges: 130,
        last_contact_date: now - 25 * day,
      },
    ],
  },
  {
    id: 7,
    owner_name: "Pablo Mendez Vega",
    owner_email: "p.mendez@gmail.com",
    owner_phone: "+34 654 321 987",
    owner_notes: "Large penthouse, needs furnishing. Under review for group-travel niche.",
    last_contact_date: null,
    properties: [
      {
        id: 401,
        title: "Poblenou Penthouse with Terrace",
        location: "Barcelona, Spain",
        address: "Carrer de la Marina 19, 5-1",
        price: 520000,
        rent_price: null,
        sale_price: 520000,
        bedrooms: 4,
        bathrooms: 2,
        surface_m2: 125,
        rooms: 6,
        description: "Spacious 4-bedroom penthouse in Poblenou with rooftop terrace. Ideal for group bookings. Requires approximately 20k in furnishing investment.",
        listing_url: "https://idealista.com/listing/52019",
        transaction_type: "sale",
        contact_email: "p.mendez@gmail.com",
        phone_number: "+34 654 321 987",
        source: "Idealista",
        source_platform: "idealista",
        listing_ref: "ID-52019",
        first_seen: "2026-02-14",
        viability_score: 7.6,
        recommendation: "Good",
        estimated_annual_gross: 51200,
        price_to_earnings: 10.2,
        degree_of_certainty: "Medium",
        sales_pipeline_stage: "New Lead",
        chatbot_pipeline_stage: "No Contact",
        deposit: null,
        monthly_charges: 310,
        last_contact_date: null,
      },
    ],
  },
]
