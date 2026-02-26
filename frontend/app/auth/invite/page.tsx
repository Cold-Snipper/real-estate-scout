"use client"

import { useState, useEffect } from "react"
import { Building2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

// Handles invite-link acceptance.
// The invite API builds a custom URL: /auth/invite?token=XXX&type=invite
// We verify the token directly with supabase.auth.verifyOtp — no Supabase
// redirect-URL allowlist required. The page is public (middleware allows /auth/*).
export default function InvitePage() {
  const [sessionReady, setSessionReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    const type = params.get("type")

    if (token && (type === "invite" || type === "magiclink")) {
      // Token-based flow: verify the OTP directly (no Supabase redirect needed)
      const otpType = type === "magiclink" ? "magiclink" : "invite"
      supabase.auth.verifyOtp({ token_hash: token, type: otpType }).then(({ error: verifyError }) => {
        if (verifyError) {
          console.error("[/auth/invite] verifyOtp error:", verifyError)
          window.location.replace("/login?error=invalid_invite")
        } else {
          setSessionReady(true)
        }
      })
    } else {
      // Fallback: check for an existing session (e.g. hash-based flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSessionReady(true)
        } else {
          window.location.replace("/login?error=invalid_invite")
        }
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const password = formData.get("password") as string

    const res = await fetch("/api/signup/invited", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Failed to complete setup")
      setLoading(false)
      return
    }

    // Full reload so the session cookie is picked up by middleware
    window.location.href = "/"
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verifying invite…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary">
              <Building2 className="size-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Immo Snippy
            </span>
          </div>

          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Set up your account</CardTitle>
              <CardDescription>Enter your name and choose a password to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="flex items-start gap-3 rounded-lg border border-score-orange/30 bg-score-orange/8 px-3.5 py-3">
                    <AlertCircle className="size-4 text-score-orange mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex flex-col gap-2 flex-1">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Jane"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Smith"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Choose a password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "Setting up…" : "Create account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
