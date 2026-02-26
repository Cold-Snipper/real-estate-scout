import { useState, useMemo } from "react";
import { Database, RefreshCw, Users, Building2, Activity, FileJson, Download } from "lucide-react";
import { useLeads, useAgents, useLogs, useConfig, useDatabase, exportCrmOwnersCsv } from "@/hooks/useApi";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DATA_STATUS_OPTIONS = ["All", "New Lead", "Contacted", "Interested", "Call Booked", "Proposal Sent", "Contract Signed", "Onboarded", "Active Client"];
const DATA_CHANNEL_OPTIONS = ["All", "Email", "WhatsApp", "Facebook Messenger", "Facebook Group Comments", "Website Forms", "Phone/SMS"];

export default function DataPage() {
  const { data: leads, refresh: refreshLeads } = useLeads(5000);
  const { data: agents, refresh: refreshAgents } = useAgents(5000);
  const { data: logs, refresh: refreshLogs } = useLogs(5000);
  const { data: config, refresh: refreshConfig } = useConfig(5000);
  const { data: dbInfo, refresh: refreshDatabase } = useDatabase(5000);
  const [leadStatusFilter, setLeadStatusFilter] = useState("All");
  const [leadChannelFilter, setLeadChannelFilter] = useState("All");

  const filteredLeads = useMemo(() => {
    let list = leads ?? [];
    if (leadStatusFilter && leadStatusFilter !== "All") list = list.filter((l) => (l.status ?? "") === leadStatusFilter);
    if (leadChannelFilter && leadChannelFilter !== "All") list = list.filter((l) => (l.channel ?? "").toLowerCase().includes(leadChannelFilter.toLowerCase().split("/")[0]));
    return list;
  }, [leads, leadStatusFilter, leadChannelFilter]);

  const refreshAll = () => {
    refreshLeads();
    refreshAgents();
    refreshLogs();
    refreshConfig();
    refreshDatabase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Data & CRM</h1>
          <p className="text-sm text-muted-foreground">Browse leads, agents, activity, and config</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={refreshAll} className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </TooltipTrigger>
          <TooltipContent>Refresh all data</TooltipContent>
        </Tooltip>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leads?.length ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agents?.length ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Total Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs?.length ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Recent Activity</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data panels */}
      <div className="space-y-3">
        <CollapsibleSection title="Leads" count={filteredLeads.length} icon={<Users className="w-3.5 h-3.5 text-primary" />} defaultOpen>
          <div className="flex flex-wrap items-center gap-3 mt-3 mb-2">
            <label className="text-xs text-muted-foreground">Status Filter</label>
            <select value={leadStatusFilter} onChange={(e) => setLeadStatusFilter(e.target.value)} className="text-xs rounded border border-border bg-background px-2 py-1.5">
              {DATA_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="text-xs text-muted-foreground">Channel Filter</label>
            <select value={leadChannelFilter} onChange={(e) => setLeadChannelFilter(e.target.value)} className="text-xs rounded border border-border bg-background px-2 py-1.5">
              {DATA_CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={() => exportCrmOwnersCsv()} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
          {filteredLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 pr-3 font-semibold">Email</th>
                    <th className="text-left py-2 pr-3 font-semibold">Phone</th>
                    <th className="text-left py-2 pr-3 font-semibold">Status</th>
                    <th className="text-left py-2 pr-3 font-semibold">Channel</th>
                    <th className="text-left py-2 pr-3 font-semibold">Source</th>
                    <th className="text-left py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.slice(0, 50).map((l) => (
                    <tr key={l.id} className="border-b border-border/40 hover:bg-accent/30">
                      <td className="py-2 pr-3">{l.contact_email || "—"}</td>
                      <td className="py-2 pr-3">{l.phone_number || "—"}</td>
                      <td className="py-2 pr-3">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">{l.status || "—"}</span>
                      </td>
                      <td className="py-2 pr-3">{l.channel || "—"}</td>
                      <td className="py-2 pr-3 font-mono text-[10px] truncate max-w-[180px]">
                        {l.listing_url ? <a href={l.listing_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{(() => { try { return new URL(l.listing_url!).hostname; } catch { return l.listing_url!.slice(0, 30); } })()}</a> : "—"}
                      </td>
                      <td className="py-2">
                        <select className="text-[10px] rounded border border-border bg-background px-1.5 py-1" value="" onChange={(e) => { const v = e.target.value; e.target.value = ""; if (v === "detail" || v === "contacted" || v === "send" || v === "export" || v === "delete") alert(v === "export" ? "Export CSV from button above" : "Coming soon"); }}>
                          <option value="">Actions</option>
                          <option value="detail">View Detail</option>
                          <option value="contacted">Mark as Contacted</option>
                          <option value="send">Send Message</option>
                          <option value="export">Export</option>
                          <option value="delete">Delete</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-muted-foreground mt-2">No leads match filters.</p>}
        </CollapsibleSection>

        <CollapsibleSection title="Agents" count={agents?.length} icon={<Building2 className="w-3.5 h-3.5 text-primary" />}>
          <div className="flex justify-end mt-3 mb-2">
            <button type="button" onClick={() => exportCrmOwnersCsv()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
          {agents && agents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2 pr-3 font-semibold">Agency</th>
                    <th className="text-left py-2 pr-3 font-semibold">Listing</th>
                    <th className="text-left py-2 pr-3 font-semibold">Price</th>
                    <th className="text-left py-2 pr-3 font-semibold">Location</th>
                    <th className="text-left py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.slice(0, 25).map((a) => (
                    <tr key={a.id} className="border-b border-border/40 hover:bg-accent/30">
                      <td className="py-2 pr-3">{a.agency_name || "—"}</td>
                      <td className="py-2 pr-3 truncate max-w-[200px]">{a.listing_title || "—"}</td>
                      <td className="py-2 pr-3">{a.price || "—"}</td>
                      <td className="py-2 pr-3">{a.location || "—"}</td>
                      <td className="py-2">
                        <select className="text-[10px] rounded border border-border bg-background px-1.5 py-1" value="" onChange={(e) => { const v = e.target.value; e.target.value = ""; if (v === "detail" || v === "contacted" || v === "send" || v === "export" || v === "delete") alert("Coming soon"); }}>
                          <option value="">Actions</option>
                          <option value="detail">View Detail</option>
                          <option value="contacted">Mark as Contacted</option>
                          <option value="send">Send Message</option>
                          <option value="export">Export</option>
                          <option value="delete">Delete</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-muted-foreground mt-2">No agents yet.</p>}
        </CollapsibleSection>

        <CollapsibleSection title="Activity Logs" count={logs?.length} icon={<Activity className="w-3.5 h-3.5 text-primary" />}>
          {logs && logs.length > 0 ? (
            <div className="space-y-1 mt-3">
              {logs.slice(0, 15).map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground font-mono text-[10px] shrink-0">{new Date(log.time).toLocaleTimeString()}</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">{log.status || "—"}</span>
                  <span className="truncate">{log.contact_email || log.listing_url || "—"}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground mt-2">No recent activity.</p>}
        </CollapsibleSection>

        <CollapsibleSection title="Database" icon={<Database className="w-3.5 h-3.5 text-primary" />}>
          <div className="mt-3 text-xs space-y-1.5">
            {dbInfo ? (
              <>
                <div className="flex gap-2"><span className="text-muted-foreground">Configured:</span><span className={dbInfo.configured ? "text-success font-medium" : "text-destructive font-medium"}>{dbInfo.configured ? "Yes" : "No"}</span></div>
                {dbInfo.cluster && <div className="flex gap-2"><span className="text-muted-foreground">Cluster:</span><span className="font-mono">{dbInfo.cluster}</span></div>}
                {dbInfo.user && <div className="flex gap-2"><span className="text-muted-foreground">User:</span><span className="font-mono">{dbInfo.user}</span></div>}
                {dbInfo.message && <p className="text-muted-foreground">{dbInfo.message}</p>}
              </>
            ) : <p className="text-muted-foreground">Loading…</p>}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Config" icon={<FileJson className="w-3.5 h-3.5 text-primary" />}>
          <pre className="mt-3 text-[11px] font-mono bg-muted/50 p-4 rounded-lg overflow-auto max-h-[300px] text-muted-foreground border border-border/50">
            {config ? JSON.stringify(config, null, 2) : "Loading…"}
          </pre>
        </CollapsibleSection>

        <CollapsibleSection title="LU Listings" icon={<Database className="w-3.5 h-3.5 text-primary" />}>
          <p className="mt-3 text-xs text-muted-foreground">Luxembourg listings from scraper (when configured).</p>
        </CollapsibleSection>
      </div>
    </div>
  );
}
