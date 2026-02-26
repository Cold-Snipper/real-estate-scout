import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, Heart, Info, Search, SlidersHorizontal, Bed, Maximize,
  MapPin, Euro, ChevronLeft, ChevronRight, Bot, Sparkles,
} from "lucide-react";
import B2CBottomNav from "./B2CBottomNav";

type MockListing = {
  id: string;
  title: string;
  price: number;
  transactionType: "rent" | "buy";
  bedrooms: number;
  surface: number;
  location: string;
  matchScore: number;
  matchReason: string;
  images: string[];
  description: string;
  features: string[];
};

const MOCK_LISTINGS: MockListing[] = [
  {
    id: "1", title: "Bright 2BR in Kirchberg", price: 1850, transactionType: "rent",
    bedrooms: 2, surface: 72, location: "Kirchberg", matchScore: 94,
    matchReason: "Perfect match: near your preferred area, within budget, modern building with elevator.",
    images: [], description: "Beautiful apartment with panoramic views over Kirchberg plateau. Walking distance to European institutions and Auchan shopping center.",
    features: ["Elevator", "Parking", "Balcony", "Modern kitchen"],
  },
  {
    id: "2", title: "Cozy Studio near Gare", price: 1200, transactionType: "rent",
    bedrooms: 1, surface: 35, location: "Gare", matchScore: 87,
    matchReason: "Good fit: walkable nightlife area, affordable, close to public transport.",
    images: [], description: "Charming studio in the heart of the Gare district. Fully renovated, close to restaurants and bars.",
    features: ["Furnished", "Near transport", "Renovated"],
  },
  {
    id: "3", title: "Family House in Strassen", price: 2800, transactionType: "rent",
    bedrooms: 4, surface: 165, location: "Strassen", matchScore: 82,
    matchReason: "Spacious family home with garden, quiet neighborhood near international schools.",
    images: [], description: "Detached house with large garden, double garage, and modern amenities. Ideal for families.",
    features: ["Garden", "Garage", "4 bedrooms", "Quiet area"],
  },
  {
    id: "4", title: "Luxury Penthouse Limpertsberg", price: 3500, transactionType: "rent",
    bedrooms: 3, surface: 120, location: "Limpertsberg", matchScore: 76,
    matchReason: "Premium location, rooftop terrace, slightly above budget range.",
    images: [], description: "Stunning penthouse with wraparound terrace and city views. Premium finishes throughout.",
    features: ["Terrace", "City views", "Premium", "Parking"],
  },
  {
    id: "5", title: "Modern 1BR Bonnevoie", price: 1450, transactionType: "rent",
    bedrooms: 1, surface: 48, location: "Bonnevoie", matchScore: 71,
    matchReason: "Good value, up-and-coming area with great café culture.",
    images: [], description: "Newly built apartment in trendy Bonnevoie. Open kitchen, large windows, communal rooftop.",
    features: ["New build", "Open kitchen", "Rooftop access"],
  },
];

export default function B2CDiscover() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [botDialogOpen, setBotDialogOpen] = useState(false);
  const [selectedForBot, setSelectedForBot] = useState<MockListing | null>(null);

  const available = useMemo(() =>
    MOCK_LISTINGS.filter((l) =>
      !passed.has(l.id) &&
      (searchQuery === "" || l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.location.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => b.matchScore - a.matchScore),
    [passed, searchQuery]
  );

  const current = available[currentIndex] || null;

  const handlePass = useCallback(() => {
    if (!current) return;
    setPassed((s) => new Set(s).add(current.id));
    setCurrentIndex(0);
  }, [current]);

  const handleSave = useCallback(() => {
    if (!current) return;
    setSaved((s) => new Set(s).add(current.id));
    setPassed((s) => new Set(s).add(current.id));
    setCurrentIndex(0);
  }, [current]);

  const handleBotHelp = useCallback((listing: MockListing) => {
    setSelectedForBot(listing);
    setBotDialogOpen(true);
  }, []);

  const scoreColor = (score: number) =>
    score >= 90 ? "text-success" :
    score >= 75 ? "text-primary" :
    score >= 60 ? "text-warning" : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setFilterOpen(!filterOpen)}>
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between max-w-lg mx-auto mt-2">
          <p className="text-xs text-muted-foreground">{available.length} matches • {saved.size} saved</p>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/b2c/saved")}>
            View Saved →
          </Button>
        </div>
      </header>

      {/* Card stack */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {current ? (
          <div className="w-full max-w-md">
            {/* Card */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
              {/* Image placeholder */}
              <div className="relative h-56 bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{current.location}</p>
                </div>

                {/* Match badge */}
                <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm flex items-center gap-1.5 shadow-sm`}>
                  <Sparkles className={`w-3.5 h-3.5 ${scoreColor(current.matchScore)}`} />
                  <span className={`text-sm font-bold ${scoreColor(current.matchScore)}`}>{current.matchScore}%</span>
                </div>

                {/* Nav dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {available.slice(0, 5).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentIndex ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{current.title}</h3>
                    <p className="text-lg font-bold text-primary">
                      €{current.price.toLocaleString()}{current.transactionType === "rent" ? "/mo" : ""}
                    </p>
                  </div>
                </div>

                {/* Spec badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Bed className="w-3 h-3" /> {current.bedrooms} bed
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Maximize className="w-3 h-3" /> {current.surface} m²
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <MapPin className="w-3 h-3" /> {current.location}
                  </Badge>
                  {current.features.slice(0, 2).map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                  ))}
                </div>

                {/* AI match reason */}
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary shrink-0" />
                    <span>{current.matchReason}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <button
                onClick={handlePass}
                className="w-14 h-14 rounded-full border-2 border-destructive/30 flex items-center justify-center hover:bg-destructive/10 transition-colors"
              >
                <X className="w-6 h-6 text-destructive" />
              </button>

              <button
                onClick={() => setDetailOpen(true)}
                className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <Info className="w-5 h-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => handleBotHelp(current)}
                className="w-11 h-11 rounded-full border-2 border-primary/30 flex items-center justify-center hover:bg-primary/10 transition-colors"
              >
                <Bot className="w-5 h-5 text-primary" />
              </button>

              <button
                onClick={handleSave}
                className="w-14 h-14 rounded-full border-2 border-success/30 flex items-center justify-center hover:bg-success/10 transition-colors"
              >
                <Heart className={`w-6 h-6 ${saved.has(current.id) ? "fill-success text-success" : "text-success"}`} />
              </button>
            </div>

            {/* Card navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="ghost" size="sm" disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground">{currentIndex + 1}/{available.length}</span>
              <Button
                variant="ghost" size="sm" disabled={currentIndex >= available.length - 1}
                onClick={() => setCurrentIndex((i) => Math.min(available.length - 1, i + 1))}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Sparkles className="w-12 h-12 text-primary/30 mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">No more matches</h3>
            <p className="text-sm text-muted-foreground">Check back later or adjust your filters</p>
            <Button variant="outline" onClick={() => { setPassed(new Set()); setCurrentIndex(0); }}>
              Reset & start over
            </Button>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{current?.title}</DialogTitle>
          </DialogHeader>
          {current && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="bg-gradient-to-br from-primary/10 to-accent rounded-lg h-40 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary/30" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">€{current.price.toLocaleString()}{current.transactionType === "rent" ? "/mo" : ""}</span>
                  <Badge className={scoreColor(current.matchScore)}>{current.matchScore}% match</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{current.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Bedrooms" value={String(current.bedrooms)} />
                  <Stat label="Surface" value={`${current.surface} m²`} />
                  <Stat label="Location" value={current.location} />
                  <Stat label="Type" value={current.transactionType} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {current.features.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                  ))}
                </div>
                <div className="bg-primary/5 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{current.matchReason}</p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { handleSave(); setDetailOpen(false); }}>
                    <Heart className="w-4 h-4 mr-1" /> Save
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { handleBotHelp(current); setDetailOpen(false); }}>
                    <Bot className="w-4 h-4 mr-1" /> Let Bot Help
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Bot Dialog */}
      <Dialog open={botDialogOpen} onOpenChange={setBotDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> Bot Outreach
            </DialogTitle>
          </DialogHeader>
          {selectedForBot && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Our bot will contact the agent for <strong>{selectedForBot.title}</strong> on your behalf.
              </p>
              <div className="bg-card rounded-lg border border-border p-3 text-sm space-y-1">
                <p className="text-muted-foreground">Draft message:</p>
                <p className="text-foreground italic">
                  "Hello, I'm interested in your listing '{selectedForBot.title}' at €{selectedForBot.price.toLocaleString()}/mo. Could we arrange a viewing this week? I'm flexible with timings. Thank you!"
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { setBotDialogOpen(false); handleSave(); }}>
                  Send & Save
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setBotDialogOpen(false)}>
                  Edit first
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <B2CBottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
