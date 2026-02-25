import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Config,
  Lead,
  Agent,
  ActivityLog,
  TargetsData,
  DatabaseInfo,
  RunStatus,
  StreamLine,
  CrmOwner,
} from "@/types/api";
import { useRunBotContext } from "@/contexts/RunBotContext";
import targetsEuFallback from "@/data/targets_eu.json";

const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
const defaultFetchOptions: RequestInit = { credentials: "include" as RequestCredentials };

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, defaultFetchOptions);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...defaultFetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 409) throw new Error("Bot already running");
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// Polling hook
function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 15000
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetcher()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message));
  }, [fetcher]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, error, refresh };
}

export function useConfig(intervalMs?: number) {
  const fetcher = useCallback(() => fetchJson<Config>("/config"), []);
  return usePolling(fetcher, intervalMs ?? 15000);
}

export function useLeads(intervalMs?: number) {
  const fetcher = useCallback(() => fetchJson<Lead[]>("/leads"), []);
  return usePolling(fetcher, intervalMs ?? 15000);
}

export function useAgents(intervalMs?: number) {
  const fetcher = useCallback(() => fetchJson<Agent[]>("/agents"), []);
  return usePolling(fetcher, intervalMs ?? 15000);
}

export type Operator = {
  id: number;
  company_name?: string | null;
  website_url?: string | null;
  tagline?: string | null;
  [key: string]: unknown;
};

export function useOperators(intervalMs?: number) {
  const fetcher = useCallback(() => fetchJson<Operator[]>("/operators"), []);
  return usePolling(fetcher, intervalMs ?? 15000);
}

export type ApiSettings = {
  ollamaModel?: string;
  temperature?: number;
  maxTokens?: number;
  defaultProviderId?: number;
};

export function useSettings(intervalMs?: number) {
  const fetcher = useCallback(() => fetchJson<ApiSettings>("/config"), []);
  return usePolling(fetcher, intervalMs ?? 15000);
}

export function updateSettings(body: Partial<ApiSettings>) {
  return postJson("/config", body);
}

export function useLogs(intervalMs?: number) {
  const fetcher = useCallback(() => fetchJson<ActivityLog[]>("/logs"), []);
  return usePolling(fetcher, intervalMs ?? 15000);
}

/** Targets with static EU fallback so Website Bot has countries/sites when API is unavailable */
export function useTargets() {
  const fallback = targetsEuFallback as TargetsData;
  const [data, setData] = useState<TargetsData | null>(fallback);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchJson<TargetsData>("/targets")
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => {
        setError(e.message);
        setData((prev) => prev ?? fallback);
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, error, refresh };
}

export function useDatabase(intervalMs?: number) {
  const fetcher = useCallback(() => fetchJson<DatabaseInfo>("/database"), []);
  return usePolling(fetcher, intervalMs ?? 30000);
}

export function useCrmOwners(intervalMs?: number) {
  const fetcher = useCallback(async (): Promise<CrmOwner[]> => {
    try {
      const data = await fetchJson<unknown>("/crm/owners");
      return Array.isArray(data) ? (data as CrmOwner[]) : [];
    } catch {
      throw new Error("Could not load CRM owners. Is the API running on port 8000?");
    }
  }, []);
  return usePolling(fetcher, intervalMs ?? 15000);
}

/** Manual lead/owner entry. Required: owner_email. Source URL (listing_url) required when adding a property. Schema-aligned fields. */
export function createCrmOwner(body: {
  owner_email: string;
  owner_name?: string;
  owner_phone?: string;
  owner_notes?: string;
  listing_url?: string;
  title?: string;
  price?: number;
  rent_price?: number;
  sale_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  rooms?: number;
  surface_m2?: number;
  location?: string;
  description?: string;
  listing_ref?: string;
  source?: string;
  transaction_type?: string;
  address?: string;
  phone_number?: string;
  phone_source?: string;
}): Promise<{ id: number; ok: boolean }> {
  return postJson("/crm/owners", body);
}

/** Download CRM owners export as CSV (trigger download in browser). */
export async function exportCrmOwnersCsv(): Promise<void> {
  const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
  const res = await fetch(`${API_BASE}/crm/owners/export`, { credentials: "include" });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "crm_owners_export.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Update CRM owner (owner_name, owner_email, owner_phone, owner_notes). */
export function updateCrmOwner(ownerId: number, body: { owner_name?: string; owner_email?: string; owner_phone?: string; owner_notes?: string }): Promise<{ ok: boolean }> {
  const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
  return fetch(`${API_BASE}/crm/owners/${ownerId}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Update failed: ${r.status}`))));
}

export type CrmConversation = { id: number; property_id: number; channel: string; message_text: string; sender: string; timestamp: number };

export function getCrmConversations(propertyId: number): Promise<CrmConversation[]> {
  return fetchJson(`/crm/properties/${propertyId}/conversations`);
}

export function postCrmConversation(propertyId: number, body: { channel: string; message_text: string; sender?: string }): Promise<{ id: number; ok: boolean }> {
  return postJson(`/crm/properties/${propertyId}/conversations`, body);
}

export async function exportCrmPropertiesCsv(): Promise<void> {
  const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
  const res = await fetch(`${API_BASE}/crm/properties/export`, { credentials: "include" });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "crm_properties_export.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportCrmSingleOwnerCsv(ownerId: number): Promise<void> {
  const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
  const res = await fetch(`${API_BASE}/crm/owners/${ownerId}/export`, { credentials: "include" });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `crm_owner_${ownerId}_export.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportCrmConversationsCsv(): Promise<void> {
  const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
  const res = await fetch(`${API_BASE}/crm/conversations/export`, { credentials: "include" });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "crm_chat_history_export.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Bulk update: owner_ids or property_ids, and sales_pipeline_stage, chatbot_pipeline_stage, or mark_contacted: true */
export function bulkUpdateCrm(body: { owner_ids?: number[]; property_ids?: number[]; sales_pipeline_stage?: string; chatbot_pipeline_stage?: string; mark_contacted?: boolean }): Promise<{ ok: boolean; updated: number }> {
  return postJson("/crm/bulk-update", body);
}

/** Update CRM property. All fields aligned to schema-realestate-listings-standard (editable listing + pipeline + AI). */
export function updateCrmProperty(
  propertyId: number,
  body: {
    sales_pipeline_stage?: string;
    chatbot_pipeline_stage?: string;
    automation_enabled?: number;
    ai_stop_stage?: string;
    title?: string;
    price?: number;
    rent_price?: number;
    sale_price?: number;
    bedrooms?: number;
    bathrooms?: number;
    rooms?: number;
    surface_m2?: number;
    location?: string;
    description?: string;
    listing_url?: string;
    contact_email?: string;
    phone_number?: string;
    phone_source?: string;
    listing_ref?: string;
    transaction_type?: string;
    address?: string;
    source_platform?: string;
    source?: string;
    rental_terms?: string;
    image_urls?: string;
    deposit?: number;
    monthly_charges?: number;
    terrace_m2?: number;
    year_of_construction?: number;
    first_seen?: string;
    last_updated?: string;
    estimated_operating_costs?: number;
    cash_flow_projection?: number;
    risk_indicators?: string;
  }
): Promise<{ ok: boolean }> {
  const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
  return fetch(`${API_BASE}/crm/properties/${propertyId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Update failed: ${r.status}`))));
}

/** Property valuation result (daily rental context: market data + 2026–2031 + LLM). */
export type ValuationResult = {
  property_valuation_score?: number;
  recommendation?: string;
  reasoning?: string;
  estimated_annual_gross_revenue?: number | string;
  price_to_earnings_ratio?: number | string;
  cap_rate?: string;
  key_strengths?: string[];
  key_risks?: string[];
  suggested_management_fee?: string;
  market_summary?: { adr?: number; occupancy?: number; price_range?: number[]; from_fallback?: boolean };
};

export function valuateCrmProperty(property: {
  title?: string | null;
  description?: string | null;
  location?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  surface_m2?: number | null;
  transaction_type?: string | null;
}): Promise<ValuationResult> {
  return postJson<ValuationResult>("/crm/valuate", {
    title: property.title ?? "",
    description: property.description ?? "",
    location: property.location ?? "",
    price: property.price ?? undefined,
    bedrooms: property.bedrooms ?? undefined,
    surface_m2: property.surface_m2 ?? undefined,
    transaction_type: property.transaction_type ?? undefined,
  });
}

export function updateConfig(body: Partial<Config>) {
  return postJson("/config", body);
}

/** Uses shared run state from RunBotProvider (same log on Run and Pipeline pages) */
export function useRunBot() {
  return useRunBotContext();
}

export function useStreamAction() {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async (path: string) => {
    setRunning(true);
    setLines([]);
    try {
      const res = await fetch(`${API_BASE}${path}`, { method: "POST", ...defaultFetchOptions });
      if (!res.ok) {
        setLines([{ type: "stderr", data: `HTTP ${res.status}` }]);
        setRunning(false);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) { setRunning(false); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          if (!part.trim()) continue;
          try {
            const line: StreamLine = JSON.parse(part);
            setLines((p) => [...p, line]);
            if (line.type === "exit") { setRunning(false); return; }
          } catch {
            setLines((p) => [...p, { type: "stdout", data: part }]);
          }
        }
      }
    } catch {
      setLines((p) => [...p, { type: "stderr", data: "Connection failed" }]);
    }
    setRunning(false);
  }, []);

  return { lines, running, run };
}
