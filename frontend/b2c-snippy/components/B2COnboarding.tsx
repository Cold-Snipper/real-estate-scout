"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Mic, Home, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { savePreferences, type B2CPreferences, PROPERTY_TYPES } from "../lib/b2c-api"
import { LUXEMBOURG_COMMUNES } from "../lib/communes"

const steps = [
  { title: "Account", key: "account" },
  { title: "Rent or buy", key: "rentBuy" },
  { title: "Filters", key: "filters" },
  { title: "Location", key: "location" },
  { title: "Summary", key: "summary" },
]

const schema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  rentOrBuy: z.enum(["rent", "buy"]),
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(0),
  moveInDate: z.date().optional(),
  bedrooms: z.number().optional(),
  sqmMin: z.number().optional(),
  sqmMax: z.number().optional(),
  parking: z.boolean(),
  balcony: z.boolean(),
  elevator: z.boolean(),
  pets: z.boolean(),
  furnished: z.boolean(),
  energyClass: z.string().optional(),
  energyClassMinC: z.boolean(),
  constructionYearMin2010: z.boolean(),
  maxMonthlyCharges: z.number().optional(),
  propertyTypes: z.array(z.string()),
  communes: z.array(z.string()),
  locationFreeText: z.string().optional(),
  voiceNoteText: z.string().optional(),
  communicationMode: z.enum(["manual", "bot_assisted", "full_auto"]),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  email: "",
  rentOrBuy: "rent",
  budgetMin: 500,
  budgetMax: 2000,
  moveInDate: undefined,
  bedrooms: undefined,
  sqmMin: undefined,
  sqmMax: undefined,
  parking: false,
  balcony: false,
  elevator: false,
  pets: false,
  furnished: false,
  energyClass: "",
  energyClassMinC: false,
  constructionYearMin2010: false,
  maxMonthlyCharges: undefined,
  propertyTypes: [],
  communes: [],
  locationFreeText: "",
  voiceNoteText: "",
  communicationMode: "manual",
}

export function B2COnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const values = form.watch()
  const progress = ((step + 1) / steps.length) * 100

  const toggleCommune = (commune: string) => {
    const current = form.getValues("communes")
    const next = current.includes(commune)
      ? current.filter((c) => c !== commune)
      : [...current, commune]
    form.setValue("communes", next)
  }

  const togglePropertyType = (pt: string) => {
    const current = form.getValues("propertyTypes")
    const next = current.includes(pt)
      ? current.filter((p) => p !== pt)
      : [...current, pt]
    form.setValue("propertyTypes", next)
  }

  const handleVoiceNote = () => {
    if (typeof window === "undefined") return
    const win = window as Window & {
      SpeechRecognition?: new () => unknown
      webkitSpeechRecognition?: new () => unknown
    }
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
    setLiveTranscript("")
    rec.onresult = (e) => {
      let text = ""
      const results = e.results
      for (let i = 0; i < results.length; i++) {
        const r = results[i] as { [j: number]: { transcript?: string }; isFinal?: boolean }
        text += r?.[0]?.transcript ?? ""
        if (r && !r.isFinal) text += " "
      }
      setLiveTranscript(text)
      const last = results[results.length - 1] as { isFinal?: boolean } | undefined
      if (last?.isFinal) {
        const current = form.getValues("voiceNoteText") ?? ""
        form.setValue("voiceNoteText", current ? `${current} ${text}`.trim() : text)
      }
    }
    rec.onend = () => setVoiceRecording(false)
    rec.onerror = () => setVoiceRecording(false)
    rec.start()
  }

  const onSubmit = async (data: FormValues) => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1)
      return
    }
    setIsSubmitting(true)
    const prefs: B2CPreferences = {
      rentOrBuy: data.rentOrBuy,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      moveInDate: data.moveInDate ? format(data.moveInDate, "yyyy-MM-dd") : undefined,
      bedrooms: data.bedrooms,
      sqmMin: data.sqmMin,
      sqmMax: data.sqmMax,
      parking: data.parking,
      balcony: data.balcony,
      elevator: data.elevator,
      pets: data.pets,
      furnished: data.furnished,
      energyClass: data.energyClass,
      energyClassMinC: data.energyClassMinC,
      constructionYearMin: data.constructionYearMin2010 ? 2010 : undefined,
      maxMonthlyCharges: data.maxMonthlyCharges,
      propertyTypes: data.propertyTypes,
      communes: data.communes,
      locationFreeText: data.locationFreeText,
      voiceNoteText: data.voiceNoteText,
      voiceContext: data.voiceNoteText,
      communicationMode: data.communicationMode,
    }
    await savePreferences(prefs)
    setIsSubmitting(false)
    router.push("/b2c-snippy/discover")
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <Progress value={progress} className="h-1.5" />
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Step {step + 1} of {steps.length}: {steps[step].title}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <form id="b2c-onboarding" onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-xl space-y-8">
          {step === 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Create account</CardTitle>
                <p className="text-sm text-muted-foreground">Optional — you can continue as guest and sign up later.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" {...form.register("email")} />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Rent or buy</CardTitle>
                <p className="text-sm text-muted-foreground">Budget and when you plan to move in.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup
                  value={values.rentOrBuy}
                  onValueChange={(v) => form.setValue("rentOrBuy", v as "rent" | "buy")}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-border p-6 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <Home className="size-10 text-primary" />
                    <span className="text-lg font-semibold">Rent</span>
                    <RadioGroupItem value="rent" className="sr-only" />
                  </Label>
                  <Label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-border p-6 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <TrendingUp className="size-10 text-primary" />
                    <span className="text-lg font-semibold">Buy</span>
                    <RadioGroupItem value="buy" className="sr-only" />
                  </Label>
                </RadioGroup>
                <div className="space-y-2">
                  <Label>Budget range (€/month or € total)</Label>
                  <div className="flex items-center gap-4">
                    <span className="min-w-[4rem] text-sm font-medium tabular-nums">€{values.budgetMin.toLocaleString()}</span>
                    <Slider
                      min={values.rentOrBuy === "rent" ? 300 : 50000}
                      max={values.rentOrBuy === "rent" ? 5000 : 2000000}
                      step={values.rentOrBuy === "rent" ? 50 : 10000}
                      value={[values.budgetMin, values.budgetMax]}
                      onValueChange={([min, max]) => {
                        form.setValue("budgetMin", min)
                        form.setValue("budgetMax", max)
                      }}
                    />
                    <span className="min-w-[5rem] text-sm font-medium tabular-nums text-right">€{values.budgetMax.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Move-in date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                        {values.moveInDate ? format(values.moveInDate, "PPP") : "Pick a date"}
                        <ChevronRight className="ml-auto size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={values.moveInDate}
                        onSelect={(d) => form.setValue("moveInDate", d)}
                        disabled={(d) => d < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Must-haves</CardTitle>
                <p className="text-sm text-muted-foreground">We’ll only show listings that match these.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min bedrooms (1–5+)</Label>
                    <Select
                      value={values.bedrooms?.toString() ?? "any"}
                      onValueChange={(v) => form.setValue("bedrooms", v === "any" ? undefined : Number(v))}
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
                  <div className="space-y-2">
                    <Label>Surface min (m²)</Label>
                    <Slider
                      min={20}
                      max={200}
                      step={5}
                      value={[values.sqmMin ?? 40]}
                      onValueChange={([v]) => form.setValue("sqmMin", v)}
                    />
                    <span className="text-xs text-muted-foreground">{values.sqmMin ?? 40} m²</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Property type</Label>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map((pt) => (
                      <Label key={pt} className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                        values.propertyTypes.includes(pt) ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                      )}>
                        <Checkbox
                          checked={values.propertyTypes.includes(pt)}
                          onCheckedChange={() => togglePropertyType(pt)}
                        />
                        {pt}
                      </Label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { name: "parking", label: "Parking" },
                    { name: "balcony", label: "Balcony" },
                    { name: "elevator", label: "Elevator" },
                    { name: "pets", label: "Pet friendly" },
                    { name: "furnished", label: "Furnished" },
                    { name: "energyClassMinC", label: "Energy class ≥ C" },
                    { name: "constructionYearMin2010", label: "Construction year ≥ 2010" },
                  ].map(({ name, label }) => (
                    <Label key={name} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                      <Checkbox
                        checked={values[name as keyof FormValues] as boolean}
                        onCheckedChange={(c) => form.setValue(name as keyof FormValues, !!c)}
                      />
                      {label}
                    </Label>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Energy class (or leave as Any)</Label>
                  <Select value={values.energyClass} onValueChange={(v) => form.setValue("energyClass", v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      {["A", "B", "C", "D", "E"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCharges">Max monthly charges (€)</Label>
                  <Input
                    id="maxCharges"
                    type="number"
                    placeholder="e.g. 150"
                    {...form.register("maxMonthlyCharges", { valueAsNumber: true })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <p className="text-sm text-muted-foreground">Communes and any extra description (e.g. “near Kirchberg, walking distance to…”).</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Communes</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between">
                        {values.communes.length === 0 ? "Select communes" : `${values.communes.length} selected`}
                        <ChevronRight className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {LUXEMBOURG_COMMUNES.map((c) => (
                          <Label key={c} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary">
                            <Checkbox
                              checked={values.communes.includes(c)}
                              onCheckedChange={() => toggleCommune(c)}
                            />
                            {c}
                          </Label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationText">Near / area description</Label>
                  <Input id="locationText" placeholder="e.g. near Kirchberg, walking distance to cafés" {...form.register("locationFreeText")} />
                </div>
                <div className="space-y-2">
                  <Label>Voice note — describe your ideal place</Label>
                  <Button
                    type="button"
                    variant={voiceRecording ? "destructive" : "outline"}
                    size="lg"
                    className="w-full gap-3 py-8"
                    onClick={handleVoiceNote}
                  >
                    <Mic className={cn("size-8", voiceRecording && "animate-pulse")} />
                    <span>{voiceRecording ? "Stop recording" : "Hold to record voice note"}</span>
                  </Button>
                  {(liveTranscript || values.voiceNoteText) && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Live transcript:</p>
                      <p className="text-sm">{liveTranscript || values.voiceNoteText}</p>
                    </div>
                  )}
                  <Textarea
                    placeholder="Or type: e.g. something with character, not too modern; quiet but close to nightlife"
                    className="min-h-[80px]"
                    {...form.register("voiceNoteText")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Summary & contact mode</CardTitle>
                <p className="text-sm text-muted-foreground">Review your preferences. You can change them later in Profile.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                  <p><span className="font-medium">Rent or buy:</span> {values.rentOrBuy === "rent" ? "Rent" : "Buy"}</p>
                  <p><span className="font-medium">Budget:</span> €{values.budgetMin.toLocaleString()} – €{values.budgetMax.toLocaleString()}</p>
                  {values.moveInDate && <p><span className="font-medium">Move-in:</span> {format(values.moveInDate, "PPP")}</p>}
                  {values.bedrooms && <p><span className="font-medium">Bedrooms:</span> {values.bedrooms}+</p>}
                  {(values.sqmMin ?? 0) > 0 && <p><span className="font-medium">Surface min:</span> {values.sqmMin} m²</p>}
                  {values.propertyTypes.length > 0 && <p><span className="font-medium">Property types:</span> {values.propertyTypes.join(", ")}</p>}
                  {values.communes.length > 0 && <p><span className="font-medium">Communes:</span> {values.communes.join(", ")}</p>}
                  {values.locationFreeText && <p><span className="font-medium">Area:</span> {values.locationFreeText}</p>}
                  {values.voiceNoteText && (
                    <p><span className="font-medium">Voice context:</span> <em className="text-muted-foreground">{values.voiceNoteText}</em></p>
                  )}
                </div>
                <RadioGroup
                  value={values.communicationMode}
                  onValueChange={(v) => form.setValue("communicationMode", v as FormValues["communicationMode"])}
                  className="grid gap-3"
                >
                  <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="manual" className="mt-0.5" />
                    <div>
                      <span className="font-medium">Manual only</span>
                      <p className="text-xs text-muted-foreground">You contact agents yourself.</p>
                    </div>
                  </Label>
                  <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="bot_assisted" className="mt-0.5" />
                    <div>
                      <span className="font-medium">Bot assisted</span>
                      <p className="text-xs text-muted-foreground">Bot drafts; you confirm before sending.</p>
                    </div>
                  </Label>
                  <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="full_auto" className="mt-0.5" />
                    <div>
                      <span className="font-medium">Fully automated</span>
                      <p className="text-xs text-muted-foreground">Bot contacts with your approval.</p>
                    </div>
                  </Label>
                </RadioGroup>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>
                    <ChevronLeft className="size-4" />
                    Back
                  </Button>
                  <Button type="submit" form="b2c-onboarding" size="lg" className="flex-1" disabled={isSubmitting}>
                    Generate my perfect matches
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step < 4 && (
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button type="submit" form="b2c-onboarding">
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
