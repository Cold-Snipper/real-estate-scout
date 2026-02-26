"use client"

import { useState, useMemo } from "react"
import {
  Users, Building2, MessageSquare, Phone, Mail, Search,
  ChevronRight, X, Plus, Star, TrendingUp, BarChart3,
  Calendar, Send, ExternalLink, Eye, Edit3,
  CheckCircle2, Circle, Activity, Bot, ArrowRight, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  crmOwners as initialOwners,
  crmConversations,
  SALES_STAGES,
  CHATBOT_STAGES,
  CHANNELS,
  type CrmOwner,
  type CrmProperty,
  type CrmConversation,
  type SalesStage,
  type Recommendation,
} from "@/lib/crm-data"

// ── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  "New Lead": "bg-muted text-muted-foreground",
  Contacted: "bg-primary/15 text-primary",
  Interested: "bg-score-orange/15 text-score-orange",
  "Call Booked": "bg-primary/20 text-primary",
  "Proposal Sent": "bg-primary/25 text-primary",
  "Contract Signed": "bg-score-green/15 text-score-green",
  Onboarded: "bg-score-green/20 text-score-green",
  "Active Client": "bg-score-green/30 text-score-green",
  "No Contact": "bg-muted text-muted-foreground",
  "First Message Sent": "bg-primary/10 text-primary",
  Replied: "bg-score-orange/15 text-score-orange",
  Closed: "bg-score-green/20 text-score-green",
}

const STAGE_DOT_COLORS: Record<string, string> = {
  "New Lead": "bg-muted-foreground",
  Contacted: "bg-primary",
  Interested: "bg-score-orange",
  "Call Booked": "bg-primary",
  "Proposal Sent": "bg-primary",
  "Contract Signed": "bg-score-green",
  Onboarded: "bg-score-green",
  "Active Client": "bg-score-green",
  "No Contact": "bg-muted-foreground",
  "First Message Sent": "bg-primary",
  Replied: "bg-score-orange",
  Closed: "bg-score-green",
}

const RECOMMENDATION_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  "Strong Buy": { color: "text-score-green", bg: "bg-score-green/10", label: "Strong Buy" },
  Good: { color: "text-primary", bg: "bg-primary/10", label: "Good" },
  Marginal: { color: "text-score-orange", bg: "bg-score-orange/10", label: "Marginal" },
  Avoid: { color: "text-score-red", bg: "bg-score-red/10", label: "Avoid" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts: number | null | undefined): string {
  if (ts == null) return "\u2014"
  const d = new Date(ts)
  return Number.isNaN(d.getTime())
    ? "\u2014"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "\u2014"
  return `\u20AC${n.toLocaleString("en", { maximumFractionDigits: 0 })}`
}
function initials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string | null | undefined }) {
  if (!stage) return <span className="text-muted-foreground text-xs">{"\u2014"}</span>
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage] ?? "bg-muted text-muted-foreground"}`}
    >
      {stage}
    </span>
  )
}

function ViabilityScore({ score, size = "sm" }: { score: number | null | undefined; size?: "sm" | "lg" }) {
  if (score == null) return <span className="text-muted-foreground text-xs">Not rated</span>
  const pct = (score / 10) * 100
  const color =
    score >= 8
      ? "stroke-score-green"
      : score >= 6
        ? "stroke-primary"
        : score >= 4
          ? "stroke-score-orange"
          : "stroke-score-red"
  if (size === "lg") {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="15.9" fill="none" className={color} strokeWidth="2.5" strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{score}</span>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Viability Score</div>
          <div className="text-xs font-medium">/10</div>
        </div>
      </div>
    )
  }
  return (
    <div className="relative w-7 h-7">
      <svg viewBox="0 0 36 36" className="w-7 h-7 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.9" fill="none" className={color} strokeWidth="3.5" strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{score}</span>
    </div>
  )
}

function ContactAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
  return (
    <div className={`${sz} rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary shrink-0`}>
      {initials(name)}
    </div>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  const lower = channel.toLowerCase()
  if (lower === "email") return <Mail className="w-3.5 h-3.5 text-primary" />
  if (lower === "whatsapp") return <Phone className="w-3.5 h-3.5 text-score-green" />
  if (lower === "phone") return <Phone className="w-3.5 h-3.5 text-score-orange" />
  if (lower === "sms") return <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
  return <MessageSquare className="w-3.5 h-3.5" />
}

// ── Property Card ─────────────────────────────────────────────────────────────

function PropertyCard({
  property,
  onClick,
  selected,
}: {
  property: CrmProperty
  onClick: () => void
  selected?: boolean
}) {
  const rec = property.recommendation
  const recCfg = rec ? RECOMMENDATION_CONFIG[rec] : null
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{property.title}</p>
          <p className="text-xs text-muted-foreground truncate">{property.location}</p>
        </div>
        <ViabilityScore score={property.viability_score} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold text-primary">{fmtCurrency(property.price)}</span>
        <span className="text-xs text-muted-foreground">{property.bedrooms} bd</span>
        <span className="text-xs text-muted-foreground">{property.surface_m2}m{"\u00B2"}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <StageBadge stage={property.sales_pipeline_stage} />
        {recCfg && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${recCfg.bg} ${recCfg.color}`}>
            {recCfg.label}
          </span>
        )}
      </div>
    </button>
  )
}

// ── Conversation Thread ───────────────────────────────────────────────────────

function ConversationThread({ conversations }: { conversations: CrmConversation[] }) {
  const [activeChannel, setActiveChannel] = useState<string>("all")
  const [msgText, setMsgText] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const usedChannels = useMemo(() => {
    const seen = new Set<string>()
    conversations.forEach((c) => seen.add(c.channel))
    return Array.from(seen)
  }, [conversations])

  const filtered = useMemo(() => {
    let list = conversations
    if (activeChannel !== "all") list = list.filter((c) => c.channel.toLowerCase() === activeChannel.toLowerCase())
    if (searchTerm.trim()) list = list.filter((c) => c.message_text?.toLowerCase().includes(searchTerm.toLowerCase()))
    return [...list].sort((a, b) => a.timestamp - b.timestamp)
  }, [conversations, activeChannel, searchTerm])

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 overflow-x-auto pb-2 shrink-0">
        <button onClick={() => setActiveChannel("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeChannel === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent"}`}>
          All
        </button>
        {usedChannels.map((ch) => (
          <button key={ch} onClick={() => setActiveChannel(ch)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeChannel === ch ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent"}`}>
            <ChannelIcon channel={ch} />
            {ch}
          </button>
        ))}
        {CHANNELS.filter((c) => !usedChannels.includes(c.key)).map((ch) => (
          <button key={ch.key} onClick={() => setActiveChannel(ch.key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap text-muted-foreground bg-muted/50 hover:bg-accent transition-colors">
            <ChannelIcon channel={ch.key} />
            {ch.key}
          </button>
        ))}
      </div>

      <div className="relative mb-2 shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input type="text" placeholder="Search messages..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background" />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-2">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No messages yet on this channel.</p>
            </div>
          )}
          {filtered.map((msg) => {
            const isAI = msg.sender === "ai"
            const isUser = msg.sender === "user"
            return (
              <div key={msg.id} className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold ${isAI ? "bg-primary/15 text-primary" : isUser ? "bg-score-green/15 text-score-green" : "bg-muted text-muted-foreground"}`}>
                  {isAI ? "AI" : isUser ? "Me" : "C"}
                </div>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${isAI ? "bg-primary/5 text-foreground border border-primary/10" : isUser ? "bg-score-green/5 text-foreground border border-score-green/10" : "bg-muted/60 text-foreground"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <ChannelIcon channel={msg.channel} />
                    <span className="text-muted-foreground text-[10px]">{msg.channel}</span>
                    <span className="text-muted-foreground text-[10px] ml-auto">{fmtDate(msg.timestamp)}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message_text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-2 shrink-0">
        <input
          type="text"
          placeholder={`Log message via ${activeChannel === "all" ? "Email" : activeChannel}...`}
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && msgText.trim()) setMsgText("") }}
          className="flex-1 text-xs px-3 py-2 rounded-lg border border-border bg-background"
        />
        <Button size="sm" disabled={!msgText.trim()} onClick={() => setMsgText("")} className="shrink-0">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Property Detail Panel ─────────────────────────────────────────────────────

function PropertyDetailPanel({ property, conversations, onClose }: { property: CrmProperty; conversations: CrmConversation[]; onClose: () => void }) {
  const [tab, setTab] = useState<"overview" | "valuation" | "conversation">("overview")
  const rec = property.recommendation
  const recCfg = rec ? RECOMMENDATION_CONFIG[rec] : null

  const TABS = [
    { key: "overview" as const, label: "Overview", icon: Eye },
    { key: "valuation" as const, label: "Valuation", icon: TrendingUp },
    { key: "conversation" as const, label: "Conversations", icon: MessageSquare },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground truncate">{property.title}</h3>
              <StageBadge stage={property.sales_pipeline_stage} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{property.location}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xl font-bold text-primary">{fmtCurrency(property.price)}</span>
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{property.bedrooms} bd</span>
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{property.bathrooms} ba</span>
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{property.surface_m2}m{"\u00B2"}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <a href={property.listing_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary hover:bg-accent transition-colors">
            <ExternalLink className="w-3 h-3" /> View listing
          </a>
          <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary hover:bg-accent transition-colors">
            <Check className="w-3 h-3 text-score-green" /> Mark Contacted
          </button>
          <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary hover:bg-accent transition-colors">
            <Calendar className="w-3 h-3 text-primary" /> Book Call
          </button>
        </div>
      </div>

      <div className="flex border-b border-border bg-secondary/30 shrink-0">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border p-4 bg-card space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property Details</h4>
                  {[
                    ["Address", property.address],
                    ["Location", property.location],
                    ["Bedrooms", property.bedrooms],
                    ["Bathrooms", property.bathrooms],
                    ["Size", `${property.surface_m2} m\u00B2`],
                    ["Transaction", property.transaction_type],
                    ["Source", property.source],
                    ["Ref", property.listing_ref],
                    ["First Seen", property.first_seen],
                  ].map(([label, value]) =>
                    value != null && value !== "" ? (
                      <div key={String(label)} className="flex justify-between text-xs gap-2">
                        <span className="text-muted-foreground shrink-0">{String(label)}</span>
                        <span className="font-medium text-right truncate max-w-[60%]">{String(value)}</span>
                      </div>
                    ) : null
                  )}
                </div>
                <div className="rounded-xl border border-border p-4 bg-card space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact & Financials</h4>
                  {[
                    ["Email", property.contact_email],
                    ["Phone", property.phone_number],
                    ["Price", fmtCurrency(property.price)],
                    ["Monthly Charges", fmtCurrency(property.monthly_charges)],
                    ["Last Contact", fmtDate(property.last_contact_date)],
                  ].map(([label, value]) =>
                    value != null && value !== "\u2014" && value !== "" ? (
                      <div key={String(label)} className="flex justify-between text-xs gap-2">
                        <span className="text-muted-foreground shrink-0">{String(label)}</span>
                        <span className="font-medium text-right">{String(value)}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
              {property.description && (
                <div className="rounded-xl border border-border p-4 bg-card">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Description</h4>
                  <p className="text-xs text-foreground leading-relaxed">{property.description}</p>
                </div>
              )}
            </div>
          )}

          {tab === "valuation" && (
            <div className="space-y-4">
              <div className={`rounded-xl p-4 border ${recCfg ? `${recCfg.bg} border-current/20` : "border-border bg-muted/30"}`}>
                <div className="flex items-center gap-4">
                  <ViabilityScore score={property.viability_score} size="lg" />
                  <div className="flex-1">
                    {rec && recCfg && <div className={`text-lg font-bold ${recCfg.color}`}>{recCfg.label}</div>}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {"Certainty: "}
                      <span className={`font-medium ${property.degree_of_certainty === "High" ? "text-score-green" : property.degree_of_certainty === "Medium" ? "text-score-orange" : "text-muted-foreground"}`}>
                        {property.degree_of_certainty ?? "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3 bg-card">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Est. Annual Gross</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{property.estimated_annual_gross != null ? fmtCurrency(property.estimated_annual_gross) : "\u2014"}</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">P/E Ratio</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{property.price_to_earnings != null ? `${property.price_to_earnings.toFixed(1)}\u00D7` : "\u2014"}</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Yield</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{property.estimated_annual_gross && property.price ? `${((property.estimated_annual_gross / property.price) * 100).toFixed(1)}%` : "\u2014"}</p>
                </div>
              </div>
            </div>
          )}

          {tab === "conversation" && (
            <div className="h-[400px] flex flex-col">
              <ConversationThread conversations={conversations} />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Contact Profile Panel ────────────────────────────────────────────────────

function ContactProfilePanel({ owner, onClose }: { owner: CrmOwner; onClose: () => void }) {
  const [selectedProperty, setSelectedProperty] = useState<CrmProperty | null>(null)
  const [aiAutoEnabled, setAiAutoEnabled] = useState(true)
  const [ownerTab, setOwnerTab] = useState<"properties" | "contact">("properties")

  const properties = owner.properties
  const conversations = selectedProperty ? crmConversations[selectedProperty.id] ?? [] : []

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-border bg-card shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ContactAvatar name={owner.owner_name} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-foreground truncate">{owner.owner_name}</h2>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                {owner.owner_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {owner.owner_email}
                  </span>
                )}
                {owner.owner_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {owner.owner_phone}
                  </span>
                )}
              </div>
              {owner.owner_notes && (
                <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">{owner.owner_notes}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4 mt-4 text-center">
          <div>
            <div className="text-xl font-bold text-foreground">{properties.length}</div>
            <div className="text-[10px] text-muted-foreground">Properties</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {properties.filter((p) => p.sales_pipeline_stage === "Active Client" || p.sales_pipeline_stage === "Onboarded").length}
            </div>
            <div className="text-[10px] text-muted-foreground">Active</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {properties.length > 0 ? (properties.reduce((sum, p) => sum + (p.viability_score ?? 0), 0) / properties.length).toFixed(1) : "\u2014"}
            </div>
            <div className="text-[10px] text-muted-foreground">Avg. Score</div>
          </div>
        </div>

        <div className={`mt-4 rounded-xl border p-3 ${aiAutoEnabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className={`w-4 h-4 ${aiAutoEnabled ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs font-semibold">AI Automation</p>
                <p className="text-[10px] text-muted-foreground">Auto-continue conversations</p>
              </div>
            </div>
            <Switch checked={aiAutoEnabled} onCheckedChange={setAiAutoEnabled} />
          </div>
        </div>
      </div>

      <div className="flex border-b border-border bg-secondary/30 shrink-0">
        <button
          onClick={() => setOwnerTab("properties")}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${ownerTab === "properties" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Building2 className="w-3.5 h-3.5" /> Properties ({properties.length})
        </button>
        <button
          onClick={() => setOwnerTab("contact")}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${ownerTab === "contact" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit Contact
        </button>
      </div>

      {ownerTab === "properties" ? (
        <div className="flex flex-1 min-h-0">
          <div className={`shrink-0 border-r border-border ${selectedProperty ? "w-72" : "w-full"} transition-all`}>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {properties.map((prop) => (
                  <PropertyCard key={prop.id} property={prop} onClick={() => setSelectedProperty((prev) => (prev?.id === prop.id ? null : prop))} selected={selectedProperty?.id === prop.id} />
                ))}
              </div>
            </ScrollArea>
          </div>
          {selectedProperty && (
            <div className="flex-1 flex flex-col min-w-0">
              <PropertyDetailPanel property={selectedProperty} conversations={conversations} onClose={() => setSelectedProperty(null)} />
            </div>
          )}
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-4 max-w-md">
            <h4 className="text-sm font-semibold">Contact Information</h4>
            {[
              { label: "Name", value: owner.owner_name },
              { label: "Email", value: owner.owner_email },
              { label: "Phone", value: owner.owner_phone },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <input type="text" defaultValue={f.value} className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Internal Notes</label>
              <textarea defaultValue={owner.owner_notes} rows={4} className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background resize-y" />
            </div>
            <Button className="w-full">Save Contact</Button>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

// ── Pipeline Kanban (upgraded with listing cards) ────────────────────────────

interface PipelineProperty extends CrmProperty {
  ownerName: string
}

function PipelineListingCard({ prop }: { prop: PipelineProperty }) {
  const rec = prop.recommendation
  const recCfg = rec ? RECOMMENDATION_CONFIG[rec] : null
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{prop.title}</p>
          <p className="text-xs text-muted-foreground truncate">{prop.location}</p>
        </div>
        <ViabilityScore score={prop.viability_score} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground tabular-nums">{fmtCurrency(prop.price)}</span>
        {recCfg && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${recCfg.bg} ${recCfg.color}`}>
            {recCfg.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{prop.bedrooms} bed{prop.bedrooms !== 1 ? "s" : ""}</span>
        <span className="text-border">|</span>
        <span>{prop.surface_m2} m{"\u00B2"}</span>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <ContactAvatar name={prop.ownerName} size="sm" />
        <span className="text-xs text-muted-foreground truncate">{prop.ownerName}</span>
      </div>
    </div>
  )
}

function PipelineKanban({ owners }: { owners: CrmOwner[] }) {
  const [pipelineType, setPipelineType] = useState<"sales" | "chatbot">("sales")
  const stages = pipelineType === "sales" ? SALES_STAGES : CHATBOT_STAGES

  const buckets = useMemo(() => {
    const map: Record<string, PipelineProperty[]> = {}
    stages.forEach((s) => { map[s] = [] })
    owners.forEach((o) => {
      o.properties.forEach((p) => {
        const stage = pipelineType === "sales" ? p.sales_pipeline_stage : p.chatbot_pipeline_stage
        if (map[stage]) {
          map[stage].push({ ...p, ownerName: o.owner_name })
        }
      })
    })
    return map
  }, [owners, pipelineType, stages])

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setPipelineType("sales")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pipelineType === "sales" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent"}`}>
          Sales Pipeline
        </button>
        <button onClick={() => setPipelineType("chatbot")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pipelineType === "chatbot" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent"}`}>
          Chatbot Pipeline
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const items = buckets[stage] ?? []
          const totalValue = items.reduce((sum, p) => sum + p.price, 0)
          return (
            <div key={stage} className="shrink-0 w-64 flex flex-col rounded-lg bg-secondary/40 border border-border/50">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${STAGE_DOT_COLORS[stage] ?? "bg-muted-foreground"}`} />
                  <span className="text-xs font-semibold">{stage}</span>
                  <span className="flex items-center justify-center size-5 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>
              </div>
              {items.length > 0 && (
                <div className="px-3 py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">
                    Total: <span className="font-semibold text-foreground tabular-nums">{fmtCurrency(totalValue)}</span>
                  </span>
                </div>
              )}
              <ScrollArea className="flex-1 max-h-[calc(100vh-320px)]">
                <div className="flex flex-col gap-2 p-2.5">
                  {items.map((prop) => (
                    <PipelineListingCard key={prop.id} prop={prop} />
                  ))}
                  {items.length === 0 && (
                    <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                      <Circle className="w-5 h-5 opacity-20" />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Process Flow ──────────────────────────────────────────────────────────────

function ProcessFlow() {
  const steps = [
    { label: "Scraping", icon: Search, desc: "Property feeds", value: "7 sources", active: true },
    { label: "Database", icon: Activity, desc: "Cloud connected", value: "PostgreSQL", active: true },
    { label: "LLM Analysis", icon: Bot, desc: "Scoring model", value: "Running", active: true },
    { label: "Outreach", icon: Send, desc: "AI-powered", value: "12 leads", active: true },
    { label: "CRM", icon: Users, desc: "Contact tracking", value: "7 contacts", active: true },
    { label: "Reporting", icon: BarChart3, desc: "Activity logs", value: "24 logs", active: true },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" /> Data Flow
      </h3>
      <div className="flex items-center gap-0 flex-wrap">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.label} className="flex items-center">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 min-w-[100px] text-center">
                <Icon className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-[11px] font-semibold">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                <p className="text-[11px] font-bold mt-1 text-primary">{step.value}</p>
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 shrink-0" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Add Contact Dialog ──────────────────────────────────────────────────────

function AddContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Add New Contact
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Email is mandatory. If adding a property, Source URL is required.</p>
        <form className="space-y-3 mt-2" onSubmit={(e) => { e.preventDefault(); onClose() }}>
          {[
            { label: "Email *", placeholder: "contact@example.com", type: "email", required: true },
            { label: "Name", placeholder: "Full name", type: "text" },
            { label: "Phone", placeholder: "+352 ...", type: "tel" },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
              <input type={f.type} required={f.required} placeholder={f.placeholder} className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background" />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Internal Notes</label>
            <textarea rows={2} className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background resize-none" />
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground font-medium mb-2">Optional: First Property</p>
            <div className="space-y-2">
              <input type="url" placeholder="Source URL (listing URL)" className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Price" className="text-sm px-3 py-2 rounded-lg border border-border bg-background" />
                <input type="number" placeholder="Beds" className="text-sm px-3 py-2 rounded-lg border border-border bg-background" />
                <input type="text" placeholder="City" className="text-sm px-3 py-2 rounded-lg border border-border bg-background" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1">Add Contact</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main CRM Page ─────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { key: "pipeline" as const, label: "Pipeline", icon: Activity },
  { key: "contacts" as const, label: "Contacts", icon: Users },
  { key: "flow" as const, label: "Data Flow", icon: ArrowRight },
]

export function CrmDashboard() {
  const [ownerList] = useState<CrmOwner[]>(initialOwners)
  const [selectedOwner, setSelectedOwner] = useState<CrmOwner | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStage, setFilterStage] = useState("")
  const [filterViability, setFilterViability] = useState("")
  const [filterCity, setFilterCity] = useState("")
  const [activeTab, setActiveTab] = useState<"contacts" | "pipeline" | "flow">("pipeline")
  const [addOwnerOpen, setAddOwnerOpen] = useState(false)
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Set<number>>(new Set())
  const [globalAiAuto, setGlobalAiAuto] = useState(true)

  const filteredOwners = useMemo(() => {
    let list = ownerList
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (o) =>
          o.owner_name.toLowerCase().includes(q) ||
          o.owner_email.toLowerCase().includes(q) ||
          o.owner_phone.toLowerCase().includes(q)
      )
    }
    if (filterStage) list = list.filter((o) => o.properties.some((p) => p.sales_pipeline_stage === filterStage))
    if (filterViability) {
      const min = Number(filterViability)
      if (!isNaN(min)) list = list.filter((o) => o.properties.some((p) => (p.viability_score ?? 0) >= min))
    }
    if (filterCity.trim()) {
      const city = filterCity.toLowerCase()
      list = list.filter((o) => o.properties.some((p) => p.location.toLowerCase().includes(city)))
    }
    return list
  }, [ownerList, searchQuery, filterStage, filterViability, filterCity])

  const totalProperties = ownerList.reduce((n, o) => n + o.properties.length, 0)
  const newLeadCount = ownerList.filter((o) => o.properties.some((p) => p.sales_pipeline_stage === "New Lead")).length
  const activeClients = ownerList.filter((o) =>
    o.properties.some((p) => p.sales_pipeline_stage === "Active Client" || p.sales_pipeline_stage === "Onboarded")
  ).length

  const toggleOwner = (id: number) => {
    setSelectedOwnerIds((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const selectAll = () => setSelectedOwnerIds(new Set(filteredOwners.map((o) => o.id)))
  const clearSelection = () => setSelectedOwnerIds(new Set())

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">CRM</h1>
            <Badge variant="secondary" className="text-xs">
              {ownerList.length} contacts
            </Badge>
            <div className="flex items-center gap-2">
              <Bot className={`w-4 h-4 ${globalAiAuto ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">AI Auto</span>
              <Switch checked={globalAiAuto} onCheckedChange={setGlobalAiAuto} />
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setAddOwnerOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Contact
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: "Total Contacts", value: ownerList.length, icon: Users, color: "text-primary" },
              { label: "Properties", value: totalProperties, icon: Building2, color: "text-foreground" },
              { label: "New Leads", value: newLeadCount, icon: Star, color: "text-score-orange" },
              { label: "Active Clients", value: activeClients, icon: CheckCircle2, color: "text-score-green" },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${s.color} shrink-0`} />
                  <div>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border bg-secondary/20 shrink-0">
          {MAIN_TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Contacts tab */}
        {activeTab === "contacts" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 py-3 border-b border-border bg-background flex flex-wrap items-center gap-3 shrink-0">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background" />
              </div>
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="text-sm rounded-lg border border-border bg-card px-3 py-1.5">
                <option value="">All stages</option>
                {SALES_STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              <select value={filterViability} onChange={(e) => setFilterViability(e.target.value)} className="text-sm rounded-lg border border-border bg-card px-3 py-1.5">
                <option value="">Any viability</option>
                {[5, 6, 7, 8, 9].map((n) => (<option key={n} value={String(n)}>{"Score \u2265 "}{n}</option>))}
              </select>
              <input type="text" placeholder="Filter by city..." value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="text-sm rounded-lg border border-border bg-background px-3 py-1.5 w-28" />
              {(filterStage || filterViability || filterCity) && (
                <button onClick={() => { setFilterStage(""); setFilterViability(""); setFilterCity("") }} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{filteredOwners.length} of {ownerList.length}</span>
            </div>

            {selectedOwnerIds.size > 0 && (
              <div className="px-6 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-3 flex-wrap shrink-0">
                <span className="text-sm font-medium text-primary">{selectedOwnerIds.size} selected</span>
                <Button size="sm" variant="outline"><Check className="w-3.5 h-3.5 mr-1" /> Mark Contacted</Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}><X className="w-3.5 h-3.5" /> Clear</Button>
              </div>
            )}

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-2">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-10 py-3 px-2 text-left">
                        <input type="checkbox" checked={selectedOwnerIds.size === filteredOwners.length && filteredOwners.length > 0} onChange={(e) => (e.target.checked ? selectAll() : clearSelection())} />
                      </th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Contact</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Phone</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Props</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Stage</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Score</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Last Contact</th>
                      <th className="w-10 py-3 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOwners.map((owner) => {
                      const topProp = owner.properties[0]
                      const avgScore =
                        owner.properties.length > 0
                          ? owner.properties.reduce((s, p) => s + (p.viability_score ?? 0), 0) / owner.properties.length
                          : null
                      return (
                        <tr key={owner.id} onClick={() => setSelectedOwner(owner)} className="border-b border-border/40 hover:bg-accent/20 cursor-pointer transition-colors group">
                          <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedOwnerIds.has(owner.id)} onChange={() => toggleOwner(owner.id)} />
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <ContactAvatar name={owner.owner_name} size="sm" />
                              <div>
                                <p className="font-semibold text-foreground">{owner.owner_name}</p>
                                <p className="text-xs text-muted-foreground">{owner.owner_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden sm:table-cell">
                            <p className="text-xs text-muted-foreground">{owner.owner_phone}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{owner.properties.length}</span>
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <StageBadge stage={topProp?.sales_pipeline_stage} />
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            {avgScore != null && avgScore > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <ViabilityScore score={Number(avgScore.toFixed(1))} />
                                <span className="text-xs font-medium">{avgScore.toFixed(1)}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{"\u2014"}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell text-xs text-muted-foreground">{fmtDate(owner.last_contact_date)}</td>
                          <td className="py-3 px-3">
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </div>
        )}

        {activeTab === "pipeline" && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              <PipelineKanban owners={ownerList} />
            </div>
          </ScrollArea>
        )}

        {activeTab === "flow" && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-4">
              <ProcessFlow />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Contact Profile Panel (slide-in right) */}
      {selectedOwner && (
        <div className="flex flex-col w-full md:w-[640px] lg:w-[780px] border-l border-border bg-card shrink-0 min-h-0">
          <ContactProfilePanel owner={selectedOwner} onClose={() => setSelectedOwner(null)} />
        </div>
      )}

      <AddContactDialog open={addOwnerOpen} onClose={() => setAddOwnerOpen(false)} />
    </div>
  )
}
