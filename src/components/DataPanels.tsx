import { useLeads, useAgents, useLogs, useConfig, useDatabase } from "@/hooks/useApi";
import { CollapsibleSection } from "./CollapsibleSection";
import { Database, Users, Building2, Activity, FileJson } from "lucide-react";

export function DataPanels() {
  const { data: leads } = useLeads();
  const { data: agents } = useAgents();
  const { data: logs } = useLogs();
  const { data: config } = useConfig();
  const { data: dbInfo } = useDatabase();

  return (
    <div className="space-y-2">
      <CollapsibleSection title="Leads" count={leads?.length} icon={<Users className="w-3.5 h-3.5 text-primary" />}>
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 pr-3 font-medium">Email</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Phone</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Status</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Channel</th>
                  <th className="text-left py-1.5 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 15).map((l) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-1.5 pr-3">{l.contact_email || "—"}</td>
                    <td className="py-1.5 pr-3">{l.contact_phone || "—"}</td>
                    <td className="py-1.5 pr-3">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{l.status || "—"}</span>
                    </td>
                    <td className="py-1.5 pr-3">{l.channel || "—"}</td>
                    <td className="py-1.5 font-mono text-[10px] truncate max-w-[200px]">
                      {l.source_url ? (
                        <a href={l.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {new URL(l.source_url).hostname}
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">No leads yet.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Agents" count={agents?.length} icon={<Building2 className="w-3.5 h-3.5 text-primary" />}>
        {agents && agents.length > 0 ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 pr-3 font-medium">Agency</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Listing</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Price</th>
                  <th className="text-left py-1.5 font-medium">Location</th>
                </tr>
              </thead>
              <tbody>
                {agents.slice(0, 15).map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-1.5 pr-3">{a.agency_name || "—"}</td>
                    <td className="py-1.5 pr-3 truncate max-w-[200px]">{a.listing_title || "—"}</td>
                    <td className="py-1.5 pr-3">{a.price || "—"}</td>
                    <td className="py-1.5">{a.location || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">No agents yet.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Recent Activity" count={logs?.length} icon={<Activity className="w-3.5 h-3.5 text-primary" />}>
        {logs && logs.length > 0 ? (
          <div className="space-y-1 mt-3">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs py-1 border-b border-border/30">
                <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                  {new Date(log.time).toLocaleTimeString()}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">{log.status || "—"}</span>
                <span className="truncate">{log.contact_email || log.source_url || "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">No recent activity.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Database" icon={<Database className="w-3.5 h-3.5 text-primary" />}>
        <div className="mt-3 text-xs space-y-1">
          {dbInfo ? (
            <>
              <div className="flex gap-2">
                <span className="text-muted-foreground">Configured:</span>
                <span className={dbInfo.configured ? "text-success" : "text-destructive"}>
                  {dbInfo.configured ? "Yes" : "No"}
                </span>
              </div>
              {dbInfo.cluster && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Cluster:</span>
                  <span className="font-mono">{dbInfo.cluster}</span>
                </div>
              )}
              {dbInfo.user && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-mono">{dbInfo.user}</span>
                </div>
              )}
              {dbInfo.message && <p className="text-muted-foreground">{dbInfo.message}</p>}
            </>
          ) : (
            <p className="text-muted-foreground">Loading…</p>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Config" icon={<FileJson className="w-3.5 h-3.5 text-primary" />}>
        <pre className="mt-3 text-[11px] font-mono bg-background p-3 rounded-md overflow-auto max-h-[300px] text-muted-foreground">
          {config ? JSON.stringify(config, null, 2) : "Loading…"}
        </pre>
      </CollapsibleSection>
    </div>
  );
}
