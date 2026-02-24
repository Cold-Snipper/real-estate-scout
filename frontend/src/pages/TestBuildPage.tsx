import { FlaskConical, Hammer, Globe, Facebook } from "lucide-react";
import { useStreamAction } from "@/hooks/useApi";
import { TerminalLog } from "@/components/TerminalLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function TestBuildPage() {
  const websiteTest = useStreamAction();
  const facebookTest = useStreamAction();
  const buildAction = useStreamAction();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Test & Build</h1>
          <p className="text-sm text-muted-foreground">Run website bot tests, Facebook bot tests, or build the dashboard. Each action streams in its own panel.</p>
        </div>
      </div>

      {/* Test Website Bot */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Test Website Bot
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => websiteTest.run("/test/website")}
                  disabled={websiteTest.running}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {websiteTest.running ? "Running…" : "Test Website Bot"}
                </button>
              </TooltipTrigger>
              <TooltipContent>POST /api/test/website — runs website bot tests</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TerminalLog lines={websiteTest.lines} maxHeight="280px" />
        </CardContent>
      </Card>

      {/* Test Facebook Bot */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Facebook className="w-4 h-4 text-primary" />
              Test Facebook Bot
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => facebookTest.run("/test/facebook")}
                  disabled={facebookTest.running}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {facebookTest.running ? "Running…" : "Test Facebook Bot"}
                </button>
              </TooltipTrigger>
              <TooltipContent>POST /api/test/facebook — runs Facebook bot tests</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TerminalLog lines={facebookTest.lines} maxHeight="280px" />
        </CardContent>
      </Card>

      {/* Build */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Hammer className="w-4 h-4 text-primary" />
              Build
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => buildAction.run("/build")}
                  disabled={buildAction.running}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {buildAction.running ? "Building…" : "Build Dashboard"}
                </button>
              </TooltipTrigger>
              <TooltipContent>POST /api/build — runs npm run build in the dashboard directory</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TerminalLog lines={buildAction.lines} maxHeight="280px" />
        </CardContent>
      </Card>
    </div>
  );
}
