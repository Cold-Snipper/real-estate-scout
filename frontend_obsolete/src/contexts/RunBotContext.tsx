import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { RunStatus, StreamLine } from "@/types/api";

const API_BASE = (import.meta as unknown as { env: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? "/api";
const defaultFetchOptions: RequestInit = { credentials: "include" as RequestCredentials };

type RunBotContextValue = {
  status: RunStatus;
  lines: StreamLine[];
  start: (dryRun?: boolean) => Promise<void>;
  stop: () => Promise<void>;
  clearLog: () => void;
};

const RunBotContext = createContext<RunBotContextValue | null>(null);

export function getRunStatus(): Promise<{ running: boolean }> {
  return fetch(`${API_BASE}/run`, defaultFetchOptions).then((res) =>
    res.ok ? res.json() : { running: false }
  );
}

export function RunBotProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [lines, setLines] = useState<StreamLine[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getRunStatus()
      .then((r) => {
        if (r.running) setStatus("running");
      })
      .catch(() => {});
  }, []);

  const start = useCallback(async (dryRun: boolean = true) => {
    if (status === "running" || status === "starting") return;
    setStatus("starting");
    setLines([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/run`, {
        ...defaultFetchOptions,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
        signal: controller.signal,
      });

      if (res.status === 409) {
        setStatus("running");
        setLines((p) => [...p, { type: "status", data: "Bot already running" }]);
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setLines((p) => [...p, { type: "stderr", data: `HTTP ${res.status}` }]);
        return;
      }

      setStatus("running");
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          if (!part.trim()) continue;
          try {
            const line: StreamLine = JSON.parse(part);
            setLines((p) => [...p, line]);
            if (line.type === "exit") {
              setStatus(line.data === "0" ? "stopped" : "error");
              return;
            }
          } catch {
            setLines((p) => [...p, { type: "stdout", data: part }]);
          }
        }
      }
      setStatus("stopped");
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setStatus("stopped");
      } else {
        setStatus("error");
      }
    }
  }, [status]);

  const stop = useCallback(async () => {
    abortRef.current?.abort();
    try {
      await fetch(`${API_BASE}/run`, { method: "DELETE", ...defaultFetchOptions });
    } catch {}
    setStatus("stopped");
  }, []);

  const clearLog = useCallback(() => setLines([]), []);

  const value: RunBotContextValue = { status, lines, start, stop, clearLog };

  return (
    <RunBotContext.Provider value={value}>
      {children}
    </RunBotContext.Provider>
  );
}

export function useRunBotContext() {
  const ctx = useContext(RunBotContext);
  if (!ctx) throw new Error("useRunBotContext must be used within RunBotProvider");
  return ctx;
}
