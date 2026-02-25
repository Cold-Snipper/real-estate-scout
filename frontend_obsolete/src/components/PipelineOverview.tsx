import { Settings, Globe, ScrollText, FileSearch, Copy, Brain, Mail, Timer } from "lucide-react";

const steps = [
  { name: "Config", icon: Settings, desc: "Load config & URLs" },
  { name: "Browser", icon: Globe, desc: "Playwright init" },
  { name: "Scroll", icon: ScrollText, desc: "Navigate & scroll pages" },
  { name: "Extract", icon: FileSearch, desc: "Parse listing data" },
  { name: "Dedup", icon: Copy, desc: "Skip known listings" },
  { name: "Classify", icon: Brain, desc: "LLM classify private/agent" },
  { name: "Contact", icon: Mail, desc: "Extract & send contacts" },
  { name: "Cooldown", icon: Timer, desc: "Rate limit & sleep" },
];

export function PipelineOverview() {
  return (
    <section id="pipeline" className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Pipeline</h2>
      <div className="flex flex-wrap gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.name} className="flex items-center gap-1.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border">
                <Icon className="w-3.5 h-3.5 text-primary" />
                <div>
                  <div className="text-xs font-medium">{step.name}</div>
                  <div className="text-[10px] text-muted-foreground">{step.desc}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <span className="text-muted-foreground text-xs">→</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
