import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { resolveOrgId } from "@/lib/resolve-org"

// GET /api/settings — fetch user_preferences + acquisition_criteria (all personas for org)
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

    const [{ data: prefs }, { data: criteriaRows }] = await Promise.all([
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
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as unknown[] }),
    ])

    const personas = criteriaRows ?? []

    return NextResponse.json({
      preferences: prefs ?? null,
      criteria: personas[0] ?? null,   // backward-compat: single first row
      personas,                         // full list for PersonalizationTab
    })
  } catch (err) {
    console.error("[/api/settings GET]", err)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PATCH /api/settings
// Body: { preferences?: Partial<UserPreferences>, criteria?: Partial<AcquisitionCriteria> }
// If criteria.id is set, updates that row; otherwise upserts by org (first / backward-compat).
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const ops: PromiseLike<unknown>[] = []

    if (body.preferences) {
      ops.push(
        supabase
          .from("user_preferences")
          .upsert({ ...body.preferences, user_id: user.id, updated_at: new Date().toISOString() })
          .then()
      )
    }

    if (body.criteria) {
      const organizationId = await resolveOrgId(user.id, supabase)
      if (organizationId) {
        const { id: criteriaId, ...criteriaData } = body.criteria as Record<string, unknown>
        const baseData = {
          ...criteriaData,
          organization_id: organizationId,
          updated_at: new Date().toISOString(),
        }
        if (criteriaId) {
          ops.push(
            supabase
              .from("acquisition_criteria")
              .update(baseData)
              .eq("id", criteriaId)
              .eq("organization_id", organizationId)
              .then()
          )
        } else {
          ops.push(
            supabase
              .from("acquisition_criteria")
              .upsert(baseData)
              .then()
          )
        }
      }
    }

    await Promise.all(ops)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/settings PATCH]", err)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
