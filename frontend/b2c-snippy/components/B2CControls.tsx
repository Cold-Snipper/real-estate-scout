"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Mic, Bot, Bell, ChevronRight, Lightbulb, Home, MapPin } from "lucide-react"
import { HelpTooltip } from "./HelpTooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useB2CUser } from "../lib/b2c-user-context"
import { LUXEMBOURG_COMMUNES } from "../lib/communes"
import { PROPERTY_TYPES } from "../lib/b2c-api"

export function B2CControls() {
  const {
    filters,
    controls,
    voiceContext,
    setFilters,
    setControls,
    setVoiceContext,
    persistFilters,
    persistControls,
    persistVoiceContext,
  } = useB2CUser()
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [filterExpanded, setFilterExpanded] = useState(false)

  const handleVoiceNote = () => {
    if (typeof window === "undefined") return
    const win = window as Window & { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }
    const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition
    if (!Recognition) return
    const rec = new Recognition() as {
      start: () => void
      stop?: () => void
      continuous: boolean
      interimResults: boolean
      lang: string
      onresult: (e: { results: unknown[] }) => void
      onend: () => void
      onerror: () => void
    }
    if (voiceRecording) {
      rec.stop?.()
      setVoiceRecording(false)
      return
    }
    rec.continuous = true
    rec.interimResults = true
    rec.lang = "en-US"
    setVoiceRecording(true)
    rec.onresult = (e) => {
      let text = ""
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i] as { [j: number]: { transcript?: string } }
        text += r?.[0]?.transcript ?? ""
      }
      setVoiceContext((prev) => (prev ? `${prev} ${text}` : text).trim())
    }
    rec.onend = () => setVoiceRecording(false)
    rec.onerror = () => setVoiceRecording(false)
    rec.start()
  }

  const saveVoiceContext = () => {
    persistVoiceContext(voiceContext)
  }

  const toggleCommune = (c: string) => {
    const next = filters.communes?.includes(c)
      ? (filters.communes ?? []).filter((x) => x !== c)
      : [...(filters.communes ?? []), c]
    setFilters({ communes: next })
    persistFilters({ ...filters, communes: next })
  }

  const togglePropertyType = (pt: string) => {
    const next = filters.propertyTypes?.includes(pt)
      ? (filters.propertyTypes ?? []).filter((x) => x !== pt)
      : [...(filters.propertyTypes ?? []), pt]
    setFilters({ propertyTypes: next })
    persistFilters({ ...filters, propertyTypes: next })
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <header className="shrink-0 border-b border-primary/20 bg-card px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Controls</h1>
        <p className="text-sm text-muted-foreground">
          How we search, rank, and contact agents for you
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
            <Lightbulb className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">Quick tip</p>
              <p className="text-muted-foreground">
                These settings shape how Snippy finds and ranks apartments. Structured filters (budget, location, etc.) are hard requirements — we only show listings that match. Voice context is used for soft ranking to prioritise properties that &quot;feel right&quot;. All data syncs to your account.
              </p>
            </div>
          </div>

          {/* Structured filters — expanded inline */}
          <Card className="border-border border-l-4 border-l-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <Home className="size-4 text-primary" />
                </span>
                Search preferences (structured)
                <HelpTooltip content="These are your mandatory criteria. We filter the database strictly: only listings that meet all selected filters appear in your feed. For example, if you set budget max €2000 and min 2 bedrooms, we will never show a €2500 studio. Adjust anytime — your feed updates immediately." />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Rent or buy, budget, bedrooms, size, communes, property types. Hard filters — we only show listings that match all of these.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" size="sm" onClick={() => setFilterExpanded(!filterExpanded)} className="w-full">
                {filterExpanded ? "Collapse" : "Expand"} full filters
              </Button>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="inline-flex items-center">
                      Rent or buy
                      <HelpTooltip content="Rent = you pay monthly; the property stays with the owner. Buy = you purchase the property. This changes which listings we show — rental vs sale listings come from different sources." />
                    </Label>
                    <Select
                      value={filters.rentOrBuy}
                      onValueChange={(v) => {
                        setFilters({ rentOrBuy: v as "rent" | "buy" })
                        persistFilters({ ...filters, rentOrBuy: v as "rent" | "buy" })
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="inline-flex items-center">
                      Budget min (€)
                      <HelpTooltip content="Minimum price you're willing to consider. For rent: monthly rent. For buy: purchase price. We exclude any listing below this — useful if you want to avoid very cheap listings that might have issues." />
                    </Label>
                    <Input
                      type="number"
                      value={filters.budgetMin}
                      onChange={(e) => setFilters({ budgetMin: Number(e.target.value) || 0 })}
                      onBlur={() => persistFilters()}
                    />
                  </div>
                  <div>
                    <Label className="inline-flex items-center">
                      Budget max (€)
                      <HelpTooltip content="Maximum you can afford. For rent: monthly amount including any charges. For buy: total purchase budget. Listings above this never appear. In Luxembourg, add ~10–15% for notary and registration if buying." />
                    </Label>
                    <Input
                      type="number"
                      value={filters.budgetMax}
                      onChange={(e) => setFilters({ budgetMax: Number(e.target.value) || 0 })}
                      onBlur={() => persistFilters()}
                    />
                  </div>
                </div>

                {filterExpanded && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="inline-flex items-center">
                          Min bedrooms
                          <HelpTooltip content="Minimum number of bedrooms. In Luxembourg, listings often use 'rooms' (chambres) where a 3-room = 2 bedrooms + living room. We map this for you. Leave 'Any' if flexible." />
                        </Label>
                        <Select
                          value={filters.bedrooms != null ? String(filters.bedrooms) : "any"}
                          onValueChange={(v) => {
                            const n = v === "any" ? undefined : Number(v)
                            setFilters({ bedrooms: n })
                            persistFilters({ ...filters, bedrooms: n })
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}+</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="inline-flex items-center">
                          Min size (m²)
                          <HelpTooltip content="Minimum living area in square metres. Luxembourg listings typically show surface habitable. Smaller apartments (&lt;50m²) can feel cramped; 70m²+ is comfortable for 2 people." />
                        </Label>
                        <Input
                          type="number"
                          value={filters.sqmMin ?? ""}
                          onChange={(e) => setFilters({ sqmMin: e.target.value ? Number(e.target.value) : undefined })}
                          onBlur={() => persistFilters()}
                          placeholder="Any"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <MapPin className="size-4" />
                        Communes
                        <HelpTooltip content="Luxembourg is divided into communes (municipalities). Select the ones you're interested in — we only show listings in these areas. Luxembourg City, Esch, Differdange are popular. Kirchberg is the business district; many expats look there." />
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {LUXEMBOURG_COMMUNES.slice(0, 12).map((c) => (
                          <label key={c} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={(filters.communes ?? []).includes(c)}
                              onCheckedChange={() => toggleCommune(c)}
                            />
                            <span className="text-sm">{c}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">More communes in onboarding</p>
                    </div>

                    <div>
                      <Label className="inline-flex items-center">
                        Property types
                        <HelpTooltip content="Type of dwelling. Apartment = flat in a building. House = detached/semi. Studio = single room. Duplex = two floors. Penthouse = top floor with terrace. Loft = open-plan, often converted." />
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {PROPERTY_TYPES.map((pt) => (
                          <label key={pt} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={(filters.propertyTypes ?? []).includes(pt)}
                              onCheckedChange={() => togglePropertyType(pt)}
                            />
                            <span className="text-sm">{pt}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.parking}
                          onCheckedChange={(c) => {
                            setFilters({ parking: !!c })
                            persistFilters({ ...filters, parking: !!c })
                          }}
                        />
                        <span className="text-sm">Parking</span>
                        <HelpTooltip content="Require a parking spot (outdoor or garage). In Luxembourg City, street parking is scarce; many prefer a dedicated spot." />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.balcony}
                          onCheckedChange={(c) => {
                            setFilters({ balcony: !!c })
                            persistFilters({ ...filters, balcony: !!c })
                          }}
                        />
                        <span className="text-sm">Balcony</span>
                        <HelpTooltip content="Require outdoor space (balcony or terrace). Nice for summer; terraces are rare and add value." />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.elevator}
                          onCheckedChange={(c) => {
                            setFilters({ elevator: !!c })
                            persistFilters({ ...filters, elevator: !!c })
                          }}
                        />
                        <span className="text-sm">Elevator</span>
                        <HelpTooltip content="Require elevator access. Important if you have mobility needs, pram, or heavy groceries. Top-floor flats often lack one." />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.pets}
                          onCheckedChange={(c) => {
                            setFilters({ pets: !!c })
                            persistFilters({ ...filters, pets: !!c })
                          }}
                        />
                        <span className="text-sm">Pets</span>
                        <HelpTooltip content="You have or plan to have pets. Many landlords restrict pets; we filter to pet-friendly listings where possible." />
                      </label>
                    </div>

                    <div>
                      <Label className="inline-flex items-center">
                        Max monthly charges (€)
                        <HelpTooltip content="In Luxembourg, rent listings often exclude 'charges' (heating, water, building maintenance, etc.). This is your max for those extra costs. Typical: €100–300/month. Total budget = rent + charges." />
                      </Label>
                      <Input
                        type="number"
                        value={filters.maxMonthlyCharges ?? ""}
                        onChange={(e) => setFilters({ maxMonthlyCharges: e.target.value ? Number(e.target.value) : undefined })}
                        onBlur={() => persistFilters()}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <Label className="inline-flex items-center">
                        Energy class min.
                        <HelpTooltip content="EU energy label: A++ is best, E is worst. Better class = lower bills and future-proof. Luxembourg regulations increasingly require C or better for rentals. A/B = modern, efficient." />
                      </Label>
                      <Select
                        value={filters.energyClass ?? "any"}
                        onValueChange={(v) => {
                          setFilters({ energyClass: v === "any" ? undefined : v })
                          persistFilters({ ...filters, energyClass: v === "any" ? undefined : v })
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          {["A++", "A+", "A", "B", "C", "D", "E"].map((e) => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <Button variant="outline" asChild>
                <Link href="/b2c-snippy/onboarding">Full onboarding wizard</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border border-l-4 border-l-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <Mic className="size-4 text-primary" />
                </span>
                Voice context
                <HelpTooltip content="Beyond filters, describe what you want in your own words. We use this to rank matches: listings that align with your description appear higher. Examples: 'something with character, not too modern', 'quiet but near cafés', 'walking distance from Kirchberg', 'flexible on budget if it feels right'. You can type or record a voice note — both work the same." />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Describe your ideal place in words or by voice. We use this to prioritise listings that match your vibe — e.g. &quot;something with character&quot;, &quot;quiet but near cafés&quot;, &quot;walking distance from Kirchberg&quot;.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="button"
                variant={voiceRecording ? "destructive" : "outline"}
                onClick={handleVoiceNote}
                className="gap-2"
              >
                <Mic className="size-4" />
                {voiceRecording ? "Stop recording" : "Record voice note"}
              </Button>
              <Textarea
                placeholder="e.g. something with character, quiet but near cafés, flexible on budget if it feels right"
                value={voiceContext}
                onChange={(e) => setVoiceContext(e.target.value)}
                onBlur={saveVoiceContext}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          <Card className="border-border border-l-4 border-l-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <Bot className="size-4 text-primary" />
                </span>
                Contact mode
                <HelpTooltip content="When you save a listing you like, we can help you contact the agent. Manual = you do it yourself; we just save and remind. Bot assisted = we draft a message, you review and approve before it goes. Full auto = we contact agents on your behalf and check with you before booking viewings or making commitments. Choose based on how much control you want." />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose how we handle outreach to agents when you save a listing: manual, bot-drafted (you approve), or fully automated with your sign-off on big steps.
              </p>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={controls.communicationMode}
                onValueChange={(v) => {
                  setControls({ communicationMode: v as "manual" | "bot_assisted" | "full_auto" })
                  persistControls({ ...controls, communicationMode: v as typeof controls.communicationMode })
                }}
                className="grid gap-3"
              >
                <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="manual" className="mt-0.5" />
                  <div>
                    <span className="font-medium">Manual only</span>
                    <p className="text-xs text-muted-foreground">You find the agent contact (listing or our link) and reach out yourself. We save the listing and track it in Saved Apartments.</p>
                  </div>
                </Label>
                <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="bot_assisted" className="mt-0.5" />
                  <div>
                    <span className="font-medium">Bot assisted</span>
                    <p className="text-xs text-muted-foreground">We draft a personalised message (based on your goal: call, viewing, info). You see it, edit if needed, and approve before it gets sent. Best for staying in control.</p>
                  </div>
                </Label>
                <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="full_auto" className="mt-0.5" />
                  <div>
                    <span className="font-medium">Fully automated</span>
                    <p className="text-xs text-muted-foreground">We contact agents on your behalf. Before booking a viewing, making an offer, or committing to anything, we ask you to confirm. Good if you trust us but want final say on big steps.</p>
                  </div>
                </Label>
              </RadioGroup>
              {(controls.communicationMode === "bot_assisted" || controls.communicationMode === "full_auto") && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-4">
                  <Label htmlFor="confirm" className="inline-flex items-center">
                    Confirm before bot sends
                    <HelpTooltip content="When on, every message the bot prepares will be shown to you for review before it's sent. You can edit the text or cancel. When off, the bot sends automatically — only use if you're comfortable with that. We still check with you before viewings or offers." />
                  </Label>
                  <Switch
                    id="confirm"
                    checked={controls.botConfirmBeforeSend}
                    onCheckedChange={(c) => {
                      setControls({ botConfirmBeforeSend: c })
                      persistControls({ ...controls, botConfirmBeforeSend: c })
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border border-l-4 border-l-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                  <Bell className="size-4 text-primary" />
                </span>
                Early warning alerts
                <HelpTooltip content="New listings appear daily. When one strongly matches your preferences (budget, location, filters, vibe), we notify you immediately or in a daily digest. That gives you a head start — in Luxembourg, good rentals often get multiple applications within days. You can set how strict the match must be (e.g. 90%+) and where to notify (in-app, email, push)." />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Get notified when a newly listed property strongly matches your preferences — so you can act fast in competitive markets like Luxembourg.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label htmlFor="early" className="inline-flex items-center">
                    Enable early warnings
                    <HelpTooltip content="Master switch. When on, we watch for new listings and notify you when one matches. When off, you only see listings when you open the app. No alerts sent." />
                  </Label>
                  <p className="text-xs text-muted-foreground">Turn alerts on or off</p>
                </div>
                <Switch
                  id="early"
                  checked={controls.earlyWarnings}
                  onCheckedChange={(c) => {
                    setControls({ earlyWarnings: c })
                    persistControls({ ...controls, earlyWarnings: c })
                  }}
                />
              </div>

              {controls.earlyWarnings && (
                <>
                  <div className="space-y-2">
                    <Label className="inline-flex items-center">
                      Minimum match score
                      <HelpTooltip content="We score each listing against your preferences (filters + voice context). 95% = near-perfect. 90% = strong fit. 80% = good. 70% = looser, more alerts. Higher threshold = fewer but more relevant alerts. Lower = more alerts, some may be borderline." />
                    </Label>
                    <p className="text-xs text-muted-foreground">Only alert when a listing scores at least this high vs your preferences</p>
                    <Select
                      value={String(controls.alertMatchThreshold ?? 80)}
                      onValueChange={(v) => {
                        const n = Number(v) as 70 | 80 | 90 | 95
                        setControls({ alertMatchThreshold: n })
                        persistControls({ ...controls, alertMatchThreshold: n })
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="95">95%+ — Only near-perfect matches</SelectItem>
                        <SelectItem value="90">90%+ — Strong matches only</SelectItem>
                        <SelectItem value="80">80%+ — Good matches</SelectItem>
                        <SelectItem value="70">70%+ — Wider net, more alerts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="inline-flex items-center">
                      How to notify
                      <HelpTooltip content="In-app: new matches appear in the Alerts tab; open the app to see them. Email: we send a message to your saved email. Push: browser or app push notification if you've granted permission. You can enable multiple — e.g. in-app + email for important matches." />
                    </Label>
                    <p className="text-xs text-muted-foreground">Where you&apos;ll receive alerts</p>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(controls.alertChannels ?? ["in_app"]).includes("in_app")}
                          onCheckedChange={(c) => {
                            const ch = controls.alertChannels ?? ["in_app"]
                            const next = c ? [...ch.filter((x) => x !== "in_app"), "in_app"] : ch.filter((x) => x !== "in_app")
                            setControls({ alertChannels: next.length ? next : ["in_app"] })
                            persistControls({ ...controls, alertChannels: next.length ? next : ["in_app"] })
                          }}
                        />
                        <span className="text-sm">In-app (Alerts tab)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(controls.alertChannels ?? []).includes("email")}
                          onCheckedChange={(c) => {
                            const ch = controls.alertChannels ?? ["in_app"]
                            const next = c ? [...ch, "email"] : ch.filter((x) => x !== "email")
                            setControls({ alertChannels: next })
                            persistControls({ ...controls, alertChannels: next })
                          }}
                        />
                        <span className="text-sm">Email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(controls.alertChannels ?? []).includes("push")}
                          onCheckedChange={(c) => {
                            const ch = controls.alertChannels ?? ["in_app"]
                            const next = c ? [...ch, "push"] : ch.filter((x) => x !== "push")
                            setControls({ alertChannels: next })
                            persistControls({ ...controls, alertChannels: next })
                          }}
                        />
                        <span className="text-sm">Push notification</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="inline-flex items-center">
                      When to send
                      <HelpTooltip content="Immediate: as soon as we detect a matching listing, we notify you. Best for hot markets. Daily digest: we collect matches and send one summary per day (e.g. morning). Fewer interruptions, still timely." />
                    </Label>
                    <p className="text-xs text-muted-foreground">Timing of notifications</p>
                    <Select
                      value={controls.alertFrequency ?? "immediate"}
                      onValueChange={(v) => {
                        setControls({ alertFrequency: v as "immediate" | "daily_digest" })
                        persistControls({ ...controls, alertFrequency: v as "immediate" | "daily_digest" })
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate — As soon as a match appears</SelectItem>
                        <SelectItem value="daily_digest">Daily digest — Once per day summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-4 pt-4">
            <Button variant="outline" asChild className="border-primary/30 hover:bg-primary/5">
              <Link href="/b2c-snippy/profile">
                Go to Profile (contact details)
                <ChevronRight className="size-4 ml-1" />
              </Link>
            </Button>
            <Link href="/available" className="text-xs text-primary/80 hover:text-primary">
              Agency? Switch to B2B →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
