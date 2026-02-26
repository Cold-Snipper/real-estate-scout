/**
 * B2C user API — profile, filters, controls. Persists to MongoDB when MONGO_URI set.
 */

import { NextResponse } from "next/server"
import {
  getB2CUser,
  upsertB2CUser,
  type B2CProfileData,
  type B2CStructuredFilters,
  type B2CControls,
} from "@/lib/b2c-db"

function getUserId(request: Request): string {
  const header = request.headers.get("x-b2c-user-id")
  if (header) return header
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7).slice(0, 64)
  return "anonymous"
}

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const user = await getB2CUser(userId)
    if (!user) return NextResponse.json({ profile: null, filters: null, controls: null })
    return NextResponse.json({
      profile: user.profile,
      filters: user.filters,
      voiceContext: user.voiceContext,
      controls: user.controls,
    })
  } catch (e) {
    console.error("[b2c/user GET]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)
    const body = await request.json()

    const profile = body.profile as Partial<B2CProfileData> | undefined
    const filters = body.filters as Partial<B2CStructuredFilters> | undefined
    const voiceContext = body.voiceContext as string | undefined
    const controls = body.controls as Partial<B2CControls> | undefined

    const update: Parameters<typeof upsertB2CUser>[1] = {}
    if (profile != null) update.profile = profile
    if (filters != null) update.filters = filters
    if (voiceContext !== undefined) update.voiceContext = voiceContext
    if (controls != null) update.controls = controls

    const user = await upsertB2CUser(userId, update)
    return NextResponse.json({
      ok: true,
      profile: user.profile,
      filters: user.filters,
      voiceContext: user.voiceContext,
      controls: user.controls,
    })
  } catch (e) {
    console.error("[b2c/user POST]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
