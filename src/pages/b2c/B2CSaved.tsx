import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Heart, MapPin, Bed, Maximize, Euro, MessageSquare,
  Trash2, ExternalLink, Search, Bot, Sparkles,
} from "lucide-react";
import B2CBottomNav from "./B2CBottomNav";

const PIPELINE_STAGES = ["Interested", "Contacted", "Viewing Scheduled", "Offer Submitted", "Rejected", "Closed"] as const;
type Stage = typeof PIPELINE_STAGES[number];

type SavedProperty = {
  id: string;
  title: string;
  price: number;
  transactionType: "rent" | "buy";
  bedrooms: number;
  surface: number;
  location: string;
  matchScore: number;
  stage: Stage;
  notes: string;
  conversations: { sender: string; text: string; time: string }[];
};

const MOCK_SAVED: SavedProperty[] = [
  {
    id: "1", title: "Bright 2BR in Kirchberg", price: 1850, transactionType: "rent",
    bedrooms: 2, surface: 72, location: "Kirchberg", matchScore: 94, stage: "Contacted",
    notes: "Agent responded quickly. Viewing possible next week.",
    conversations: [
      { sender: "bot", text: "Hello, I'm interested in the 2BR in Kirchberg. Could we arrange a viewing?", time: "2h ago" },
      { sender: "agent", text: "Of course! We have availability Thursday at 14:00 or Friday at 10:00.", time: "1h ago" },
    ],
  },
  {
    id: "2", title: "Cozy Studio near Gare", price: 1200, transactionType: "rent",
    bedrooms: 1, surface: 35, location: "Gare", matchScore: 87, stage: "Interested",
    notes: "", conversations: [],
  },
  {
    id: "3", title: "Family House in Strassen", price: 2800, transactionType: "rent",
    bedrooms: 4, surface: 165, location: "Strassen", matchScore: 82, stage: "Viewing Scheduled",
    notes: "Viewing on Monday 10AM",
    conversations: [
      { sender: "bot", text: "We'd like to book a viewing for the house in Strassen.", time: "1d ago" },
      { sender: "agent", text: "Monday at 10AM works. See you then!", time: "20h ago" },
      { sender: "user", text: "Confirmed. Thanks!", time: "18h ago" },
    ],
  },
];

export default function B2CSaved() {
  const [saved, setSaved] = useState<SavedProperty[]>(MOCK_SAVED);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<SavedProperty | null>(null);

  const filtered = saved.filter((p) => {
    if (activeTab !== "all" && p.stage !== activeTab) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const updateStage = (id: string, stage: Stage) => {
    setSaved((prev) => prev.map((p) => p.id === id ? { ...p, stage } : p));
    if (selectedProperty?.id === id) setSelectedProperty((p) => p ? { ...p, stage } : null);
  };

  const updateNotes = (id: string, notes: string) => {
    setSaved((prev) => prev.map((p) => p.id === id ? { ...p, notes } : p));
  };

  const removeProperty = (id: string) => {
    setSaved((prev) => prev.filter((p) => p.id !== id));
    setSelectedProperty(null);
  };

  const stageColor = (stage: Stage) => {
    switch (stage) {
      case "Interested": return "bg-primary/10 text-primary";
      case "Contacted": return "bg-warning/10 text-warning";
      case "Viewing Scheduled": return "bg-success/10 text-success";
      case "Offer Submitted": return "bg-primary/20 text-primary";
      case "Rejected": return "bg-destructive/10 text-destructive";
      case "Closed": return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" /> Saved Apartments
            </h1>
            <Badge variant="secondary">{saved.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search saved..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 max-w-lg mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mt-3 flex overflow-x-auto">
            <TabsTrigger value="all" className="text-xs flex-1">All</TabsTrigger>
            {PIPELINE_STAGES.slice(0, 4).map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs flex-1">{s.split(" ")[0]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-lg mx-auto space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No saved apartments yet</p>
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProperty(p)}
                className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-semibold text-foreground text-sm truncate">{p.title}</h3>
                    <p className="text-sm font-bold text-primary">€{p.price.toLocaleString()}{p.transactionType === "rent" ? "/mo" : ""}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{p.bedrooms}</span>
                      <span className="flex items-center gap-0.5"><Maximize className="w-3 h-3" />{p.surface}m²</span>
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.location}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageColor(p.stage)}`}>
                      {p.stage}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" />{p.matchScore}%
                    </span>
                  </div>
                </div>
                {p.conversations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquare className="w-3 h-3" />
                    <span className="truncate">{p.conversations[p.conversations.length - 1].text}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Detail Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={(o) => !o && setSelectedProperty(null)}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.title}</DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-4 pr-4">
                {/* Quick stats */}
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">
                    €{selectedProperty.price.toLocaleString()}{selectedProperty.transactionType === "rent" ? "/mo" : ""}
                  </span>
                  <span className="text-sm font-semibold text-success">{selectedProperty.matchScore}% match</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Bed className="w-3 h-3" />{selectedProperty.bedrooms} bed
                  <Maximize className="w-3 h-3 ml-2" />{selectedProperty.surface} m²
                  <MapPin className="w-3 h-3 ml-2" />{selectedProperty.location}
                </div>

                {/* Pipeline stage */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={selectedProperty.stage} onValueChange={(v) => updateStage(selectedProperty.id, v as Stage)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <Textarea
                    value={selectedProperty.notes}
                    onChange={(e) => updateNotes(selectedProperty.id, e.target.value)}
                    placeholder="Add notes about this property..."
                    rows={2}
                  />
                </div>

                {/* Conversations */}
                {selectedProperty.conversations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Conversation
                    </p>
                    <div className="space-y-2">
                      {selectedProperty.conversations.map((c, i) => (
                        <div key={i} className={`p-2.5 rounded-lg text-xs ${
                          c.sender === "agent" ? "bg-secondary/60 ml-0 mr-8" :
                          c.sender === "bot" ? "bg-primary/10 ml-8 mr-0" :
                          "bg-accent ml-8 mr-0"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold capitalize text-foreground">
                              {c.sender === "bot" ? "🤖 Bot" : c.sender === "agent" ? "Agent" : "You"}
                            </span>
                            <span className="text-muted-foreground">{c.time}</span>
                          </div>
                          <p className="text-foreground">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Bot className="w-3.5 h-3.5" /> Let Bot Contact
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={() => removeProperty(selectedProperty.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <B2CBottomNav />
    </div>
  );
}
