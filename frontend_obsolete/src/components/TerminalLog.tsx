import { useRef, useEffect } from "react";
import type { StreamLine } from "@/types/api";

interface TerminalLogProps {
  lines: StreamLine[];
  maxHeight?: string;
}

export function TerminalLog({ lines, maxHeight = "400px" }: TerminalLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div
      className="bg-muted/30 overflow-auto font-mono text-sm terminal-log"
      style={{ maxHeight }}
    >
      <div className="p-3 space-y-0.5">
        {lines.length === 0 && (
          <span className="text-muted-foreground text-xs">Waiting for output…</span>
        )}
        {lines.map((line, i) => {
          let cls = "stdout";
          if (line.type === "stderr") cls = "stderr";
          if (line.type === "status") cls = "status";
          if (line.type === "exit") cls = line.data === "0" ? "exit-ok" : "exit-err";
          return (
            <div key={i} className={cls}>
              {line.type === "exit" ? `⏹ Process exited (${line.data})` : line.data}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
