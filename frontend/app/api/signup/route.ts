import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/signup
// Called immediately after supabase.auth.signUp on the client.
// Creates the organization and links the profile — done server-side so we
// can use the service-role key and bypass RLS (the user has no session yet
// while email confirmation is pending).
export async function POST(request: NextRequest) {
  try {
    const { userId, orgName, firstName, lastName } = await request.json()

    if (!userId || !orgName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: orgName.trim() })
      .select("id")
      .single()

    if (orgError) {
      console.error("[/api/signup] org insert error:", orgError)
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
    }

    // 2. Upsert profile with organization_id
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        first_name: firstName ?? "",
        last_name: lastName ?? "",
        organization_id: org.id,
      })

    if (profileError) {
      console.error("[/api/signup] profile upsert error:", profileError)
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, organizationId: org.id })
  } catch (err) {
    console.error("[/api/signup]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
