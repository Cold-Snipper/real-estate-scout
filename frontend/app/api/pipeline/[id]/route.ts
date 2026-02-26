import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PATCH /api/pipeline/[id]
// id = listing_ref (MongoDB listing reference)
// Body: { status: "new" | "reviewing" | "contacted" | "viewing" | "passed" | "acquired" }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get user's organization_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization" }, { status: 400 })
    }

    // Upsert pipeline status
    const { error } = await supabase
      .from("listing_pipeline")
      .upsert(
        {
          organization_id: profile.organization_id,
          listing_id: id,
          status: status.toLowerCase(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,listing_id" }
      )

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/pipeline/[id]]", err)
    return NextResponse.json({ error: "Failed to update pipeline status" }, { status: 500 })
  }
}
