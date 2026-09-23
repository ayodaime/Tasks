import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const s = status as TaskStatus;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[s] ?? "bg-slate-100 text-slate-700"}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as TaskPriority;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_COLORS[p] ?? "bg-slate-100 text-slate-700"}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
      {PRIORITY_LABELS[p] ?? priority}
    </span>
  );
}
