"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, Eye, EyeOff, Clock, CheckCircle2, Mail, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

const PROPERTY_TYPES = [
  { value: "urban_apartments", label: "Urban apartments" },
  { value: "family_houses_villas", label: "Family houses & villas" },
  { value: "luxury_unique", label: "Luxury & unique stays" },
  { value: "rural_countryside", label: "Rural & countryside" },
  { value: "studio_small", label: "Studios & small units" },
  { value: "no_preference", label: "No preference" },
]

const PRICING_MODELS = [
  { value: "20_25_percent", label: "20–25% of booking revenue" },
  { value: "15_20_percent", label: "15–20% of booking revenue" },
  { value: "flat_monthly", label: "Flat monthly fee" },
  { value: "hybrid", label: "Hybrid (base + percentage)" },
  { value: "performance_based_min", label: "Performance-based with minimum" },
]

const TONE_STYLES = [
  { value: "professional_trustworthy", label: "Professional & trustworthy" },
  { value: "friendly_approachable", label: "Friendly & approachable" },
  { value: "luxurious_premium", label: "Luxurious & premium" },
  { value: "direct_results", label: "Direct & results-focused" },
  { value: "empathetic_supportive", label: "Empathetic & supportive" },
  { value: "calm_expert", label: "Calm expert" },
]

const TARGET_OWNER_TYPES = [
  { value: "busy_professionals_expat", label: "Busy professionals & expats" },
  { value: "investors_portfolio", label: "Real estate investors & portfolio owners" },
  { value: "retirees_second_home", label: "Retirees & second-home owners" },
  { value: "first_time_hosts", label: "First-time hosts" },
  { value: "inherited_owners", label: "Inherited property owners" },
  { value: "corporate_landlords", label: "Corporate landlords" },
]

const SERVICE_PACKAGES = [
  { value: "full_done_for_you", label: "Full done-for-you management" },
  { value: "cohosting_only", label: "Co-hosting only" },
  { value: "setup_launch_only", label: "Setup & launch only" },
  { value: "revenue_optimization_only", label: "Revenue optimization only" },
  { value: "legal_compliance_specialist", label: "Legal & compliance specialist" },
]

type Step = "signup" | "onboarding" | "done"

export default function SignupPage() {
  const [step, setStep] = useState<Step>("signup")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [orgId, setOrgId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Onboarding fields
  const [criteria, setCriteria] = useState({
    tagline: "",
    target_countries: "",
    ideal_client_profile: "",
    preferred_property_types: "",
    min_property_value: "",
    pricing_model: "",
    tone_style: "",
    calendly_link: "",
    call_length_minutes: "",
    key_phrases: "",
    custom_rules: "",
  })
  // primary_service_package goes into agency_context_ext JSONB
  const [primaryServicePackage, setPrimaryServicePackage] = useState("")

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const emailVal = formData.get("email") as string
    const password = formData.get("password") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const orgName = formData.get("org") as string

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({
      email: emailVal,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id, orgName, firstName, lastName }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Failed to set up your account. Please contact support.")
        setLoading(false)
        return
      }

      const body = await res.json()
      setOrgId(body.organizationId ?? null)
    }

    setEmail(emailVal)
    setLoading(false)
    setStep("onboarding")
  }

  const handleOnboarding = async (skip: boolean) => {
    if (!skip && orgId) {
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(criteria)) {
        if (v !== "") {
          payload[k] = k === "min_property_value" || k === "call_length_minutes" ? Number(v) : v
        }
      }
      if (primaryServicePackage) {
        payload.agency_context_ext = { primary_service_package: primaryServicePackage }
      }
      if (Object.keys(payload).length > 0) {
        // Save via admin route (user not confirmed yet, pass orgId directly)
        await fetch("/api/signup/criteria", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: orgId, criteria: payload }),
        }).catch(console.error)
      }
    }
    setStep("done")
  }

  const cf = (key: keyof typeof criteria) => ({
    value: criteria[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCriteria((prev) => ({ ...prev, [key]: e.target.value })),
  })

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-6">
            <Logo />
            <Card className="w-full">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex items-center justify-center size-14 rounded-full bg-primary/10">
                    <Clock className="size-7 text-primary" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-lg font-semibold text-foreground">Account pending approval</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your request has been submitted. An administrator will review and approve your account.
                    </p>
                  </div>
                  <div className="w-full rounded-lg bg-secondary/70 p-4 mt-1">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="size-4 text-score-green mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground text-left">Account created successfully</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground text-left">
                          Confirmation sent to <span className="font-medium text-foreground">{email}</span>
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="size-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground text-left">Awaiting admin approval</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {"You'll receive an email once your account is approved."}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Onboarding screen ────────────────────────────────────────────────────────
  if (step === "onboarding") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="flex flex-col items-center gap-6">
            <Logo />
            <Card className="w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Set up your bot</CardTitle>
                <CardDescription>
                  Help the AI grade listings for your strategy. You can update this anytime in Settings → Bot Setup.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-5">
                  {/* Step 1 — Company basics */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ob-tagline">Your value proposition</Label>
                      <Input id="ob-tagline" placeholder="e.g. Full done-for-you STR management in Luxembourg" {...cf("tagline")} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ob-countries">Target countries</Label>
                      <Input id="ob-countries" placeholder="e.g. Luxembourg, Belgium, France" {...cf("target_countries")} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Step 2 — Strategy */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ob-tone">Communication tone</Label>
                      <select
                        id="ob-tone"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...cf("tone_style")}
                      >
                        <option value="">Select tone</option>
                        {TONE_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ob-owner">Ideal owner type</Label>
                      <select
                        id="ob-owner"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...cf("ideal_client_profile")}
                      >
                        <option value="">Any type</option>
                        {TARGET_OWNER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ob-type">Preferred property type</Label>
                      <select
                        id="ob-type"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...cf("preferred_property_types")}
                      >
                        <option value="">Any type</option>
                        {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="ob-pricing">Pricing model</Label>
                      <select
                        id="ob-pricing"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...cf("pricing_model")}
                      >
                        <option value="">Select model</option>
                        {PRICING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ob-package">Primary service package</Label>
                    <select
                      id="ob-package"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={primaryServicePackage}
                      onChange={(e) => setPrimaryServicePackage(e.target.value)}
                    >
                      <option value="">Select package</option>
                      {SERVICE_PACKAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <div className="border-t border-border" />

                  {/* Step 3 — Links & notes */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ob-calendly">Booking link (Calendly etc.)</Label>
                    <Input id="ob-calendly" type="url" placeholder="https://calendly.com/your-link" {...cf("calendly_link")} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ob-rules">Custom AI rules <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <textarea
                      id="ob-rules"
                      rows={3}
                      placeholder={"Always mention the revenue guarantee.\nNever discuss competitor pricing."}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      {...cf("custom_rules")}
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => handleOnboarding(true)}>
                      Skip for now
                    </Button>
                    <Button className="flex-1 gap-1.5" onClick={() => handleOnboarding(false)}>
                      Save & continue
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ── Signup screen ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          <Logo />
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Create your account</CardTitle>
              <CardDescription>Get started with your acquisition dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org">Organization name</Label>
                  <Input id="org" name="org" type="text" placeholder="Acme Acquisitions" required autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" name="firstName" type="text" placeholder="Julia" required autoComplete="given-name" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" name="lastName" type="text" placeholder="Reyes" required autoComplete="family-name" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      required
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
                  <p className="text-[11px] text-muted-foreground">
                    Must be at least 8 characters with one uppercase and one number
                  </p>
                </div>
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center justify-center size-10 rounded-xl bg-primary">
        <Building2 className="size-5 text-primary-foreground" />
      </div>
      <span className="text-lg font-bold tracking-tight text-foreground">Immo Snippy</span>
    </div>
  )
}
