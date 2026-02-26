import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/team
// Returns accepted members and pending invites for the caller's organization.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ members: [], pending: [] })
    }

    const [{ data: profiles }, { data: pendingInvites }] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("organization_id", profile.organization_id),
      adminClient
        .from("team_invites")
        .select("email, created_at")
        .eq("organization_id", profile.organization_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ])

    return NextResponse.json({
      currentUserId: user.id,
      members: profiles ?? [],
      pending: pendingInvites ?? [],
    })
  } catch (err) {
    console.error("[/api/team GET]", err)
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 })
  }
}
