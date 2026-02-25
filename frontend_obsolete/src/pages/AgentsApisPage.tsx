import { useState, useCallback } from "react";
import {
  Building2,
  FileJson,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  Eye,
  MessageSquare,
  Trash2,
  Activity,
  ListOrdered,
} from "lucide-react";
import {
  useAgents,
  useConfig,
  useDatabase,
  useLeads,
  useLogs,
  useOperators,
  useCrmOwners,
  updateSettings,
  type Operator,
  type ApiSettings,
} from "@/hooks/useApi";
import type { CrmOwner } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";

/** Sales pipeline stages (owner-centric: owner is in stage if any property is in that stage). */
const SALES_STAGES = [
  "New Lead",
  "Contacted",
  "Interested",
  "Call Booked",
  "Proposal Sent",
  "Contract Signed",
  "Onboarded",
  "Active Client",
] as const;

/** Badge variant by stage (Salesforce-style: early = muted, mid = blue, late = green). */
const STAGE_BADGE_CLASS: Record<string, string> = {
  "New Lead": "bg-slate-500/15 text-slate-700 border-slate-400/30",
  "Contacted": "bg-blue-500/15 text-blue-700 border-blue-400/30",
  "Interested": "bg-amber-500/15 text-amber-700 border-amber-400/30",
  "Call Booked": "bg-blue-500/15 text-blue-700 border-blue-400/30",
  "Proposal Sent": "bg-violet-500/15 text-violet-700 border-violet-400/30",
  "Contract Signed": "bg-green-500/15 text-green-700 border-green-400/30",
  "Onboarded": "bg-green-500/15 text-green-700 border-green-400/30",
  "Active Client": "bg-emerald-600/15 text-emerald-800 border-emerald-500/30",
};

function formatLastContact(ts: number | null | undefined): string {
  if (ts == null) return "—";
  try {
    const d = new Date(typeof ts === "number" && ts > 1e10 ? ts : ts * 1000);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  } catch {
    return "—";
  }
}

const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";

const OLLAMA_MODEL_OPTIONS = ["llama3.2", "qwen2.5", "deepseek-r1", "llama3.1-8b", "llama3.2-3b"];

export default function AgentsApisPage() {
  const { data: agentsData, refresh: refreshAgents } = useAgents(15000);
  const { data: config, refresh: refreshConfig } = useConfig(15000);
  const { data: dbInfo, refresh: refreshDb } = useDatabase(30000);
  const { data: operatorsData, refresh: refreshOperators } = useOperators(15000);
  const { data: leadsData, refresh: refreshLeads } = useLeads(15000);
  const { data: logsData, refresh: refreshLogs } = useLogs(15000);
  const { data: crmOwnersData, refresh: refreshCrm } = useCrmOwners(15000);

  const agents = Array.isArray(agentsData) ? agentsData : [];
  const operators = Array.isArray(operatorsData) ? operatorsData : [];
  const leads = Array.isArray(leadsData) ? leadsData : [];
  const logs = Array.isArray(logsData) ? logsData : [];
  const ownerList = Array.isArray(crmOwnersData) ? crmOwnersData : [];

  const [settingsForm, setSettingsForm] = useState<ApiSettings>({});
  const [contextPreview, setContextPreview] = useState<{ id: number; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; subject?: string; body?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string | null>(null);
  const [flowSearchQuery, setFlowSearchQuery] = useState("");
  const [selectedOwnerForModal, setSelectedOwnerForModal] = useState<CrmOwner | null>(null);

  const refreshAll = useCallback(() => {
    refreshAgents();
    refreshConfig();
    refreshDb();
    refreshOperators();
    refreshLeads();
    refreshLogs();
    refreshCrm();
  }, [
    refreshAgents,
    refreshConfig,
    refreshDb,
    refreshOperators,
    refreshLeads,
    refreshLogs,
    refreshCrm,
  ]);

  const handleViewContext = useCallback(async (op: Operator) => {
    try {
      const res = await fetch(`${API_BASE}/operators/${op.id}/context`, { credentials: "include" });
      const text = await res.text();
      setContextPreview({ id: op.id, text: text.slice(0, 3000) });
    } catch {
      setContextPreview({ id: op.id, text: "Failed to load context." });
    }
  }, []);

  const handleTestMessage = useCallback(async (op: Operator) => {
    try {
      const res = await fetch(`${API_BASE}/operators/${op.id}/test-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ listing_text: "3-bed apartment in city center, €1,200/month." }),
      });
      const data = await res.json();
      setTestResult({ id: op.id, subject: data.subject, body: data.body });
    } catch {
      setTestResult({ id: op.id, subject: "Error", body: "Request failed." });
    }
  }, []);

  const handleDeleteOperator = useCallback(
    async (op: Operator) => {
      if (!confirm(`Delete operator "${op.company_name ?? op.id}"?`)) return;
      try {
        await fetch(`${API_BASE}/operators/${op.id}`, { method: "DELETE", credentials: "include" });
        refreshOperators();
      } catch {
        // ignore
      }
    },
    [refreshOperators]
  );

  const handleResetDefaults = useCallback(async () => {
    setResetting(true);
    try {
      await fetch(`${API_BASE}/operators/reset-defaults`, { method: "POST", credentials: "include" });
      refreshOperators();
    } finally {
      setResetting(false);
    }
  }, [refreshOperators]);

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);
    try {
      await updateSettings(settingsForm);
      refreshConfig();
    } finally {
      setSaving(false);
    }
  }, [settingsForm, refreshConfig]);

  const leadCountByStatus = leads.reduce(
    (acc, l) => {
      const s = l.status ?? "unknown";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Process Flow: owner-centric pipeline — owner is in stage if any property has that sales_pipeline_stage
  const pipelineStageCounts = SALES_STAGES.map((stage) => ({
    stage,
    count: ownerList.filter((o) =>
      o.properties?.some((p) => p.sales_pipeline_stage === stage)
    ).length,
  }));

  const flowFilteredOwners = ownerList.filter((o) => {
    const inStage = !selectedPipelineStage || o.properties?.some((p) => p.sales_pipeline_stage === selectedPipelineStage);
    if (!inStage) return false;
    if (!flowSearchQuery.trim()) return true;
    const q = flowSearchQuery.trim().toLowerCase();
    return (
      (o.owner_name ?? "").toLowerCase().includes(q) ||
      (o.owner_email ?? "").toLowerCase().includes(q) ||
      (o.owner_phone ?? "").toLowerCase().includes(q)
    );
  });

  const avgViabilityForOwner = (o: CrmOwner): number | null => {
    const scores = o.properties?.map((p) => p.viability_score).filter((v): v is number => typeof v === "number" && !Number.isNaN(v)) ?? [];
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  };

  const primaryStageForOwner = (o: CrmOwner): string => {
    const stages = o.properties?.map((p) => p.sales_pipeline_stage).filter(Boolean) ?? [];
    const order = SALES_STAGES as unknown as string[];
    for (let i = order.length - 1; i >= 0; i--) {
      if (stages.includes(order[i])) return order[i];
    }
    return stages[0] ?? "New Lead";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Agents & APIs</h1>
          <p className="text-sm text-muted-foreground">Agents, operators, API/LLM settings, process flow, logs</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="ml-auto">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="bg-secondary border border-border w-full max-w-2xl flex flex-wrap">
          <TabsTrigger value="agents">Agents Management</TabsTrigger>
          <TabsTrigger value="apis">APIs & LLM Settings</TabsTrigger>
          <TabsTrigger value="flow">Process Flow Overview</TabsTrigger>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-primary" /> Scraped agents ({agents?.length ?? 0})
              </h3>
              {agents && agents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 pr-3 font-semibold">Agency</th>
                        <th className="text-left py-2 pr-3 font-semibold">Listing</th>
                        <th className="text-left py-2 pr-3 font-semibold">Price</th>
                        <th className="text-left py-2 font-semibold">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.slice(0, 25).map((a) => (
                        <tr key={a.id} className="border-b border-border/40">
                          <td className="py-2 pr-3">{a.agency_name ?? "—"}</td>
                          <td className="py-2 pr-3 truncate max-w-[200px]">{a.listing_title ?? "—"}</td>
                          <td className="py-2 pr-3">{a.price ?? "—"}</td>
                          <td className="py-2">{a.location ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No agents yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold">Operators (onboarded)</h3>
                <span className="text-xs text-muted-foreground">({operators.length})</span>
                <a
                  href="/operator-onboarding"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Add New Agent
                </a>
                <Button variant="outline" size="sm" disabled={resetting} onClick={handleResetDefaults}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset to Default Agents
                </Button>
              </div>
              {operators.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 pr-3 font-semibold">ID</th>
                        <th className="text-left py-2 pr-3 font-semibold">Company</th>
                        <th className="text-left py-2 pr-3 font-semibold">Tagline</th>
                        <th className="text-left py-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operators.map((op) => (
                        <tr key={op.id} className="border-b border-border/40">
                          <td className="py-2 pr-3">{op.id}</td>
                          <td className="py-2 pr-3">{op.company_name ?? "—"}</td>
                          <td className="py-2 pr-3 truncate max-w-[180px]">{op.tagline ?? "—"}</td>
                          <td className="py-2">
                            <select
                              className="text-xs rounded border border-border bg-background px-2 py-1"
                              value=""
                              onChange={(e) => {
                                const v = e.target.value;
                                e.target.value = "";
                                if (v === "edit") window.open("/operator-onboarding", "_blank");
                                else if (v === "context") handleViewContext(op);
                                else if (v === "test") handleTestMessage(op);
                                else if (v === "delete") handleDeleteOperator(op);
                              }}
                            >
                              <option value="">Actions</option>
                              <option value="edit">Edit</option>
                              <option value="context">View Context</option>
                              <option value="test">Test Message</option>
                              <option value="delete">Delete</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No operators. Use Add New Agent or Reset to Default.</p>
              )}
              {contextPreview && (
                <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs font-semibold mb-2">Context preview (operator {contextPreview.id})</p>
                  <pre className="text-[11px] whitespace-pre-wrap max-h-48 overflow-auto">{contextPreview.text}</pre>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setContextPreview(null)}>Close</Button>
                </div>
              )}
              {testResult && (
                <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs font-semibold mb-2">Test message result (operator {testResult.id})</p>
                  <p className="text-xs"><strong>Subject:</strong> {testResult.subject ?? "—"}</p>
                  <p className="text-xs mt-1"><strong>Body:</strong></p>
                  <pre className="text-[11px] whitespace-pre-wrap max-h-32 overflow-auto mt-0.5">{testResult.body ?? "—"}</pre>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTestResult(null)}>Close</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apis" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <FileJson className="w-4 h-4 text-primary" /> API & LLM settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-muted-foreground mb-1">Ollama Model</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={String(settingsForm.ollamaModel ?? config?.ollamaModel ?? "llama3.2")}
                    onChange={(e) => setSettingsForm((s) => ({ ...s, ollamaModel: e.target.value }))}
                  >
                    {OLLAMA_MODEL_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={config?.temperature != null ? String(config.temperature) : "0.7"}
                    value={settingsForm.temperature ?? ""}
                    onChange={(e) => setSettingsForm((s) => ({ ...s, temperature: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Max tokens</label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={config?.maxTokens != null ? String(config.maxTokens) : "1024"}
                    value={settingsForm.maxTokens ?? ""}
                    onChange={(e) => setSettingsForm((s) => ({ ...s, maxTokens: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Default Provider</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={settingsForm.defaultProviderId !== undefined ? String(settingsForm.defaultProviderId) : config?.defaultProviderId != null ? String(config.defaultProviderId) : ""}
                    onChange={(e) => setSettingsForm((s) => ({ ...s, defaultProviderId: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  >
                    <option value="">Use Global Default</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>{op.id} — {op.company_name ?? "Unnamed"}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button className="mt-4" disabled={saving} onClick={handleSaveSettings}>Save settings</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Current config (raw)</h3>
              <pre className="text-[11px] font-mono bg-muted/50 p-4 rounded-lg overflow-auto max-h-[200px] text-muted-foreground border border-border/50">
                {config ? JSON.stringify(config, null, 2) : "Loading…"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="mt-4 space-y-4">
          {/* Real-time data flow banner */}
          <Card className="border-border bg-muted/20">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Data flow</p>
              <p className="text-sm">
                <span className="font-medium">Onboarding</span> → <span className="font-medium">Database</span> → <span className="font-medium">Context</span> → <span className="font-medium">LLM</span> → <span className="font-medium">Outreach</span> → <span className="font-medium">Logging</span>
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                <span>Operators: <strong className="text-foreground">{operators.length}</strong></span>
                <span>Leads: <strong className="text-foreground">{leads.length}</strong></span>
                <span>Owners: <strong className="text-foreground">{ownerList.length}</strong></span>
                <span>Logs: <strong className="text-foreground">{logs.length}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline stages — clickable cards with counts */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" /> Sales pipeline (owner-centric)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Click a stage to filter the owner list below.</p>
            <div className="flex flex-wrap gap-2">
              {pipelineStageCounts.map(({ stage, count }) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setSelectedPipelineStage((s) => (s === stage ? null : stage))}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors min-w-[100px] ${
                    selectedPipelineStage === stage
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:bg-accent/30 hover:border-primary/40"
                  }`}
                >
                  <p className="text-xs font-medium text-muted-foreground truncate">{stage}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{count}</p>
                  <Badge variant="outline" className={`mt-1 text-[10px] border ${STAGE_BADGE_CLASS[stage] ?? "bg-muted"}`}>
                    {stage}
                  </Badge>
                </button>
              ))}
            </div>
            {selectedPipelineStage && (
              <p className="text-xs text-muted-foreground mt-2">
                Filtering by: <strong className="text-foreground">{selectedPipelineStage}</strong>
                {" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setSelectedPipelineStage(null)}>Clear filter</button>
              </p>
            )}
          </div>

          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search owners by name, email, phone…"
              value={flowSearchQuery}
              onChange={(e) => setFlowSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background"
            />
          </div>

          {/* Owner list table (filtered by stage + search) */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold">Owner Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold">Properties</th>
                      <th className="text-left py-3 px-4 font-semibold">Last Contact</th>
                      <th className="text-left py-3 px-4 font-semibold">Viability</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowFilteredOwners.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => setSelectedOwnerForModal(o)}
                        className="border-b border-border/40 hover:bg-accent/30 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-medium">{o.owner_name ?? "—"}</td>
                        <td className="py-2.5 px-4">{o.owner_email ?? "—"}</td>
                        <td className="py-2.5 px-4">{o.owner_phone ?? "—"}</td>
                        <td className="py-2.5 px-4">{o.properties?.length ?? 0}</td>
                        <td className="py-2.5 px-4">{formatLastContact(o.last_contact_date)}</td>
                        <td className="py-2.5 px-4">
                          {(() => { const v = avgViabilityForOwner(o); return v != null ? `${v}/10` : "—"; })()}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge variant="outline" className={`text-[10px] border ${STAGE_BADGE_CLASS[primaryStageForOwner(o)] ?? "bg-muted"}`}>
                            {primaryStageForOwner(o)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {flowFilteredOwners.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground text-center">
                  {ownerList.length === 0 ? "No owners in CRM yet. Add owners from the CRM page." : "No owners match the selected stage or search."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Owner Profile modal (Stage 1: simple overview; full tabs in next stage) */}
          <Dialog open={!!selectedOwnerForModal} onOpenChange={(open) => !open && setSelectedOwnerForModal(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedOwnerForModal?.owner_name ?? "Owner"} — Profile</DialogTitle>
              </DialogHeader>
              {selectedOwnerForModal && (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <p><span className="text-muted-foreground">Email:</span> {selectedOwnerForModal.owner_email ?? "—"}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedOwnerForModal.owner_phone ?? "—"}</p>
                  </div>
                  {selectedOwnerForModal.owner_notes && (
                    <p><span className="text-muted-foreground">Notes:</span> {selectedOwnerForModal.owner_notes}</p>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Properties ({selectedOwnerForModal.properties?.length ?? 0})</h4>
                    <div className="space-y-2">
                      {selectedOwnerForModal.properties?.map((p) => (
                        <div key={p.id} className="rounded-lg border border-border p-3">
                          <p className="font-medium">{p.title ?? "Untitled"}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.price != null && `€${p.price}`}
                            {p.surface_m2 != null && ` · ${p.surface_m2} m²`}
                            {p.sales_pipeline_stage && ` · ${p.sales_pipeline_stage}`}
                          </p>
                          {p.viability_score != null && (
                            <Badge variant="outline" className="mt-1 text-[10px]">Viability {p.viability_score}/10</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Full tabs (Conversations, Valuation, Notes) coming in next step.</p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ListOrdered className="w-4 h-4 text-primary" /> Recent logs
              </h3>
              {logs && logs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 pr-3 font-semibold">Time</th>
                        <th className="text-left py-2 pr-3 font-semibold">Status</th>
                        <th className="text-left py-2 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.slice(0, 50).map((log, i) => (
                        <tr key={log.id ?? i} className="border-b border-border/40">
                          <td className="py-2 pr-3">{log.time ?? "—"}</td>
                          <td className="py-2 pr-3">{(log as { status?: string }).status ?? "—"}</td>
                          <td className="py-2 truncate max-w-[300px]">{(log as { details?: string }).details ?? log.listing_url ?? log.contact_email ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No recent logs.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Database</h3>
          <div className="text-xs space-y-1.5">
            {dbInfo ? (
              <>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Configured:</span>
                  <span className={dbInfo.configured ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                    {dbInfo.configured ? "Yes" : "No (SQLite)"}
                  </span>
                </div>
                {dbInfo.cluster && <div className="flex gap-2"><span className="text-muted-foreground">Cluster:</span><span className="font-mono">{dbInfo.cluster}</span></div>}
                {dbInfo.user && <div className="flex gap-2"><span className="text-muted-foreground">User:</span><span className="font-mono">{dbInfo.user}</span></div>}
                {dbInfo.message && <p className="text-muted-foreground">{dbInfo.message}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">Loading…</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
