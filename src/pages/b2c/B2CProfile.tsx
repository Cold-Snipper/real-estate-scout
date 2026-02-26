import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  User, Settings, Mic, MicOff, Save, ArrowLeft,
  Bell, Bot, Shield, Trash2, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import B2CBottomNav from "./B2CBottomNav";

export default function B2CProfile() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({
    transactionType: "rent" as "rent" | "buy",
    budgetMin: 800,
    budgetMax: 3000,
    bedroomsMin: 1,
    surfaceMin: 30,
    locationText: "Near Kirchberg, walkable area",
    voiceNote: "Recorded",
    botMode: "semi" as "manual" | "semi" | "auto",
  });
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const handleSave = () => {
    toast.success("Preferences updated");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/b2c/discover")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> My Profile
          </h1>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Account */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Account
            </h2>
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value="user@example.com" disabled className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input defaultValue="John" className="h-9 text-sm" />
              </div>
            </div>
          </section>

          <Separator />

          {/* Search Preferences */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Search Preferences
            </h2>
            <div className="bg-card rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Transaction type</Label>
                <div className="flex gap-1">
                  {(["rent", "buy"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPrefs((p) => ({ ...p, transactionType: t }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        prefs.transactionType === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {t === "rent" ? "Rent" : "Buy"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Budget: €{prefs.budgetMin.toLocaleString()}</span>
                  <span>€{prefs.budgetMax.toLocaleString()}</span>
                </div>
                <Slider
                  min={prefs.transactionType === "rent" ? 400 : 100000}
                  max={prefs.transactionType === "rent" ? 8000 : 3000000}
                  step={prefs.transactionType === "rent" ? 50 : 10000}
                  value={[prefs.budgetMin, prefs.budgetMax]}
                  onValueChange={([min, max]) => setPrefs((p) => ({ ...p, budgetMin: min, budgetMax: max }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min bedrooms</Label>
                  <Select value={String(prefs.bedroomsMin)} onValueChange={(v) => setPrefs((p) => ({ ...p, bedroomsMin: +v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min surface (m²)</Label>
                  <Input
                    type="number"
                    value={prefs.surfaceMin}
                    onChange={(e) => setPrefs((p) => ({ ...p, surfaceMin: +e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Location description</Label>
                <Textarea value={prefs.locationText} onChange={(e) => setPrefs((p) => ({ ...p, locationText: e.target.value }))} rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Voice note</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      setIsRecording(!isRecording);
                      if (isRecording) toast.info("Voice note saved");
                    }}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isRecording ? "Stop" : "Re-record"}
                  </Button>
                  {prefs.voiceNote && <Badge variant="secondary" className="text-xs">✓ Active</Badge>}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Bot Settings */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" /> Bot & Automation
            </h2>
            <div className="bg-card rounded-xl border border-border p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Assistance level</Label>
                <Select value={prefs.botMode} onValueChange={(v) => setPrefs((p) => ({ ...p, botMode: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual only</SelectItem>
                    <SelectItem value="semi">Semi-automatic (approve before send)</SelectItem>
                    <SelectItem value="auto">Fully automated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Early warning alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified on high-match new listings</p>
                </div>
                <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
              </div>
            </div>
          </section>

          <Separator />

          {/* Danger zone */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-destructive" /> Account
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1">
                <LogOut className="w-3.5 h-3.5" /> Log out
              </Button>
              <Button variant="outline" size="sm" className="text-xs text-destructive gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Delete account
              </Button>
            </div>
          </section>

          {/* Save */}
          <Button className="w-full gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </ScrollArea>

      <B2CBottomNav />
    </div>
  );
}
