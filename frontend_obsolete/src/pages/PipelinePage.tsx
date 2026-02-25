import { Layers, Settings, Globe, Brain, Mail, FileSearch, Users, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRunBotContext } from "@/contexts/RunBotContext";
import { StatusBadge } from "@/components/StatusBadge";
import { TerminalLog } from "@/components/TerminalLog";

const stages = [
  {
    num: 1,
    name: "Setup & Source Selection",
    icon: Settings,
    purpose: "User selects websites, Facebook, or both. Config is loaded and validated.",
    inputs: "User choice, config.yaml",
    outputs: "source_type, phase2 URLs",
    status: "ready",
  },
  {
    num: 2,
    name: "Scanning Engine",
    icon: Globe,
    purpose: "Browser launches, navigates start URLs, scrolls pages, and handles cookies.",
    inputs: "start_urls, headless flag",
    outputs: "Raw HTML pages",
    status: "idle",
  },
  {
    num: 3,
    name: "Analysis & Classification",
    icon: Brain,
    purpose: "LLM classifies listings as private or agency, assigns confidence scores.",
    inputs: "Listing text, config thresholds",
    outputs: "is_private, confidence, agent details",
    status: "idle",
  },
  {
    num: 4,
    name: "Contact Extraction & Outreach",
    icon: Mail,
    purpose: "Extracts emails, phones, and form endpoints. Sends messages or logs dry-run.",
    inputs: "Classified leads, message templates",
    outputs: "Emails sent / dry-run logs",
    status: "idle",
  },
  {
    num: 5,
    name: "Logging & Agents List",
    icon: FileSearch,
    purpose: "Persists lead_logs and agent_logs to SQLite/MongoDB. Deduplication via listing_ref.",
    inputs: "Processed leads/agents",
    outputs: "Database entries, export files",
    status: "idle",
  },
  {
    num: 6,
    name: "CRM & Client Communications",
    icon: Users,
    purpose: "Track leads post-contact: viability scores, communication history, and stage management.",
    inputs: "Contacted leads",
    outputs: "Client records, comm logs",
    status: "idle",
  },
];

const statusColors: Record<string, string> = {
  ready: "bg-success/15 text-success",
  active: "bg-primary/15 text-primary",
  idle: "bg-secondary text-muted-foreground",
};

export default function PipelinePage() {
  const { status, lines } = useRunBotContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">6-stage lead generation pipeline overview</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <div key={stage.num}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary">Stage {stage.num}</span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusColors[stage.status]}`}>
                          {stage.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{stage.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{stage.purpose}</p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Inputs</span>
                          <p className="text-foreground/80 mt-0.5">{stage.inputs}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Outputs</span>
                          <p className="text-foreground/80 mt-0.5">{stage.outputs}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {i < stages.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="w-4 h-4 text-border" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live run output (same stream as Run page) */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Live run output</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">When you start the bot from the Run page, this stream shows output in real time.</p>
        </CardHeader>
        <CardContent className="p-0">
          <TerminalLog lines={lines} maxHeight="min(500px, 60vh)" />
        </CardContent>
      </Card>
    </div>
  );
}
