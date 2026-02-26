import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Database,
  FileText,
  Building2,
  FilePlus,
  Trash2,
  Loader2,
  ListChecks,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
const MAX_RULES = 50;
const OPERATOR_SELECT_NONE = "__none__";
const PREFS_MARKER = "\n\n<!-- PREFS -->\n";

type Operator = { id: number; company_name: string; rules?: string[]; [k: string]: unknown };
type OperatorDocument = { id: number; operator_id: number; name: string; document_type: string; content: string; created_at?: number };

const DOCUMENT_TYPES = [
  { value: "draft_contract", label: "Draft contract", description: "Sample management agreement or contract template the AI can reference when discussing terms." },
  { value: "summary_agreement", label: "Summary agreement", description: "One-pager or summary for owners (key points, fees, what’s included)." },
  { value: "payout_examples", label: "Payout examples", description: "Real or example numbers (e.g. €X long-term vs €Y short-term) for social proof." },
  { value: "other", label: "Other document", description: "Any other reference (policies, FAQ, guarantees) the AI should use." },
] as const;

const TONE_OPTIONS = [
  { value: "professional and friendly", label: "Professional and friendly", preview: "Builds trust quickly; safe default for most agencies." },
  { value: "warm and consultative", label: "Warm and consultative", preview: "Friendly and advisory; good for relationship-focused brands." },
  { value: "direct and high-energy", label: "Direct and high-energy", preview: "Closes faster; best when leads are pre-qualified." },
  { value: "calm and expert", label: "Calm and expert", preview: "Authority and clarity; suits premium or legal-heavy positioning." },
];
const TARGET_OWNER_OPTIONS = [
  { value: "busy professionals", label: "Busy professionals", tooltip: "Time-poor, value convenience and done-for-you." },
  { value: "investors", label: "Investors", tooltip: "Focused on yield and scalability." },
  { value: "retirees", label: "Retirees", tooltip: "Often want passive income and minimal hassle." },
  { value: "expat landlords", label: "Expat landlords", tooltip: "Need remote management and local compliance." },
  { value: "first-time hosts", label: "First-time hosts", tooltip: "Need guidance and reassurance." },
  { value: "inherited property owners", label: "Inherited property owners", tooltip: "May be new to renting; value simplicity." },
];
const PREFERRED_PROPERTY_OPTIONS = [
  { value: "apartments", label: "Apartments", tooltip: "Urban, high turnover; strong for STR." },
  { value: "houses", label: "Houses", tooltip: "Family stays; longer bookings possible." },
  { value: "villas", label: "Villas", tooltip: "Premium; longer stays, higher revenue." },
  { value: "studios", label: "Studios", tooltip: "Compact; quick turnover, urban." },
  { value: "any", label: "Any", tooltip: "No preference; all property types." },
];
const FEE_STRUCTURE_OPTIONS = [
  { value: "20-25% commission", label: "20–25% commission", tooltip: "Percentage of revenue; scales with performance." },
  { value: "15-20% commission", label: "15–20% commission", tooltip: "Lower take; competitive for volume." },
  { value: "performance-based minimum", label: "Performance-based minimum", tooltip: "Owner pays only when results delivered." },
  { value: "flat + percentage", label: "Flat + percentage", tooltip: "Base fee plus share of revenue." },
];
const CALL_BOOKING_OPTIONS = [
  { value: "Always offer 15-min call first", label: "Always offer 15-min call first", tooltip: "Fastest path to close; low commitment for owner." },
  { value: "Always offer 30-min discovery call", label: "Always offer 30-min discovery call", tooltip: "More time to build rapport and qualify." },
  { value: "Qualify then offer call", label: "Qualify then offer call", tooltip: "Higher conversion; only book when interest is clear." },
  { value: "Send audit before asking for call", label: "Send audit before asking for call", tooltip: "Value first; then ask for the call." },
];
const COUNTRY_OPTIONS = [
  "AT", "BE", "CH", "DE", "ES", "FR", "GR", "IT", "LU", "NL", "PT", "UK", "Other",
];

// --- Expanded onboarding: 16 toggles, 10 dropdowns, 14 text (stored per-operator, feed Agency Context) ---
export type AgencyContextExt = {
  long_description: string;
  properties_managed: string;
  main_office: string;
  primary_service_package: string;
  offer_structure: string;
  revenue_guarantee: boolean;
  photography_included: boolean;
  legal_compliance_handled: boolean;
  furnished_setup_addon: boolean;
  communication_tone: string;
  call_ask_style: string;
  social_proof_first: boolean;
  enlarge_pie: boolean;
  risk_reversal_early: boolean;
  warm_language_cold: boolean;
  pain_points: string;
  results_highlight: string;
  onboarding_fee: string;
  mention_fee_early: boolean;
  emphasize_pie_early: boolean;
  first_month_discount: boolean;
  when_offer_call: string;
  call_phrasing: string;
  mention_guarantee_always: boolean;
  eu_compliance_highlight: boolean;
  try_risk_free_framing: boolean;
  local_presence_24_7: boolean;
  avoid_competitors: boolean;
  countries_special_rules: string;
  strict_rules: string;
  additional_notes_ai: string;
};

const PRIMARY_SERVICE_OPTIONS = [
  { value: "full_done_for_you", label: "Full done-for-you management (pricing, guests, cleaning, compliance)" },
  { value: "cohosting_only", label: "Co-hosting only (guest communication + optimization)" },
  { value: "setup_launch_only", label: "Setup & launch only (listing + first 90 days)" },
  { value: "revenue_optimization_only", label: "Revenue optimization only (dynamic pricing + calendar)" },
  { value: "legal_compliance_specialist", label: "Legal & compliance specialist package" },
];
const OFFER_STRUCTURE_OPTIONS = [
  { value: "percentage_revenue", label: "Percentage of revenue (most common)" },
  { value: "flat_monthly", label: "Flat monthly fee per property" },
  { value: "hybrid", label: "Hybrid (base fee + percentage)" },
  { value: "performance_based", label: "Performance-based (you only get paid on results)" },
  { value: "tiered_value", label: "Tiered pricing based on property value" },
];
const COMMUNICATION_TONE_OPTIONS = [
  { value: "professional_trustworthy", label: "Professional and trustworthy" },
  { value: "friendly_approachable", label: "Friendly and approachable" },
  { value: "luxurious_premium", label: "Luxurious and premium" },
  { value: "direct_results", label: "Direct and results-oriented" },
  { value: "empathetic_supportive", label: "Empathetic and supportive" },
  { value: "calm_expert", label: "Calm and expert" },
];
const CALL_ASK_STYLE_OPTIONS = [
  { value: "very_direct", label: "Very direct (“Let’s book a call now”)" },
  { value: "gentle_qualification", label: "Gentle qualification first" },
  { value: "value_first_soft_ask", label: "Value-first then soft ask" },
  { value: "calendly_immediately", label: "Always offer Calendly link immediately" },
];
const TARGET_OWNER_EXPANDED_OPTIONS = [
  { value: "busy_professionals_expat", label: "Busy professionals and expats" },
  { value: "investors_portfolio", label: "Real estate investors and portfolio owners" },
  { value: "retirees_second_home", label: "Retirees and second-home owners" },
  { value: "first_time_hosts", label: "First-time hosts" },
  { value: "inherited_owners", label: "Inherited property owners" },
  { value: "corporate_landlords", label: "Corporate landlords" },
];
const PROPERTY_TYPE_EXPANDED_OPTIONS = [
  { value: "urban_apartments", label: "Urban apartments (high turnover)" },
  { value: "family_houses_villas", label: "Family houses and villas" },
  { value: "luxury_unique", label: "Luxury / unique properties" },
  { value: "rural_countryside", label: "Rural or countryside homes" },
  { value: "studio_small", label: "Studio / small apartments" },
  { value: "no_preference", label: "No strong preference" },
];
const PRICING_MODEL_OPTIONS = [
  { value: "20_25_percent", label: "20–25% of booking revenue" },
  { value: "15_20_percent", label: "15–20% of booking revenue" },
  { value: "flat_monthly", label: "Flat monthly fee per property" },
  { value: "hybrid", label: "Hybrid (base + percentage)" },
  { value: "performance_based_min", label: "Performance-based minimum" },
];
const ONBOARDING_FEE_OPTIONS = [
  { value: "yes_fixed", label: "Yes, fixed amount" },
  { value: "yes_percentage_first", label: "Yes, percentage of first month" },
  { value: "no_waived", label: "No, waived for good properties" },
  { value: "case_by_case", label: "Case by case" },
];
const CALL_LENGTH_OPTIONS = [
  { value: "15", label: "15 minutes (fast close)" },
  { value: "30", label: "30 minutes (deep dive)" },
  { value: "45", label: "45 minutes (detailed presentation)" },
];
const WHEN_OFFER_CALL_OPTIONS = [
  { value: "after_first_reply", label: "Immediately after first reply" },
  { value: "after_audit", label: "After sending audit report" },
  { value: "strong_interest", label: "Only after strong interest shown" },
  { value: "never_auto", label: "Never automatically (manual follow-up)" },
];

const DEFAULT_AGENCY_EXT: AgencyContextExt = {
  long_description: "",
  properties_managed: "",
  main_office: "",
  primary_service_package: PRIMARY_SERVICE_OPTIONS[0].value,
  offer_structure: OFFER_STRUCTURE_OPTIONS[0].value,
  revenue_guarantee: false,
  photography_included: false,
  legal_compliance_handled: false,
  furnished_setup_addon: false,
  communication_tone: COMMUNICATION_TONE_OPTIONS[0].value,
  call_ask_style: CALL_ASK_STYLE_OPTIONS[0].value,
  social_proof_first: true,
  enlarge_pie: true,
  risk_reversal_early: true,
  warm_language_cold: false,
  pain_points: "",
  results_highlight: "",
  onboarding_fee: ONBOARDING_FEE_OPTIONS[0].value,
  mention_fee_early: false,
  emphasize_pie_early: true,
  first_month_discount: false,
  when_offer_call: WHEN_OFFER_CALL_OPTIONS[0].value,
  call_phrasing: "",
  mention_guarantee_always: true,
  eu_compliance_highlight: true,
  try_risk_free_framing: true,
  local_presence_24_7: false,
  avoid_competitors: true,
  countries_special_rules: "",
  strict_rules: "",
  additional_notes_ai: "",
};

type Prefs = {
  mention_guarantee: boolean;
  include_social_proof: boolean;
  offer_free_audit_first: boolean;
  send_calendly_in_opener: boolean;
  use_risk_reversal: boolean;
  focus_outcome_not_fee: boolean;
  mention_eu_compliance: boolean;
  warm_tone_emphasis: boolean;
};

const DEFAULT_PREFS: Prefs = {
  mention_guarantee: true,
  include_social_proof: true,
  offer_free_audit_first: true,
  send_calendly_in_opener: false,
  use_risk_reversal: true,
  focus_outcome_not_fee: true,
  mention_eu_compliance: true,
  warm_tone_emphasis: false,
};

const PREF_LABELS: Record<keyof Prefs, string> = {
  mention_guarantee: "Mention guarantee in messages",
  include_social_proof: "Include social proof (numbers, examples)",
  offer_free_audit_first: "Offer free audit in opener",
  send_calendly_in_opener: "Send Calendly in first message",
  use_risk_reversal: "Use risk reversal phrasing",
  focus_outcome_not_fee: "Focus on outcome, not fee %",
  mention_eu_compliance: "Mention EU / compliance when relevant",
  warm_tone_emphasis: "Warm tone emphasis",
};
const PREF_TOOLTIPS: Record<keyof Prefs, string> = {
  mention_guarantee: "Include guarantee-style phrasing in messages to reduce perceived risk.",
  include_social_proof: "Use concrete numbers and local examples (e.g. €X to €Y).",
  offer_free_audit_first: "Offer a free profit/pricing audit in the opener.",
  send_calendly_in_opener: "Include Calendly link in the first message.",
  use_risk_reversal: "Use risk-reversal language (e.g. cancel anytime, no lock-in).",
  focus_outcome_not_fee: "Emphasise total income growth, not fee percentage.",
  mention_eu_compliance: "Mention EU/STR compliance when relevant.",
  warm_tone_emphasis: "Add extra warmth and empathy in phrasing.",
};

function parseNotesAndPrefs(notes: string | undefined): { notes: string; prefs: Prefs } {
  if (!notes || !notes.includes(PREFS_MARKER)) {
    return { notes: notes || "", prefs: { ...DEFAULT_PREFS } };
  }
  const [notesPart, jsonPart] = notes.split(PREFS_MARKER);
  let prefs = { ...DEFAULT_PREFS };
  try {
    const parsed = JSON.parse(jsonPart) as Partial<Prefs>;
    prefs = { ...DEFAULT_PREFS, ...parsed };
  } catch {
    // ignore
  }
  return { notes: notesPart.trim(), prefs };
}

function serializeNotesAndPrefs(notes: string, prefs: Prefs): string {
  return notes.trim() + PREFS_MARKER + JSON.stringify(prefs);
}

export default function OperatorOnboardingPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<number | "new" | "">("");
  const [documents, setDocuments] = useState<OperatorDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", document_type: "draft_contract" as const, content: "" });
  const [docDragOver, setDocDragOver] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rules, setRules] = useState<string[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesText, setRulesText] = useState("");
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    website_url: "",
    tagline: "",
    countries: [] as string[],
    tone_style: COMMUNICATION_TONE_OPTIONS[0].value,
    ideal_client_profile: TARGET_OWNER_EXPANDED_OPTIONS[0].value,
    preferred_property_types: PROPERTY_TYPE_EXPANDED_OPTIONS[0].value,
    pricing_model: PRICING_MODEL_OPTIONS[0].value,
    qualification_rules: "",
    calendly_link: "",
    call_length_minutes: 30,
    notes: "",
    prefs: { ...DEFAULT_PREFS } as Prefs,
    agency_context_ext: { ...DEFAULT_AGENCY_EXT } as AgencyContextExt,
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [rawContextOpen, setRawContextOpen] = useState(false);
  const [rawContextText, setRawContextText] = useState("");
  const [docModalContent, setDocModalContent] = useState<{ name: string; content: string } | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(true);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const isEditing = selectedOperatorId !== "" && selectedOperatorId !== "new";
  const canEditRulesAndDocs = isEditing;

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/operators`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOperators(Array.isArray(data) ? data : []);
      } else {
        setOperators([]);
      }
    } catch {
      setOperators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async (operatorId: number) => {
    setDocLoading(true);
    try {
      const res = await fetch(`${API_BASE}/operators/${operatorId}/documents`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      } else {
        setDocuments([]);
      }
    } catch {
      setDocuments([]);
    } finally {
      setDocLoading(false);
    }
  }, []);

  const loadOperatorIntoForm = useCallback((op: Operator) => {
    const countriesStr = (op.countries as string) || "";
    const countries = countriesStr ? countriesStr.split(/\s*,\s*/).filter(Boolean) : [];
    const { notes: notesOnly, prefs } = parseNotesAndPrefs((op.notes as string) || "");
    const ext = (op.agency_context_ext as AgencyContextExt | undefined) || { ...DEFAULT_AGENCY_EXT };
    setForm({
      company_name: (op.company_name as string) || "",
      website_url: (op.website_url as string) || "",
      tagline: (op.tagline as string) || "",
      countries,
      tone_style: (op.tone_style as string) || COMMUNICATION_TONE_OPTIONS[0].value,
      ideal_client_profile: (op.ideal_client_profile as string) || TARGET_OWNER_EXPANDED_OPTIONS[0].value,
      preferred_property_types: (op.preferred_property_types as string) || PROPERTY_TYPE_EXPANDED_OPTIONS[0].value,
      pricing_model: (op.pricing_model as string) || PRICING_MODEL_OPTIONS[0].value,
      qualification_rules: (op.qualification_rules as string) || "",
      calendly_link: (op.calendly_link as string) || "",
      call_length_minutes: typeof op.call_length_minutes === "number" ? op.call_length_minutes : 30,
      notes: notesOnly,
      prefs,
      agency_context_ext: { ...DEFAULT_AGENCY_EXT, ...ext },
    });
    setRules(Array.isArray(op.rules) ? op.rules : []);
    setRulesText("");
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  useEffect(() => {
    if (selectedOperatorId === "new" || selectedOperatorId === "") {
      setForm({
        company_name: "",
        website_url: "",
        tagline: "",
        countries: [],
        tone_style: COMMUNICATION_TONE_OPTIONS[0].value,
        ideal_client_profile: TARGET_OWNER_EXPANDED_OPTIONS[0].value,
        preferred_property_types: PROPERTY_TYPE_EXPANDED_OPTIONS[0].value,
        pricing_model: PRICING_MODEL_OPTIONS[0].value,
        qualification_rules: "",
        calendly_link: "",
        call_length_minutes: 30,
        notes: "",
        prefs: { ...DEFAULT_PREFS },
        agency_context_ext: { ...DEFAULT_AGENCY_EXT },
      });
      setRules([]);
      setRulesText("");
      setDocuments([]);
      setCurrentStep(1);
      return;
    }
    if (typeof selectedOperatorId === "number") {
      fetchDocuments(selectedOperatorId);
      const op = operators.find((o) => o.id === selectedOperatorId);
      if (op) loadOperatorIntoForm(op);
    }
  }, [selectedOperatorId, operators, fetchDocuments, loadOperatorIntoForm]);

  const fetchOperatorRules = useCallback(async (operatorId: number) => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const res = await fetch(`${API_BASE}/operators/${operatorId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRules(Array.isArray(data.rules) ? data.rules : []);
      } else {
        setRules([]);
      }
    } catch {
      setRules([]);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof selectedOperatorId === "number") {
      fetchOperatorRules(selectedOperatorId);
    }
  }, [selectedOperatorId, fetchOperatorRules]);

  const savePayload = useCallback(() => ({
    company_name: form.company_name.trim(),
    website_url: form.website_url.trim() || undefined,
    tagline: form.tagline.trim() || undefined,
    countries: form.countries.length ? form.countries.join(", ") : undefined,
    tone_style: form.tone_style,
    ideal_client_profile: form.ideal_client_profile,
    preferred_property_types: form.preferred_property_types,
    pricing_model: form.pricing_model,
    qualification_rules: form.qualification_rules,
    calendly_link: form.calendly_link.trim() || undefined,
    call_length_minutes: form.call_length_minutes,
    notes: serializeNotesAndPrefs(form.notes, form.prefs),
    agency_context_ext: form.agency_context_ext,
  }), [form]);

  const performSave = useCallback(async (showToast = true) => {
    if (selectedOperatorId === "") return;
    setFormError(null);
    const payload = savePayload();
    if (selectedOperatorId === "new" || String(selectedOperatorId) === "") {
      if (!payload.company_name) return;
      setFormSaving(true);
      if (showToast) toast.loading("Saving…", { id: "operator-save" });
      try {
        const res = await fetch(`${API_BASE}/operators`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        await fetchOperators();
        setSelectedOperatorId(data.id as number);
        if (showToast) toast.success("Operator created", { id: "operator-save" });
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to create operator");
        if (showToast) toast.dismiss("operator-save");
      } finally {
        setFormSaving(false);
      }
      return;
    }
    setFormSaving(true);
    if (showToast) toast.loading("Saving…", { id: "operator-save" });
    try {
      const res = await fetch(`${API_BASE}/operators/${selectedOperatorId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      await fetchOperators();
      if (showToast) toast.success("Saved", { id: "operator-save" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save operator");
      if (showToast) toast.dismiss("operator-save");
    } finally {
      setFormSaving(false);
    }
  }, [selectedOperatorId, savePayload, fetchOperators]);

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSave(true);
  };

  const handleSaveAndClose = async () => {
    await performSave(true);
    navigate(-1);
  };

  const handleCancel = () => {
    if (selectedOperatorId === "new") {
      setSelectedOperatorId("");
      setForm({ ...form, company_name: "", website_url: "", tagline: "", countries: [] });
    } else {
      navigate(-1);
    }
  };

  const toggleCountry = (code: string) => {
    setForm((f) => ({
      ...f,
      countries: f.countries.includes(code) ? f.countries.filter((c) => c !== code) : [...f.countries, code],
    }));
  };

  const removeCountry = (code: string) => {
    setForm((f) => ({ ...f, countries: f.countries.filter((c) => c !== code) }));
  };

  const handleBlurSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if ((selectedOperatorId === "new" || selectedOperatorId === "") && !form.company_name.trim()) return;
      if (typeof selectedOperatorId === "number") performSave(true);
    }, 800);
  }, [selectedOperatorId, form.company_name, performSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleSaveOperator(e as unknown as React.FormEvent);
      }
      if (e.key === "Escape") handleCancel();
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        setSelectedOperatorId("new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const refs = [section1Ref, section2Ref, section3Ref];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = refs.findIndex((r) => r.current === e.target);
          if (i >= 0) setCurrentStep((i + 1) as 1 | 2 | 3);
        }
      },
      { threshold: 0.2, rootMargin: "-80px 0px 0px 0px" }
    );
    refs.forEach((r) => { if (r.current) observer.observe(r.current); });
    return () => observer.disconnect();
  }, [selectedOperatorId, isEditing]);

  const fetchRawContext = useCallback(async () => {
    if (typeof selectedOperatorId !== "number") return;
    try {
      const res = await fetch(`${API_BASE}/operators/${selectedOperatorId}/context`, { credentials: "include" });
      if (res.ok) setRawContextText(await res.text());
      else setRawContextText("Failed to load context.");
    } catch {
      setRawContextText("Failed to load context.");
    }
  }, [selectedOperatorId]);

  const moveRule = async (index: number, direction: "up" | "down") => {
    if (selectedOperatorId === "" || selectedOperatorId === "new") return;
    const newRules = [...rules];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= newRules.length) return;
    [newRules[index], newRules[swap]] = [newRules[swap], newRules[index]];
    setRulesSaving(true);
    try {
      const res = await fetch(`${API_BASE}/operators/${selectedOperatorId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: newRules }),
      });
      if (res.ok) setRules(newRules);
    } finally {
      setRulesSaving(false);
    }
  };

  const isCalendlyValid = /^https?:\/\/[^\s]+$/.test(form.calendly_link.trim());
  const NOTES_MAX = 5000;

  const handleRulesFromText = () => {
    if (selectedOperatorId === "" || selectedOperatorId === "new") return;
    const lines = rulesText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const nextRules = [...rules, ...lines].slice(0, MAX_RULES);
    if (nextRules.length === rules.length && lines.length > 0) return;
    setRulesSaving(true);
    setRulesError(null);
    fetch(`${API_BASE}/operators/${selectedOperatorId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: nextRules }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save rules");
        setRules(nextRules);
        setRulesText("");
      })
      .catch(() => setRulesError("Failed to save rules"))
      .finally(() => setRulesSaving(false));
  };

  const handleDeleteRule = async (index: number) => {
    if (selectedOperatorId === "" || selectedOperatorId === "new") return;
    const nextRules = rules.filter((_, i) => i !== index);
    setRulesSaving(true);
    setRulesError(null);
    try {
      const res = await fetch(`${API_BASE}/operators/${selectedOperatorId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: nextRules }),
      });
      if (res.ok) setRules(nextRules);
    } catch {
      setRulesError("Failed to update rules");
    } finally {
      setRulesSaving(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOperatorId === "" || selectedOperatorId === "new" || !docForm.content.trim()) return;
    setError(null);
    setDocSaving(true);
    try {
      const res = await fetch(`${API_BASE}/operators/${selectedOperatorId}/documents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docForm.name.trim() || DOCUMENT_TYPES.find((t) => t.value === docForm.document_type)?.label || "Document",
          document_type: docForm.document_type,
          content: docForm.content.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      setDocForm({ name: "", document_type: "draft_contract", content: "" });
      await fetchDocuments(selectedOperatorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setDocSaving(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (selectedOperatorId === "" || selectedOperatorId === "new") return;
    try {
      const res = await fetch(`${API_BASE}/operators/${selectedOperatorId}/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) await fetchDocuments(selectedOperatorId as number);
    } catch {
      // ignore
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDocDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      setDocForm((f) => ({ ...f, content: text, name: f.name || file.name.replace(/\.[^/.]+$/, "") }));
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      setDocForm((f) => ({ ...f, content: text, name: f.name || file.name.replace(/\.[^/.]+$/, "") }));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const stepLabels: Record<1 | 2 | 3, string> = {
    1: "Company & location",
    2: "Voice & targeting",
    3: "Links, rules & documents",
  };

  return (
    <div className="pb-24 min-h-[70vh] bg-background">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Operator Onboarding</h1>
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Step {currentStep}/3</span>
            <span className="text-xs font-medium text-foreground">– {stepLabels[currentStep]}</span>
          </div>
          <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(currentStep / 3) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleSaveOperator({ preventDefault: () => {} } as React.FormEvent)} disabled={formSaving}>
            Save draft
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveAndClose} disabled={formSaving}>
            {formSaving ? "Saving…" : "Save & close"}
          </Button>
        </div>
      </header>

      <div className="space-y-8 pt-6" onBlur={handleBlurSave}>
        {/* Section 1 – Operator selection */}
        <Card ref={section1Ref} onFocus={() => setCurrentStep(1)}>
          <CardContent className="pt-6">
            <Label className="text-sm font-medium">Select an operator to edit or create new</Label>
            <select
              className="flex h-10 w-full max-w-sm mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={selectedOperatorId === "new" ? "new" : selectedOperatorId === "" ? OPERATOR_SELECT_NONE : String(selectedOperatorId)}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedOperatorId(v === "new" ? "new" : v === OPERATOR_SELECT_NONE ? "" : Number(v));
              }}
            >
              <option value={OPERATOR_SELECT_NONE}>Select operator…</option>
              <option value="new">+ Create new operator</option>
              {operators.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.company_name as string}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">All changes save to local SQLite on Save or when moving to next section.</p>
            {operators.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground mt-2">No operators yet. Choose “+ Create new operator” and fill the form below.</p>
            )}
          </CardContent>
        </Card>

        {(selectedOperatorId === "new" || isEditing) && (
        <form onSubmit={handleSaveOperator} className="space-y-8">
          {/* Section 1: Company Basics (7 text questions) */}
          <Card ref={section2Ref} onFocus={() => setCurrentStep(1)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Section 1: Company basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Company full legal name *</Label>
                <Input required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} onBlur={handleBlurSave} placeholder="e.g. StayLocal Management Ltd" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Website URL *</Label>
                <div className="flex gap-2 flex-wrap items-end">
                  <Input className="flex-1 min-w-[200px]" type="url" value={form.website_url} onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))} onBlur={handleBlurSave} placeholder="https://..." />
                  <Button type="button" size="sm" variant="outline" disabled={!form.website_url.trim()}>Scrape now</Button>
                </div>
                <p className="text-xs text-muted-foreground">We will scrape this later for more context.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Short tagline / one-liner (what appears in signatures)</Label>
                <Input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} onBlur={handleBlurSave} placeholder="e.g. We turn your property into passive income" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Long description of your company (what you tell owners about who you are)</Label>
                <Textarea className="min-h-[100px]" value={form.agency_context_ext.long_description} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, long_description: e.target.value } }))} onBlur={handleBlurSave} placeholder="Describe your company, mission, and how you work with owners..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">In which countries do you actively manage properties?</Label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_OPTIONS.map((code) => (
                    <label key={code} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.countries.includes(code)} onChange={() => toggleCountry(code)} className="rounded border-border" />
                      <span className="text-sm">{code}</span>
                    </label>
                  ))}
                </div>
                {form.countries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.countries.map((code) => (
                      <span key={code} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm">
                        {code}
                        <button type="button" onClick={() => removeCountry(code)} className="rounded hover:bg-muted-foreground/20 p-0.5" aria-label={`Remove ${code}`}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">How many properties do you currently manage across all countries?</Label>
                <Input value={form.agency_context_ext.properties_managed} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, properties_managed: e.target.value } }))} onBlur={handleBlurSave} placeholder="e.g. 45" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">What is your main office location or hub city?</Label>
                <Input value={form.agency_context_ext.main_office} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, main_office: e.target.value } }))} onBlur={handleBlurSave} placeholder="e.g. Luxembourg City" />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Services & Offer (2 dropdowns + 4 Yes/No) */}
          <Card onFocus={() => setCurrentStep(2)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Section 2: Services & offer structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Primary service package</Label>
                <Select value={form.agency_context_ext.primary_service_package} onValueChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, primary_service_package: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIMARY_SERVICE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">How do you usually structure your core offer?</Label>
                <Select value={form.agency_context_ext.offer_structure} onValueChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, offer_structure: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OFFER_STRUCTURE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "revenue_guarantee" as const, label: "Do you offer a revenue guarantee (e.g. minimum income or we work free)?", tooltip: "Bot can mention this in outreach." },
                  { key: "photography_included" as const, label: "Do you include professional photography and listing optimization as standard?", tooltip: "Included in your standard package." },
                  { key: "legal_compliance_handled" as const, label: "Do you handle all legal registration and compliance for the owner?", tooltip: "Bot can stress compliance handling." },
                  { key: "furnished_setup_addon" as const, label: "Do you provide furnished property setup as an add-on service?", tooltip: "Optional add-on to mention." },
                ].map(({ key, label, tooltip }) => (
                  <Tooltip key={key}><TooltipTrigger asChild>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <Label className="text-xs cursor-pointer flex-1">{label}</Label>
                      <Switch checked={form.agency_context_ext[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, [key]: v } }))} />
                    </div>
                  </TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Tone & Communication (2 dropdowns + 4 Yes/No) */}
          <Card onFocus={() => setCurrentStep(2)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Section 3: Tone & communication style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Primary communication tone with owners</Label>
                <Select value={form.agency_context_ext.communication_tone} onValueChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, communication_tone: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMUNICATION_TONE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">How direct should the AI be when asking for a call?</Label>
                <Select value={form.agency_context_ext.call_ask_style} onValueChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, call_ask_style: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALL_ASK_STYLE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "social_proof_first" as const, label: "Should the AI always mention social proof (numbers, examples) in first messages?", tooltip: "Concrete results and local examples." },
                  { key: "enlarge_pie" as const, label: "Should the AI focus heavily on enlarging the pie (showing how both sides win)?", tooltip: "Emphasise total income growth." },
                  { key: "risk_reversal_early" as const, label: "Should the AI emphasize risk reversal and guarantees early?", tooltip: "Mention guarantees in opener/follow-up." },
                  { key: "warm_language_cold" as const, label: "Should the AI use warm, personal language even in cold messages?", tooltip: "Friendly tone in first contact." },
                ].map(({ key, label, tooltip }) => (
                  <Tooltip key={key}><TooltipTrigger asChild>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <Label className="text-xs cursor-pointer flex-1">{label}</Label>
                      <Switch checked={form.agency_context_ext[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, [key]: v } }))} />
                    </div>
                  </TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Target Audience (2 dropdowns + 2 text) */}
          <Card onFocus={() => setCurrentStep(2)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Section 4: Target audience & ideal client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Main target owner type</Label>
                <Select value={form.ideal_client_profile} onValueChange={(v) => setForm((f) => ({ ...f, ideal_client_profile: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_OWNER_EXPANDED_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Preferred property type focus</Label>
                <Select value={form.preferred_property_types} onValueChange={(v) => setForm((f) => ({ ...f, preferred_property_types: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPE_EXPANDED_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">What specific pain points do your ideal owners usually have?</Label>
                <Textarea className="min-h-[80px]" value={form.agency_context_ext.pain_points} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, pain_points: e.target.value } }))} placeholder="e.g. bad tenants, low rent, maintenance stress" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">What results do you most want to highlight to owners?</Label>
                <Textarea className="min-h-[80px]" value={form.agency_context_ext.results_highlight} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, results_highlight: e.target.value } }))} placeholder='e.g. "2.3× income", "zero guest contact", "90-day guarantee"' />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Pricing & Commercial (2 dropdowns + 3 Yes/No) */}
          <Card onFocus={() => setCurrentStep(3)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Section 5: Pricing & commercial model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Standard management fee structure</Label>
                <Select value={form.pricing_model} onValueChange={(v) => setForm((f) => ({ ...f, pricing_model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICING_MODEL_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Do you charge an onboarding / setup fee?</Label>
                <Select value={form.agency_context_ext.onboarding_fee} onValueChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, onboarding_fee: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_FEE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "mention_fee_early" as const, label: "Should the AI mention your fee structure early in conversations?", tooltip: "Transparency about fees in opener or first reply." },
                  { key: "emphasize_pie_early" as const, label: "Should the AI emphasize you keep 75–80% of a much larger pie?", tooltip: "Enlarge the pie messaging." },
                  { key: "first_month_discount" as const, label: "Should the AI offer a reduced first-month fee as a closing tool?", tooltip: "Use first-month discount to close." },
                ].map(({ key, label, tooltip }) => (
                  <Tooltip key={key}><TooltipTrigger asChild>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <Label className="text-xs cursor-pointer flex-1">{label}</Label>
                      <Switch checked={form.agency_context_ext[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, [key]: v } }))} />
                    </div>
                  </TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Call Booking (2 dropdowns + 2 text) */}
          <Card onFocus={() => setCurrentStep(3)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Section 6: Call booking & sales process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Preferred discovery call length</Label>
                <Select value={String(form.call_length_minutes)} onValueChange={(v) => setForm((f) => ({ ...f, call_length_minutes: parseInt(v, 10) || 30 }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALL_LENGTH_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">When should the AI offer a call?</Label>
                <Select value={form.agency_context_ext.when_offer_call} onValueChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, when_offer_call: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WHEN_OFFER_CALL_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">What must be true before the AI offers a discovery call? (qualification rules)</Label>
                <Textarea className="min-h-[80px]" value={form.qualification_rules} onChange={(e) => setForm((f) => ({ ...f, qualification_rules: e.target.value }))} placeholder="e.g. Owner expressed interest; property type matches; location in our area" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">What exact phrasing do you want the AI to use when asking for a call?</Label>
                <Textarea className="min-h-[80px]" value={form.agency_context_ext.call_phrasing} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, call_phrasing: e.target.value } }))} placeholder="e.g. Would you be open to a quick 15-minute call to see how we could help?" />
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Guarantees, Compliance & Special Rules (5 Yes/No + 3 text) */}
          <Card onFocus={() => setCurrentStep(3)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Section 7: Guarantees, compliance & special rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "mention_guarantee_always" as const, label: "Should the AI always mention your revenue guarantee?", tooltip: "Include guarantee in most messages." },
                  { key: "eu_compliance_highlight" as const, label: "Should the AI highlight EU compliance and legal protection?", tooltip: "Mention EU/STR compliance when relevant." },
                  { key: "try_risk_free_framing" as const, label: "Should the AI offer try risk-free framing in most messages?", tooltip: "Risk reversal language." },
                  { key: "local_presence_24_7" as const, label: "Should the AI mention local presence / 24/7 support?", tooltip: "Local availability and support." },
                  { key: "avoid_competitors" as const, label: "Should the AI avoid mentioning competitors at all costs?", tooltip: "Never name or compare to competitors." },
                ].map(({ key, label, tooltip }) => (
                  <Tooltip key={key}><TooltipTrigger asChild>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <Label className="text-xs cursor-pointer flex-1">{label}</Label>
                      <Switch checked={form.agency_context_ext[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, [key]: v } }))} />
                    </div>
                  </TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Any countries or cities you want to treat differently?</Label>
                <Textarea className="min-h-[60px]" value={form.agency_context_ext.countries_special_rules} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, countries_special_rules: e.target.value } }))} placeholder="e.g. Germany: always mention 90-day cap; Spain: stress tax reporting" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Any strict rules the AI must always follow?</Label>
                <Textarea className="min-h-[60px]" value={form.agency_context_ext.strict_rules} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, strict_rules: e.target.value } }))} placeholder="e.g. Never promise specific revenue numbers" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Any additional notes or internal guidelines for the AI?</Label>
                <Textarea className="min-h-[60px]" value={form.agency_context_ext.additional_notes_ai} onChange={(e) => setForm((f) => ({ ...f, agency_context_ext: { ...f.agency_context_ext, additional_notes_ai: e.target.value } }))} placeholder="Internal guidelines for message generation" />
              </div>
            </CardContent>
          </Card>

          {/* Links & notes (Calendly + internal notes) */}
          <Card ref={section3Ref} onFocus={() => setCurrentStep(3)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Links & notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Calendly link</Label>
                <div className="relative flex items-center gap-2">
                  <Input
                    className="text-sm pr-9"
                    type="url"
                    value={form.calendly_link}
                    onChange={(e) => setForm((f) => ({ ...f, calendly_link: e.target.value }))}
                    onBlur={handleBlurSave}
                    placeholder="https://calendly.com/..."
                  />
                  {form.calendly_link.trim() && (
                    <span className={`absolute right-3 flex h-4 w-4 ${isCalendlyValid ? "text-green-600" : "text-muted-foreground"}`}>
                      {isCalendlyValid ? <Check className="h-4 w-4 animate-in zoom-in-95" /> : null}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes (internal)</Label>
                <Textarea
                  className="min-h-[80px] text-sm"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, NOTES_MAX) }))}
                  onBlur={handleBlurSave}
                  placeholder="Internal notes about this operator..."
                />
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>These notes appear in context but not in messages.</span>
                  <span>{form.notes.length}/{NOTES_MAX}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={formSaving}>
              {formSaving ? "Saving…" : isEditing ? "Save operator" : "Create operator"}
            </Button>
          </div>
        </form>
      )}

      {/* ——— Rules (one text area + instructions) ——— */}
      {canEditRulesAndDocs && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Rules
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Add one rule per line. Max {MAX_RULES} rules. The AI will follow these for this operator. Examples: “Never mention competitor names.” “Always mention our 90-day guarantee.”
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Add rules (one per line)</Label>
              <Textarea
                className="min-h-[100px] text-sm font-mono"
                placeholder={"e.g. Never mention competitor names.\nAlways mention our 90-day guarantee.\nUse the owner's first name when known."}
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                disabled={rules.length >= MAX_RULES}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={handleRulesFromText} disabled={!rulesText.trim() || rules.length >= MAX_RULES || rulesSaving}>
                  {rulesSaving ? "Saving…" : "Add rules"}
                </Button>
                {rules.length >= MAX_RULES && <span className="text-xs text-muted-foreground">Max {MAX_RULES} rules reached.</span>}
              </div>
            </div>
            {rulesError && <p className="text-xs text-destructive">{rulesError}</p>}
            <div className="border-t pt-4">
              <Label className="text-xs font-medium">Current rules ({rules.length}/{MAX_RULES})</Label>
              {rulesLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</p>
              ) : rules.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">No rules yet. Add lines above and click “Add rules”.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {rules.map((rule, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      <div className="flex flex-col gap-0.5">
                        <button type="button" onClick={() => moveRule(i, "up")} disabled={i === 0 || rulesSaving} className="p-0.5 hover:bg-muted rounded" aria-label="Move up"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => moveRule(i, "down")} disabled={i === rules.length - 1 || rulesSaving} className="p-0.5 hover:bg-muted rounded" aria-label="Move down"><ChevronDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="flex-1 min-w-0">{rule}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteRule(i)} disabled={rulesSaving}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ——— Documents (drag-and-drop + descriptions) ——— */}
      {canEditRulesAndDocs && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FilePlus className="w-4 h-4" />
              Documents
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Reference documents are included in the AI context so the bot can answer accurately. Drag and drop a file or paste text, choose the type, then Save.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${docDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/30"}`}
              onDragOver={(e) => { e.preventDefault(); setDocDragOver(true); }}
              onDragLeave={() => setDocDragOver(false)}
              onDrop={handleFileDrop}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Drag and drop a file here, or click to choose</p>
              <p className="text-xs text-muted-foreground mb-3">Text files (.txt, .md, .json) or paste content below.</p>
              <input ref={fileInputRef} type="file" accept=".txt,.md,.json,text/*" className="hidden" onChange={handleFileSelect} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {DOCUMENT_TYPES.map((t) => (
                <div key={t.value} className="rounded-lg border p-3 text-sm">
                  <span className="font-medium">{t.label}</span>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3 border-t pt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Document type</Label>
                  <Select value={docForm.document_type} onValueChange={(v) => setDocForm((f) => ({ ...f, document_type: v as typeof docForm.document_type }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Name (optional)</Label>
                  <Input
                    className="text-sm"
                    placeholder="e.g. Standard management contract 2025"
                    value={docForm.name}
                    onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Content (paste or from file)</Label>
                <Textarea
                  className="min-h-[120px] text-sm font-mono"
                  placeholder="Paste or drag a file above..."
                  value={docForm.content}
                  onChange={(e) => setDocForm((f) => ({ ...f, content: e.target.value }))}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" size="sm" disabled={!docForm.content.trim() || docSaving}>
                {docSaving ? "Saving…" : "Save document"}
              </Button>
            </form>

            <div className="border-t pt-4">
              <Label className="text-xs font-medium">Saved documents</Label>
              {docLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">None yet. Add one above.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      <button type="button" className="text-left flex-1 min-w-0" onClick={() => setDocModalContent({ name: d.name || DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label || d.document_type, content: d.content })}>
                        <span className="font-medium">{d.name || DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label || d.document_type}</span>
                        <span className="text-muted-foreground"> · {(d as { document_type?: string }).document_type}</span>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.content.slice(0, 100)}{d.content.length > 100 ? "…" : ""}</p>
                      </button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteDocument(d.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 8 – How the AI uses this */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            How the AI uses this
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
            <p>Context includes:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Base system prompt (general Airbnb model, Hormozi offer, tactics)</li>
              <li>Your specific agency context (company, tone, USPs, Calendly, rules)</li>
              <li>Reference documents (contracts, payouts, etc.)</li>
              <li>Up to 50 custom rules</li>
            </ol>
            <p className="mt-2">All combined into one prompt for every outbound message.</p>
          </div>
        </CardContent>
      </Card>

      {/* Section 9 – Local database footer */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Provider profiles, documents, and rules are stored in SQLite in <code className="text-xs bg-muted px-1 rounded">operator_onboarding/</code>.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRawContextText("");
                setRawContextOpen(true);
                fetchRawContext();
              }}
              disabled={selectedOperatorId === "" || selectedOperatorId === "new"}
            >
              View raw context for current operator
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Document content modal */}
      <Dialog open={!!docModalContent} onOpenChange={(open) => !open && setDocModalContent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{docModalContent?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 rounded border bg-muted/20 p-3 text-sm font-mono whitespace-pre-wrap">
            {docModalContent?.content}
          </div>
        </DialogContent>
      </Dialog>

      {/* Raw context modal */}
      <Dialog open={rawContextOpen} onOpenChange={setRawContextOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Raw context for operator</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 rounded border bg-muted/20 p-3 text-xs font-mono whitespace-pre-wrap">
            {rawContextText || "Loading…"}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
