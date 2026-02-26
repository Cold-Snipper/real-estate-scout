"use client"

import { useState, useEffect, useCallback } from "react"
import { Camera, Shield, Users, Bell, SlidersHorizontal, CheckCircle2, AlertCircle, Clock } from "lucide-react"
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

const TABS = ["Profile", "Preferences", "Scoring", "Notifications", "Team"] as const
type Tab = (typeof TABS)[number]

const TAB_ICONS: Record<Tab, React.ElementType> = {
  Profile: Shield,
  Preferences: Clock,
  Scoring: SlidersHorizontal,
  Notifications: Bell,
  Team: Users,
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
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata) {
        // Use fresh_max_hours; fall back to available_min_hours for older accounts
        const hours = user.user_metadata.fresh_max_hours ?? user.user_metadata.available_min_hours ?? 72
        setFreshMaxHours(String(hours))
      }
    })
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
    const supabase = createClient()
    // Save as both keys so both pages pick it up without code changes
    const { error: err } = await supabase.auth.updateUser({
      data: { fresh_max_hours: hours, available_min_hours: hours },
    })
    setSaving(false)
    if (err) {
      setError(err.message)
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

function TeamTab() {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

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
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Team Members" description="Manage who has access to your Immo Snippy workspace.">
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
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                  activeTab === tab
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {tab}
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
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
