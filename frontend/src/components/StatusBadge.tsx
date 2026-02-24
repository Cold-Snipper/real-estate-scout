import type { RunStatus } from "@/types/api";

const statusConfig: Record<RunStatus, { label: string; cls: string }> = {
  idle: { label: "Idle", cls: "status-idle" },
  starting: { label: "Starting…", cls: "status-starting" },
  running: { label: "Running", cls: "status-running" },
  stopped: { label: "Stopped", cls: "status-stopped" },
  error: { label: "Error", cls: "status-error" },
};

export function StatusBadge({ status }: { status: RunStatus }) {
  const { label, cls } = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
      {status === "starting" && <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />}
      {label}
    </span>
  );
}
