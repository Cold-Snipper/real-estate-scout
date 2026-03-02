"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Camera, Shield, Users, Bell, SlidersHorizontal, CheckCircle2, AlertCircle, Clock, Bot, HelpCircle, ChevronUp, ChevronDown, X, Plus, Trash2, Check, Upload, FilePlus, Building2, ListChecks, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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


function SectionCard({ title, description, icon: Icon, children }: { title: string; description?: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
        <div className="flex flex-col gap-0.5 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
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

const COUNTRIES = [
  { code: "LU", label: "Luxembourg" },
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgium" },
  { code: "DE", label: "Germany" },
  { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "NL", label: "Netherlands" },
  { code: "GR", label: "Greece" },
  { code: "UK", label: "United Kingdom" },
  { code: "Other", label: "Other" },
]

const CALL_LENGTHS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
]

const NOTES_MAX = 5000
const STEP_LABELS = ["Company & services", "Tone & audience", "Booking & rules"]
const DOCUMENT_TYPES_CONFIG = [
  { value: "script", label: "Conversation script", description: "Step-by-step flow for outreach conversations" },
  { value: "objection_handler", label: "Objection handler", description: "Responses to common owner objections" },
  { value: "faq", label: "FAQ", description: "Frequently asked questions with answers" },
  { value: "case_study", label: "Case study / result", description: "Owner success stories and proven results" },
  { value: "general", label: "General context", description: "Other context or guidelines for the AI" },
]
type OperatorDocument = { id: string; name: string; document_type: string; content: string }

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
  additional_notes_ai: string
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
  additional_notes_ai: "",
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

function ToggleGrid({
  items,
  ext,
  setExt,
}: {
  items: Array<{ key: keyof AgencyExt; label: string; description: string }>
  ext: AgencyExt
  setExt: React.Dispatch<React.SetStateAction<AgencyExt>>
}) {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ key, label, description }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between rounded-lg border border-border p-3 cursor-default select-none">
                <span className="text-sm font-medium text-foreground pr-3 leading-tight">{label}</span>
                <Switch
                  checked={ext[key] as boolean}
                  onCheckedChange={(v) => setExt((prev) => ({ ...prev, [key]: v }))}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {description}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}

type PersonaMeta = { id: string; persona_name: string; company_name: string }

function PersonalizationTab() {
  const [personas, setPersonas] = useState<PersonaMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [criteria, setCriteria] = useState({
    persona_name: "",
    company_name: "",
    tagline: "",
    website_url: "",
    target_countries: "",
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
    call_length_minutes: "30",
    qualification_rules: "",
    custom_rules: "",
    additional_notes: "",
  })
  const [agencyExt, setAgencyExt] = useState<AgencyExt>(DEFAULT_AGENCY_EXT)
  const [countries, setCountries] = useState<string[]>([])
  const [rules, setRules] = useState<string[]>([])
  const [newRule, setNewRule] = useState("")
  const [documents, setDocuments] = useState<OperatorDocument[]>([])
  const [docForm, setDocForm] = useState({ name: "", document_type: "general", content: "" })
  const [docDragOver, setDocDragOver] = useState(false)
  const [docModalContent, setDocModalContent] = useState<OperatorDocument | null>(null)
  const [currentStep, setCurrentStep] = useState(1)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewPersona, setShowNewPersona] = useState(false)
  const [newPersonaName, setNewPersonaName] = useState("")
  const [creatingPersona, setCreatingPersona] = useState(false)

  const section1Ref = useRef<HTMLDivElement>(null)
  const section2Ref = useRef<HTMLDivElement>(null)
  const section3Ref = useRef<HTMLDivElement>(null)
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef<() => Promise<void>>(async () => {})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let bestRatio = 0
        let bestStep = 0
        entries.forEach((entry) => {
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio
            if (entry.target === section3Ref.current) bestStep = 3
            else if (entry.target === section2Ref.current) bestStep = 2
            else if (entry.target === section1Ref.current) bestStep = 1
          }
        })
        if (bestStep > 0) setCurrentStep(bestStep)
      },
      { threshold: [0.1, 0.5] }
    )
    if (section1Ref.current) observer.observe(section1Ref.current)
    if (section2Ref.current) observer.observe(section2Ref.current)
    if (section3Ref.current) observer.observe(section3Ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => { if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current) }
  }, [])

  const applyPersonaData = (p: Record<string, unknown>) => {
    const countriesStr = String(p.target_countries ?? "")
    setCountries(countriesStr ? countriesStr.split(",").map((c) => c.trim()).filter(Boolean) : [])
    const rulesRaw = p.rules
    setRules(Array.isArray(rulesRaw) ? (rulesRaw as string[]) : [])
    const docsRaw = p.documents
    setDocuments(Array.isArray(docsRaw) ? (docsRaw as OperatorDocument[]) : [])
    setCriteria({
      persona_name: String(p.persona_name ?? ""),
      company_name: String(p.company_name ?? ""),
      tagline: String(p.tagline ?? ""),
      website_url: String(p.website_url ?? ""),
      target_countries: countriesStr,
      services: String(p.services ?? ""),
      usps: String(p.usps ?? ""),
      ideal_client_profile: String(p.ideal_client_profile ?? ""),
      preferred_property_types: String(p.preferred_property_types ?? ""),
      min_property_value: String(p.min_property_value ?? ""),
      pricing_model: String(p.pricing_model ?? ""),
      tone_style: String(p.tone_style ?? ""),
      key_phrases: String(p.key_phrases ?? ""),
      languages: String(p.languages ?? ""),
      calendly_link: String(p.calendly_link ?? ""),
      call_length_minutes: String(p.call_length_minutes ?? "30"),
      qualification_rules: String(p.qualification_rules ?? ""),
      custom_rules: String(p.custom_rules ?? ""),
      additional_notes: String(p.additional_notes ?? ""),
    })
    const ext = p.agency_context_ext
    if (ext && typeof ext === "object") {
      setAgencyExt((prev) => ({ ...prev, ...(ext as AgencyExt) }))
    } else {
      setAgencyExt(DEFAULT_AGENCY_EXT)
    }
    setSelectedId(String(p.id ?? ""))
  }

  const loadSettings = async (selectId?: string) => {
    try {
      const data = await fetch("/api/settings").then((r) => r.json())
      const ps: Record<string, unknown>[] = data.personas ?? (data.criteria ? [data.criteria] : [])
      setPersonas(ps.map((p) => ({
        id: String(p.id ?? ""),
        persona_name: String(p.persona_name || p.company_name || "Unnamed"),
        company_name: String(p.company_name ?? ""),
      })))
      if (ps.length > 0) {
        const target = selectId ? ps.find((p) => String(p.id) === selectId) : ps[0]
        applyPersonaData(target ?? ps[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { loadSettings() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectPersona = async (id: string) => {
    const data = await fetch("/api/settings").then((r) => r.json()).catch(() => ({}))
    const ps: Record<string, unknown>[] = data.personas ?? []
    const p = ps.find((x) => String(x.id) === id)
    if (p) applyPersonaData(p)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const payload: Record<string, unknown> = {
      ...criteria,
      target_countries: countries.join(", "),
      agency_context_ext: agencyExt,
      rules,
      documents,
    }
    if (criteria.min_property_value !== "") payload.min_property_value = Number(criteria.min_property_value)
    payload.call_length_minutes = Number(criteria.call_length_minutes) || 30
    if (selectedId) payload.id = selectedId
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria: payload }),
    })
    setSaving(false)
    if (res.ok) {
      if (!selectedId) {
        await loadSettings()
      } else {
        setPersonas((prev) => prev.map((p) =>
          p.id === selectedId
            ? { ...p, persona_name: criteria.persona_name || criteria.company_name || "Unnamed", company_name: criteria.company_name }
            : p
        ))
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? "Failed to save")
    }
  }

  // Keep saveRef current so auto-save debounce always calls the latest version
  saveRef.current = save

  const handleBlurSave = useCallback(() => {
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current)
    pendingSaveRef.current = setTimeout(() => { saveRef.current() }, 800)
  }, [])

  const createPersona = async () => {
    if (!newPersonaName.trim()) return
    setCreatingPersona(true)
    const res = await fetch("/api/settings/persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona_name: newPersonaName.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setCreatingPersona(false)
    if (res.ok && data.persona) {
      await loadSettings(String(data.persona.id))
      setNewPersonaName("")
      setShowNewPersona(false)
    } else {
      setError(data.error ?? "Failed to create persona")
    }
  }

  const deletePersona = async () => {
    if (!selectedId || personas.length <= 1) return
    if (!confirm("Delete this persona? This cannot be undone.")) return
    await fetch(`/api/settings/persona?id=${selectedId}`, { method: "DELETE" })
    await loadSettings()
  }

  const toggleCountry = (code: string) =>
    setCountries((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])

  const addRule = () => {
    const lines = newRule.split("\n").map((r) => r.trim()).filter(Boolean)
    if (!lines.length) return
    setRules((prev) => {
      const next = [...prev]
      for (const line of lines) {
        if (next.length >= 50) break
        next.push(line)
      }
      return next
    })
    setNewRule("")
  }

  const moveRule = (i: number, dir: -1 | 1) => {
    setRules((prev) => {
      const next = [...prev]
      const target = i + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[i], next[target]] = [next[target], next[i]]
      return next
    })
  }

  const addDocument = () => {
    if (!docForm.name.trim() || !docForm.content.trim()) return
    const doc: OperatorDocument = {
      id: crypto.randomUUID(),
      name: docForm.name.trim(),
      document_type: docForm.document_type,
      content: docForm.content.trim(),
    }
    setDocuments((prev) => [...prev, doc])
    setDocForm({ name: "", document_type: "general", content: "" })
  }

  const handleFileRead = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setDocForm((prev) => ({
        ...prev,
        name: prev.name || file.name.replace(/\.[^.]+$/, ""),
        content: text,
      }))
    }
    reader.readAsText(file)
  }

  const isCalendlyValid = criteria.calendly_link.startsWith("https://calendly.com/") && criteria.calendly_link.length > 22
  const showForm = !!selectedId || showNewPersona

  const f = (key: keyof typeof criteria) => ({
    value: criteria[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCriteria((prev) => ({ ...prev, [key]: e.target.value })),
    onBlur: handleBlurSave,
  })

  const ef = (key: keyof AgencyExt) => ({
    value: agencyExt[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setAgencyExt((prev) => ({ ...prev, [key]: e.target.value })),
    onBlur: handleBlurSave,
  })

  const sel = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  const ta = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
  const iconBtn = "flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none"

  return (
    <div className="flex flex-col gap-6">

      {/* ── Sticky step bar ─────────────────────────────────────── */}
      {showForm && <div className="sticky top-0 z-10 -mx-8 px-8 py-3 bg-card/95 backdrop-blur-sm border-b border-border flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-semibold text-primary shrink-0">Step {currentStep}/3</span>
          <span className="text-xs text-muted-foreground shrink-0">—</span>
          <span className="text-xs font-medium text-foreground truncate">{STEP_LABELS[currentStep - 1]}</span>
          <div className="hidden sm:flex flex-1 mx-3 h-1 rounded-full bg-muted overflow-hidden min-w-[60px]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-score-green">
              <Check className="size-3" /> Saved
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-xs text-destructive max-w-[140px] truncate">
              <AlertCircle className="size-3 shrink-0" /> {error}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={save} disabled={saving} className="h-8 text-xs px-3">
            {saving ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </div>}

      {/* ── Persona selector ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground shrink-0 uppercase tracking-wide">Persona</span>
        {personas.length > 0 ? (
          <select
            className={cn(sel, "flex-1 border-0 shadow-none bg-transparent focus-visible:ring-0 font-medium")}
            value={selectedId ?? ""}
            onChange={(e) => handleSelectPersona(e.target.value)}
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.persona_name || p.company_name || "Unnamed"}</option>
            ))}
          </select>
        ) : (
          <span className="flex-1 text-sm text-muted-foreground">No personas yet — fill in the form and save to create your first</span>
        )}

        {showNewPersona ? (
          <>
            <Input
              autoFocus
              placeholder="Persona name"
              className="w-40 h-8 text-sm"
              value={newPersonaName}
              onChange={(e) => setNewPersonaName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createPersona()
                if (e.key === "Escape") setShowNewPersona(false)
              }}
            />
            <Button size="sm" className="h-8 text-xs px-3" onClick={createPersona} disabled={creatingPersona || !newPersonaName.trim()}>
              {creatingPersona ? "Creating…" : "Create"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => { setShowNewPersona(false); setNewPersonaName("") }}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs px-3 shrink-0"
            onClick={() => setShowNewPersona(true)}
          >
            <Plus className="size-3 mr-1" />
            New persona
          </Button>
        )}

        {personas.length > 1 && !showNewPersona && (
          <button
            className={cn(iconBtn, "text-destructive/60 hover:text-destructive hover:bg-destructive/10")}
            onClick={deletePersona}
            title="Delete this persona"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {showForm ? (<>

      {/* ── Section 1 — Company basics ───────────────────────────── */}
      <div ref={section1Ref}>
        <SectionCard title="Section 1 — Company basics" description="Your identity as an operator — used by the AI in every conversation.">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="persona_name">Persona label</Label>
                <Input id="persona_name" placeholder="e.g. Luxury, Standard, Germany" {...f("persona_name")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company_name">Company name</Label>
                <Input id="company_name" placeholder="e.g. Immo Premium GmbH" {...f("company_name")} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tagline">Tagline / one-liner</Label>
              <Input id="tagline" placeholder="e.g. Full done-for-you STR management in Luxembourg" {...f("tagline")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="long_description">Company description</Label>
              <textarea
                id="long_description"
                rows={3}
                placeholder="What do you tell property owners about your company?"
                className={ta}
                {...ef("long_description")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="website_url">Website URL</Label>
              <div className="flex gap-2">
                <Input id="website_url" type="url" placeholder="https://yourcompany.com" className="flex-1" {...f("website_url")} />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-9 px-3"
                  onClick={() => {/* scrape TODO */}}
                  title="Scrape website content for AI context"
                >
                  <Upload className="size-3.5 mr-1.5" />
                  Scrape
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label>Countries</Label>
              <div className="grid grid-cols-4 gap-x-4 gap-y-2.5">
                {COUNTRIES.map((c) => (
                  <label key={c.code} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={countries.includes(c.code)}
                      onChange={() => toggleCountry(c.code)}
                      className="size-4 rounded border-input accent-primary cursor-pointer"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">{c.label}</span>
                  </label>
                ))}
              </div>
              {countries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {countries.map((code) => {
                    const country = COUNTRIES.find((c) => c.code === code)
                    return (
                      <span key={code} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {country?.label ?? code}
                        <button onClick={() => toggleCountry(code)} className="hover:text-primary/60 transition-colors ml-0.5">
                          <X className="size-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="properties_managed">Properties managed</Label>
                <Input id="properties_managed" placeholder="e.g. 45" {...ef("properties_managed")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="main_office">Main office / hub city</Label>
                <Input id="main_office" placeholder="e.g. Luxembourg City" {...ef("main_office")} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Section 2 — Services & offer ─────────────────────────── */}
      <SectionCard title="Section 2 — Services & offer" description="What you offer and how you structure it.">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="primary_service_package">Primary service package</Label>
              <select id="primary_service_package" className={sel} {...ef("primary_service_package")}>
                <option value="">Select...</option>
                {SERVICE_PACKAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offer_structure">Offer structure</Label>
              <select id="offer_structure" className={sel} {...ef("offer_structure")}>
                <option value="">Select...</option>
                {OFFER_STRUCTURES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <ToggleGrid
            items={[
              { key: "revenue_guarantee", label: "Revenue guarantee", description: "Offer a minimum revenue guarantee to property owners" },
              { key: "photography_included", label: "Photography included", description: "Include photography and listing optimization as standard" },
              { key: "legal_compliance_handled", label: "Legal compliance", description: "Handle all legal registration and compliance on behalf of owners" },
              { key: "furnished_setup_addon", label: "Furnished setup add-on", description: "Offer furnished property setup as an optional paid add-on" },
            ]}
            ext={agencyExt}
            setExt={setAgencyExt}
          />
        </div>
      </SectionCard>

      {/* ── Section 3 — Tone & communication ─────────────────────── */}
      <div ref={section2Ref}>
        <SectionCard title="Section 3 — Tone & communication" description="How the AI should sound and approach conversations.">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tone_style">Communication tone</Label>
                <select id="tone_style" className={sel} {...f("tone_style")}>
                  <option value="">Select...</option>
                  {TONE_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="call_ask_style">Call ask style</Label>
                <select id="call_ask_style" className={sel} {...ef("call_ask_style")}>
                  <option value="">Select...</option>
                  {CALL_ASK_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <ToggleGrid
              items={[
                { key: "social_proof_first", label: "Lead with social proof", description: "Always mention reviews or managed properties in first messages" },
                { key: "enlarge_pie", label: "Enlarge the pie", description: "Focus on growing total revenue rather than debating your percentage" },
                { key: "risk_reversal_early", label: "Risk reversal early", description: "Emphasize guarantees and risk reversal in early conversations" },
                { key: "warm_language_cold", label: "Warm in cold outreach", description: "Use warm, personal language even in cold messages" },
              ]}
              ext={agencyExt}
              setExt={setAgencyExt}
            />
          </div>
        </SectionCard>
      </div>

      {/* ── Section 4 — Target audience ──────────────────────────── */}
      <SectionCard title="Section 4 — Target audience" description="Who you want to work with and what resonates with them.">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ideal_client_profile">Ideal client type</Label>
              <select id="ideal_client_profile" className={sel} {...f("ideal_client_profile")}>
                <option value="">Select...</option>
                {TARGET_OWNER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preferred_property_types">Preferred property type</Label>
              <select id="preferred_property_types" className={sel} {...f("preferred_property_types")}>
                <option value="">Select...</option>
                {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pain_points">Owner pain points</Label>
            <textarea
              id="pain_points"
              rows={3}
              placeholder="e.g. Stressed by guest communication, worried about compliance, poor previous PM experience"
              className={ta}
              {...ef("pain_points")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="results_highlight">Results to highlight</Label>
            <textarea
              id="results_highlight"
              rows={3}
              placeholder="e.g. Average 35% revenue uplift in first 3 months, 4.9-star rating across all properties"
              className={ta}
              {...ef("results_highlight")}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Section 5 — Pricing & commercial ─────────────────────── */}
      <SectionCard title="Section 5 — Pricing & commercial" description="Fee structure and how to present it.">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pricing_model">Pricing model</Label>
              <select id="pricing_model" className={sel} {...f("pricing_model")}>
                <option value="">Select...</option>
                {PRICING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onboarding_fee">Onboarding / setup fee</Label>
              <select id="onboarding_fee" className={sel} {...ef("onboarding_fee")}>
                <option value="">Select...</option>
                {ONBOARDING_FEES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <ToggleGrid
            items={[
              { key: "mention_fee_early", label: "Mention fees early", description: "Bring up fee structure early in the conversation" },
              { key: "emphasize_pie_early", label: "Emphasize net revenue", description: "Stress that owners keep 75-80% of a much larger pie" },
              { key: "first_month_discount", label: "First-month discount", description: "Offer a reduced first-month fee as a closing incentive" },
            ]}
            ext={agencyExt}
            setExt={setAgencyExt}
          />
        </div>
      </SectionCard>

      {/* ── Section 6 — Call booking ──────────────────────────────── */}
      <div ref={section3Ref}>
        <SectionCard title="Section 6 — Call booking" description="When and how the AI should ask for a meeting.">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="call_length_minutes">Call length</Label>
                <select id="call_length_minutes" className={sel} {...f("call_length_minutes")}>
                  {CALL_LENGTHS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="when_offer_call">When to offer a call</Label>
                <select id="when_offer_call" className={sel} {...ef("when_offer_call")}>
                  <option value="">Select...</option>
                  {WHEN_OFFER_CALL.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qualification_rules">Qualification rules</Label>
              <textarea
                id="qualification_rules"
                rows={3}
                placeholder="e.g. Always offer a 15-min discovery call first; only push for audit after they confirm interest"
                className={ta}
                {...f("qualification_rules")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="call_phrasing">Exact call phrasing</Label>
              <Input id="call_phrasing" placeholder='e.g. "Would a quick 20-min call make sense?"' {...ef("call_phrasing")} />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Section 7 — Guarantees, compliance & special rules ────── */}
      <SectionCard title="Section 7 — Guarantees, compliance & special rules" description="What the AI should emphasize to build trust.">
        <div className="flex flex-col gap-5">
          <ToggleGrid
            items={[
              { key: "mention_guarantee_always", label: "Always mention guarantee", description: "Reference your revenue guarantee in every conversation" },
              { key: "eu_compliance_highlight", label: "Highlight EU compliance", description: "Emphasize EU legal compliance and owner protection" },
              { key: "try_risk_free_framing", label: "Risk-free framing", description: "Offer a risk-free trial framing in most messages" },
              { key: "local_presence_24_7", label: "Local presence & 24/7", description: "Mention local team and round-the-clock availability" },
              { key: "avoid_competitors", label: "Never mention competitors", description: "Strictly avoid naming or referencing competitor companies" },
            ]}
            ext={agencyExt}
            setExt={setAgencyExt}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="countries_special_rules">Country-specific rules</Label>
            <textarea
              id="countries_special_rules"
              rows={2}
              placeholder="e.g. In France: always mention taxe de séjour. In Germany: emphasize Gewerbeanmeldung."
              className={ta}
              {...ef("countries_special_rules")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="strict_rules">Strict compliance rules</Label>
            <textarea
              id="strict_rules"
              rows={2}
              placeholder="e.g. Never promise occupancy rates. Never share pricing without a formal audit."
              className={ta}
              {...ef("strict_rules")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="additional_notes_ai">Additional notes for AI</Label>
            <textarea
              id="additional_notes_ai"
              rows={2}
              placeholder="Extra context or edge cases the AI should be aware of..."
              className={ta}
              {...ef("additional_notes_ai")}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Links & notes ────────────────────────────────────────── */}
      <SectionCard title="Links & notes" description="Booking link and internal notes.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendly_link">Calendly / booking link</Label>
            <div className="relative">
              <Input
                id="calendly_link"
                type="url"
                placeholder="https://calendly.com/your-link"
                className={cn("pr-9", isCalendlyValid && "border-score-green focus-visible:ring-score-green/30")}
                {...f("calendly_link")}
              />
              {isCalendlyValid && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-score-green pointer-events-none" />
              )}
            </div>
            {criteria.calendly_link && !isCalendlyValid && (
              <p className="text-xs text-muted-foreground">Enter a valid calendly.com link to enable booking.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="additional_notes">Internal notes</Label>
              <span className="text-xs text-muted-foreground">{criteria.additional_notes.length}/{NOTES_MAX}</span>
            </div>
            <textarea
              id="additional_notes"
              rows={4}
              maxLength={NOTES_MAX}
              placeholder="Any extra context, tone examples, or guidelines the AI should keep in mind..."
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
              {saving ? "Saving…" : "Save & close"}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* ── Rules ────────────────────────────────────────────────── */}
      <SectionCard title="Rules" description="Hard rules the AI must always follow — max 50." icon={ListChecks}>
        <div className="flex flex-col gap-4">
          {rules.length > 0 && (
            <div className="flex flex-col gap-2">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <span className="flex-1 text-sm text-foreground leading-relaxed">{rule}</span>
                  <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                    <button className={iconBtn} onClick={() => moveRule(i, -1)} disabled={i === 0} title="Move up">
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button className={iconBtn} onClick={() => moveRule(i, 1)} disabled={i === rules.length - 1} title="Move down">
                      <ChevronDown className="size-3.5" />
                    </button>
                    <button
                      className={cn(iconBtn, "hover:text-destructive hover:bg-destructive/10")}
                      onClick={() => setRules((prev) => prev.filter((_, idx) => idx !== i))}
                      title="Delete rule"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-start">
            <textarea
              rows={2}
              placeholder={"Add one rule per line, then click Add\ne.g. Never promise a specific revenue number"}
              className={ta}
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addRule() } }}
            />
            <Button variant="outline" onClick={addRule} disabled={!newRule.trim() || rules.length >= 50} className="shrink-0">
              Add rule{newRule.includes("\n") ? "s" : ""}
            </Button>
          </div>
          {rules.length >= 50 && (
            <p className="text-xs text-muted-foreground">Maximum 50 rules reached.</p>
          )}
        </div>
      </SectionCard>

      {/* ── Documents ────────────────────────────────────────────── */}
      <SectionCard title="Documents" description="Upload scripts, FAQs, and case studies for the AI to reference." icon={FilePlus}>
        <div className="flex flex-col gap-5">
          {/* Type cards */}
          <div className="grid grid-cols-3 gap-3">
            {DOCUMENT_TYPES_CONFIG.map((t) => (
              <button
                key={t.value}
                onClick={() => setDocForm((prev) => ({ ...prev, document_type: t.value }))}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                  docForm.document_type === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-xs font-semibold">{t.label}</span>
                <span className="text-[11px] leading-tight opacity-75">{t.description}</span>
              </button>
            ))}
          </div>

          {/* Drag/drop zone */}
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
              docDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            )}
            onDragOver={(e) => { e.preventDefault(); setDocDragOver(true) }}
            onDragLeave={() => setDocDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDocDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) handleFileRead(file)
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Drop a text file here or <span className="text-primary underline underline-offset-2">click to upload</span>
            </p>
            <p className="text-xs text-muted-foreground/60">.txt and .md supported</p>
          </div>

          {/* Document form */}
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Document name</Label>
                <Input
                  placeholder="e.g. Cold outreach script v2"
                  value={docForm.name}
                  onChange={(e) => setDocForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <select
                  className={sel}
                  value={docForm.document_type}
                  onChange={(e) => setDocForm((prev) => ({ ...prev, document_type: e.target.value }))}
                >
                  {DOCUMENT_TYPES_CONFIG.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Content</Label>
              <textarea
                rows={5}
                placeholder="Paste the document content here..."
                className={ta}
                value={docForm.content}
                onChange={(e) => setDocForm((prev) => ({ ...prev, content: e.target.value }))}
              />
            </div>
            <Button
              variant="outline"
              onClick={addDocument}
              disabled={!docForm.name.trim() || !docForm.content.trim()}
              className="self-end"
            >
              <Plus className="size-3.5 mr-1.5" />
              Add document
            </Button>
          </div>

          {/* Saved documents */}
          {documents.length > 0 && (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => {
                const typeConfig = DOCUMENT_TYPES_CONFIG.find((t) => t.value === doc.document_type)
                return (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{doc.name}</span>
                      <span className="text-xs text-muted-foreground">{typeConfig?.label ?? doc.document_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setDocModalContent(doc)}>
                        View
                      </Button>
                      <button
                        className={cn(iconBtn, "hover:text-destructive hover:bg-destructive/10")}
                        onClick={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
                        title="Delete document"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SectionCard>

      </>) : (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Bot className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Select a persona above or create your first one to start configuring the AI.
          </p>
        </div>
      )}

      {/* ── How the AI uses this ─────────────────────────────────── */}
      <SectionCard title="How the AI uses this" icon={Building2}>
        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Every field you fill in here is injected into the AI&apos;s system prompt when it grades a listing or drafts an outreach message. The more complete your profile, the more accurate and on-brand the output will be.</p>
            <p>Rules are enforced strictly — the AI will not violate them. Documents are retrieved as relevant context when the AI is composing messages.</p>
            <p>Personas let you maintain different operator profiles (e.g. one per market or brand). Only the selected persona is used for a given conversation.</p>
          </div>
        </div>
      </SectionCard>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileRead(file)
          e.target.value = ""
        }}
      />

      {/* Document content modal */}
      <Dialog open={!!docModalContent} onOpenChange={() => setDocModalContent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{docModalContent?.name}</DialogTitle>
          </DialogHeader>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap text-foreground bg-muted/50 rounded-lg p-4 overflow-auto">
            {docModalContent?.content}
          </pre>
        </DialogContent>
      </Dialog>

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
