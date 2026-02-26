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

    // Look up inviter's org using adminClient (bypasses RLS) so we can record it in team_invites.
    // Do this before sending the email so we fail early if the org is missing.
    const { data: inviterProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (profileError || !inviterProfile?.organization_id) {
      console.error("[/api/team/invite] inviter profile lookup failed:", profileError?.message)
      return NextResponse.json(
        { error: "Your account is not linked to an organization. Please contact support." },
        { status: 400 }
      )
    }

    // Pre-create the invited user with email_confirm: true.
    // This prevents Supabase from sending a "Confirm signup" email when
    // generateLink creates the user below. The error is ignored if the
    // user already exists (e.g. re-invite after expiry).
    const { error: preCreateError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (preCreateError && !preCreateError.message.toLowerCase().includes("exist")) {
      console.warn("[/api/team/invite] pre-create warning:", preCreateError.message)
    }

    // Generate a magic link for the pre-confirmed user.
    // We use type:"magiclink" because the user was already created above with
    // email_confirm:true; generateLink type:"invite" returns 422 for confirmed users.
    const origin = new URL(request.url).origin
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/auth/invite` },
    })

    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 })

    const actionLink = linkData?.properties?.action_link
    if (!actionLink) {
      return NextResponse.json({ error: "Failed to generate invite link" }, { status: 500 })
    }

    // Extract the one-time token from Supabase's action_link and build our own
    // invite URL. This avoids the Supabase redirect-URL allowlist check entirely:
    // instead of letting Supabase redirect (which falls back to Site URL when the
    // redirectTo isn't allowlisted), we send the user directly to our page with
    // the token as a query param, and verify it there with supabase.auth.verifyOtp.
    let inviteUrl = actionLink
    try {
      const actionUrl = new URL(actionLink)
      const token = actionUrl.searchParams.get("token")
      if (token) {
        inviteUrl = `${origin}/auth/invite?token=${encodeURIComponent(token)}&type=magiclink`
      }
    } catch {
      // Malformed action_link — fall back to the raw Supabase URL
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

    // Record the pending invite so /api/signup/invited can look up the org
    const { error: inviteInsertError } = await adminClient.from("team_invites").insert({
      email,
      organization_id: inviterProfile.organization_id,
      invited_by: user.id,
      status: "pending",
    })
    if (inviteInsertError) {
      console.error("[/api/team/invite] team_invites insert error:", inviteInsertError)
      return NextResponse.json(
        { error: `Invite email sent but failed to record invite: ${inviteInsertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[/api/team/invite POST]", err)
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 })
  }
}
