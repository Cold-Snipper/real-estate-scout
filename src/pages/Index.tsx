import { Bot, Globe, Facebook, Layers, FlaskConical, Database, Activity } from "lucide-react";
import { RunMonitor } from "@/components/RunMonitor";
import { WebsiteScan } from "@/components/WebsiteScan";
import { FacebookScan } from "@/components/FacebookScan";
import { PipelineOverview } from "@/components/PipelineOverview";
import { TestBuild } from "@/components/TestBuild";
import { DataPanels } from "@/components/DataPanels";

const navItems = [
  { id: "run", label: "Run", icon: Bot },
  { id: "website-scan", label: "Website", icon: Globe },
  { id: "facebook-scan", label: "Facebook", icon: Facebook },
  { id: "pipeline", label: "Pipeline", icon: Layers },
  { id: "test-build", label: "Test & Build", icon: FlaskConical },
  { id: "data", label: "Data", icon: Database },
];

const Index = () => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Cold Bot</h1>
              <p className="text-[10px] text-muted-foreground">Real estate lead pipeline</p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                  <Icon className="w-3 h-3" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <RunMonitor />

        <div className="border-t border-border" />
        <WebsiteScan />

        <div className="border-t border-border" />
        <FacebookScan />

        <div className="border-t border-border" />
        <PipelineOverview />

        <div className="border-t border-border" />
        <TestBuild />

        <div className="border-t border-border" />
        <section id="data" className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Data</h2>
          </div>
          <DataPanels />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Cold Bot — Luxembourg Real Estate Pipeline
      </footer>
    </div>
  );
};

export default Index;
