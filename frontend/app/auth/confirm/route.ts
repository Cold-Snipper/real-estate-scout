import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { EmailOtpType } from "@supabase/supabase-js"

// Handles Supabase email confirmation links:
// /auth/confirm?token_hash=XXX&type=signup  (default email template)
// /auth/confirm?code=XXX                    (PKCE flow with emailRedirectTo)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("[/auth/confirm] verifyOtp error:", error)
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("[/auth/confirm] exchangeCodeForSession error:", error)
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
