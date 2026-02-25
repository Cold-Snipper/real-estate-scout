"use client"

import { useState } from "react"
import { Camera, Mail, Shield, Users, Bell, SlidersHorizontal, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const TABS = ["Profile", "Scoring", "Notifications", "Team"] as const
type Tab = (typeof TABS)[number]

const TAB_ICONS: Record<Tab, React.ElementType> = {
  Profile: Shield,
  Scoring: SlidersHorizontal,
  Notifications: Bell,
  Team: Users,
}

const TEAM_MEMBERS = [
  { name: "Julia Reyes", email: "julia@immosnippy.com", role: "Admin", initials: "JR" },
  { name: "Marco Bianchi", email: "marco@immosnippy.com", role: "Analyst", initials: "MB" },
  { name: "Sophie Muller", email: "sophie@immosnippy.com", role: "Analyst", initials: "SM" },
  { name: "Andre Costa", email: "andre@immosnippy.com", role: "Viewer", initials: "AC" },
]

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
    firstName: "Julia",
    lastName: "Reyes",
    email: "julia@immosnippy.com",
    company: "Mediterranean Stays Ltd.",
    role: "Acquisition Lead",
  })

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Personal Information" description="Manage your profile details.">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="size-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  JR
                </AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 flex items-center justify-center size-6 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Camera className="size-3" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{profile.firstName} {profile.lastName}</span>
              <span className="text-xs text-muted-foreground">{profile.role}</span>
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
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
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

          <div className="flex justify-end">
            <Button>Save changes</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Security" description="Manage your password and security settings.">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" type="password" placeholder="Enter current password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" placeholder="Enter new password" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline">Update password</Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function ScoringTab() {
  const [minScore, setMinScore] = useState(6)

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
              <Switch defaultChecked />
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
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Email Notifications" description="Configure which events trigger email alerts.">
        <div className="flex flex-col gap-4">
          {[
            { label: "New high-score listings", description: "Get notified when a listing with score 75+ is added", defaultChecked: true },
            { label: "Daily pipeline summary", description: "Receive a daily digest of pipeline changes at 9:00 AM", defaultChecked: true },
            { label: "Status changes", description: "Get notified when a team member changes listing status", defaultChecked: false },
            { label: "Price drops", description: "Alert when a tracked listing has a price reduction", defaultChecked: true },
            { label: "New listings in target markets", description: "Immediate alert for any new listing in your target locations", defaultChecked: false },
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
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Team Members" description="Manage who has access to your Immo Snippy workspace.">
        <div className="flex flex-col gap-1">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.email}
              className="flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-secondary/50 transition-colors"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground">{member.name}</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3" />
                  {member.email}
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[11px]",
                  member.role === "Admin" && "bg-primary/15 text-primary"
                )}
              >
                {member.role}
              </Badge>
              {member.role !== "Admin" && (
                <button className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">Invite team member</span>
          <div className="flex gap-3">
            <Input placeholder="colleague@company.com" className="flex-1" />
            <Button>Send invite</Button>
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
            {activeTab === "Scoring" && <ScoringTab />}
            {activeTab === "Notifications" && <NotificationsTab />}
            {activeTab === "Team" && <TeamTab />}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
