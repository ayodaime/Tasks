"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TASK_PRIORITIES, PRIORITY_LABELS, DEPARTMENTS, DEPARTMENT_LABELS, type Department } from "@/lib/constants";
import type { UserSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NewTaskPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: users } = useSWR<UserSummary[]>("/api/users", fetcher);
  const isAdmin = session?.user.role === "ADMIN";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [department, setDepartment] = useState<string>(
    (session?.user.department as Department) ?? DEPARTMENTS[0]
  );
  const [assigneeId, setAssigneeId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user.department) setDepartment(session.user.department);
  }, [session?.user.department]);

  useEffect(() => {
    if (session && session.user.role === "STAFF") router.replace("/tasks");
  }, [session, router]);

  // "Their team": for a non-admin the task's department is fixed to their
  // own, so the assignee/manager lists only ever show people on that team.
  const teamMembers = users?.filter((u) => u.department === department);
  const teamManagers = users?.filter(
    (u) => (u.role === "MANAGER" || u.role === "ADMIN") && (isAdmin || u.department === department)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, department, assigneeId, managerId, dueDate }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create task.");
      return;
    }

    const task = await res.json();
    // Full navigation, not router.push: this page was itself reached via a
    // full nav (see Sidebar/"+ New Task"), so a client-side push here would
    // render the task's slide-over on top of this now-stale form instead of
    // a clean full-page view.
    window.location.href = `/tasks/${task.id}`;
  }

  if (session?.user.role === "STAFF") return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">New Task</h1>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {isAdmin && (
          <div>
            <label className="label" htmlFor="department">
              Department
            </label>
            <select
              id="department"
              className="input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isAdmin && session && !session.user.department && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            You don&apos;t have a department assigned yet. Ask an admin to set one in Manage Staff before
            creating tasks.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="priority">
              Priority
            </label>
            <select id="priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="dueDate">
              Due date
            </label>
            <input
              id="dueDate"
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="assignee">
              Assignee
            </label>
            <select id="assignee" className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {teamMembers?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Only staff in the {DEPARTMENT_LABELS[department as Department] ?? "selected"} department are shown.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="manager">
              Manager in charge
            </label>
            <select id="manager" className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">None</option>
              {teamManagers?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (!isAdmin && !!session && !session.user.department)}
            className="btn-primary"
          >
            {loading ? "Creating..." : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
