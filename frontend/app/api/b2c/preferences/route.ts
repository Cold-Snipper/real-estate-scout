import { NextResponse } from "next/server"
import { upsertB2CUser } from "@/lib/b2c-db"

function getUserId(request: Request): string {
  return request.headers.get("x-b2c-user-id") ?? "anonymous"
}

/** Save B2C preferences. Persists to MongoDB when MONGO_URI set. */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body || typeof body.rentOrBuy !== "string") {
      return NextResponse.json({ error: "Invalid preferences" }, { status: 400 })
    }
    const userId = getUserId(request)
    const filters = {
      rentOrBuy: body.rentOrBuy,
      budgetMin: body.budgetMin ?? 500,
      budgetMax: body.budgetMax ?? 2000,
      moveInDate: body.moveInDate,
      bedrooms: body.bedrooms,
      sqmMin: body.sqmMin,
      sqmMax: body.sqmMax,
      parking: !!body.parking,
      balcony: !!body.balcony,
      elevator: !!body.elevator,
      pets: !!body.pets,
      furnished: body.furnished,
      energyClass: body.energyClass,
      energyClassMinC: !!body.energyClassMinC,
      constructionYearMin: body.constructionYearMin,
      maxMonthlyCharges: body.maxMonthlyCharges,
      propertyTypes: body.propertyTypes ?? [],
      communes: body.communes ?? [],
      availabilityDate: body.availabilityDate,
      floorLevel: body.floorLevel,
      outdoorSpace: body.outdoorSpace,
      distanceRadius: body.distanceRadius,
    }
    await upsertB2CUser(userId, { filters })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[b2c/preferences POST]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
