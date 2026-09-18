"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { PriorityBadge } from "@/components/Badges";
import { TASK_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { TaskSummary } from "@/lib/types";

export default function TaskBoard({
  tasks,
  onStatusChange,
}: {
  tasks: TaskSummary[];
  onStatusChange: (taskId: string, status: string) => void;
}) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const columns = TASK_STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((col) => (
        <div
          key={col.status}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverColumn(col.status);
          }}
          onDragLeave={() => setDragOverColumn((c) => (c === col.status ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData("text/plain");
            if (taskId) onStatusChange(taskId, col.status);
            setDragOverColumn(null);
          }}
          className={`flex min-h-[200px] flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition-colors ${
            dragOverColumn === col.status ? "border-brand-400 bg-brand-50" : ""
          }`}
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-700">{STATUS_LABELS[col.status]}</h3>
            <span className="text-xs text-slate-400">{col.tasks.length}</span>
          </div>

          {col.tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", task.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="card block cursor-grab space-y-2 p-3 hover:shadow-md active:cursor-grabbing"
            >
              <p className="text-sm font-medium text-slate-800">{task.title}</p>
              <div className="flex items-center justify-between">
                <PriorityBadge priority={task.priority} />
                {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
              </div>
              {task.dueDate && (
                <p className="text-xs text-slate-400">Due {new Date(task.dueDate).toLocaleDateString()}</p>
              )}
            </Link>
          ))}

          {col.tasks.length === 0 && (
            <p className="px-1 py-2 text-xs text-slate-400">No tasks</p>
          )}
        </div>
      ))}
    </div>
  );
}
