/**
 * Adapter: maps shared listing data (AvailableListing) to B2C format (B2CFeedItem).
 * Connects B2C to the same data source as B2B (lib/available-listings-data).
 */

import type { AvailableListing } from "@/lib/available-listings-data"
import type { B2CFeedItem } from "./b2c-api"

function mockScore(listing: AvailableListing, index: number): number {
  const base = 7 + (listing.buildingYear > 2010 ? 1 : 0) + (listing.sqm > 80 ? 0.5 : 0)
  return Math.min(9.5, base + (index % 5) * 0.2)
}

const WHY_FITS = [
  "Matches your budget and preferred area.",
  "Quiet area, close to cafés and transport.",
  "Good size for your requirements, recently renovated.",
  "Walking distance to Kirchberg, pet-friendly.",
  "New listing with strong features.",
  "Well located in your target commune.",
]

export function mapToB2CFeedItem(listing: AvailableListing, index: number, matchPct?: number): B2CFeedItem {
  const score = mockScore(listing, index)
  return {
    id: listing.id,
    photo: listing.photo,
    address: listing.address,
    location: listing.location,
    price: listing.price,
    beds: listing.rooms,
    sqm: listing.sqm,
    airbnbScore: score,
    daysOnMarket: listing.daysAvailable,
    status: "New",
    aiBreakdown: [
      { label: "Location", score, reasoning: listing.description?.slice(0, 80) ?? "" },
    ],
    matchPct: matchPct ?? Math.round(score * 10) + Math.floor(Math.random() * 5),
    whyFits: WHY_FITS[index % WHY_FITS.length],
  }
}
