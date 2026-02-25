export type ListingStatus = "New" | "Reviewing" | "Contacted" | "Viewing" | "Passed"

export interface AIScoreDimension {
  label: string
  score: number
  reasoning: string
}

export interface Listing {
  id: string
  photo: string
  address: string
  location: string
  price: number
  beds: number
  sqm: number
  airbnbScore: number
  daysOnMarket: number
  status: ListingStatus
  aiBreakdown: AIScoreDimension[]
}

export const LOCATIONS = [
  "Barcelona, Spain",
  "Lisbon, Portugal",
  "Athens, Greece",
  "Porto, Portugal",
  "Valencia, Spain",
  "Split, Croatia",
  "Málaga, Spain",
]

export const STATUS_OPTIONS: ListingStatus[] = ["New", "Reviewing", "Contacted", "Viewing", "Passed"]

export const BEDROOM_OPTIONS = [
  { label: "Any", value: "any" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
]

export const listings: Listing[] = [
  {
    id: "1",
    photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200&h=200&fit=crop",
    address: "Carrer de Mallorca 284, 3-1",
    location: "Barcelona, Spain",
    price: 389000,
    beds: 2,
    sqm: 78,
    airbnbScore: 8.7,
    daysOnMarket: 3,
    status: "New",
    aiBreakdown: [
      { label: "Location Demand", score: 9.2, reasoning: "Eixample district has consistently high tourist demand year-round, with average occupancy rates above 82%." },
      { label: "Unit Economics", score: 8.5, reasoning: "Projected ADR of €145 with 78% occupancy yields a strong 7.2% gross yield after expenses." },
      { label: "Property Fit", score: 8.8, reasoning: "Modern layout with 2 bedrooms and separate living space is ideal for couples and small groups." },
      { label: "Competition", score: 8.2, reasoning: "Moderate saturation in the area, but property quality places it in the top 20% of comparable listings." },
      { label: "Regulatory Risk", score: 9.0, reasoning: "Property has existing tourist licence (HUT). Barcelona has frozen new licences since 2024." },
    ],
  },
  {
    id: "2",
    photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop",
    address: "Rua Augusta 45, 2 Dto",
    location: "Lisbon, Portugal",
    price: 425000,
    beds: 3,
    sqm: 95,
    airbnbScore: 7.9,
    daysOnMarket: 7,
    status: "Reviewing",
    aiBreakdown: [
      { label: "Location Demand", score: 8.8, reasoning: "Baixa-Chiado is one of Lisbon's prime tourist zones with strong year-round foot traffic." },
      { label: "Unit Economics", score: 7.6, reasoning: "Higher purchase price offsets by strong ADR of €165. Projected 6.8% gross yield." },
      { label: "Property Fit", score: 8.2, reasoning: "3-bedroom layout works well for families and groups. Needs minor kitchen renovation." },
      { label: "Competition", score: 7.2, reasoning: "High density of Airbnb listings in the immediate area. Differentiation will require premium furnishing." },
      { label: "Regulatory Risk", score: 7.8, reasoning: "Portugal's Mais Habitação regulations tightened STR rules but existing AL licences remain valid." },
    ],
  },
  {
    id: "3",
    photo: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop",
    address: "Odos Adrianou 52, Plaka",
    location: "Athens, Greece",
    price: 215000,
    beds: 1,
    sqm: 55,
    airbnbScore: 7.2,
    daysOnMarket: 12,
    status: "New",
    aiBreakdown: [
      { label: "Location Demand", score: 8.5, reasoning: "Plaka neighborhood benefits from Acropolis proximity. Strong seasonal demand from April to October." },
      { label: "Unit Economics", score: 7.8, reasoning: "Low acquisition cost combined with €95 ADR provides attractive 8.1% gross yield." },
      { label: "Property Fit", score: 6.5, reasoning: "Single bedroom limits guest capacity. Rooftop terrace with Acropolis view is a strong differentiator." },
      { label: "Competition", score: 6.8, reasoning: "Growing number of STR units in Plaka. However, Acropolis-view properties command premium pricing." },
      { label: "Regulatory Risk", score: 6.2, reasoning: "Greece considering new STR regulations in 2026. Plaka may face density-based restrictions." },
    ],
  },
  {
    id: "4",
    photo: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=200&h=200&fit=crop",
    address: "Rua das Flores 112, 1 Esq",
    location: "Porto, Portugal",
    price: 298000,
    beds: 2,
    sqm: 82,
    airbnbScore: 8.3,
    daysOnMarket: 5,
    status: "Contacted",
    aiBreakdown: [
      { label: "Location Demand", score: 8.6, reasoning: "Flores Street is a pedestrian boulevard in Porto's historic center with excellent tourist appeal." },
      { label: "Unit Economics", score: 8.4, reasoning: "Moderate purchase price and €125 ADR with 75% occupancy delivers a solid 7.5% gross yield." },
      { label: "Property Fit", score: 8.5, reasoning: "Recently renovated 2-bed with original tile work preserved. Turnkey-ready for STR operation." },
      { label: "Competition", score: 7.8, reasoning: "Porto's STR market is less saturated than Lisbon. Heritage properties enjoy higher demand." },
      { label: "Regulatory Risk", score: 8.2, reasoning: "Porto maintains a more STR-friendly stance than Lisbon. Existing AL licences are secure." },
    ],
  },
  {
    id: "5",
    photo: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=200&h=200&fit=crop",
    address: "Carrer del Doctor Sumsi 8, 4-2",
    location: "Valencia, Spain",
    price: 195000,
    beds: 3,
    sqm: 110,
    airbnbScore: 6.8,
    daysOnMarket: 21,
    status: "Reviewing",
    aiBreakdown: [
      { label: "Location Demand", score: 7.2, reasoning: "Ruzafa is Valencia's trendiest neighborhood but STR demand is still developing compared to Barcelona." },
      { label: "Unit Economics", score: 7.5, reasoning: "Low entry price and large floor area. Projected ADR of €105 with 65% occupancy gives 6.5% yield." },
      { label: "Property Fit", score: 7.0, reasoning: "Spacious 3-bed unit but requires full renovation. Budget estimate: €35,000 for STR-ready condition." },
      { label: "Competition", score: 6.0, reasoning: "Growing STR supply in Ruzafa. Market is price-sensitive, limiting premium positioning." },
      { label: "Regulatory Risk", score: 5.8, reasoning: "Valencia region is tightening STR regulations. New licence applications face longer review periods." },
    ],
  },
  {
    id: "6",
    photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=200&fit=crop",
    address: "Obala Hrvatskog Narodnog 14",
    location: "Split, Croatia",
    price: 340000,
    beds: 2,
    sqm: 72,
    airbnbScore: 9.1,
    daysOnMarket: 1,
    status: "New",
    aiBreakdown: [
      { label: "Location Demand", score: 9.5, reasoning: "Riva waterfront location in Split's old town. Extreme demand during summer with 95%+ occupancy May-Sep." },
      { label: "Unit Economics", score: 8.8, reasoning: "Premium ADR of €185 during peak season. Blended annual yield estimated at 8.4% gross." },
      { label: "Property Fit", score: 9.0, reasoning: "Stone-built apartment with sea view balcony. Fully renovated, move-in ready for immediate STR use." },
      { label: "Competition", score: 8.5, reasoning: "Waterfront properties are scarce and always in demand. Strong competitive moat." },
      { label: "Regulatory Risk", score: 9.6, reasoning: "Croatia has a very favorable STR regulatory environment with minimal restrictions." },
    ],
  },
  {
    id: "7",
    photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=200&fit=crop",
    address: "Calle Alcazabilla 3, 2B",
    location: "Málaga, Spain",
    price: 275000,
    beds: 2,
    sqm: 68,
    airbnbScore: 4.5,
    daysOnMarket: 34,
    status: "Passed",
    aiBreakdown: [
      { label: "Location Demand", score: 5.5, reasoning: "Close to historic center but foot traffic is lower than comparable streets in the old town." },
      { label: "Unit Economics", score: 4.8, reasoning: "ADR of €88 and 58% occupancy rate yields only 4.2% gross. Below portfolio threshold." },
      { label: "Property Fit", score: 4.2, reasoning: "North-facing unit with no outdoor space. Layout is awkward for guest use." },
      { label: "Competition", score: 3.8, reasoning: "Oversaturated micro-area with 40+ active STR listings within 200m radius." },
      { label: "Regulatory Risk", score: 4.0, reasoning: "Málaga announced STR density caps in early 2026. This zone already exceeds the proposed limit." },
    ],
  },
  {
    id: "8",
    photo: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200&h=200&fit=crop",
    address: "Carrer de la Marina 19, 5-1",
    location: "Barcelona, Spain",
    price: 520000,
    beds: 4,
    sqm: 125,
    airbnbScore: 7.6,
    daysOnMarket: 9,
    status: "New",
    aiBreakdown: [
      { label: "Location Demand", score: 8.0, reasoning: "Poblenou is an emerging neighborhood with strong demand from digital nomads and longer-stay guests." },
      { label: "Unit Economics", score: 7.2, reasoning: "Higher acquisition cost but 4-bed capacity supports group bookings at €210 ADR. 6.1% yield." },
      { label: "Property Fit", score: 7.8, reasoning: "Large penthouse with rooftop terrace. Requires €20k in furnishing but layout is excellent." },
      { label: "Competition", score: 7.4, reasoning: "Fewer 4-bed STR options in the area give this unit a competitive advantage for group travel." },
      { label: "Regulatory Risk", score: 7.6, reasoning: "Property has valid HUT licence. Poblenou is not flagged in Barcelona's latest restriction review." },
    ],
  },
]
