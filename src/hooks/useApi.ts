import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Config,
  Lead,
  Agent,
  ActivityLog,
  TargetsData,
  DatabaseInfo,
  RunStatus,
  StreamLine,
} from "@/types/api";

const API_BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 409) throw new Error("Bot already running");
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// Polling hook
function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 15000
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetcher()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message));
  }, [fetcher]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, error, refresh };
}

export function useConfig() {
  const fetcher = useCallback(() => fetchJson<Config>("/config"), []);
  return usePolling(fetcher);
}

export function useLeads() {
  const fetcher = useCallback(() => fetchJson<Lead[]>("/leads"), []);
  return usePolling(fetcher);
}

export function useAgents() {
  const fetcher = useCallback(() => fetchJson<Agent[]>("/agents"), []);
  return usePolling(fetcher);
}

export function useLogs() {
  const fetcher = useCallback(() => fetchJson<ActivityLog[]>("/logs"), []);
  return usePolling(fetcher);
}

export function useTargets() {
  const fetcher = useCallback(() => fetchJson<TargetsData>("/targets"), []);
  return usePolling(fetcher, 60000);
}

export function useDatabase() {
  const fetcher = useCallback(() => fetchJson<DatabaseInfo>("/database"), []);
  return usePolling(fetcher, 30000);
}

export function updateConfig(body: Partial<Config>) {
  return postJson("/config", body);
}

export function useRunBot() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [lines, setLines] = useState<StreamLine[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (dryRun: boolean = true) => {
    if (status === "running" || status === "starting") return;
    setStatus("starting");
    setLines([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/run`, {
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
      await fetch(`${API_BASE}/run`, { method: "DELETE" });
    } catch {}
    setStatus("stopped");
  }, []);

  const clearLog = useCallback(() => setLines([]), []);

  return { status, lines, start, stop, clearLog, setStatus, setLines };
}

export function useStreamAction() {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async (path: string) => {
    setRunning(true);
    setLines([]);
    try {
      const res = await fetch(`${API_BASE}${path}`, { method: "POST" });
      if (!res.ok) {
        setLines([{ type: "stderr", data: `HTTP ${res.status}` }]);
        setRunning(false);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) { setRunning(false); return; }
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
            if (line.type === "exit") { setRunning(false); return; }
          } catch {
            setLines((p) => [...p, { type: "stdout", data: part }]);
          }
        }
      }
    } catch {
      setLines((p) => [...p, { type: "stderr", data: "Connection failed" }]);
    }
    setRunning(false);
  }, []);

  return { lines, running, run };
}
