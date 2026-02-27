import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/outreach
// Creates a placeholder CRM contact + property + mock bot conversation for a listing.
// Pipeline status update is handled separately by the caller.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization" }, { status: 400 })
    }

    const orgId = profile.organization_id
    const body = await request.json()
    const { address, location, price, rooms, listing_url } = body

    // Placeholder contact representing the agency
    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .insert({
        organization_id: orgId,
        name: `Agency — ${address ?? "Unknown property"}`,
        email: `bot-${Date.now()}@placeholder.local`,
        phone: "",
        notes: "Auto-created by outreach bot",
      })
      .select()
      .single()

    if (contactError || !contact) {
      console.error("[/api/outreach] contact insert:", contactError)
      return NextResponse.json({ error: "Failed to create contact" }, { status: 500 })
    }

    // Property linked to the contact
    const { data: property, error: propError } = await admin
      .from("properties")
      .insert({
        organization_id: orgId,
        contact_id: contact.id,
        title: address ?? "Untitled property",
        listing_url: listing_url ?? null,
        price: price ? Number(price) : null,
        rooms: rooms ? Number(rooms) : null,
        location: location ?? null,
        address: address ?? null,
        sales_pipeline_stage: "New Lead",
        chatbot_pipeline_stage: "First Message Sent",
      })
      .select()
      .single()

    if (propError || !property) {
      console.error("[/api/outreach] property insert:", propError)
      return NextResponse.json({ error: "Failed to create property" }, { status: 500 })
    }

    // Mock bot message — simulates first outreach step
    await admin
      .from("conversations")
      .insert({
        property_id: property.id,
        channel: "Email",
        sender: "ai",
        message: "Initial outreach sent by bot — awaiting reply from agency.",
        sent_at: new Date().toISOString(),
      })

    return NextResponse.json({ ok: true, contactId: contact.id })
  } catch (err) {
    console.error("[/api/outreach POST]", err)
    return NextResponse.json({ error: "Failed to queue outreach" }, { status: 500 })
  }
}
