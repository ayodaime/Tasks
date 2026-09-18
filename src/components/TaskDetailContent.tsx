"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  type Department,
} from "@/lib/constants";
import type { TaskDetail, UserSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskDetailContent({
  taskId,
  onDeleted,
}: {
  taskId: string;
  onDeleted: () => void;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const canAssign = session?.user.role !== "STAFF";
  const { data: task, mutate, isLoading } = useSWR<TaskDetail>(`/api/tasks/${taskId}`, fetcher);
  const { data: users } = useSWR<UserSummary[]>("/api/users", fetcher);

  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function updateField(field: string, value: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    mutate();
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    setComment("");
    setPosting(false);
    mutate();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: formData });
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    mutate();
  }

  async function deleteTask() {
    if (!confirm("Delete this task? This can't be undone.")) return;
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    onDeleted();
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (!task) return <p className="text-sm text-red-600">Task not found.</p>;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{task.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Created by {task.createdBy.name} on {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button className="text-sm text-red-600 hover:underline" onClick={deleteTask}>
            Delete
          </button>
        </div>

        {task.description && <p className="mt-4 whitespace-pre-wrap text-slate-700">{task.description}</p>}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <label className="label">Department</label>
            {isAdmin ? (
              <select
                className="input"
                value={task.department ?? ""}
                onChange={(e) => updateField("department", e.target.value)}
              >
                {!task.department && <option value="">Unclassified</option>}
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {DEPARTMENT_LABELS[d]}
                  </option>
                ))}
              </select>
            ) : (
              <p className="input flex items-center bg-slate-50 text-slate-600">
                {task.department ? DEPARTMENT_LABELS[task.department as Department] ?? task.department : "Unclassified"}
              </p>
            )}
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={task.status} onChange={(e) => updateField("status", e.target.value)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={task.priority} onChange={(e) => updateField("priority", e.target.value)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assignee</label>
            {canAssign ? (
              <select
                className="input"
                value={task.assignee?.id ?? ""}
                onChange={(e) => updateField("assigneeId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {/* Non-admins can only hand this task to someone on the same team (department). */}
                {users
                  ?.filter((u) => isAdmin || u.department === task.department)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            ) : (
              <p className="input flex items-center bg-slate-50 text-slate-600">
                {task.assignee?.name ?? "Unassigned"}
              </p>
            )}
          </div>
          <div>
            <label className="label">Manager in charge</label>
            {canAssign ? (
              <select
                className="input"
                value={task.manager?.id ?? ""}
                onChange={(e) => updateField("managerId", e.target.value)}
              >
                <option value="">None</option>
                {/* Non-admins can only put a manager from the same team (department) in charge. */}
                {users
                  ?.filter(
                    (u) => (u.role === "MANAGER" || u.role === "ADMIN") && (isAdmin || u.department === task.department)
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            ) : (
              <p className="input flex items-center bg-slate-50 text-slate-600">{task.manager?.name ?? "None"}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
          {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Attachments</h2>
          <label className="btn-secondary cursor-pointer">
            {uploading ? "Uploading..." : "Upload file"}
            <input ref={fileInput} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        {task.attachments.length === 0 ? (
          <p className="text-sm text-slate-500">No files attached yet.</p>
        ) : (
          <ul className="space-y-2">
            {task.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <a href={a.filepath} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                  {a.filename}
                </a>
                <span className="text-slate-400">
                  {formatBytes(a.size)} &middot; {a.uploadedBy.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-3 font-medium">Progress updates</h2>
        <ul className="mb-4 space-y-3">
          {task.comments.map((c) => (
            <li key={c.id} className="rounded-md bg-slate-50 p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">{c.author.name}</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.body}</p>
            </li>
          ))}
          {task.comments.length === 0 && <p className="text-sm text-slate-500">No updates yet.</p>}
        </ul>
        <form onSubmit={submitComment} className="flex gap-2">
          <input
            className="input"
            placeholder="Post a progress update..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" disabled={posting} className="btn-primary">
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
