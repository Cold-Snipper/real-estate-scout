import { FlaskConical, Hammer } from "lucide-react";
import { useStreamAction } from "@/hooks/useApi";
import { TerminalLog } from "./TerminalLog";

export function TestBuild() {
  const testAction = useStreamAction();
  const buildAction = useStreamAction();

  return (
    <section id="test-build" className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Test & Build</h2>
      <div className="flex gap-2">
        <button
          onClick={() => testAction.run("/test")}
          disabled={testAction.running}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          {testAction.running ? "Running…" : "Run Tests"}
        </button>
        <button
          onClick={() => buildAction.run("/build")}
          disabled={buildAction.running}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
        >
          <Hammer className="w-3.5 h-3.5" />
          {buildAction.running ? "Building…" : "Build Dashboard"}
        </button>
      </div>
      {(testAction.lines.length > 0 || buildAction.lines.length > 0) && (
        <TerminalLog lines={[...testAction.lines, ...buildAction.lines]} maxHeight="300px" />
      )}
    </section>
  );
}
