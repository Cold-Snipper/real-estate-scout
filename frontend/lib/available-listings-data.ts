export type ListingSource = "athome" | "immotop"

export interface AvailableListing {
  id: string
  photo: string | null
  title: string
  address: string
  location: string
  price: number
  rooms: number
  sqm: number
  buildingYear: number | null
  source: string
  daysAvailable: number
  description: string
  features: string[]
  listing_url: string | null
  listing_ref: string | null
}

export const AVAILABLE_LOCATIONS = [
  "Luxembourg City",
  "Esch-sur-Alzette",
  "Differdange",
  "Ettelbruck",
  "Dudelange",
  "Strassen",
  "Bertrange",
]

export const SOURCE_OPTIONS: { label: string; value: ListingSource }[] = [
  { label: "athome.lu", value: "athome" },
  { label: "immotop.lu", value: "immotop" },
]

export const ROOM_OPTIONS = [
  { label: "Any", value: "any" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5+", value: "5" },
]

export const availableListings: AvailableListing[] = [
  {
    id: "av-1",
    photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
    title: "Modern Apartment in Kirchberg",
    address: "2 Rue Alphonse Weicker",
    location: "Luxembourg City",
    price: 895000,
    rooms: 3,
    sqm: 105,
    buildingYear: 2019,
    source: "athome",
    daysAvailable: 14,

    description: "Bright 3-room apartment in the Kirchberg business district with underground parking and balcony.",
    features: ["Balcony", "Parking", "Elevator", "Modern kitchen"],
  },
  {
    id: "av-2",
    photo: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
    title: "Renovated Townhouse",
    address: "15 Rue de Strasbourg",
    location: "Luxembourg City",
    price: 1250000,
    rooms: 5,
    sqm: 180,
    buildingYear: 1965,
    source: "immotop",
    daysAvailable: 7,

    description: "Fully renovated townhouse in Gare district with garden and 2 parking spots. Premium finishes throughout.",
    features: ["Garden", "2x Parking", "Cellar", "Renovated 2023"],
  },
  {
    id: "av-3",
    photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop",
    title: "Studio in Belval",
    address: "8 Boulevard du Jazz",
    location: "Esch-sur-Alzette",
    price: 320000,
    rooms: 1,
    sqm: 42,
    buildingYear: 2022,
    source: "athome",
    daysAvailable: 45,

    description: "Compact studio in the Belval university quarter. Ideal for investment or young professionals.",
    features: ["New build", "Fitted kitchen", "Bike storage"],
  },
  {
    id: "av-4",
    photo: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop",
    title: "Family Home with Garden",
    address: "42 Route d'Arlon",
    location: "Strassen",
    price: 1450000,
    rooms: 6,
    sqm: 240,
    buildingYear: 1988,
    source: "immotop",
    daysAvailable: 21,

    description: "Spacious family house on a quiet street with large garden, double garage, and panoramic views.",
    features: ["Garden 6 ares", "Double garage", "Solar panels", "Pool"],
  },
  {
    id: "av-5",
    photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop",
    title: "2-Bedroom in Bonnevoie",
    address: "23 Rue de Bonnevoie",
    location: "Luxembourg City",
    price: 620000,
    rooms: 2,
    sqm: 72,
    buildingYear: 2015,
    source: "athome",
    daysAvailable: 30,

    description: "Well-maintained 2-bedroom in a residential area close to the train station. South-facing balcony.",
    features: ["Balcony", "Cellar", "Elevator", "Near station"],
  },
  {
    id: "av-6",
    photo: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=300&fit=crop",
    title: "Penthouse with Terrace",
    address: "1 Parc d'Activités",
    location: "Bertrange",
    price: 1100000,
    rooms: 4,
    sqm: 155,
    buildingYear: 2021,
    source: "immotop",
    daysAvailable: 3,

    description: "Top-floor penthouse with 40m2 roof terrace and open-plan living. High-end finishes.",
    features: ["Roof terrace", "2x Parking", "Home office", "A+ energy"],
  },
  {
    id: "av-7",
    photo: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=300&fit=crop",
    title: "Investment Apartment",
    address: "5 Rue Emile Mark",
    location: "Differdange",
    price: 285000,
    rooms: 2,
    sqm: 65,
    buildingYear: 1975,
    source: "athome",
    daysAvailable: 60,

    description: "Currently rented 2-room apartment. Stable tenant with lease until 2027. Good yield property.",
    features: ["Rented", "Cellar", "Parking", "4.2% yield"],
  },
  {
    id: "av-8",
    photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
    title: "New Build 3-Bedroom",
    address: "Lot 12, Quartier Neihaischen",
    location: "Dudelange",
    price: 545000,
    rooms: 3,
    sqm: 98,
    buildingYear: 2025,
    source: "immotop",
    daysAvailable: 10,

    description: "Off-plan 3-bedroom in a new eco-district. Delivery Q3 2025. Triple glazing and heat pump.",
    features: ["New build", "A+ energy", "Heat pump", "Parking"],
  },
  {
    id: "av-9",
    photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
    title: "Charming Ettelbruck Villa",
    address: "18 Rue Prince Henri",
    location: "Ettelbruck",
    price: 780000,
    rooms: 4,
    sqm: 165,
    buildingYear: 2001,
    source: "athome",
    daysAvailable: 35,

    description: "Detached villa with mature garden in a family-friendly neighborhood near schools and amenities.",
    features: ["Garden", "Garage", "Attic", "Quiet area"],
  },
  {
    id: "av-10",
    photo: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
    title: "Loft-Style Duplex",
    address: "7 Rue du Fossé",
    location: "Luxembourg City",
    price: 975000,
    rooms: 3,
    sqm: 130,
    buildingYear: 2017,
    source: "immotop",
    daysAvailable: 5,

    description: "Industrial-chic duplex in Grund with double-height ceilings, exposed beams, and river views.",
    features: ["Duplex", "River view", "Designer kitchen", "Parking"],
  },
]
