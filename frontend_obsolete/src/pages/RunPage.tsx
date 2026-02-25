import { useState } from "react";
import { Play, Square, Trash2, Bot, Zap } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { TerminalLog } from "@/components/TerminalLog";
import { useRunBot } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function RunPage() {
  const { status, lines, start, stop, clearLog } = useRunBot();
  const [dryRun, setDryRun] = useState(true);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Run & Monitor</h1>
          <p className="text-sm text-muted-foreground">Start, stop, and monitor the Immo Snippy bot</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Controls card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Bot Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-border bg-secondary accent-primary w-4 h-4"
            />
            <span className="font-medium">Dry run</span>
            <span className="text-xs text-muted-foreground">(no emails will be sent)</span>
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => start(dryRun)}
                  disabled={status === "running" || status === "starting"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  <Play className="w-4 h-4" />
                  Start Bot
                </button>
              </TooltipTrigger>
              <TooltipContent>Start the Immo Snippy pipeline</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={stop}
                  disabled={status !== "running" && status !== "starting"}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              </TooltipTrigger>
              <TooltipContent>Stop the running bot</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={clearLog}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </TooltipTrigger>
              <TooltipContent>Clear the log output</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Terminal */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Process Output</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TerminalLog lines={lines} maxHeight="500px" />
        </CardContent>
      </Card>
    </div>
  );
}
