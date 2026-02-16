import { useState } from "react";
import { Play, Square, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { TerminalLog } from "./TerminalLog";
import { useRunBot } from "@/hooks/useApi";

export function RunMonitor() {
  const { status, lines, start, stop, clearLog } = useRunBot();
  const [dryRun, setDryRun] = useState(true);

  return (
    <section id="run" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Run & Monitor</h2>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-border bg-secondary accent-primary"
          />
          <span className="text-muted-foreground">Dry run</span>
          <span className="text-xs text-muted-foreground">(no emails)</span>
        </label>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => start(dryRun)}
            disabled={status === "running" || status === "starting"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Start Bot
          </button>
          <button
            onClick={stop}
            disabled={status !== "running" && status !== "starting"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>
          <button
            onClick={clearLog}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      <TerminalLog lines={lines} />
    </section>
  );
}
