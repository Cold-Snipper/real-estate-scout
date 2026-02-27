"use client"

import { useState, useEffect, useCallback } from "react"
import { Camera, Shield, Users, Bell, SlidersHorizontal, CheckCircle2, AlertCircle, Clock, Bot, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const TABS = ["Profile", "Preferences", "Scoring", "Notifications", "Team", "Personalization"] as const
type Tab = (typeof TABS)[number]

const TAB_ICONS: Record<Tab, React.ElementType> = {
  Profile: Shield,
  Preferences: Clock,
  Scoring: SlidersHorizontal,
  Notifications: Bell,
  Team: Users,
  Personalization: Bot,
}

const TAB_TOOLTIPS: Partial<Record<Tab, string>> = {
  Personalization: "Configure your company profile and strategy so the AI can grade listings and generate outreach tailored to your business.",
}


function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1 mb-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function ProfileTab() {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    role: "",
  })
  const [saving, setSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile({
            firstName: data.profile.first_name ?? "",
            lastName: data.profile.last_name ?? "",
            email: data.profile.email ?? "",
            company: data.profile.company ?? "",
            role: data.profile.role ?? "",
          })
        }
      })
      .catch(console.error)
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    setProfileSaved(false)
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: profile.firstName,
        last_name: profile.lastName,
        company: profile.company,
      }),
    }).catch(console.error)
    setSaving(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const updatePassword = async () => {
    if (!newPassword) return
    setPasswordSaving(true)
    setPasswordError(null)
    setPasswordSaved(false)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSaved(true)
      setNewPassword("")
      setTimeout(() => setPasswordSaved(false), 3000)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Personal Information" description="Manage your profile details.">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="size-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  {`${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 flex items-center justify-center size-6 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Camera className="size-3" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{profile.firstName} {profile.lastName}</span>
              <span className="text-xs text-muted-foreground">{profile.email}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="opacity-60 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {profileSaved && (
              <span className="flex items-center gap-1.5 text-xs text-score-green">
                <CheckCircle2 className="size-3.5" />
                Saved
              </span>
            )}
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Security" description="Manage your password and security settings.">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null) }}
            />
          </div>
          {passwordError && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              {passwordError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            {passwordSaved && (
              <span className="flex items-center gap-1.5 text-xs text-score-green">
                <CheckCircle2 className="size-3.5" />
                Password updated
              </span>
            )}
            <Button variant="outline" onClick={updatePassword} disabled={passwordSaving || !newPassword}>
              {passwordSaving ? "Updating..." : "Update password"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function PreferencesTab() {
  const [freshMaxHours, setFreshMaxHours] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences?.fresh_max_hours) {
          setFreshMaxHours(String(data.preferences.fresh_max_hours))
        }
      })
      .catch(console.error)
  }, [])

  const save = async () => {
    const hours = Number(freshMaxHours)
    if (!hours || hours <= 0) {
      setError("Must be a positive number.")
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { fresh_max_hours: hours } }),
    })
    setSaving(false)
    if (!res.ok) {
      setError("Failed to save. Please try again.")
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const hours = Number(freshMaxHours)
  const label = hours >= 48 ? `${(hours / 24).toFixed(hours % 24 === 0 ? 0 : 1)} days` : `${hours} hours`

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Freshness Cutoff"
        description="Listings newer than this appear on Fresh Listings. Everything older goes to Available Listings."
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="freshMaxHours">A listing is &ldquo;fresh&rdquo; if it was scraped within the last</Label>
            <div className="flex items-center gap-2">
              <Input
                id="freshMaxHours"
                type="number"
                min={1}
                className="w-32"
                value={freshMaxHours}
                onChange={(e) => { setFreshMaxHours(e.target.value); setError(null) }}
              />
              <span className="text-sm text-muted-foreground">hours{hours >= 48 ? ` (≈ ${label})` : ""}</span>
            </div>
            {hours > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Fresh Listings</strong> → scraped in the last {label} &nbsp;·&nbsp;
                <strong>Available Listings</strong> → older than {label}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3.5" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-score-green">
                <CheckCircle2 className="size-3.5" />
                Saved — reload the page to apply
              </span>
            )}
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function ScoringTab() {
  const [minScore, setMinScore] = useState(6)
  const [autoPass, setAutoPass] = useState(true)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) {
          setMinScore((data.preferences.min_score ?? 60) / 10)
          setAutoPass(data.preferences.auto_pass_below != null)
        }
      })
      .catch(console.error)
  }, [])

  const save = useCallback(() => {
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: {
          min_score: Math.round(minScore * 10),
          auto_pass_below: autoPass ? 40 : null,
        },
      }),
    }).catch(console.error)
  }, [minScore, autoPass])

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Score Thresholds" description="Set minimum scores for listing qualification and alerts.">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Minimum Airbnb Score for alerts</Label>
              <span className="text-sm font-semibold text-foreground tabular-nums">{minScore.toFixed(1)}</span>
            </div>
            <Slider
              min={0}
              max={10}
              step={0.5}
              value={[minScore]}
              onValueChange={([val]) => setMinScore(val)}
              onValueCommit={save}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>0 (All listings)</span>
              <span>10 (Perfect only)</span>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label>Auto-pass low-scoring listings</Label>
                <span className="text-xs text-muted-foreground">Automatically set status to "Passed" for listings scoring below 4.0</span>
              </div>
              <Switch checked={autoPass} onCheckedChange={(v) => { setAutoPass(v); save() }} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label>Prioritize high-demand locations</Label>
                <span className="text-xs text-muted-foreground">Boost score weight for Location Demand dimension by 20%</span>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    notify_high_score: true,
    notify_daily_digest: true,
    notify_status_change: false,
    notify_price_drops: true,
    notify_new_in_target: false,
  })

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) {
          setPrefs({
            notify_high_score: data.preferences.notify_high_score ?? true,
            notify_daily_digest: data.preferences.notify_daily_digest ?? true,
            notify_status_change: data.preferences.notify_status_change ?? false,
            notify_price_drops: data.preferences.notify_price_drops ?? true,
            notify_new_in_target: data.preferences.notify_new_in_target ?? false,
          })
        }
      })
      .catch(console.error)
  }, [])

  const savePrefs = (updated: typeof prefs) => {
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: updated }),
    }).catch(console.error)
  }

  const toggle = (key: keyof typeof prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] }
    setPrefs(updated)
    savePrefs(updated)
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Email Notifications" description="Configure which events trigger email alerts.">
        <div className="flex flex-col gap-4">
          {[
            { label: "New high-score listings", description: "Get notified when a listing with score 75+ is added", key: "notify_high_score" as const },
            { label: "Daily pipeline summary", description: "Receive a daily digest of pipeline changes at 9:00 AM", key: "notify_daily_digest" as const },
            { label: "Status changes", description: "Get notified when a team member changes listing status", key: "notify_status_change" as const },
            { label: "Price drops", description: "Alert when a tracked listing has a price reduction", key: "notify_price_drops" as const },
            { label: "New listings in target markets", description: "Immediate alert for any new listing in your target locations", key: "notify_new_in_target" as const },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
              <Switch checked={prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="In-App Notifications" description="Control what appears in your notification feed.">
        <div className="flex flex-col gap-4">
          {[
            { label: "Pipeline activity", description: "Show activity when listings move between stages", defaultChecked: true },
            { label: "Team mentions", description: "Get notified when someone mentions you in a note", defaultChecked: true },
            { label: "System updates", description: "Announcements about new features and changes", defaultChecked: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
              <Switch defaultChecked={item.defaultChecked} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

type TeamMember = { id: string; first_name: string; last_name: string }
type PendingInvite = { email: string; created_at: string }

function TeamTab() {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pending, setPending] = useState<PendingInvite[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadTeam = () => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => {
        if (data.members) setMembers(data.members)
        if (data.pending) setPending(data.pending)
        if (data.currentUserId) setCurrentUserId(data.currentUserId)
      })
      .catch(console.error)
  }

  useEffect(() => { loadTeam() }, [])

  const sendInvite = async () => {
    if (!inviteEmail) return
    setInviting(true)
    setInviteError(null)
    setInviteSent(false)

    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    })
    const data = await res.json()
    setInviting(false)

    if (!res.ok) {
      setInviteError(data.error ?? "Failed to send invite")
    } else {
      setInviteSent(true)
      setInviteEmail("")
      setTimeout(() => setInviteSent(false), 4000)
      loadTeam()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Team Members" description="Manage who has access to your Immo Snippy workspace.">
        <div className="flex flex-col gap-4">
          {/* Member list */}
          {(members.length > 0 || pending.length > 0) && (
            <div className="flex flex-col gap-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-1.5">
                  <div className="flex items-center justify-center size-7 rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                    {(m.first_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground">
                    {m.first_name} {m.last_name}
                    {m.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                    )}
                  </span>
                </div>
              ))}
              {pending.map((p) => (
                <div key={p.email} className="flex items-center gap-3 py-1.5">
                  <div className="flex items-center justify-center size-7 rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                    ?
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {p.email}
                    <span className="ml-1.5 text-xs">— invite pending</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Invite form */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-foreground">Invite team member</span>
            <div className="flex gap-3">
              <Input
                placeholder="colleague@company.com"
                type="email"
                className="flex-1"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null) }}
                onKeyDown={(e) => e.key === "Enter" && sendInvite()}
              />
              <Button onClick={sendInvite} disabled={inviting || !inviteEmail}>
                {inviting ? "Sending…" : "Send invite"}
              </Button>
            </div>
            {inviteError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" />
                {inviteError}
              </div>
            )}
            {inviteSent && (
              <div className="flex items-center gap-1.5 text-xs text-score-green">
                <CheckCircle2 className="size-3.5" />
                Invite sent successfully
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Personalization ───────────────────────────────────────────────────────────

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

const OFFER_STRUCTURES = [
  { value: "percentage_revenue", label: "Percentage of revenue" },
  { value: "flat_monthly", label: "Flat monthly fee per property" },
  { value: "hybrid", label: "Hybrid (base fee + percentage)" },
  { value: "performance_based", label: "Performance-based" },
  { value: "tiered_value", label: "Tiered pricing" },
]

const CALL_ASK_STYLES = [
  { value: "very_direct", label: "Very direct — \"Let's book a call now\"" },
  { value: "gentle_qualification", label: "Gentle qualification first" },
  { value: "value_first_soft_ask", label: "Value-first, then soft ask" },
  { value: "calendly_immediately", label: "Always offer Calendly link immediately" },
]

const WHEN_OFFER_CALL = [
  { value: "after_first_reply", label: "After first reply" },
  { value: "after_audit", label: "After sending audit report" },
  { value: "strong_interest", label: "Only after strong interest shown" },
  { value: "never_auto", label: "Never automatically" },
]

const ONBOARDING_FEES = [
  { value: "yes_fixed", label: "Yes, fixed amount" },
  { value: "yes_percentage_first", label: "Yes, percentage of first month" },
  { value: "no_waived", label: "No, waived for good properties" },
  { value: "case_by_case", label: "Case by case" },
]

type AgencyExt = {
  primary_service_package: string
  offer_structure: string
  call_ask_style: string
  when_offer_call: string
  onboarding_fee: string
  long_description: string
  main_office: string
  properties_managed: string
  pain_points: string
  results_highlight: string
  call_phrasing: string
  countries_special_rules: string
  strict_rules: string
  revenue_guarantee: boolean
  photography_included: boolean
  legal_compliance_handled: boolean
  furnished_setup_addon: boolean
  social_proof_first: boolean
  enlarge_pie: boolean
  risk_reversal_early: boolean
  warm_language_cold: boolean
  mention_fee_early: boolean
  emphasize_pie_early: boolean
  first_month_discount: boolean
  mention_guarantee_always: boolean
  eu_compliance_highlight: boolean
  try_risk_free_framing: boolean
  local_presence_24_7: boolean
  avoid_competitors: boolean
}

const DEFAULT_AGENCY_EXT: AgencyExt = {
  primary_service_package: "",
  offer_structure: "",
  call_ask_style: "",
  when_offer_call: "",
  onboarding_fee: "",
  long_description: "",
  main_office: "",
  properties_managed: "",
  pain_points: "",
  results_highlight: "",
  call_phrasing: "",
  countries_special_rules: "",
  strict_rules: "",
  revenue_guarantee: false,
  photography_included: false,
  legal_compliance_handled: false,
  furnished_setup_addon: false,
  social_proof_first: false,
  enlarge_pie: false,
  risk_reversal_early: false,
  warm_language_cold: false,
  mention_fee_early: false,
  emphasize_pie_early: false,
  first_month_discount: false,
  mention_guarantee_always: false,
  eu_compliance_highlight: false,
  try_risk_free_framing: false,
  local_presence_24_7: false,
  avoid_competitors: false,
}

const MESSAGING_TOGGLES: Array<{ key: keyof AgencyExt; label: string; description: string }> = [
  { key: "revenue_guarantee", label: "Revenue guarantee", description: "Offer a revenue guarantee to owners" },
  { key: "mention_guarantee_always", label: "Always mention guarantee", description: "Reference guarantee in every message" },
  { key: "photography_included", label: "Photography included", description: "Photography & listing optimization as standard" },
  { key: "legal_compliance_handled", label: "Handle legal compliance", description: "Handle all legal registration & compliance" },
  { key: "furnished_setup_addon", label: "Furnished setup add-on", description: "Property furnished setup as a paid add-on" },
  { key: "social_proof_first", label: "Lead with social proof", description: "Always mention social proof in first messages" },
  { key: "risk_reversal_early", label: "Risk reversal early", description: "Emphasize guarantees and risk reversal early" },
  { key: "enlarge_pie", label: "Enlarge the pie", description: "Focus on growing total revenue (not just the %) " },
  { key: "warm_language_cold", label: "Warm language in cold messages", description: "Use warm personal language in cold outreach" },
  { key: "mention_fee_early", label: "Mention fees early", description: "Mention fee structure early in conversations" },
  { key: "emphasize_pie_early", label: "Emphasize net revenue", description: "Emphasize owner keeps 75–80% of a much larger pie" },
  { key: "first_month_discount", label: "First month discount", description: "Offer reduced first-month fee as a closing tool" },
  { key: "eu_compliance_highlight", label: "Highlight EU compliance", description: "Highlight EU compliance and legal protection" },
  { key: "try_risk_free_framing", label: "Risk-free framing", description: "Offer 'try risk-free' framing in messages" },
  { key: "local_presence_24_7", label: "Local presence & 24/7", description: "Mention local presence and 24/7 support" },
  { key: "avoid_competitors", label: "Never mention competitors", description: "Strictly avoid mentioning competitor names" },
]

function PersonalizationTab() {
  const [criteria, setCriteria] = useState({
    tagline: "",
    target_countries: "",
    website_url: "",
    services: "",
    usps: "",
    ideal_client_profile: "",
    preferred_property_types: "",
    min_property_value: "",
    pricing_model: "",
    tone_style: "",
    key_phrases: "",
    languages: "",
    calendly_link: "",
    call_length_minutes: "",
    qualification_rules: "",
    custom_rules: "",
    additional_notes: "",
  })
  const [agencyExt, setAgencyExt] = useState<AgencyExt>(DEFAULT_AGENCY_EXT)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.criteria) {
          const c = data.criteria
          setCriteria({
            tagline: c.tagline ?? "",
            target_countries: c.target_countries ?? "",
            website_url: c.website_url ?? "",
            services: c.services ?? "",
            usps: c.usps ?? "",
            ideal_client_profile: c.ideal_client_profile ?? "",
            preferred_property_types: c.preferred_property_types ?? "",
            min_property_value: c.min_property_value ?? "",
            pricing_model: c.pricing_model ?? "",
            tone_style: c.tone_style ?? "",
            key_phrases: c.key_phrases ?? "",
            languages: c.languages ?? "",
            calendly_link: c.calendly_link ?? "",
            call_length_minutes: c.call_length_minutes ?? "",
            qualification_rules: c.qualification_rules ?? "",
            custom_rules: c.custom_rules ?? "",
            additional_notes: c.additional_notes ?? "",
          })
          if (c.agency_context_ext && typeof c.agency_context_ext === "object") {
            setAgencyExt((prev) => ({ ...prev, ...c.agency_context_ext }))
          }
        }
      })
      .catch(console.error)
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    const payload: Record<string, unknown> = { ...criteria }
    if (criteria.min_property_value !== "") payload.min_property_value = Number(criteria.min_property_value)
    if (criteria.call_length_minutes !== "") payload.call_length_minutes = Number(criteria.call_length_minutes)
    payload.agency_context_ext = agencyExt
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria: payload }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? "Failed to save")
    }
  }

  const f = (key: keyof typeof criteria) => ({
    value: criteria[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCriteria((prev) => ({ ...prev, [key]: e.target.value })),
  })

  const ef = (key: keyof AgencyExt) => ({
    value: agencyExt[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setAgencyExt((prev) => ({ ...prev, [key]: e.target.value })),
  })

  const sel = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  const ta = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"

  return (
    <div className="flex flex-col gap-6">

      {/* Step 1 — Company basics */}
      <SectionCard title="Company basics" description="Your identity as an operator.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" placeholder="e.g. Full done-for-you STR management in Luxembourg" {...f("tagline")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="website_url">Website URL</Label>
              <Input id="website_url" type="url" placeholder="https://yourcompany.com" {...f("website_url")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target_countries">Countries</Label>
              <Input id="target_countries" placeholder="LU, FR, BE" {...f("target_countries")} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Step 2 — 5 dropdowns */}
      <SectionCard title="Strategy" description="Five settings that shape how the AI positions your offer.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tone_style">Tone / communication style</Label>
            <select id="tone_style" className={sel} {...f("tone_style")}>
              <option value="">Select…</option>
              {TONE_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ideal_client_profile">Target owner type (ideal client)</Label>
            <select id="ideal_client_profile" className={sel} {...f("ideal_client_profile")}>
              <option value="">Select…</option>
              {TARGET_OWNER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferred_property_types">Preferred property type</Label>
            <select id="preferred_property_types" className={sel} {...f("preferred_property_types")}>
              <option value="">Select…</option>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pricing_model">Pricing model</Label>
            <select id="pricing_model" className={sel} {...f("pricing_model")}>
              <option value="">Select…</option>
              {PRICING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="primary_service_package">Primary service package</Label>
            <select id="primary_service_package" className={sel} {...ef("primary_service_package")}>
              <option value="">Select…</option>
              {SERVICE_PACKAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Step 3 — Links & notes */}
      <SectionCard title="Links & notes" description="Booking link and guidelines for the AI.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendly_link">Calendly link</Label>
            <Input id="calendly_link" type="url" placeholder="https://calendly.com/your-link" {...f("calendly_link")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qualification_rules">Qualification rules</Label>
            <textarea
              id="qualification_rules"
              rows={3}
              placeholder="e.g. Always offer a 15-min call first"
              className={ta}
              {...f("qualification_rules")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="additional_notes">Notes</Label>
            <textarea
              id="additional_notes"
              rows={3}
              placeholder="Any extra context for the AI…"
              className={ta}
              {...f("additional_notes")}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            {error && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {error}
              </span>
            )}
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-score-green">
                <CheckCircle2 className="size-3.5" />
                Saved
              </span>
            )}
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </SectionCard>

    </div>
  )
}

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("Profile")

  return (
    <>
      <header className="flex items-center border-b border-border bg-card px-8 py-5 shrink-0">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Tab sidebar */}
        <nav className="w-52 shrink-0 border-r border-border bg-card px-3 py-5 flex flex-col gap-1">
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab]
            const tooltip = TAB_TOOLTIPS[tab]
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full",
                  activeTab === tab
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{tab}</span>
                {tooltip && (
                  <span
                    className="relative group/tip shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="size-3.5 opacity-40 group-hover/tip:opacity-100 transition-opacity" />
                    <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 z-50 w-56 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md opacity-0 group-hover/tip:opacity-100 transition-opacity">
                      {tooltip}
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-2xl px-8 py-6">
            {activeTab === "Profile" && <ProfileTab />}
            {activeTab === "Preferences" && <PreferencesTab />}
            {activeTab === "Scoring" && <ScoringTab />}
            {activeTab === "Notifications" && <NotificationsTab />}
            {activeTab === "Team" && <TeamTab />}
            {activeTab === "Personalization" && <PersonalizationTab />}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
