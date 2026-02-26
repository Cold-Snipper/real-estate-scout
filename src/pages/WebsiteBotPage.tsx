import { useState, useMemo, useCallback } from "react";
import { Globe, Play, Pause, Eye, Send, FileSearch } from "lucide-react";
import { useTargets, updateConfig, useRunBot } from "@/hooks/useApi";
import { TerminalLog } from "@/components/TerminalLog";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function WebsiteBotPage() {
  const { data: targets } = useTargets();
  const { status, lines, start } = useRunBot();

  const [country, setCountry] = useState("");
  const [siteId, setSiteId] = useState("");
  const [listingType, setListingType] = useState("");
  const [criteria, setCriteria] = useState("");
  const [city, setCity] = useState("");
  const [roomsMin, setRoomsMin] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [overrideUrls, setOverrideUrls] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [sendLimit, setSendLimit] = useState("10");
  const [headless, setHeadless] = useState(true);

  const countries = targets?.countries || [];
  const sites = useMemo(
    () => (country && targets?.sitesByCountry ? targets.sitesByCountry[country] || [] : []),
    [country, targets]
  );
  const selectedSite = sites.find((s) => s.id === siteId);
  const listingTypes = selectedSite?.listingTypes || targets?.defaultListingTypes || [];

  const startUrl = useMemo(() => {
    if (!selectedSite || !listingType) return "";
    const lt = listingTypes.find((t) => t.value === listingType);
    return lt ? selectedSite.baseUrl + lt.path : selectedSite.baseUrl;
  }, [selectedSite, listingType, listingTypes]);

  const handleStart = useCallback(async () => {
    const urls = overrideUrls.trim()
      ? overrideUrls.split("\n").map((u) => u.trim()).filter(Boolean)
      : startUrl ? [startUrl] : [];
    if (urls.length === 0) return;
    try {
      await updateConfig({ source_type: "website", start_urls: urls });
      start(true);
    } catch (e) { console.error(e); }
  }, [startUrl, overrideUrls, start]);

  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider";
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg bg-secondary/60 border border-border text-foreground focus:ring-2 focus:ring-ring/40 outline-none transition-shadow placeholder:text-muted-foreground/50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Website Scan</h1>
          <p className="text-sm text-muted-foreground">Scrape listings from atHome, Immotop, and more</p>
        </div>
        <div className="ml-auto"><StatusBadge status={status} /></div>
      </div>

      {/* Target Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Target Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Country</label>
              <select className={inputCls} value={country} onChange={(e) => { setCountry(e.target.value); setSiteId(""); setListingType(""); }}>
                <option value="">Select country…</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Target Site</label>
              <select className={inputCls} value={siteId} onChange={(e) => { setSiteId(e.target.value); setListingType(""); }} disabled={!country}>
                <option value="">Select site…</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Listing Type</label>
              <select className={inputCls} value={listingType} onChange={(e) => setListingType(e.target.value)} disabled={!siteId}>
                <option value="">Select type…</option>
                {listingTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {startUrl && (
            <div className="px-3 py-2.5 rounded-lg bg-muted/60 text-xs font-mono text-muted-foreground truncate border border-border/60">
              🔗 {startUrl}
            </div>
          )}

          <div>
            <label className={labelCls}>Override Start URLs (one per line)</label>
            <textarea className={`${inputCls} min-h-[80px] font-mono text-xs`} value={overrideUrls} onChange={(e) => setOverrideUrls(e.target.value)} placeholder="Leave empty to use selected target above…" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filters & Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Luxembourg" />
            </div>
            <div>
              <label className={labelCls}>Rooms (min)</label>
              <input type="number" className={inputCls} value={roomsMin} onChange={(e) => setRoomsMin(e.target.value)} placeholder="2" />
            </div>
            <div>
              <label className={labelCls}>Max Price (€)</label>
              <input type="number" className={inputCls} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="500000" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Criteria / Keywords</label>
            <textarea className={`${inputCls} min-h-[60px] text-xs`} value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="apartment, garage, garden…" />
          </div>
        </CardContent>
      </Card>

      {/* Outreach */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Outreach Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={labelCls}>Message Template</label>
            <textarea className={`${inputCls} min-h-[100px] text-xs`} value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} placeholder="Hello, I am interested in your property listing…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Send Limit</label>
              <input type="number" className={inputCls} value={sendLimit} onChange={(e) => setSendLimit(e.target.value)} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={headless} onChange={(e) => setHeadless(e.target.checked)} className="rounded border-border bg-secondary accent-primary w-4 h-4" />
                <span className="font-medium text-sm">Run headless</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleStart} disabled={(!startUrl && !overrideUrls.trim()) || status === "running"} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
              <Play className="w-4 h-4" />
              Update Config & Start Scan
            </button>
          </TooltipTrigger>
          <TooltipContent>Save config and launch scan</TooltipContent>
        </Tooltip>

        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Pause className="w-3.5 h-3.5" /> Pause Scan
        </button>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <FileSearch className="w-3.5 h-3.5" /> Test Single Page
        </button>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Eye className="w-3.5 h-3.5" /> Preview Results
        </button>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Send className="w-3.5 h-3.5" /> Send via Forms
        </button>
      </div>

      {/* Log */}
      {lines.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Scan Output</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TerminalLog lines={lines} maxHeight="400px" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
