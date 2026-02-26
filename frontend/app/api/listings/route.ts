/**
 * Shared listings API — used by both B2B and B2C.
 * Reads from the same data source as Available Listings (lib/available-listings-data).
 * Replace with MongoDB/backend fetch when ready.
 */

import { NextResponse } from "next/server"
import { availableListings } from "@/lib/available-listings-data"

export async function GET() {
  try {
    return NextResponse.json(availableListings)
  } catch (e) {
    console.error("[listings] Error:", e)
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 })
  }
}
