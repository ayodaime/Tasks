"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Avatar from "@/components/Avatar";
import TaskBoard from "@/components/TaskBoard";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
} from "@/lib/constants";
import type { TaskSummary, UserSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TasksPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [view, setView] = useState<"board" | "list">("board");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [department, setDepartment] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (assigneeId) params.set("assigneeId", assigneeId);
    if (managerId) params.set("managerId", managerId);
    if (department) params.set("department", department);
    return params.toString();
  }, [status, priority, assigneeId, managerId, department]);

  const { data: tasks, isLoading, mutate } = useSWR<TaskSummary[]>(`/api/tasks?${query}`, fetcher);
  const { data: users } = useSWR<UserSummary[]>("/api/users", fetcher);

  async function handleStatusChange(taskId: string, newStatus: string) {
    mutate(
      (current) => current?.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      { revalidate: false }
    );
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Tasks</h1>
        {/* Plain <a>, not <Link>: client-side nav here would trigger the
            @modal intercepting route for /tasks/[id], mistaking "new" for a
            task id. A full navigation bypasses interception entirely. */}
        <a href="/tasks/new" className="btn-primary">
          + New Task
        </a>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="flex rounded-md border border-slate-300 p-0.5 text-sm">
          <button
            onClick={() => setView("board")}
            className={`rounded px-3 py-1 ${view === "board" ? "bg-brand-500 text-white" : "text-slate-600"}`}
          >
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded px-3 py-1 ${view === "list" ? "bg-brand-500 text-white" : "text-slate-600"}`}
          >
            List
          </button>
        </div>

        {isAdmin && (
          <select className="input w-auto" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        )}
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          <option value="">Any assignee</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
          <option value="">Any manager</option>
          {users
            ?.filter((u) => u.role === "MANAGER" || u.role === "ADMIN")
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
        {(status || priority || assigneeId || managerId || department) && (
          <button
            className="btn-secondary"
            onClick={() => {
              setStatus("");
              setPriority("");
              setAssigneeId("");
              setManagerId("");
              setDepartment("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {!isLoading && tasks?.length === 0 && <p className="text-sm text-slate-500">No tasks match these filters.</p>}

      {!isLoading && tasks && tasks.length > 0 && view === "board" && (
        <TaskBoard tasks={tasks} onStatusChange={handleStatusChange} />
      )}

      {!isLoading && tasks && tasks.length > 0 && view === "list" && (
        <div className="card divide-y divide-slate-100">
          {tasks.map((t) => (
            <Link
              key={t.id}
              href={`/tasks/${t.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-slate-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                {t.assignee && <Avatar name={t.assignee.name} size="sm" />}
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    Assignee: {t.assignee?.name ?? "Unassigned"} &middot; Manager: {t.manager?.name ?? "None"}
                    {t.dueDate && <> &middot; Due {new Date(t.dueDate).toLocaleDateString()}</>}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
