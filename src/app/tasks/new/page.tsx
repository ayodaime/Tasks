"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { TASK_PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import type { UserSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NewTaskPage() {
  const router = useRouter();
  const { data: users } = useSWR<UserSummary[]>("/api/users", fetcher);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, assigneeId, managerId, dueDate }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create task.");
      return;
    }

    const task = await res.json();
    router.push(`/tasks/${task.id}`);
  }

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
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="manager">
              Manager in charge
            </label>
            <select id="manager" className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">None</option>
              {users
                ?.filter((u) => u.role === "MANAGER" || u.role === "ADMIN")
                .map((u) => (
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
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating..." : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
