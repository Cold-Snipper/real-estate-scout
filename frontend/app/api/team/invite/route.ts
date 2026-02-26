import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "Immo Snippy <noreply@aisthetics.org>"

// POST /api/team/invite
// Body: { email: string }
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    // Verify the caller is authenticated
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Use admin client with service role key
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate the invite link without triggering Supabase's own email
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
    })

    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 })

    const inviteUrl = linkData?.properties?.action_link
    if (!inviteUrl) {
      return NextResponse.json({ error: "Failed to generate invite link" }, { status: 500 })
    }

    // Send via Resend from aisthetics.org
    const { error: emailError } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "You've been invited to Immo Snippy",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="margin-bottom:8px">You're invited!</h2>
          <p style="color:#555;margin-bottom:24px">
            You've been invited to join <strong>Immo Snippy</strong>, a real-estate acquisition dashboard.
            Click the button below to set up your account.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;
                    padding:12px 24px;border-radius:8px;font-weight:600">
            Accept invitation
          </a>
          <p style="color:#999;font-size:12px;margin-top:32px">
            This link expires in 24 hours. If you didn't expect this invite, you can ignore this email.
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error("[/api/team/invite] Resend error:", emailError)
      return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/team/invite POST]", err)
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 })
  }
}
