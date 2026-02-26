import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/signup/invited
// Called from /auth/invite after the user has been authenticated via the invite hash token.
// Creates their profile linked to the inviting org, sets their password, and marks the invite accepted.
export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, password } = await request.json()

    if (!firstName || !lastName || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // The user is already authenticated (invite token was processed by getSession() on the client)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const adminClient = createAdminClient()

    // Find the pending invite for this email to get the organization_id.
    // Use maybeSingle() to avoid a 406 when no rows exist (single() throws PGRST116).
    const { data: invite, error: inviteError } = await adminClient
      .from("team_invites")
      .select("id, organization_id")
      .eq("email", user.email)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (inviteError) {
      console.error("[/api/signup/invited] team_invites query error:", inviteError)
      return NextResponse.json({ error: "Failed to look up invite. Has the team_invites migration been run?" }, { status: 500 })
    }

    if (!invite?.organization_id) {
      console.error("[/api/signup/invited] No pending invite found for", user.email)
      return NextResponse.json({ error: "No pending invite found. Please ask your team admin to re-send the invite." }, { status: 400 })
    }

    // Create profile linked to the inviting org
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        organization_id: invite.organization_id,
      })

    if (profileError) {
      console.error("[/api/signup/invited] profile upsert error:", profileError)
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }

    // Set password and store name in user_metadata
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (updateError) {
      console.error("[/api/signup/invited] updateUserById error:", updateError)
      return NextResponse.json({ error: "Failed to set password" }, { status: 500 })
    }

    // Mark invite as accepted
    await adminClient
      .from("team_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/signup/invited POST]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
