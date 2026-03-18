// Contacter dashboard page.
// Talks only to /api/mailer/* (FastAPI mailer backend) and is the primary
// UI for listing selection, mailer runs, live logs, spectator screenshots,
// and embedded atHome/Immotop views.
"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Download, Loader2, Pause, Play, RefreshCw, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

type MailerPropertyRow = {
  id: number
  listing_url: string
  title?: string | null
  location?: string | null
  source?: string | null
  phone_number?: string | null
  contact_email?: string | null
}

type MailerStatus = {
  state: "idle" | "running" | "done" | "error"
  updated_at: number
  operator_id?: number
  source?: string
  limit?: number
  dry_run?: boolean
  stats?: { picked: number; sent: number; failed: number; dry_run: boolean }
  error?: string
}

type MailerProgress = {
  running: boolean
  total: number
  processed: number
  successes: number
  failures: number
  percent: number
  current_id?: number | null
  last_error?: string | null
}

type IntegrationType = "whatsapp" | "athome" | "immotop"
type IntegrationResult = { success: boolean; message: string; timestamp: string; url: string; title: string }
type IntegrationUiState = { enabled: boolean; status: "not_tested" | "testing" | "working" | "failed"; last?: IntegrationResult }

function apiBase(): string {
  // FastAPI lives on a separate port in this repo; this keeps the UI configurable.
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "")
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export default function ContacterPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<MailerPropertyRow[]>([])
  const [status, setStatus] = useState<MailerStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<"all" | "athome" | "immotop">("all")
  const [dryRun, setDryRun] = useState(true)
  const [operatorId, setOperatorId] = useState<number>(1)
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [progress, setProgress] = useState<MailerProgress>({
    running: false,
    total: 0,
    processed: 0,
    successes: 0,
    failures: 0,
    percent: 0,
    current_id: null,
    last_error: null,
  })
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [integrationLogs, setIntegrationLogs] = useState<string[]>([])
  const [feedEvents, setFeedEvents] = useState<any[]>([])
  const [feedConnected, setFeedConnected] = useState(false)
  const [feedPaused, setFeedPaused] = useState(false)
  const [feedAutoScroll, setFeedAutoScroll] = useState(true)
  const [spectator, setSpectator] = useState<{ url?: string; label?: string; ts?: string; channel?: string; property_id?: number | null; page_url?: string | null }>({})
  const [feedFilters, setFeedFilters] = useState<Record<string, boolean>>({
    system: true,
    mailer: true,
    athome: true,
    immotop: true,
    whatsapp: true,
    scraper: true,
  })
  const [integration, setIntegration] = useState<Record<IntegrationType, IntegrationUiState>>({
    whatsapp: { enabled: true, status: "not_tested" },
    athome: { enabled: true, status: "not_tested" },
    immotop: { enabled: true, status: "not_tested" },
  })

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)),
    [selected]
  )

  const allChecked = rows.length > 0 && selectedIds.length === rows.length

  async function refreshAll() {
    setLoading(true)
    try {
      const [props, st, integ] = await Promise.all([
        apiGet<MailerPropertyRow[]>(`/api/mailer/properties?source=${source}&limit=200`),
        apiGet<MailerStatus>(`/api/mailer/status`),
        apiGet<Record<string, IntegrationResult>>(`/api/mailer/integration-status`).catch(() => ({} as any)),
      ])
      setRows(props)
      setStatus(st)
      setSelected({})
      if (integ && typeof integ === "object") {
        setIntegration((cur) => {
          const next = { ...cur }
          for (const k of ["whatsapp", "athome", "immotop"] as IntegrationType[]) {
            const last = (integ as any)[k] as IntegrationResult | undefined
            if (last) {
              next[k] = { ...next[k], last, status: last.success ? "working" : "failed" }
            }
          }
          return next
        })
      }
    } catch (e: any) {
      toast({ title: "Failed to load mailer data", description: String(e?.message || e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  useEffect(() => {
    // Local persistence for toggles + website URL.
    try {
      const raw = localStorage.getItem("contacter_integration_state")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.integration) setIntegration(parsed.integration)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("contacter_integration_state", JSON.stringify({ integration }))
    } catch {
      // ignore
    }
  }, [integration])

  useEffect(() => {
    // Live feed subscription (SSE). This is the "real-time console" for what the bot is doing.
    const es = new EventSource(`${apiBase()}/api/mailer/live-feed`)
    setFeedConnected(true)
    es.onmessage = (event) => {
      if (feedPaused) return
      try {
        const data = JSON.parse(event.data)
        setFeedEvents((cur) => [...cur, data].slice(-400))
        const su = data?.data?.spectator_url
        if (typeof su === "string" && su.startsWith("/api/")) {
          setSpectator({
            url: `${apiBase()}${su}`,
            label: String(data?.data?.spectator_label || ""),
            ts: String(data?.data?.spectator_ts || data?.ts || ""),
            channel: String(data?.channel || ""),
            property_id: data?.data?.property_id ?? null,
            page_url: data?.data?.page_url ?? null,
          })
        }
      } catch {
        setFeedEvents((cur) => [...cur, { ts: "", channel: "system", level: "debug", message: String(event.data), data: {} }].slice(-400))
      }
    }
    es.onerror = () => {
      setFeedConnected(false)
      try {
        es.close()
      } catch {
        // ignore
      }
    }
    return () => {
      try {
        es.close()
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedPaused])

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const st = await apiGet<MailerStatus>(`/api/mailer/status`)
        setStatus(st)
      } catch {
        // ignore
      }
    }, 2000)
    return () => clearInterval(t)
  }, [])

  function statusBadge(s: IntegrationUiState) {
    if (s.status === "testing") return <Badge variant="secondary">Testing…</Badge>
    if (s.status === "working") return <Badge className="bg-green-600 hover:bg-green-600 text-white">✅ Working</Badge>
    if (s.status === "failed") return <Badge variant="destructive">❌ Failed</Badge>
    return <Badge variant="outline">Not tested</Badge>
  }

  async function testIntegration(t: IntegrationType) {
    setIntegration((cur) => ({ ...cur, [t]: { ...cur[t], status: "testing" } }))
    const startedAt = new Date().toLocaleString()
    setIntegrationLogs((l) => [...l, `${startedAt} TEST ${t} started`].slice(-200))
    try {
      const body: any = { type: t, timeout_ms: 20000 }
      const res = await apiPost<IntegrationResult>(`/api/mailer/test-integration`, body)
      setIntegration((cur) => ({
        ...cur,
        [t]: { ...cur[t], last: res, status: res.success ? "working" : "failed" },
      }))
      setIntegrationLogs((l) =>
        [...l, `${new Date().toLocaleString()} TEST ${t} ${res.success ? "OK" : "FAIL"}: ${res.message}`].slice(-200)
      )
      toast({ title: `${t} test ${res.success ? "passed" : "failed"}`, description: res.message, variant: res.success ? "default" : "destructive" })
    } catch (e: any) {
      setIntegration((cur) => ({ ...cur, [t]: { ...cur[t], status: "failed" } }))
      setIntegrationLogs((l) => [...l, `${new Date().toLocaleString()} TEST ${t} ERROR: ${String(e?.message || e)}`].slice(-200))
      toast({ title: `${t} test error`, description: String(e?.message || e), variant: "destructive" })
    }
  }

  async function runAllIntegrationTests() {
    for (const t of ["whatsapp", "athome", "immotop"] as IntegrationType[]) {
      if (!integration[t]?.enabled) continue
      // Sequential (less noisy): opens one headed browser at a time.
      // eslint-disable-next-line no-await-in-loop
      await testIntegration(t)
    }
  }

  function cancelRun() {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
    setProgress((p) => ({ ...p, running: false }))
  }

  async function markContacted() {
    if (selectedIds.length === 0) {
      toast({ title: "Select at least one listing", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<{ ok: boolean; updated: number }>(`/api/mailer/mark-contacted`, {
        listing_ids: selectedIds,
        sent_via_email: true,
        sent_via_whatsapp: false,
      })
      toast({ title: "Marked as contacted", description: `${res.updated} updated` })
      await refreshAll()
    } catch (e: any) {
      toast({ title: "Failed to mark contacted", description: String(e?.message || e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function clearSelection() {
    setSelected({})
    toast({ title: "Selection cleared" })
  }

  async function exportCsv() {
    if (selectedIds.length === 0) {
      toast({ title: "Select at least one listing", variant: "destructive" })
      return
    }
    const qs = new URLSearchParams({ listing_ids: selectedIds.join(",") })
    const url = `${apiBase()}/api/mailer/export.csv?${qs.toString()}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  async function runMailer() {
    if (selectedIds.length === 0) {
      toast({ title: "Select at least one listing", variant: "destructive" })
      return
    }

    // Reset progress and start SSE stream.
    cancelRun()
    setProgress({
      running: true,
      total: selectedIds.length,
      processed: 0,
      successes: 0,
      failures: 0,
      percent: 0,
      current_id: null,
      last_error: null,
    })

    const qs = new URLSearchParams({
      operator_id: String(operatorId),
      listing_ids: selectedIds.join(","),
      source,
      dry_run: String(dryRun),
      headless: "true",
    })

    const es = new EventSource(`${apiBase()}/api/mailer/run-progress?${qs.toString()}`)
    setEventSource(es)
    setLogs([])

    es.onmessage = (event) => {
      if (event.data === "[DONE]") {
        es.close()
        setEventSource(null)
        setProgress((p) => ({ ...p, running: false, percent: 100 }))
        toast({ title: dryRun ? "Dry run finished" : "Mailer finished" })
        refreshAll()
        return
      }
      try {
        const data = JSON.parse(event.data)
        if (data?.state === "error") {
          es.close()
          setEventSource(null)
          setProgress((p) => ({ ...p, running: false, last_error: data?.error || "Unknown error" }))
          toast({ title: "Mailer error", description: String(data?.error || "Unknown error"), variant: "destructive" })
          return
        }
        if (data?.log) {
          setLogs((l) => [...l, String(data.log)].slice(-200))
        }
        setProgress((p) => ({
          ...p,
          running: true,
          total: Number(data.total ?? p.total),
          processed: Number(data.processed ?? p.processed),
          successes: Number(data.successes ?? p.successes),
          failures: Number(data.failures ?? p.failures),
          percent: Number(data.percent ?? p.percent),
          current_id: data.current_id ?? null,
          last_error: data.error ?? null,
        }))
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      es.close()
      setEventSource(null)
      setProgress((p) => ({ ...p, running: false }))
      toast({ title: "Mailer connection error", variant: "destructive" })
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold">Contacter</h1>
          <Badge variant="secondary">{rows.length} ready</Badge>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <select
              className="text-sm rounded-lg border border-border bg-card px-3 py-1.5"
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
            >
              <option value="all">All sources</option>
              <option value="athome">atHome.lu</option>
              <option value="immotop">Immotop.lu</option>
            </select>
            <select
              className="text-sm rounded-lg border border-border bg-card px-3 py-1.5"
              value={String(dryRun)}
              onChange={(e) => setDryRun(e.target.value === "true")}
            >
              <option value="true">Dry run</option>
              <option value="false">Real send</option>
            </select>
            <input
              className="w-20 text-sm rounded-lg border border-border bg-background px-3 py-1.5"
              type="number"
              min={1}
              value={operatorId}
              onChange={(e) => setOperatorId(Number(e.target.value))}
              title="Operator ID"
            />
            <Button variant="outline" onClick={refreshAll} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {progress.running && (
              <Button variant="outline" onClick={cancelRun} disabled={loading}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button onClick={runMailer} disabled={loading || selectedIds.length === 0}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {dryRun ? "Dry run" : "Run mailer"} ({selectedIds.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Integration status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(["whatsapp", "athome", "immotop"] as IntegrationType[]).map((t) => (
                <div key={t} className="flex items-center justify-between rounded-lg border border-border p-3 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium">
                        {t === "whatsapp"
                          ? "WhatsApp Web"
                          : t === "athome"
                            ? "atHome.lu"
                            : t === "immotop"
                              ? "Immotop.lu"
                              : "Integration"}
                      </div>
                      {statusBadge(integration[t])}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {integration[t]?.last?.timestamp ? `Last: ${integration[t].last?.timestamp}` : "Last: —"}
                      {integration[t]?.last?.url ? ` • ${integration[t].last?.url}` : ""}
                    </div>
                    {integration[t]?.last?.message && (
                      <div className="text-xs mt-2 text-muted-foreground">{integration[t].last?.message}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">On</span>
                      <Switch
                        checked={integration[t]?.enabled}
                        onCheckedChange={(v) => setIntegration((cur) => ({ ...cur, [t]: { ...cur[t], enabled: Boolean(v) } }))}
                        aria-label={`Enable ${t} integration`}
                      />
                    </div>
                    <Button
                      onClick={() => testIntegration(t)}
                      disabled={loading || integration[t]?.status === "testing" || !integration[t]?.enabled}
                    >
                      {integration[t]?.status === "testing" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={runAllIntegrationTests} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run all enabled tests
              </Button>
              <Button variant="ghost" onClick={() => setIntegrationLogs([])} disabled={integrationLogs.length === 0}>
                <X className="w-4 h-4 mr-2" />
                Clear test log
              </Button>
            </div>

            {integrationLogs.length > 0 ? (
              <Alert>
                <AlertTitle>Integration test log</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 max-h-40 overflow-auto space-y-1 font-mono text-xs">
                    {integrationLogs.slice(-40).map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap break-words">
                        {line}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="text-sm text-muted-foreground">No integration tests run in this session yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live bot feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={feedConnected ? "secondary" : "destructive"}>{feedConnected ? "Connected" : "Disconnected"}</Badge>
              <Button
                variant="outline"
                onClick={() => setFeedPaused((p) => !p)}
                title={feedPaused ? "Resume" : "Pause"}
              >
                {feedPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                {feedPaused ? "Resume" : "Pause"}
              </Button>
              <Button variant="ghost" onClick={() => setFeedEvents([])} disabled={feedEvents.length === 0}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">Auto-scroll</span>
                <Switch checked={feedAutoScroll} onCheckedChange={(v) => setFeedAutoScroll(Boolean(v))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.keys(feedFilters).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={feedFilters[k] ? "secondary" : "outline"}
                  onClick={() => setFeedFilters((f) => ({ ...f, [k]: !f[k] }))}
                >
                  {k}
                </Button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-black text-white p-3 max-h-[320px] overflow-auto font-mono text-xs">
              {feedEvents
                .filter((e) => feedFilters[String(e?.channel || "system")] !== false)
                .slice(-250)
                .map((e, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-words">
                    <span className="text-zinc-400">{e?.ts ? `[${e.ts}] ` : ""}</span>
                    <span className="text-zinc-300">{String(e?.channel || "system").padEnd(8)} </span>
                    <span className={e?.level === "error" ? "text-red-400" : e?.level === "warn" ? "text-yellow-300" : "text-emerald-300"}>
                      {String(e?.level || "info").toUpperCase().padEnd(5)}{" "}
                    </span>
                    <span>{e?.message || ""}</span>
                    {e?.data && Object.keys(e.data).length > 0 ? (
                      <span className="text-zinc-500"> {JSON.stringify(e.data)}</span>
                    ) : null}
                  </div>
                ))}
              {feedEvents.length === 0 && <div className="text-zinc-400">No events yet.</div>}
            </div>

            <div className="text-xs text-muted-foreground">
              This console is fed by real runtime events from the backend. Scrapers can push events via{" "}
              <code className="px-1 py-0.5 rounded bg-muted">POST /api/mailer/emit-feed</code>.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bot screen (spectator)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {spectator?.url ? (
              <>
                <div className="text-xs text-muted-foreground">
                  {spectator.ts ? `Last frame: ${spectator.ts}` : "Last frame: —"}
                  {spectator.channel ? ` • ${spectator.channel}` : ""}
                  {spectator.label ? ` • ${spectator.label}` : ""}
                  {spectator.property_id ? ` • property_id=${spectator.property_id}` : ""}
                </div>
                <div className="rounded-lg border border-border overflow-hidden bg-black">
                  <img
                    src={spectator.url + `?t=${Date.now()}`}
                    alt="Bot spectator view"
                    className="w-full h-auto block"
                  />
                </div>
                {spectator.page_url ? (
                  <div className="text-xs text-muted-foreground break-words">Page: {spectator.page_url}</div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No spectator frames yet. Start a real run (or WhatsApp login) to capture screenshots.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embedded sites (direct view)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground">
              These are direct embeds of atHome.lu and Immotop.lu. If a site blocks embedding (security headers), the frame
              may appear blank or show an error.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">atHome.lu</div>
                <div className="rounded-lg border border-border overflow-hidden bg-background">
                  <iframe
                    src="https://www.athome.lu/"
                    title="atHome.lu"
                    className="w-full h-80 border-0"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Immotop.lu</div>
                <div className="rounded-lg border border-border overflow-hidden bg-background">
                  <iframe
                    src="https://www.immotop.lu/"
                    title="Immotop.lu"
                    className="w-full h-80 border-0"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mailer status</CardTitle>
          </CardHeader>
          <CardContent>
            {progress.running && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Processing {progress.processed} of {progress.total}
                    {progress.current_id ? ` (current: ${progress.current_id})` : ""}
                  </span>
                  <span className="tabular-nums">{progress.percent.toFixed(1)}%</span>
                </div>
                <Progress value={progress.percent} className="h-2" />
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> {progress.successes} success
                  </div>
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" /> {progress.failures} failed
                  </div>
                </div>
                {progress.last_error && (
                  <div className="text-xs text-red-700">Last error: {progress.last_error}</div>
                )}
              </div>
            )}
            {status ? (
              <div className="text-sm space-y-1">
                <div>
                  State:{" "}
                  <span className={status.state === "error" ? "text-red-600 font-medium" : "font-medium"}>
                    {status.state}
                  </span>
                </div>
                {status.stats && (
                  <div className="flex gap-4 flex-wrap text-sm">
                    <span>Picked: {status.stats.picked}</span>
                    <span className="text-green-700">Sent: {status.stats.sent}</span>
                    <span className="text-red-700">Failed: {status.stats.failed}</span>
                  </div>
                )}
                {status.error && <div className="text-red-700">Error: {status.error}</div>}
              </div>
            ) : (
              <div className="flex items-center text-muted-foreground text-sm">
                <AlertCircle className="w-4 h-4 mr-2" /> No status yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mass actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={runMailer} disabled={loading || selectedIds.length === 0}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {dryRun ? "Dry run selected" : "Run mailer selected"} ({selectedIds.length})
              </Button>
              <Button variant="secondary" onClick={markContacted} disabled={loading || selectedIds.length === 0}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark contacted ({selectedIds.length})
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={selectedIds.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="ghost" onClick={clearSelection} disabled={selectedIds.length === 0}>
                <X className="w-4 h-4 mr-2" />
                Clear selection
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listings ready for contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={(v) => {
                          const checked = Boolean(v)
                          const next: Record<number, boolean> = {}
                          for (const r of rows) next[r.id] = checked
                          setSelected(next)
                        }}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox
                          checked={Boolean(selected[r.id])}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))}
                          aria-label={`Select ${r.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{r.id}</TableCell>
                      <TableCell className="max-w-[360px] truncate">{r.title || "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{r.location || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.source || "—"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[340px] truncate">
                        <a className="text-primary hover:underline" href={r.listing_url} target="_blank" rel="noreferrer">
                          {r.listing_url}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-muted-foreground py-10 text-center">
                        No properties match the filters (or everything is already contacted).
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {progress.running && (
          <Card>
            <CardHeader>
              <CardTitle>Live log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-[260px] overflow-auto text-xs font-mono space-y-1">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground">Waiting for events...</div>
                ) : (
                  logs.map((line, idx) => <div key={idx}>{line}</div>)
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

