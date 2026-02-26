import { NextRequest, NextResponse } from "next/server"
import { getListingsCollection } from "@/lib/mongodb"
import { createClient } from "@/lib/supabase/server"
import { FRESH_LISTINGS_MAX_HOURS } from "@/lib/config"
import { differenceInHours, parseISO } from "date-fns"

// GET /api/listings/fresh
// Returns buy listings from the last N hours, merged with pipeline status from Supabase.
// Query params: max_hours (default: FRESH_LISTINGS_MAX_HOURS env/config)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const maxHours = Number(searchParams.get("max_hours") ?? FRESH_LISTINGS_MAX_HOURS)

    const now = new Date()
    const since = new Date(now.getTime() - maxHours * 60 * 60 * 1000).toISOString()

    const collection = await getListingsCollection()
    const docs = await collection
      .find({
        transaction_type: "buy",
        first_seen: { $gte: since },
      })
      .sort({ first_seen: -1 })
      .limit(500)
      .toArray()

    // Fetch pipeline statuses from Supabase for these listing_refs
    const listingRefs = docs.map((d) => d.listing_ref).filter(Boolean)

    const supabase = await createClient()
    const { data: pipelineRows } = await supabase
      .from("listing_pipeline")
      .select("listing_id, status")
      .in("listing_id", listingRefs)

    const statusMap: Record<string, string> = {}
    for (const row of pipelineRows ?? []) {
      statusMap[row.listing_id] = row.status
    }

    const listings = docs.map((doc) => {
      const firstSeen = doc.first_seen ? parseISO(doc.first_seen) : now
      const hoursOnMarket = differenceInHours(now, firstSeen)
      const rawStatus = statusMap[doc.listing_ref] ?? "new"
      const status = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as
        "New" | "Reviewing" | "Contacted" | "Viewing" | "Passed"

      return {
        id: doc._id.toString(),
        listing_ref: doc.listing_ref ?? doc._id.toString(),
        photo: doc.image_urls?.[0] ?? null,
        address: doc.location ?? "",
        location: doc.location ?? "",
        price: doc.sale_price ?? doc.rent_price ?? 0,
        beds: doc.bedrooms ?? 0,
        sqm: doc.surface_m2 ?? 0,
        airbnbScore: null,
        aiBreakdown: [],
        daysOnMarket: Math.floor(hoursOnMarket / 24),
        status,
        source: doc.source ?? "",
        transaction_type: doc.transaction_type,
        listing_url: doc.listing_url ?? null,
      }
    })

    return NextResponse.json({ listings, maxHours })
  } catch (err) {
    console.error("[/api/listings/fresh]", err)
    return NextResponse.json({ error: "Failed to fetch fresh listings" }, { status: 500 })
  }
}
