import { NextRequest, NextResponse } from "next/server"
import { getListingsCollection } from "@/lib/mongodb"
import { AVAILABLE_LISTINGS_MIN_HOURS } from "@/lib/config"
import { differenceInDays, parseISO } from "date-fns"

// GET /api/listings
// Returns buy listings older than min_hours (defaults to AVAILABLE_LISTINGS_MIN_HOURS).
// Query params: location, min_price, max_price, min_sqm, max_sqm,
//               min_rooms, source, min_year, max_year, max_days,
//               min_hours (override for available cutoff),
//               limit (default 25), offset (default 0)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const minHours = Number(searchParams.get("min_hours") ?? AVAILABLE_LISTINGS_MIN_HOURS)

    // Age cutoff: only listings older than the configured threshold
    const minAgeCutoff = new Date(
      Date.now() - minHours * 60 * 60 * 1000
    ).toISOString()

    const filter: Record<string, unknown> = {
      transaction_type: "buy",
      first_seen: { $lte: minAgeCutoff },
    }

    const location = searchParams.get("location")
    if (location) filter.location = { $regex: location, $options: "i" }

    const source = searchParams.get("source")
    if (source) filter.source = source

    const min_price = searchParams.get("min_price")
    const max_price = searchParams.get("max_price")
    if (min_price || max_price) {
      filter.sale_price = {
        ...(min_price ? { $gte: Number(min_price) } : {}),
        ...(max_price ? { $lte: Number(max_price) } : {}),
      }
    }

    const min_sqm = searchParams.get("min_sqm")
    const max_sqm = searchParams.get("max_sqm")
    if (min_sqm || max_sqm) {
      filter.surface_m2 = {
        ...(min_sqm ? { $gte: Number(min_sqm) } : {}),
        ...(max_sqm ? { $lte: Number(max_sqm) } : {}),
      }
    }

    const min_rooms = searchParams.get("min_rooms")
    if (min_rooms) filter.rooms = { $gte: Number(min_rooms) }

    const min_year = searchParams.get("min_year")
    const max_year = searchParams.get("max_year")
    if (min_year || max_year) {
      filter.year_of_construction = {
        ...(min_year ? { $gte: Number(min_year) } : {}),
        ...(max_year ? { $lte: Number(max_year) } : {}),
      }
    }

    // max_days: exclude listings on the market for more than N days
    const max_days = searchParams.get("max_days")
    if (max_days) {
      const oldest = new Date(Date.now() - Number(max_days) * 24 * 60 * 60 * 1000).toISOString()
      filter.first_seen = {
        ...(filter.first_seen as object),
        $gte: oldest,
      }
    }

    const limit = Math.min(Number(searchParams.get("limit") ?? 25), 200)
    const offset = Number(searchParams.get("offset") ?? 0)

    const collection = await getListingsCollection()

    // Fetch page + total count in parallel
    const [docs, total] = await Promise.all([
      collection.find(filter).sort({ first_seen: -1 }).skip(offset).limit(limit).toArray(),
      collection.countDocuments(filter),
    ])

    const today = new Date()

    const listings = docs.map((doc) => {
      const firstSeen = doc.first_seen ? parseISO(doc.first_seen) : today
      const daysAvailable = differenceInDays(today, firstSeen)

      const features: string[] = []
      if (doc.elevator) features.push("Elevator")
      if (doc.balcony) features.push("Balcony")
      if (doc.garden) features.push("Garden")
      if (doc.parking_spaces) features.push("Parking")
      if (doc.furnished) features.push("Furnished")
      if (doc.fitted_kitchen) features.push("Fitted kitchen")
      if (doc.terrace_m2) features.push("Terrace")
      if (doc.energy_class) features.push(`Energy ${doc.energy_class}`)

      return {
        id: doc._id.toString(),
        photo: doc.image_urls?.[0] ?? null,
        title: doc.title ?? "",
        address: doc.location ?? "",
        location: doc.location ?? "",
        price: doc.sale_price ?? doc.rent_price ?? 0,
        rooms: doc.rooms ?? doc.bedrooms ?? 0,
        sqm: doc.surface_m2 ?? 0,
        buildingYear: doc.year_of_construction ?? null,
        source: doc.source ?? "",
        daysAvailable,
        description: doc.description ?? "",
        features,
        listing_url: doc.listing_url ?? null,
        listing_ref: doc.listing_ref ?? null,
        transaction_type: doc.transaction_type,
        bedrooms: doc.bedrooms ?? null,
        bathrooms: doc.bathrooms ?? null,
      }
    })

    return NextResponse.json({ listings, total, offset, limit })
  } catch (err) {
    console.error("[/api/listings]", err)
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 })
  }
}
