import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, Building2, MessageSquare, Phone, Mail, Globe, FileDown,
  Search, RefreshCw, ChevronRight, ChevronLeft, X, Plus, Star,
  TrendingUp, BarChart3, Zap, Bell, Check, Edit3, Save, ExternalLink,
  Facebook, Smartphone, Hash, Settings, AlertTriangle, Target,
  Calendar, Clock, Send, Trash2, MoreHorizontal, Filter, Bot,
  ArrowRight, CheckCircle2, Circle, Activity, PieChart, Eye
} from "lucide-react";
import { toast } from "sonner";
import {
  useCrmOwners, useLogs, useLeads, useDatabase,
  valuateCrmProperty, createCrmOwner,
  exportCrmOwnersCsv, exportCrmPropertiesCsv,
  exportCrmSingleOwnerCsv, exportCrmConversationsCsv,
  updateCrmOwner, updateCrmProperty, bulkUpdateCrm,
  getCrmConversations, postCrmConversation,
  type ValuationResult, type CrmConversation,
} from "@/hooks/useApi";
import type { CrmOwner, CrmProperty } from "@/types/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// ─── Constants ────────────────────────────────────────────────────────────────
const SALES_STAGES = [
  "New Lead", "Contacted", "Interested", "Call Booked",
  "Proposal Sent", "Contract Signed", "Onboarded", "Active Client",
];
const CHATBOT_STAGES = [
  "No Contact", "First Message Sent", "Replied",
  "Interested", "Call Booked", "Closed",
];
const AI_STOP_OPTIONS = [
  "Contact established", "Interest expressed", "Completely sold", "Never (manual only)",
];
const CHANNELS = [
  { key: "Email", icon: Mail, color: "text-primary" },
  { key: "WhatsApp", icon: Smartphone, color: "text-success" },
  { key: "Facebook Messenger", icon: Facebook, color: "text-blue-500" },
  { key: "Facebook Group", icon: Hash, color: "text-blue-400" },
  { key: "Website Form", icon: Globe, color: "text-purple-500" },
  { key: "Phone", icon: Phone, color: "text-orange-500" },
  { key: "SMS", icon: MessageSquare, color: "text-warning" },
];

const STAGE_COLORS: Record<string, string> = {
  "New Lead": "bg-muted text-muted-foreground",
  "Contacted": "bg-primary/15 text-primary",
  "Interested": "bg-warning/15 text-warning-foreground",
  "Call Booked": "bg-blue-100 text-blue-700",
  "Proposal Sent": "bg-purple-100 text-purple-700",
  "Contract Signed": "bg-success/15 text-success",
  "Onboarded": "bg-success/20 text-success",
  "Active Client": "bg-success/30 text-success",
  "No Contact": "bg-muted text-muted-foreground",
  "First Message Sent": "bg-primary/10 text-primary",
  "Replied": "bg-warning/15 text-warning-foreground",
  "Closed": "bg-success/20 text-success",
};

const RECOMMENDATION_CONFIG = {
  "Strong Buy": { color: "text-success", bg: "bg-success/10", icon: "🟢", score_min: 8 },
  "Good":       { color: "text-primary", bg: "bg-primary/10", icon: "🔵", score_min: 6 },
  "Marginal":   { color: "text-warning-foreground", bg: "bg-warning/10", icon: "🟡", score_min: 4 },
  "Avoid":      { color: "text-destructive", bg: "bg-destructive/10", icon: "🔴", score_min: 0 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(ts: number | null | undefined): string {
  if (ts == null) return "—";
  try {
    const d = new Date(ts > 1e10 ? ts : ts * 1000);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}
function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return `€${n.toLocaleString("en-EU", { maximumFractionDigits: 0 })}`;
}
function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string | null | undefined }) {
  if (!stage) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage] ?? "bg-muted text-muted-foreground"}`}>
      {stage}
    </span>
  );
}

function ViabilityScore({ score, size = "sm" }: { score: number | null | undefined; size?: "sm" | "lg" }) {
  if (score == null) return <span className="text-muted-foreground text-xs">Not rated</span>;
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "stroke-success" : score >= 6 ? "stroke-primary" : score >= 4 ? "stroke-warning" : "stroke-destructive";
  if (size === "lg") {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="15.9" fill="none" className={color} strokeWidth="2.5"
              strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{score}</span>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Viability Score</div>
          <div className="text-xs font-medium">/10</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-7 h-7">
        <svg viewBox="0 0 36 36" className="w-7 h-7 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" className={color} strokeWidth="3.5"
            strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{score}</span>
      </div>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const ch = CHANNELS.find(c => c.key.toLowerCase() === channel.toLowerCase());
  if (!ch) return <MessageSquare className="w-3.5 h-3.5" />;
  const Icon = ch.icon;
  return <Icon className={`w-3.5 h-3.5 ${ch.color}`} />;
}

// ─── Owner Avatar ──────────────────────────────────────────────────────────────
function OwnerAvatar({ owner, size = "md" }: { owner: CrmOwner; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} rounded-full bg-primary/15 flex items-center justify-center font-semibold text-primary flex-shrink-0`}>
      {initials(owner.owner_name)}
    </div>
  );
}

// ─── Property Card ─────────────────────────────────────────────────────────────
function PropertyCard({ property, onClick, selected }: { property: CrmProperty; onClick: () => void; selected?: boolean }) {
  const rec = property.recommendation as keyof typeof RECOMMENDATION_CONFIG | null;
  const recCfg = rec ? RECOMMENDATION_CONFIG[rec] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer
        ${selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/20"
        }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{property.title ?? "Untitled property"}</p>
          <p className="text-xs text-muted-foreground truncate">{property.location ?? "—"}</p>
        </div>
        <ViabilityScore score={property.viability_score} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold text-primary">{fmtCurrency(property.price ?? property.rent_price ?? property.sale_price)}</span>
        {property.bedrooms && <span className="text-xs text-muted-foreground">{property.bedrooms} bd</span>}
        {property.surface_m2 && <span className="text-xs text-muted-foreground">{property.surface_m2}m²</span>}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <StageBadge stage={property.sales_pipeline_stage} />
        {recCfg && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${recCfg.bg} ${recCfg.color}`}>
            {recCfg.icon} {rec}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Conversation Thread ───────────────────────────────────────────────────────
function ConversationThread({
  propertyId,
  conversations,
  onRefresh,
}: {
  propertyId: number;
  conversations: CrmConversation[];
  onRefresh: () => void;
}) {
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    let list = conversations;
    if (activeChannel !== "all") list = list.filter(c => c.channel.toLowerCase() === activeChannel.toLowerCase());
    if (searchTerm.trim()) list = list.filter(c => c.message_text?.toLowerCase().includes(searchTerm.toLowerCase()));
    return [...list].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }, [conversations, activeChannel, searchTerm]);

  const usedChannels = useMemo(() => {
    const seen = new Set<string>();
    conversations.forEach(c => seen.add(c.channel));
    return Array.from(seen);
  }, [conversations]);

  const sendMsg = () => {
    if (!msgText.trim()) return;
    setSending(true);
    postCrmConversation(propertyId, { channel: activeChannel === "all" ? "Email" : activeChannel, message_text: msgText.trim(), sender: "user" })
      .then(() => { setMsgText(""); onRefresh(); toast.success("Message logged"); })
      .catch(e => toast.error(e.message ?? "Failed to log message"))
      .finally(() => setSending(false));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 flex-shrink-0">
        <button
          onClick={() => setActiveChannel("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
            ${activeChannel === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
        >All</button>
        {usedChannels.map(ch => (
          <button
            key={ch}
            onClick={() => setActiveChannel(ch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
              ${activeChannel === ch ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            <ChannelIcon channel={ch} />
            {ch}
          </button>
        ))}
        {CHANNELS.filter(c => !usedChannels.includes(c.key)).map(ch => (
          <button
            key={ch.key}
            onClick={() => setActiveChannel(ch.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap text-muted-foreground bg-muted/50 hover:bg-accent transition-colors"
          >
            <ch.icon className={`w-3 h-3 ${ch.color}`} />
            {ch.key}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-2 flex-shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search messages…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background"
        />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-2">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No messages yet on this channel.</p>
            </div>
          )}
          {filtered.map(msg => {
            const isAI = msg.sender === "ai";
            const isUser = msg.sender === "user";
            return (
              <div key={msg.id} className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold
                  ${isAI ? "bg-primary/15 text-primary" : isUser ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {isAI ? "AI" : isUser ? "Me" : "O"}
                </div>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs
                  ${isAI ? "bg-primary/8 text-foreground border border-primary/10"
                    : isUser ? "bg-success/8 text-foreground border border-success/10"
                    : "bg-muted/60 text-foreground"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <ChannelIcon channel={msg.channel} />
                    <span className="text-muted-foreground text-[10px]">{msg.channel}</span>
                    <span className="text-muted-foreground text-[10px] ml-auto">{fmtDate(msg.timestamp)}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message_text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Compose */}
      <div className="flex gap-2 mt-2 flex-shrink-0">
        <input
          type="text"
          placeholder={`Log message via ${activeChannel === "all" ? "Email" : activeChannel}…`}
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
          className="flex-1 text-xs px-3 py-2 rounded-lg border border-border bg-background"
        />
        <Button size="sm" disabled={sending || !msgText.trim()} onClick={sendMsg} className="flex-shrink-0">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Valuation Panel ───────────────────────────────────────────────────────────
function ValuationPanel({
  property,
  result,
  loading,
  error,
  onReEvaluate,
}: {
  property: CrmProperty;
  result: ValuationResult | null;
  loading: boolean;
  error: string | null;
  onReEvaluate: () => void;
}) {
  const rec = (result?.recommendation ?? property.recommendation) as keyof typeof RECOMMENDATION_CONFIG | null;
  const recCfg = rec ? RECOMMENDATION_CONFIG[rec] : null;
  const score = result?.property_valuation_score ?? property.viability_score;
  const annualGross = result?.estimated_annual_gross_revenue ?? property.estimated_annual_gross;
  const pe = result?.price_to_earnings_ratio ?? property.price_to_earnings;
  const certainty = result?.market_summary ? "High" : property.degree_of_certainty ?? "Not Certain";

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className={`rounded-xl p-4 border ${recCfg ? recCfg.bg.replace("bg-", "border-").replace("/10", "/20") : "border-border"} ${recCfg?.bg ?? "bg-muted/30"}`}>
        <div className="flex items-center gap-4">
          <ViabilityScore score={score} size="lg" />
          <div className="flex-1">
            {rec && recCfg && (
              <div className={`text-lg font-bold ${recCfg.color}`}>{recCfg.icon} {rec}</div>
            )}
            <div className="text-xs text-muted-foreground mt-0.5">
              Certainty: <span className={`font-medium ${certainty === "High" ? "text-success" : certainty === "Not Certain" ? "text-destructive" : "text-warning-foreground"}`}>{certainty}</span>
            </div>
            {result?.recommendation && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.reasoning ?? ""}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={onReEvaluate} disabled={loading} className="flex-shrink-0">
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Re-evaluate
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

      {/* Financial metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Est. Annual Gross</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {annualGross != null ? (typeof annualGross === "number" ? fmtCurrency(annualGross) : annualGross) : <span className="text-muted-foreground text-sm">Not Certain</span>}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">P/E Ratio</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {pe != null ? (typeof pe === "number" ? `${pe.toFixed(1)}×` : pe) : <span className="text-muted-foreground text-sm">Not Certain</span>}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <PieChart className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Cap Rate</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {result?.cap_rate ?? <span className="text-muted-foreground text-sm">—</span>}
          </p>
        </div>
      </div>

      {/* Market summary */}
      {result?.market_summary && (
        <div className="rounded-lg border border-border p-3 bg-muted/30">
          <p className="text-xs font-semibold mb-2">Market Context</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">Avg. Daily Rate:</span><br/><span className="font-medium">{result.market_summary.adr ? `€${result.market_summary.adr}` : "—"}</span></div>
            <div><span className="text-muted-foreground">Occupancy:</span><br/><span className="font-medium">{result.market_summary.occupancy ? `${(result.market_summary.occupancy * 100).toFixed(0)}%` : "—"}</span></div>
            <div><span className="text-muted-foreground">Price Range:</span><br/><span className="font-medium">{result.market_summary.price_range?.join(" – ") ?? "—"}</span></div>
          </div>
          {result.market_summary.from_fallback && <p className="text-[10px] text-muted-foreground mt-2">ⓘ Market data based on regional estimates.</p>}
        </div>
      )}

      {/* Strengths / Risks */}
      {(result?.key_strengths?.length || result?.key_risks?.length) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {result.key_strengths?.length ? (
            <div className="rounded-lg border border-success/20 bg-success/5 p-3">
              <p className="text-xs font-semibold text-success mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Key Strengths</p>
              <ul className="space-y-1">
                {result.key_strengths.map((s, i) => <li key={i} className="text-xs text-foreground flex items-start gap-1.5"><span className="text-success mt-0.5">•</span>{s}</li>)}
              </ul>
            </div>
          ) : null}
          {result.key_risks?.length ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Key Risks</p>
              <ul className="space-y-1">
                {result.key_risks.map((r, i) => <li key={i} className="text-xs text-foreground flex items-start gap-1.5"><span className="text-destructive mt-0.5">•</span>{r}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {/* Suggested management fee */}
      {result?.suggested_management_fee && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          <span className="font-semibold text-primary">Suggested Management Fee: </span>
          <span>{result.suggested_management_fee}</span>
        </div>
      )}
    </div>
  );
}

// ─── Property Detail Panel ─────────────────────────────────────────────────────
function PropertyDetailPanel({
  property,
  ownerId,
  conversations,
  onConvRefresh,
  onPropertyUpdate,
  onClose,
  aiAutoEnabled,
  aiStopAt,
}: {
  property: CrmProperty;
  ownerId: number;
  conversations: CrmConversation[];
  onConvRefresh: () => void;
  onPropertyUpdate: () => void;
  onClose: () => void;
  aiAutoEnabled: boolean;
  aiStopAt: string;
}) {
  const [tab, setTab] = useState<"overview" | "valuation" | "conversation" | "edit">("overview");
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    setEditFields({
      title: property.title ?? "",
      price: String(property.price ?? ""),
      rent_price: String(property.rent_price ?? ""),
      sale_price: String(property.sale_price ?? ""),
      bedrooms: String(property.bedrooms ?? ""),
      bathrooms: String(property.bathrooms ?? ""),
      surface_m2: String(property.surface_m2 ?? ""),
      rooms: String(property.rooms ?? ""),
      location: property.location ?? "",
      address: property.address ?? "",
      description: property.description ?? "",
      listing_url: property.listing_url ?? "",
      transaction_type: property.transaction_type ?? "",
      contact_email: property.contact_email ?? "",
      phone_number: property.phone_number ?? "",
      source: property.source ?? "",
    });
  }, [property]);

  const runValuation = useCallback(() => {
    setValuationLoading(true);
    setValuationError(null);
    valuateCrmProperty(property)
      .then(r => { setValuationResult(r); toast.success("Re-evaluation complete"); })
      .catch(e => { setValuationError(e.message ?? "Valuation failed"); toast.error("Valuation failed"); })
      .finally(() => setValuationLoading(false));
  }, [property]);

  const saveEdits = () => {
    setSaving(true);
    const body: Record<string, string | number | null> = {};
    Object.entries(editFields).forEach(([k, v]) => {
      if (["price", "rent_price", "sale_price", "bedrooms", "bathrooms", "surface_m2", "rooms"].includes(k)) {
        body[k] = v !== "" ? Number(v) : null;
      } else {
        body[k] = v || null;
      }
    });
    updateCrmProperty(property.id, body)
      .then(() => { toast.success("Property saved"); onPropertyUpdate(); })
      .catch(e => toast.error(e.message ?? "Save failed"))
      .finally(() => setSaving(false));
  };

  const changeStage = (field: "sales_pipeline_stage" | "chatbot_pipeline_stage", value: string) => {
    setUpdatingStage(true);
    updateCrmProperty(property.id, { [field]: value })
      .then(() => { toast.success(`Stage updated to "${value}"`); onPropertyUpdate(); })
      .catch(e => toast.error(e.message ?? "Update failed"))
      .finally(() => setUpdatingStage(false));
  };

  const TABS = [
    { key: "overview", label: "Overview", icon: Eye },
    { key: "valuation", label: "Valuation", icon: TrendingUp },
    { key: "conversation", label: "Conversations", icon: MessageSquare },
    { key: "edit", label: "Edit Fields", icon: Edit3 },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Property header */}
      <div className="p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground truncate">{property.title ?? "Untitled property"}</h3>
              <StageBadge stage={property.sales_pipeline_stage} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{property.location ?? "—"}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xl font-bold text-primary">{fmtCurrency(property.price ?? property.rent_price ?? property.sale_price)}</span>
              {property.bedrooms != null && <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{property.bedrooms} bd</span>}
              {property.bathrooms != null && <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{property.bathrooms} ba</span>}
              {property.surface_m2 != null && <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{property.surface_m2}m²</span>}
              {property.transaction_type && <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full capitalize">{property.transaction_type}</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pipeline selectors */}
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sales</span>
            <select
              disabled={updatingStage}
              value={property.sales_pipeline_stage ?? "New Lead"}
              onChange={e => changeStage("sales_pipeline_stage", e.target.value)}
              className="text-xs rounded-lg border border-border bg-background px-2 py-1 font-medium"
            >
              {SALES_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Chatbot</span>
            <select
              disabled={updatingStage}
              value={property.chatbot_pipeline_stage ?? "No Contact"}
              onChange={e => changeStage("chatbot_pipeline_stage", e.target.value)}
              className="text-xs rounded-lg border border-border bg-background px-2 py-1 font-medium"
            >
              {CHATBOT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {property.listing_url && (
            <a href={property.listing_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary hover:bg-accent transition-colors">
              <ExternalLink className="w-3 h-3" /> View listing
            </a>
          )}
          <button
            onClick={() => updateCrmProperty(property.id, { chatbot_pipeline_stage: "First Message Sent" }).then(onPropertyUpdate)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary hover:bg-accent transition-colors"
          >
            <Check className="w-3 h-3 text-success" /> Mark Contacted
          </button>
          <button
            onClick={() => updateCrmProperty(property.id, { sales_pipeline_stage: "Call Booked" }).then(onPropertyUpdate)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary hover:bg-accent transition-colors"
          >
            <Calendar className="w-3 h-3 text-primary" /> Book Call
          </button>
          <button
            onClick={() => { exportCrmSingleOwnerCsv(ownerId); toast.success("CSV export started"); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-secondary hover:bg-accent transition-colors"
          >
            <FileDown className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-border bg-secondary/30 flex-shrink-0">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors
                ${tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
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
                    ["Size", property.surface_m2 ? `${property.surface_m2} m²` : null],
                    ["Rooms", property.rooms],
                    ["Transaction", property.transaction_type],
                    ["Source", property.source ?? property.source_platform],
                    ["Ref", property.listing_ref],
                    ["First Seen", property.first_seen],
                  ].map(([label, value]) => value != null && value !== "" ? (
                    <div key={String(label)} className="flex justify-between text-xs gap-2">
                      <span className="text-muted-foreground flex-shrink-0">{label}</span>
                      <span className="font-medium text-right truncate max-w-[60%]">{String(value)}</span>
                    </div>
                  ) : null)}
                </div>
                <div className="rounded-xl border border-border p-4 bg-card space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact & Financials</h4>
                  {[
                    ["Email", property.contact_email],
                    ["Phone", property.phone_number],
                    ["Price", fmtCurrency(property.price)],
                    ["Rent", fmtCurrency(property.rent_price)],
                    ["Sale Price", fmtCurrency(property.sale_price)],
                    ["Deposit", fmtCurrency(property.deposit)],
                    ["Charges/mo", fmtCurrency(property.monthly_charges)],
                    ["Last Contact", fmtDate(property.last_contact_date)],
                  ].map(([label, value]) => value != null && value !== "—" && value !== "" ? (
                    <div key={String(label)} className="flex justify-between text-xs gap-2">
                      <span className="text-muted-foreground flex-shrink-0">{label}</span>
                      <span className="font-medium text-right">{String(value)}</span>
                    </div>
                  ) : null)}
                </div>
              </div>
              {property.description && (
                <div className="rounded-xl border border-border p-4 bg-card">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Description</h4>
                  <p className="text-xs text-foreground leading-relaxed">{property.description}</p>
                </div>
              )}
              {/* AI automation for this property */}
              <div className={`rounded-xl border p-4 ${aiAutoEnabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Bot className={`w-4 h-4 ${aiAutoEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold">AI Automation</span>
                  <span className={`ml-auto text-xs font-medium ${aiAutoEnabled ? "text-primary" : "text-muted-foreground"}`}>
                    {aiAutoEnabled ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Stops at: <span className="font-medium text-foreground">{aiStopAt}</span></p>
              </div>
            </div>
          )}

          {tab === "valuation" && (
            <ValuationPanel
              property={property}
              result={valuationResult}
              loading={valuationLoading}
              error={valuationError}
              onReEvaluate={runValuation}
            />
          )}

          {tab === "conversation" && (
            <div className="h-[400px] flex flex-col">
              <ConversationThread
                propertyId={property.id}
                conversations={conversations}
                onRefresh={onConvRefresh}
              />
            </div>
          )}

          {tab === "edit" && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { key: "title", label: "Title", type: "text" },
                  { key: "location", label: "Location", type: "text" },
                  { key: "address", label: "Address", type: "text" },
                  { key: "price", label: "Price (€)", type: "number" },
                  { key: "rent_price", label: "Rent Price (€)", type: "number" },
                  { key: "sale_price", label: "Sale Price (€)", type: "number" },
                  { key: "bedrooms", label: "Bedrooms", type: "number" },
                  { key: "bathrooms", label: "Bathrooms", type: "number" },
                  { key: "surface_m2", label: "Size (m²)", type: "number" },
                  { key: "rooms", label: "Rooms", type: "number" },
                  { key: "transaction_type", label: "Transaction Type", type: "text" },
                  { key: "contact_email", label: "Contact Email", type: "email" },
                  { key: "phone_number", label: "Phone", type: "text" },
                  { key: "listing_url", label: "Listing URL", type: "url" },
                  { key: "source", label: "Source", type: "text" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                    <input
                      type={f.type}
                      value={editFields[f.key] ?? ""}
                      onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={editFields.description ?? ""}
                  onChange={e => setEditFields(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background resize-y"
                />
              </div>
              <Button onClick={saveEdits} disabled={saving} className="w-full">
                <Save className="w-3.5 h-3.5 mr-2" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Owner Profile Panel ───────────────────────────────────────────────────────
function OwnerProfilePanel({
  owner,
  onClose,
  onRefresh,
}: {
  owner: CrmOwner;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [selectedProperty, setSelectedProperty] = useState<CrmProperty | null>(null);
  const [conversations, setConversations] = useState<CrmConversation[]>([]);
  const [aiAutoEnabled, setAiAutoEnabled] = useState(true);
  const [aiStopAt, setAiStopAt] = useState("Interest expressed");
  const [editOwner, setEditOwner] = useState({ name: owner.owner_name ?? "", email: owner.owner_email ?? "", phone: owner.owner_phone ?? "", notes: owner.owner_notes ?? "" });
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerTab, setOwnerTab] = useState<"properties" | "contact">("properties");

  useEffect(() => {
    setEditOwner({ name: owner.owner_name ?? "", email: owner.owner_email ?? "", phone: owner.owner_phone ?? "", notes: owner.owner_notes ?? "" });
  }, [owner]);

  useEffect(() => {
    if (selectedProperty) {
      getCrmConversations(selectedProperty.id).then(setConversations).catch(() => setConversations([]));
    }
  }, [selectedProperty]);

  const saveOwner = () => {
    setSavingOwner(true);
    updateCrmOwner(owner.id, { owner_name: editOwner.name, owner_email: editOwner.email, owner_phone: editOwner.phone, owner_notes: editOwner.notes })
      .then(() => { toast.success("Owner saved"); onRefresh(); })
      .catch(e => toast.error(e.message ?? "Save failed"))
      .finally(() => setSavingOwner(false));
  };

  const properties = owner.properties ?? [];
  const lastContact = fmtDate(owner.last_contact_date);

  return (
    <div className="flex flex-col h-full">
      {/* Owner header */}
      <div className="p-5 border-b border-border bg-gradient-to-r from-primary/5 to-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <OwnerAvatar owner={owner} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg text-foreground truncate">{owner.owner_name ?? "Unknown Owner"}</h2>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              {owner.owner_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{owner.owner_email}</span>}
              {owner.owner_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{owner.owner_phone}</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last contact: {lastContact}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-3">
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{properties.length}</div>
            <div className="text-[10px] text-muted-foreground">Properties</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">
              {properties.filter(p => p.sales_pipeline_stage === "Active Client" || p.sales_pipeline_stage === "Onboarded").length}
            </div>
            <div className="text-[10px] text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">
              {properties.reduce((sum, p) => sum + (p.viability_score ?? 0), 0) / (properties.length || 1) > 0
                ? (properties.reduce((sum, p) => sum + (p.viability_score ?? 0), 0) / properties.length).toFixed(1)
                : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">Avg. Score</div>
          </div>
        </div>

        {/* AI Automation controls */}
        <div className={`mt-4 rounded-xl border p-3 ${aiAutoEnabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className={`w-4 h-4 ${aiAutoEnabled ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs font-semibold">AI Automation</p>
                <p className="text-[10px] text-muted-foreground">Allow AI to continue conversations automatically</p>
              </div>
            </div>
            <Switch checked={aiAutoEnabled} onCheckedChange={setAiAutoEnabled} />
          </div>
          {aiAutoEnabled && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">AI stops at:</span>
              <select
                value={aiStopAt}
                onChange={e => setAiStopAt(e.target.value)}
                className="flex-1 text-xs rounded-lg border border-border bg-background px-2 py-1"
              >
                {AI_STOP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Owner sub-tabs */}
      <div className="flex border-b border-border bg-secondary/30 flex-shrink-0">
        <button
          onClick={() => setOwnerTab("properties")}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors
            ${ownerTab === "properties" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Building2 className="w-3.5 h-3.5" /> Properties ({properties.length})
        </button>
        <button
          onClick={() => setOwnerTab("contact")}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors
            ${ownerTab === "contact" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit Owner
        </button>
      </div>

      {/* Main panel split: property list + property detail */}
      {ownerTab === "properties" ? (
        <div className="flex flex-1 min-h-0">
          {/* Property cards list */}
          <div className={`flex-shrink-0 border-r border-border ${selectedProperty ? "w-72" : "w-full"} transition-all`}>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {properties.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No properties linked to this owner.</p>
                  </div>
                )}
                {properties.map(prop => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onClick={() => setSelectedProperty(prev => prev?.id === prop.id ? null : prop)}
                    selected={selectedProperty?.id === prop.id}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Property detail (slide in) */}
          {selectedProperty && (
            <div className="flex-1 flex flex-col min-w-0">
              <PropertyDetailPanel
                property={selectedProperty}
                ownerId={owner.id}
                conversations={conversations}
                onConvRefresh={() => getCrmConversations(selectedProperty.id).then(setConversations).catch(() => {})}
                onPropertyUpdate={onRefresh}
                onClose={() => setSelectedProperty(null)}
                aiAutoEnabled={aiAutoEnabled}
                aiStopAt={aiStopAt}
              />
            </div>
          )}
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-4 max-w-md">
            <h4 className="text-sm font-semibold">Owner Information</h4>
            {[
              { key: "name", label: "Name", type: "text", placeholder: "Full name" },
              { key: "email", label: "Email *", type: "email", placeholder: "owner@example.com" },
              { key: "phone", label: "Phone", type: "tel", placeholder: "+352 ..." },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <input
                  type={f.type}
                  value={editOwner[f.key as keyof typeof editOwner]}
                  onChange={e => setEditOwner(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Internal Notes</label>
              <textarea
                value={editOwner.notes}
                onChange={e => setEditOwner(p => ({ ...p, notes: e.target.value }))}
                rows={4}
                placeholder="Notes visible only to you…"
                className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background resize-y"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveOwner} disabled={savingOwner} className="flex-1">
                <Save className="w-3.5 h-3.5 mr-2" />
                {savingOwner ? "Saving…" : "Save Owner"}
              </Button>
              <Button variant="outline" onClick={() => exportCrmSingleOwnerCsv(owner.id)}>
                <FileDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Pipeline Kanban ───────────────────────────────────────────────────────────
function PipelineKanban({ owners }: { owners: CrmOwner[] }) {
  const [pipelineType, setPipelineType] = useState<"sales" | "chatbot">("sales");
  const stages = pipelineType === "sales" ? SALES_STAGES : CHATBOT_STAGES;

  const buckets = useMemo(() => {
    const map: Record<string, CrmOwner[]> = {};
    stages.forEach(s => { map[s] = []; });
    owners.forEach(o => {
      const props = o.properties ?? [];
      if (pipelineType === "sales") {
        const stageSet = new Set(props.map(p => p.sales_pipeline_stage ?? "New Lead"));
        stageSet.forEach(s => { if (map[s]) map[s].push(o); });
      } else {
        const stageSet = new Set(props.map(p => p.chatbot_pipeline_stage ?? "No Contact"));
        stageSet.forEach(s => { if (map[s]) map[s].push(o); });
      }
    });
    return map;
  }, [owners, pipelineType, stages]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setPipelineType("sales")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pipelineType === "sales" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
        >Sales Pipeline</button>
        <button
          onClick={() => setPipelineType("chatbot")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pipelineType === "chatbot" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
        >Chatbot Pipeline</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage, idx) => {
          const items = buckets[stage] ?? [];
          const isLate = pipelineType === "sales" ? idx >= 5 : idx >= 4;
          return (
            <div key={stage} className="flex-shrink-0 w-52">
              <div className={`rounded-t-xl px-3 py-2 border border-b-0 border-border ${isLate ? "bg-success/10" : "bg-secondary/50"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{stage}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${items.length > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {items.length}
                  </span>
                </div>
              </div>
              <div className="rounded-b-xl border border-t-0 border-border bg-card min-h-[120px] p-2 space-y-2">
                {items.map(o => (
                  <div key={o.id} className="rounded-lg bg-background border border-border p-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <OwnerAvatar owner={o} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate">{o.owner_name ?? "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{o.properties?.length ?? 0} props</p>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Circle className="w-5 h-5 mx-auto opacity-20" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Process Flow ──────────────────────────────────────────────────────────────
function ProcessFlow({ leadsCount, logsCount, dbConfigured }: { leadsCount: number; logsCount: number; dbConfigured: boolean }) {
  const steps = [
    { label: "Onboarding", icon: Settings, desc: "Operator config", value: "1 operator", active: true },
    { label: "Database", icon: Activity, desc: dbConfigured ? "MongoDB connected" : "SQLite (local)", value: dbConfigured ? "Cloud" : "Local", active: true },
    { label: "Context", icon: Target, desc: "LLM system prompt", value: "Injected", active: true },
    { label: "LLM", icon: Bot, desc: "Ollama model", value: "Running", active: true },
    { label: "Outreach", icon: Send, desc: "Leads generated", value: `${leadsCount} leads`, active: leadsCount > 0 },
    { label: "Logging", icon: BarChart3, desc: "Activity tracked", value: `${logsCount} logs`, active: logsCount > 0 },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" /> Data Flow
      </h3>
      <div className="flex items-center gap-0 flex-wrap">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-center">
              <div className={`rounded-xl border p-3 min-w-[100px] text-center
                ${step.active ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${step.active ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-[11px] font-semibold">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                <p className={`text-[11px] font-bold mt-1 ${step.active ? "text-primary" : "text-muted-foreground"}`}>{step.value}</p>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Owner Dialog ──────────────────────────────────────────────────────────
function AddOwnerDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ owner_email: "", owner_name: "", owner_phone: "", owner_notes: "", listing_url: "", price: "", bedrooms: "", location: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.owner_email.trim()) return;
    const hasPropertyData = form.listing_url.trim() || form.price || form.bedrooms || form.location.trim();
    if (hasPropertyData && !form.listing_url.trim()) { setError("Source URL is required when adding a property."); return; }
    setSubmitting(true); setError(null);
    createCrmOwner({
      owner_email: form.owner_email.trim(),
      owner_name: form.owner_name.trim() || undefined,
      owner_phone: form.owner_phone.trim() || undefined,
      owner_notes: form.owner_notes.trim() || undefined,
      listing_url: form.listing_url.trim() || undefined,
      price: form.price ? Number(form.price) : undefined,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      location: form.location.trim() || undefined,
    })
      .then(() => { toast.success("Owner added successfully"); onSuccess(); onClose(); })
      .catch(e => setError(e.message ?? "Failed to add owner"))
      .finally(() => setSubmitting(false));
  };

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "", required = false) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}{required && " *"}</label>
      <input type={type} required={required} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder} className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Add Manual Lead / Owner
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Email is mandatory. If adding a property, Source URL is required.</p>
        <form onSubmit={submit} className="space-y-3 mt-2">
          {field("owner_email", "Email", "email", "owner@example.com", true)}
          {field("owner_name", "Name", "text", "Full name")}
          {field("owner_phone", "Phone", "tel", "+352 ...")}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Internal Notes</label>
            <textarea value={form.owner_notes} onChange={e => setForm(p => ({ ...p, owner_notes: e.target.value }))} rows={2}
              className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-border bg-background resize-none" />
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground font-medium mb-2">Optional: First Property</p>
            {field("listing_url", "Source URL (listing URL)", "url", "https://...")}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {field("price", "Price (€)", "number")}
              {field("bedrooms", "Bedrooms", "number")}
              {field("location", "City")}
            </div>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Saving…" : "Add Owner"}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main CRM Page ─────────────────────────────────────────────────────────────
export default function CRMPage() {
  const { data: owners, error, refresh } = useCrmOwners(15000);
  const { data: leadsData } = useLeads(30000);
  const { data: logsData } = useLogs(30000);
  const { data: dbInfo } = useDatabase(60000);

  const [selectedOwner, setSelectedOwner] = useState<CrmOwner | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterViability, setFilterViability] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [activeTab, setActiveTab] = useState<"owners" | "pipeline" | "flow">("owners");
  const [addOwnerOpen, setAddOwnerOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Set<number>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [globalAiAuto, setGlobalAiAuto] = useState(true);

  const ownerList: CrmOwner[] = Array.isArray(owners) ? owners : [];
  const isLoading = owners === null && !error;
  const leadsCount = Array.isArray(leadsData) ? leadsData.length : 0;
  const logsCount = Array.isArray(logsData) ? logsData.length : 0;

  const filteredOwners = useMemo(() => {
    let list = ownerList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        (o.owner_name ?? "").toLowerCase().includes(q) ||
        (o.owner_email ?? "").toLowerCase().includes(q) ||
        (o.owner_phone ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStage) list = list.filter(o => o.properties?.some(p => p.sales_pipeline_stage === filterStage));
    if (filterViability) {
      const min = Number(filterViability);
      if (!isNaN(min)) list = list.filter(o => o.properties?.some(p => (p.viability_score ?? 0) >= min));
    }
    if (filterCity.trim()) {
      const city = filterCity.toLowerCase();
      list = list.filter(o => o.properties?.some(p => (p.location ?? "").toLowerCase().includes(city)));
    }
    return list;
  }, [ownerList, searchQuery, filterStage, filterViability, filterCity]);

  const totalProperties = ownerList.reduce((n, o) => n + (o.properties?.length ?? 0), 0);
  const newLeadCount = ownerList.filter(o => o.properties?.some(p => p.sales_pipeline_stage === "New Lead")).length;
  const activeClients = ownerList.filter(o => o.properties?.some(p => p.sales_pipeline_stage === "Active Client" || p.sales_pipeline_stage === "Onboarded")).length;

  const toggleOwner = (id: number) => {
    setSelectedOwnerIds(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const selectAll = () => setSelectedOwnerIds(new Set(filteredOwners.map(o => o.id)));
  const clearSelection = () => setSelectedOwnerIds(new Set());

  const doExport = async (fn: () => Promise<void>, label: string) => {
    setExportingCsv(true);
    try { await fn(); toast.success(`${label} exported`); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Export failed"); }
    finally { setExportingCsv(false); }
  };

  const TABS = [
    { key: "owners", label: "Owner List", icon: Users },
    { key: "pipeline", label: "Pipeline", icon: Layers },
    { key: "flow", label: "Data Flow", icon: Activity },
  ] as const;

  return (
    <div className="flex h-full min-h-0">
      {/* ── Main area ── */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all ${selectedOwner ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CRM</h1>
              <p className="text-xs text-muted-foreground">Owner-centric lead management · {ownerList.length} owners · {totalProperties} properties</p>
            </div>
            {/* Global AI toggle */}
            <div className={`ml-4 flex items-center gap-2 px-3 py-1.5 rounded-xl border ${globalAiAuto ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
              <Bot className={`w-3.5 h-3.5 ${globalAiAuto ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">AI Auto</span>
              <Switch checked={globalAiAuto} onCheckedChange={setGlobalAiAuto} />
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setAddOwnerOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Owner
              </Button>
              <div className="relative">
                <select
                  onChange={e => {
                    const v = e.target.value; e.target.value = "";
                    if (v === "owners") doExport(exportCrmOwnersCsv, "Owners CSV");
                    else if (v === "properties") doExport(exportCrmPropertiesCsv, "Properties CSV");
                    else if (v === "chat") doExport(exportCrmConversationsCsv, "Chat history CSV");
                  }}
                  disabled={exportingCsv}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-accent cursor-pointer pr-8 disabled:opacity-50"
                >
                  <option value="">Export…</option>
                  <option value="owners">All Owners CSV</option>
                  <option value="properties">All Properties CSV</option>
                  <option value="chat">All Chat History CSV</option>
                </select>
                <FileDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <Button size="sm" variant="outline" onClick={() => refresh()} disabled={isLoading}>
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Summary stats */}
          {!isLoading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Total Owners", value: ownerList.length, icon: Users, color: "text-primary" },
                { label: "Properties", value: totalProperties, icon: Building2, color: "text-foreground" },
                { label: "New Leads", value: newLeadCount, icon: Star, color: "text-warning-foreground" },
                { label: "Active Clients", value: activeClients, icon: CheckCircle2, color: "text-success" },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl border border-border bg-background p-3 flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
                    <div>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border bg-secondary/20 flex-shrink-0">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={refresh}>Retry</Button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
              <p className="text-sm">Loading CRM data…</p>
              <p className="text-xs mt-1">Make sure the API is running on port 8000.</p>
            </div>
          </div>
        )}

        {/* Tab content */}
        {!isLoading && activeTab === "owners" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Filters */}
            <div className="px-6 py-3 border-b border-border bg-background flex flex-wrap items-center gap-3 flex-shrink-0">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search owners…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background" />
              </div>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="text-sm rounded-lg border border-border bg-card px-3 py-1.5">
                <option value="">All stages</option>
                {SALES_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterViability} onChange={e => setFilterViability(e.target.value)}
                className="text-sm rounded-lg border border-border bg-card px-3 py-1.5">
                <option value="">Any viability</option>
                {[5,6,7,8,9].map(n => <option key={n} value={String(n)}>Score ≥ {n}</option>)}
              </select>
              <input type="text" placeholder="Filter by city…" value={filterCity} onChange={e => setFilterCity(e.target.value)}
                className="text-sm rounded-lg border border-border bg-background px-3 py-1.5 w-28" />
              {(filterStage || filterViability || filterCity) && (
                <button onClick={() => { setFilterStage(""); setFilterViability(""); setFilterCity(""); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{filteredOwners.length} of {ownerList.length}</span>
            </div>

            {/* Bulk actions */}
            {selectedOwnerIds.size > 0 && (
              <div className="px-6 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-3 flex-wrap flex-shrink-0">
                <span className="text-sm font-medium text-primary">{selectedOwnerIds.size} selected</span>
                <Button size="sm" variant="outline" disabled={bulkUpdating}
                  onClick={() => { setBulkUpdating(true); bulkUpdateCrm({ owner_ids: [...selectedOwnerIds], mark_contacted: true }).then(() => { refresh(); clearSelection(); toast.success("Marked as contacted"); }).finally(() => setBulkUpdating(false)); }}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Mark Contacted
                </Button>
                <select className="text-xs rounded-lg border border-border bg-card px-2 py-1.5"
                  onChange={e => { const v = e.target.value; if (!v) return; setBulkUpdating(true); bulkUpdateCrm({ owner_ids: [...selectedOwnerIds], sales_pipeline_stage: v }).then(() => { refresh(); clearSelection(); toast.success(`Stage changed to "${v}"`); }).finally(() => setBulkUpdating(false)); }}>
                  <option value="">Change stage…</option>
                  {SALES_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button size="sm" variant="outline" onClick={() => { selectedOwnerIds.forEach(id => exportCrmSingleOwnerCsv(id)); clearSelection(); }}>
                  <FileDown className="w-3.5 h-3.5 mr-1" /> Export
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}><X className="w-3.5 h-3.5" /> Clear</Button>
              </div>
            )}

            {/* Owner table */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-2">
                {filteredOwners.length === 0 && ownerList.length > 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No owners match your filters.</p>
                    <button className="text-xs text-primary hover:underline mt-1" onClick={() => { setSearchQuery(""); setFilterStage(""); setFilterViability(""); setFilterCity(""); }}>Clear all filters</button>
                  </div>
                )}
                {ownerList.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No owners yet</p>
                    <p className="text-xs mt-1">Run the scan to auto-populate, or add manually.</p>
                    <Button size="sm" className="mt-4" onClick={() => setAddOwnerOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Add Owner</Button>
                  </div>
                )}
                {filteredOwners.length > 0 && (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="w-10 py-3 px-2 text-left">
                          <input type="checkbox" checked={selectedOwnerIds.size === filteredOwners.length && filteredOwners.length > 0}
                            onChange={e => e.target.checked ? selectAll() : clearSelection()} />
                        </th>
                        <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Owner</th>
                        <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Contact</th>
                        <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Props</th>
                        <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Stage</th>
                        <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Score</th>
                        <th className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Last Contact</th>
                        <th className="w-10 py-3 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOwners.map(owner => {
                        const topProp = owner.properties?.[0];
                        const avgScore = owner.properties?.length
                          ? owner.properties.reduce((s, p) => s + (p.viability_score ?? 0), 0) / owner.properties.length
                          : null;
                        return (
                          <tr
                            key={owner.id}
                            onClick={() => setSelectedOwner(owner)}
                            className="border-b border-border/40 hover:bg-accent/20 cursor-pointer transition-colors group"
                          >
                            <td className="py-3 px-2" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedOwnerIds.has(owner.id)} onChange={() => toggleOwner(owner.id)} />
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <OwnerAvatar owner={owner} size="sm" />
                                <div>
                                  <p className="font-semibold text-foreground">{owner.owner_name ?? "—"}</p>
                                  <p className="text-xs text-muted-foreground">{owner.owner_email ?? "—"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 hidden sm:table-cell">
                              <p className="text-xs text-muted-foreground">{owner.owner_phone ?? "—"}</p>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {owner.properties?.length ?? 0}
                              </span>
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell">
                              <StageBadge stage={topProp?.sales_pipeline_stage} />
                            </td>
                            <td className="py-3 px-3 hidden lg:table-cell">
                              {avgScore != null && avgScore > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <ViabilityScore score={Math.round(avgScore)} />
                                  <span className="text-xs font-medium">{avgScore.toFixed(1)}</span>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell text-xs text-muted-foreground">
                              {fmtDate(owner.last_contact_date)}
                            </td>
                            <td className="py-3 px-3">
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {!isLoading && activeTab === "pipeline" && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              <PipelineKanban owners={ownerList} />
            </div>
          </ScrollArea>
        )}

        {!isLoading && activeTab === "flow" && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-4">
              <ProcessFlow leadsCount={leadsCount} logsCount={logsCount} dbConfigured={dbInfo?.configured ?? false} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ── Owner Profile Panel (slide-in right) ── */}
      {selectedOwner && (
        <div className="flex flex-col w-full md:w-[640px] lg:w-[780px] xl:w-[860px] border-l border-border bg-card flex-shrink-0 min-h-0">
          <OwnerProfilePanel
            owner={selectedOwner}
            onClose={() => setSelectedOwner(null)}
            onRefresh={() => { refresh(); }}
          />
        </div>
      )}

      {/* Add Owner Dialog */}
      <AddOwnerDialog open={addOwnerOpen} onClose={() => setAddOwnerOpen(false)} onSuccess={refresh} />
    </div>
  );
}

// Fix missing Layers icon import
function Layers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
