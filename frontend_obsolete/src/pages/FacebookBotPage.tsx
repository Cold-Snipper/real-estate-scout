import { useState, useCallback, useMemo } from "react";
import { Facebook, Play, Search, CheckCheck, Trash2, Send } from "lucide-react";
import { updateConfig, useRunBot } from "@/hooks/useApi";
import { TerminalLog } from "@/components/TerminalLog";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function FacebookBotPage() {
  const { status, lines, start } = useRunBot();
  const [source, setSource] = useState<"marketplace" | "groups" | "both">("marketplace");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState("50");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("propertyforsale");
  const [propertyType, setPropertyType] = useState("any");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [postedWithin, setPostedWithin] = useState("");
  const [language, setLanguage] = useState("en");
  const [fsboOnly, setFsboOnly] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [groupUrls, setGroupUrls] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [sendLimit, setSendLimit] = useState("10");
  const [headless, setHeadless] = useState(true);

  const startUrl = useMemo(() => {
    if (source === "groups") return "";
    const base = `https://www.facebook.com/marketplace/${city || "nearby"}/${category}`;
    const params = new URLSearchParams();
    if (keywords) params.set("query", keywords);
    if (radius) params.set("radius", radius);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    return params.toString() ? `${base}?${params}` : base;
  }, [source, city, radius, keywords, category, minPrice, maxPrice]);

  const handleStart = useCallback(async () => {
    try {
      if (source === "groups") {
        const urls = groupUrls.split("\n").map((u) => u.trim()).filter(Boolean);
        await updateConfig({ source_type: "facebook", start_urls: urls, facebook: { marketplace_enabled: false } });
      } else {
        await updateConfig({ source_type: "facebook", start_urls: [startUrl], facebook: { marketplace_enabled: true } });
      }
      start(true);
    } catch (e) { console.error(e); }
  }, [source, startUrl, groupUrls, start]);

  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider";
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg bg-secondary/60 border border-border text-foreground focus:ring-2 focus:ring-ring/40 outline-none transition-shadow placeholder:text-muted-foreground/50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Facebook className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Facebook Scan</h1>
          <p className="text-sm text-muted-foreground">Scrape Marketplace and Groups listings</p>
        </div>
        <div className="ml-auto"><StatusBadge status={status} /></div>
      </div>

      {/* Source */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Source Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={labelCls}>Source Type</label>
            <div className="flex gap-2">
              {(["marketplace", "groups", "both"] as const).map((s) => (
                <button key={s} onClick={() => setSource(s)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${source === s ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={loggedIn} onChange={(e) => setLoggedIn(e.target.checked)} className="rounded border-border bg-secondary accent-primary w-4 h-4" />
            <span className="font-medium">Logged-in user session</span>
          </label>
        </CardContent>
      </Card>

      {/* Marketplace config */}
      {source !== "groups" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Marketplace Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>City</label>
                <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="luxembourg" />
              </div>
              <div>
                <label className={labelCls}>Radius (km)</label>
                <input className={inputCls} value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="50" />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="propertyforsale">Property for Sale</option>
                  <option value="propertyrentals">Rentals</option>
                  <option value="rooms">Rooms</option>
                  <option value="commercialproperty">Commercial</option>
                  <option value="land">Land</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Keywords</label>
                <input className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="apartment, villa…" />
              </div>
              <div>
                <label className={labelCls}>Property Type</label>
                <select className={inputCls} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                  <option value="any">Any</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="studio">Studio</option>
                  <option value="townhouse">Townhouse</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Language</label>
                <select className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="lu">Luxembourgish</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Min Price (€)</label>
                <input type="number" className={inputCls} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Max Price (€)</label>
                <input type="number" className={inputCls} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="1000000" />
              </div>
              <div>
                <label className={labelCls}>Bedrooms</label>
                <input type="number" className={inputCls} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="2" />
              </div>
              <div>
                <label className={labelCls}>Bathrooms</label>
                <input type="number" className={inputCls} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="1" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Size Min (m²)</label>
                <input type="number" className={inputCls} value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Size Max (m²)</label>
                <input type="number" className={inputCls} value={sizeMax} onChange={(e) => setSizeMax(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Posted Within (days)</label>
                <input type="number" className={inputCls} value={postedWithin} onChange={(e) => setPostedWithin(e.target.value)} placeholder="7" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={fsboOnly} onChange={(e) => setFsboOnly(e.target.checked)} className="rounded border-border bg-secondary accent-primary w-4 h-4" />
              <span className="font-medium">FSBO Only (For Sale By Owner)</span>
            </label>

            {startUrl && (
              <div className="px-3 py-2.5 rounded-lg bg-muted/60 text-xs font-mono text-muted-foreground truncate border border-border/60">
                🔗 {startUrl}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Groups config */}
      {source !== "marketplace" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Group URLs</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea className={`${inputCls} min-h-[120px] font-mono text-xs`} value={groupUrls} onChange={(e) => setGroupUrls(e.target.value)} placeholder="https://www.facebook.com/groups/…&#10;One URL per line" />
          </CardContent>
        </Card>
      )}

      {/* Outreach */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Message & Outreach</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={labelCls}>Message Template</label>
            <textarea className={`${inputCls} min-h-[100px] text-xs`} value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} placeholder="Hi, I saw your listing on Facebook…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Send Limit</label>
              <input type="number" className={inputCls} value={sendLimit} onChange={(e) => setSendLimit(e.target.value)} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={headless} onChange={(e) => setHeadless(e.target.checked)} className="rounded border-border bg-secondary accent-primary w-4 h-4" />
                <span className="font-medium">Run headless</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleStart} disabled={status === "running"} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
              <Play className="w-4 h-4" /> Update Config & Start Scan
            </button>
          </TooltipTrigger>
          <TooltipContent>Save config and launch Facebook scan</TooltipContent>
        </Tooltip>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Search className="w-3.5 h-3.5" /> Analyze Feed
        </button>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <CheckCheck className="w-3.5 h-3.5" /> Mark Contacted
        </button>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Clear Queue
        </button>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Send className="w-3.5 h-3.5" /> Send via Browser
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
