import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/settings — fetch user_preferences + acquisition_criteria
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    const [{ data: prefs }, { data: criteria }] = await Promise.all([
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single(),
      profile?.organization_id
        ? supabase
            .from("acquisition_criteria")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .single()
        : Promise.resolve({ data: null }),
    ])

    return NextResponse.json({
      preferences: prefs ?? null,
      criteria: criteria ?? null,
    })
  } catch (err) {
    console.error("[/api/settings GET]", err)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PATCH /api/settings
// Body: { preferences?: Partial<UserPreferences>, criteria?: Partial<AcquisitionCriteria> }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    const updates: Promise<unknown>[] = []

    if (body.preferences) {
      updates.push(
        supabase
          .from("user_preferences")
          .upsert({ ...body.preferences, user_id: user.id, updated_at: new Date().toISOString() })
      )
    }

    if (body.criteria && profile?.organization_id) {
      updates.push(
        supabase
          .from("acquisition_criteria")
          .upsert({
            ...body.criteria,
            organization_id: profile.organization_id,
            updated_at: new Date().toISOString(),
          })
      )
    }

    await Promise.all(updates)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/settings PATCH]", err)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
