import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { resolveOrgId } from "@/lib/resolve-org"

// POST /api/settings/persona — create a new persona for the caller's org
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const organizationId = await resolveOrgId(user.id, supabase)
    if (!organizationId) {
      return NextResponse.json({ error: "Failed to resolve organization" }, { status: 500 })
    }

    const { data: persona, error } = await supabase
      .from("acquisition_criteria")
      .insert({
        persona_name: body.persona_name || "New persona",
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, persona })
  } catch (err) {
    console.error("[/api/settings/persona POST]", err)
    return NextResponse.json({ error: "Failed to create persona" }, { status: 500 })
  }
}

// DELETE /api/settings/persona?id=<uuid> — delete a persona (must belong to caller's org)
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const organizationId = await resolveOrgId(user.id, supabase)
    if (!organizationId) {
      return NextResponse.json({ error: "Failed to resolve organization" }, { status: 500 })
    }

    await supabase
      .from("acquisition_criteria")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/settings/persona DELETE]", err)
    return NextResponse.json({ error: "Failed to delete persona" }, { status: 500 })
  }
}
