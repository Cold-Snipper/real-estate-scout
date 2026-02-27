import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/crm — fetch contacts with their properties and conversations
export async function GET() {
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
      return NextResponse.json({ owners: [] })
    }

    const orgId = profile.organization_id

    // Fetch contacts
    const { data: contacts, error: contactsError } = await admin
      .from("contacts")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    if (contactsError) throw contactsError

    // Fetch properties for all contacts
    const { data: properties, error: propsError } = await admin
      .from("properties")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })

    if (propsError) throw propsError

    // Fetch conversations for all properties
    const propertyIds = (properties ?? []).map((p) => p.id)
    let conversations: unknown[] = []
    if (propertyIds.length > 0) {
      const { data: convData } = await admin
        .from("conversations")
        .select("*")
        .in("property_id", propertyIds)
        .order("sent_at", { ascending: true })
      conversations = convData ?? []
    }

    // Group properties by contact_id
    const propsByContact: Record<string, unknown[]> = {}
    for (const prop of properties ?? []) {
      const cid = prop.contact_id ?? "__no_contact__"
      if (!propsByContact[cid]) propsByContact[cid] = []
      propsByContact[cid].push({
        ...prop,
        conversations: (conversations as Array<{ property_id: string }>).filter(
          (cv) => cv.property_id === prop.id
        ),
      })
    }

    // Map to frontend CrmOwner shape
    const owners = (contacts ?? []).map((contact) => ({
      id: contact.id,
      owner_name: contact.name,
      owner_email: contact.email ?? "",
      owner_phone: contact.phone ?? "",
      owner_notes: contact.notes ?? "",
      last_contact_date: contact.last_contact_at
        ? new Date(contact.last_contact_at).getTime()
        : null,
      properties: (propsByContact[contact.id] ?? []).map((p: unknown) => {
        const prop = p as Record<string, unknown>
        return {
          ...prop,
          last_contact_date: prop.last_contact_at
            ? new Date(prop.last_contact_at as string).getTime()
            : null,
          conversations: ((prop.conversations as Array<Record<string, unknown>>) ?? []).map(
            (cv) => ({
              id: cv.id,
              channel: cv.channel,
              sender: cv.sender,
              message_text: cv.message,
              timestamp: new Date(cv.sent_at as string).getTime(),
            })
          ),
        }
      }),
    }))

    return NextResponse.json({ owners })
  } catch (err) {
    console.error("[/api/crm GET]", err)
    return NextResponse.json({ error: "Failed to fetch CRM data" }, { status: 500 })
  }
}

// POST /api/crm — create a contact (and optionally a first property)
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
    const { name, email, phone, notes, property } = body

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    // Create contact
    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .insert({ organization_id: orgId, name: name ?? "", email, phone: phone ?? "", notes: notes ?? "" })
      .select()
      .single()

    if (contactError) {
      console.error("[/api/crm POST] contact insert:", contactError)
      return NextResponse.json({ error: "Failed to create contact" }, { status: 500 })
    }

    // Optionally create first property
    let properties: unknown[] = []
    if (property?.listing_url || property?.price || property?.location) {
      const { data: prop, error: propError } = await admin
        .from("properties")
        .insert({
          organization_id: orgId,
          contact_id: contact.id,
          title: property.address ?? property.location ?? "Untitled property",
          listing_url: property.listing_url ?? null,
          price: property.price ? Number(property.price) : null,
          rooms: property.rooms ? Number(property.rooms) : null,
          location: property.location ?? null,
          address: property.address ?? null,
        })
        .select()
        .single()

      if (!propError && prop) {
        properties = [{ ...prop, conversations: [], last_contact_date: null }]
      }
    }

    const owner = {
      id: contact.id,
      owner_name: contact.name,
      owner_email: contact.email,
      owner_phone: contact.phone ?? "",
      owner_notes: contact.notes ?? "",
      last_contact_date: null,
      properties,
    }

    return NextResponse.json({ owner })
  } catch (err) {
    console.error("[/api/crm POST]", err)
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 })
  }
}
