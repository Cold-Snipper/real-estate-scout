import { useState, useCallback, useMemo } from "react";
import { Facebook, Play } from "lucide-react";
import { toast } from "sonner";
import { updateConfig, useRunBot } from "@/hooks/useApi";

export function FacebookScan() {
  const { status, start } = useRunBot();
  const [source, setSource] = useState<"marketplace" | "groups">("marketplace");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState("50");
  const [keywords, setKeywords] = useState("");
  const [groupUrls, setGroupUrls] = useState("");

  const startUrl = useMemo(() => {
    if (source === "marketplace") {
      const base = `https://www.facebook.com/marketplace/${city || "nearby"}/propertyforsale`;
      const params = new URLSearchParams();
      if (keywords) params.set("query", keywords);
      if (radius) params.set("radius", radius);
      return params.toString() ? `${base}?${params}` : base;
    }
    return "";
  }, [source, city, radius, keywords]);

  const handleStart = useCallback(async () => {
    try {
      if (source === "marketplace") {
        await updateConfig({
          source_type: "facebook",
          start_urls: [startUrl],
          facebook: { marketplace_enabled: true, marketplace_url_template: startUrl },
        });
      } else {
        const urls = groupUrls.split("\n").map((u) => u.trim()).filter(Boolean);
        if (urls.length === 0) {
          toast.error("Enter at least one group URL");
          return;
        }
        await updateConfig({
          source_type: "facebook",
          start_urls: urls,
          facebook: { marketplace_enabled: false },
        });
      }
      start(true);
      toast.success("Config updated, scan started");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to start scan");
    }
  }, [source, startUrl, groupUrls, start]);

  const inputCls = "w-full px-3 py-2 text-sm rounded-md bg-secondary border border-border text-foreground focus:ring-1 focus:ring-ring outline-none";
  const selectCls = inputCls;

  return (
    <section id="facebook-scan" className="space-y-4">
      <div className="flex items-center gap-2">
        <Facebook className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Facebook Scan</h2>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Source</label>
        <select className={selectCls} value={source} onChange={(e) => setSource(e.target.value as "marketplace" | "groups")}>
          <option value="marketplace">Marketplace</option>
          <option value="groups">Groups</option>
        </select>
      </div>

      {source === "marketplace" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">City</label>
            <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. luxembourg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Radius (km)</label>
            <input className={inputCls} value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Keywords</label>
            <input className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="apartment, house…" />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Group URLs (one per line)</label>
          <textarea
            className={`${inputCls} min-h-[100px] font-mono text-xs`}
            value={groupUrls}
            onChange={(e) => setGroupUrls(e.target.value)}
            placeholder="https://www.facebook.com/groups/..."
          />
        </div>
      )}

      {source === "marketplace" && startUrl && (
        <div className="px-3 py-2 rounded-md bg-muted text-xs font-mono text-muted-foreground truncate">
          {startUrl}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={status === "running"}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Play className="w-3.5 h-3.5" />
        Update Config & Start Scan
      </button>
    </section>
  );
}
