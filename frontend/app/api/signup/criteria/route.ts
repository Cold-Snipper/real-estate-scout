import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/signup/criteria
// Saves initial acquisition_criteria for a newly-created org.
// Called during signup before email is confirmed, so we use the service role key.
// The organizationId is returned by /api/signup and trusted here.
export async function POST(request: NextRequest) {
  try {
    const { organizationId, criteria } = await request.json()

    if (!organizationId || !criteria || typeof criteria !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from("acquisition_criteria")
      .upsert({
        ...criteria,
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error("[/api/signup/criteria] upsert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/signup/criteria POST]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
