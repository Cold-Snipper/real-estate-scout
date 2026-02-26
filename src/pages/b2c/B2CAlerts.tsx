import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Sparkles, MapPin, Bed, Maximize, Bot, Eye, X } from "lucide-react";
import B2CBottomNav from "./B2CBottomNav";

type Alert = {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  surface: number;
  matchScore: number;
  reason: string;
  timeAgo: string;
  read: boolean;
};

const MOCK_ALERTS: Alert[] = [
  {
    id: "a1", title: "New 3BR in Belair just listed", price: 2200, location: "Belair",
    bedrooms: 3, surface: 95, matchScore: 96,
    reason: "96% match — hits all your criteria: Belair location, within budget, 3 bedrooms, elevator, parking.",
    timeAgo: "12 min ago", read: false,
  },
  {
    id: "a2", title: "Renovated studio Bonnevoie", price: 1150, location: "Bonnevoie",
    bedrooms: 1, surface: 38, matchScore: 88,
    reason: "Great value in your preferred area with modern finish and terrace.",
    timeAgo: "2h ago", read: false,
  },
  {
    id: "a3", title: "Penthouse Limpertsberg", price: 3200, location: "Limpertsberg",
    bedrooms: 2, surface: 110, matchScore: 78,
    reason: "Premium property slightly above budget. Rooftop terrace.",
    timeAgo: "1d ago", read: true,
  },
];

export default function B2CAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const markRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  };

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Alerts
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-xs px-1.5">{unreadCount}</Badge>
            )}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{alertsEnabled ? "On" : "Off"}</span>
            <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
          </div>
        </div>
      </header>

      {!alertsEnabled ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <BellOff className="w-12 h-12 text-muted-foreground/30" />
          <h3 className="font-semibold text-foreground">Alerts paused</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Turn alerts on to get notified when high-match listings hit the market.
          </p>
          <Button onClick={() => setAlertsEnabled(true)}>Enable Alerts</Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-lg mx-auto space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No new alerts</p>
                <p className="text-xs text-muted-foreground">We'll notify you when matching listings appear.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-card rounded-xl border p-4 space-y-3 transition-colors ${
                    !alert.read ? "border-primary/30 bg-primary/[0.02]" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!alert.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                        <span className="text-xs text-muted-foreground">{alert.timeAgo}</span>
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">{alert.title}</h3>
                      <p className="text-sm font-bold text-primary mt-0.5">€{alert.price.toLocaleString()}/mo</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-success" />
                      <span className="text-sm font-bold text-success">{alert.matchScore}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{alert.location}</span>
                    <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{alert.bedrooms}</span>
                    <span className="flex items-center gap-0.5"><Maximize className="w-3 h-3" />{alert.surface}m²</span>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground">{alert.reason}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1 text-xs" onClick={() => markRead(alert.id)}>
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                      <Bot className="w-3.5 h-3.5" /> Let Bot Contact
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => dismiss(alert.id)}>
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <B2CBottomNav />
    </div>
  );
}
