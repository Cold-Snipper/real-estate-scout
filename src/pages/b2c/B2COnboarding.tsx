import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Mic, MicOff, Home, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Basics", "Budget", "Filters", "Location", "Summary"];

const COMMUNES = [
  "Luxembourg-Ville", "Esch-sur-Alzette", "Differdange", "Dudelange", "Ettelbruck",
  "Diekirch", "Wiltz", "Echternach", "Remich", "Grevenmacher", "Mersch", "Strassen",
  "Bertrange", "Sandweiler", "Hesperange", "Walferdange", "Steinsel", "Kirchberg",
  "Bonnevoie", "Gasperich", "Belair", "Limpertsberg", "Merl", "Hollerich", "Clausen",
];

const PROPERTY_TYPES = ["Apartment", "House", "Villa", "Studio", "Penthouse", "Duplex", "Loft", "Townhouse"];
const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G", "I"];

type Prefs = {
  transactionType: "rent" | "buy";
  budgetMin: number;
  budgetMax: number;
  moveInDate: string;
  bedroomsMin: number;
  surfaceMin: number;
  propertyTypes: string[];
  parking: boolean;
  balcony: boolean;
  elevator: boolean;
  petFriendly: boolean;
  furnished: boolean;
  newBuild: boolean;
  energyClass: string;
  communes: string[];
  locationText: string;
  voiceNote: string;
  botMode: "manual" | "semi" | "auto";
};

const defaultPrefs: Prefs = {
  transactionType: "rent",
  budgetMin: 800,
  budgetMax: 3000,
  moveInDate: "",
  bedroomsMin: 1,
  surfaceMin: 30,
  propertyTypes: [],
  parking: false,
  balcony: false,
  elevator: false,
  petFriendly: false,
  furnished: false,
  newBuild: false,
  energyClass: "",
  communes: [],
  locationText: "",
  voiceNote: "",
  botMode: "semi",
};

export default function B2COnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [isRecording, setIsRecording] = useState(false);

  const update = useCallback(<K extends keyof Prefs>(key: K, val: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: val }));
  }, []);

  const toggleArrayItem = useCallback((key: "propertyTypes" | "communes", item: string) => {
    setPrefs((p) => {
      const arr = p[key] as string[];
      return { ...p, [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] };
    });
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      toast.info("Voice note saved");
      update("voiceNote", "Voice note recorded (transcription would go here)");
    } else {
      setIsRecording(true);
      toast("Recording... speak now", { icon: "🎙️" });
    }
  }, [isRecording, update]);

  const handleFinish = useCallback(() => {
    toast.success("Preferences saved! Finding your matches...");
    setTimeout(() => navigate("/b2c/discover"), 1200);
  }, [navigate]);

  const canNext = step === 0 ? true :
    step === 1 ? prefs.budgetMax > prefs.budgetMin :
    step === 2 ? true :
    step === 3 ? true : true;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => step > 0 ? setStep(step - 1) : navigate("/b2c")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
          <h2 className="text-sm font-semibold text-foreground">{STEPS[step]}</h2>
        </div>
        <Home className="w-5 h-5 text-primary" />
      </header>

      {/* Progress */}
      <Progress value={((step + 1) / STEPS.length) * 100} className="h-1 rounded-none" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-lg mx-auto w-full space-y-6">
        {/* Step 0: Basics */}
        {step === 0 && (
          <>
            <h3 className="text-xl font-bold text-foreground">What are you looking for?</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["rent", "buy"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update("transactionType", t)}
                  className={`p-4 rounded-xl border-2 text-center font-semibold capitalize transition-colors ${
                    prefs.transactionType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t === "rent" ? "🏠 Rent" : "🏡 Buy"}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 1: Budget */}
        {step === 1 && (
          <>
            <h3 className="text-xl font-bold text-foreground">
              {prefs.transactionType === "rent" ? "Monthly budget" : "Purchase budget"}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">€{prefs.budgetMin.toLocaleString()}</span>
                <span className="font-semibold text-foreground">→</span>
                <span className="text-muted-foreground">€{prefs.budgetMax.toLocaleString()}</span>
              </div>
              <Slider
                min={prefs.transactionType === "rent" ? 400 : 100000}
                max={prefs.transactionType === "rent" ? 8000 : 3000000}
                step={prefs.transactionType === "rent" ? 50 : 10000}
                value={[prefs.budgetMin, prefs.budgetMax]}
                onValueChange={([min, max]) => {
                  update("budgetMin", min);
                  update("budgetMax", max);
                }}
              />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Preferred move-in date</Label>
                <Input
                  type="date"
                  value={prefs.moveInDate}
                  onChange={(e) => update("moveInDate", e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Filters */}
        {step === 2 && (
          <>
            <h3 className="text-xl font-bold text-foreground">Property details</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Min bedrooms</Label>
                  <Select value={String(prefs.bedroomsMin)} onValueChange={(v) => update("bedroomsMin", +v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Min surface (m²)</Label>
                  <Input
                    type="number"
                    value={prefs.surfaceMin}
                    onChange={(e) => update("surfaceMin", +e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Property type</Label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleArrayItem("propertyTypes", t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        prefs.propertyTypes.includes(t)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Energy class</Label>
                <div className="flex gap-1.5">
                  {ENERGY_CLASSES.map((c) => (
                    <button
                      key={c}
                      onClick={() => update("energyClass", prefs.energyClass === c ? "" : c)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                        prefs.energyClass === c
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities grid */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Amenities</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["parking", "🅿️ Parking"],
                    ["balcony", "🌿 Balcony / Terrace"],
                    ["elevator", "🛗 Elevator"],
                    ["petFriendly", "🐾 Pet friendly"],
                    ["furnished", "🪑 Furnished"],
                    ["newBuild", "🏗️ New build"],
                  ] as const).map(([key, label]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        prefs[key] ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Checkbox
                        checked={prefs[key] as boolean}
                        onCheckedChange={(v) => update(key, !!v)}
                      />
                      <span className="text-xs font-medium text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <>
            <h3 className="text-xl font-bold text-foreground">Where do you want to live?</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select communes</Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 border rounded-lg border-border">
                  {COMMUNES.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleArrayItem("communes", c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        prefs.communes.includes(c)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Describe your ideal area</Label>
                <Textarea
                  placeholder="e.g. Near Kirchberg, close to cafés, quiet but walkable…"
                  value={prefs.locationText}
                  onChange={(e) => update("locationText", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Voice note (optional)</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={handleVoiceToggle}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isRecording ? "Stop recording" : "Record voice note"}
                  </Button>
                  {prefs.voiceNote && (
                    <span className="text-xs text-success">✓ Recorded</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs text-muted-foreground">Bot assistance level</Label>
                <div className="space-y-2">
                  {([
                    ["manual", "Manual only", "You contact agents yourself"],
                    ["semi", "Semi-automatic", "Bot drafts messages, you approve before sending"],
                    ["auto", "Fully automated", "Bot contacts agents and schedules viewings for you"],
                  ] as const).map(([val, title, desc]) => (
                    <label
                      key={val}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        prefs.botMode === val ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                      onClick={() => update("botMode", val)}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        prefs.botMode === val ? "border-primary" : "border-muted-foreground/40"
                      }`}>
                        {prefs.botMode === val && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <>
            <div className="text-center space-y-3">
              <Sparkles className="w-10 h-10 text-primary mx-auto" />
              <h3 className="text-xl font-bold text-foreground">Your preference profile</h3>
              <p className="text-sm text-muted-foreground">Review and launch your personalized search</p>
            </div>

            <div className="space-y-3 bg-card rounded-xl border border-border p-4">
              <Row label="Type" value={prefs.transactionType === "rent" ? "Rent" : "Buy"} />
              <Row label="Budget" value={`€${prefs.budgetMin.toLocaleString()} – €${prefs.budgetMax.toLocaleString()}`} />
              {prefs.moveInDate && <Row label="Move-in" value={prefs.moveInDate} />}
              <Row label="Bedrooms" value={`${prefs.bedroomsMin}+`} />
              <Row label="Surface" value={`${prefs.surfaceMin}+ m²`} />
              {prefs.propertyTypes.length > 0 && <Row label="Types" value={prefs.propertyTypes.join(", ")} />}
              {prefs.energyClass && <Row label="Energy" value={`Class ${prefs.energyClass}+`} />}
              <Row label="Amenities" value={[
                prefs.parking && "Parking",
                prefs.balcony && "Balcony",
                prefs.elevator && "Elevator",
                prefs.petFriendly && "Pets OK",
                prefs.furnished && "Furnished",
                prefs.newBuild && "New build",
              ].filter(Boolean).join(", ") || "None"} />
              {prefs.communes.length > 0 && <Row label="Communes" value={prefs.communes.join(", ")} />}
              {prefs.locationText && <Row label="Area notes" value={prefs.locationText} />}
              {prefs.voiceNote && <Row label="Voice note" value="✓ Recorded" />}
              <Row label="Bot mode" value={
                prefs.botMode === "manual" ? "Manual" :
                prefs.botMode === "semi" ? "Semi-auto" : "Fully automated"
              } />
            </div>
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border px-6 py-4 flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleFinish}>
            <Sparkles className="w-4 h-4 mr-1" /> Find My Perfect Matches
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right font-medium">{value}</span>
    </div>
  );
}
