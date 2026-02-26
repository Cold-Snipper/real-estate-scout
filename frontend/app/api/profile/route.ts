import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/profile
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(name)")
      .eq("id", user.id)
      .single()

    const orgName = (profile?.organizations as { name?: string } | null)?.name

    return NextResponse.json({
      profile: {
        first_name: profile?.first_name ?? user.user_metadata?.first_name ?? "",
        last_name: profile?.last_name ?? user.user_metadata?.last_name ?? "",
        company: orgName ?? user.user_metadata?.company ?? "",
        email: user.email,
        role: profile?.role ?? "",
      },
    })
  } catch (err) {
    console.error("[/api/profile GET]", err)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PATCH /api/profile
// Body: { first_name?, last_name?, company? }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Always persist to user_metadata (works without any DB table)
    await supabase.auth.updateUser({
      data: {
        first_name: body.first_name,
        last_name: body.last_name,
        company: body.company,
      },
    })

    // Also persist first_name/last_name to profiles table (no company column there)
    await supabase
      .from("profiles")
      .update({
        first_name: body.first_name,
        last_name: body.last_name,
      })
      .eq("id", user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/profile PATCH]", err)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
