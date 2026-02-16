import { useState, useMemo, useCallback } from "react";
import { Globe, Play } from "lucide-react";
import { useTargets } from "@/hooks/useApi";
import { updateConfig, useRunBot } from "@/hooks/useApi";
import { TerminalLog } from "./TerminalLog";
import { StatusBadge } from "./StatusBadge";

export function WebsiteScan() {
  const { data: targets } = useTargets();
  const { status, lines, start } = useRunBot();

  const [country, setCountry] = useState("");
  const [siteId, setSiteId] = useState("");
  const [listingType, setListingType] = useState("");

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
    if (!startUrl) return;
    try {
      await updateConfig({ source_type: "website", start_urls: [startUrl] });
      start(true);
    } catch (e) {
      console.error(e);
    }
  }, [startUrl, start]);

  const selectCls = "w-full px-3 py-2 text-sm rounded-md bg-secondary border border-border text-foreground focus:ring-1 focus:ring-ring outline-none";

  return (
    <section id="website-scan" className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Website Scan</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Country</label>
          <select
            className={selectCls}
            value={country}
            onChange={(e) => { setCountry(e.target.value); setSiteId(""); setListingType(""); }}
          >
            <option value="">Select country…</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Target Site</label>
          <select
            className={selectCls}
            value={siteId}
            onChange={(e) => { setSiteId(e.target.value); setListingType(""); }}
            disabled={!country}
          >
            <option value="">Select site…</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Listing Type</label>
          <select
            className={selectCls}
            value={listingType}
            onChange={(e) => setListingType(e.target.value)}
            disabled={!siteId}
          >
            <option value="">Select type…</option>
            {listingTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {startUrl && (
        <div className="px-3 py-2 rounded-md bg-muted text-xs font-mono text-muted-foreground truncate">
          {startUrl}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!startUrl || status === "running"}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Play className="w-3.5 h-3.5" />
        Update Config & Start Scan
      </button>
    </section>
  );
}
