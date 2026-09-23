"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import Skeleton from "@/components/Skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TASK_GROUPS,
  TASK_GROUP_LABELS,
  type TaskGroupCode,
} from "@/lib/constants";
import { userGroups, groupsOverlap } from "@/lib/groups";
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
  const canAssign = session?.user.role !== "OFFICER";
  const isPrivileged = session?.user.role === "ADMIN" || session?.user.role === "MANAGER" || session?.user.role === "SUPERVISOR";
  const { data: task, mutate, isLoading } = useSWR<TaskDetail>(`/api/tasks/${taskId}`, fetcher);
  const { data: users } = useSWR<UserSummary[]>("/api/users", fetcher);
  // Matches the API's own rule: a task can only be deleted by a
  // supervisor/manager/admin, or by whoever created it.
  const canDelete = isPrivileged || task?.createdBy.id === session?.user.id;

  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function updateField(field: string, value: unknown) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    mutate();
  }

  function toggleGroup(g: string) {
    if (!task) return;
    const next = task.groups.includes(g) ? task.groups.filter((x) => x !== g) : [...task.groups, g];
    updateField("groups", next);
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
    setConfirmingDelete(false);
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Could not delete this task.");
      return;
    }
    onDeleted();
  }

  if (isLoading) return <TaskDetailSkeleton />;
  if (!task) return <p className="text-sm text-red-600">Task not found.</p>;

  return (
    <div className="space-y-6">
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this task?"
          message="This can't be undone."
          confirmLabel="Delete"
          danger
          onConfirm={deleteTask}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{task.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Created by {task.createdBy.name} on {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
          {canDelete && (
            <button className="text-sm text-red-600 hover:underline" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          )}
        </div>

        {deleteError && (
          <p className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">{deleteError}</p>
        )}

        {task.description && <p className="mt-4 whitespace-pre-wrap text-slate-700">{task.description}</p>}

        <div className="mt-6">
          <label className="label">Team(s)</label>
          {isAdmin ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-slate-300 p-3 sm:grid-cols-3">
              {TASK_GROUPS.map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={task.groups.includes(g)} onChange={() => toggleGroup(g)} />
                  {TASK_GROUP_LABELS[g]}
                </label>
              ))}
            </div>
          ) : (
            <p className="input flex items-center bg-slate-50 text-slate-600">
              {task.groups.length > 0
                ? task.groups.map((g) => TASK_GROUP_LABELS[g as TaskGroupCode] ?? g).join(", ")
                : "Unclassified"}
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                {/* Non-admins can only hand this task to someone who shares one of its teams. */}
                {users
                  ?.filter((u) => isAdmin || groupsOverlap(userGroups(u), task.groups))
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
                {/* Non-admins can only put a manager who shares one of its teams in charge. */}
                {users
                  ?.filter(
                    (u) =>
                      (u.role === "MANAGER" || u.role === "SUPERVISOR" || u.role === "ADMIN") &&
                      (isAdmin || (!u.hideAsManager && groupsOverlap(userGroups(u), task.groups)))
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

function TaskDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="card space-y-3 p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="card space-y-3 p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
