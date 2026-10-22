"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Skeleton from "@/components/Skeleton";
import { userGroups, groupsOverlap } from "@/lib/groups";
import type { DailyActivity, UserSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function DailyActivityPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [date, setDate] = useState(todayISO());
  const [userId, setUserId] = useState("");

  const { data: users } = useSWR<UserSummary[]>("/api/users", fetcher);
  const ownGroups = session ? userGroups(session.user) : [];
  const peopleOptions = isAdmin ? users : users?.filter((u) => u.id === session?.user.id || groupsOverlap(userGroups(u), ownGroups));

  const effectiveUserId = userId || session?.user.id || "";
  const { data, isLoading } = useSWR<DailyActivity>(
    effectiveUserId ? `/api/daily-activity?date=${date}&userId=${effectiveUserId}` : null,
    fetcher
  );

  const entries = useMemo(() => {
    if (!data) return [];
    const completed = data.completed.map((t) => ({
      kind: "completed" as const,
      time: t.updatedAt,
      title: t.title,
      taskId: t.id,
    }));
    const updates = data.updates.map((u) => ({
      kind: "update" as const,
      time: u.createdAt,
      title: u.taskTitle,
      taskId: u.taskId,
      body: u.body,
    }));
    return [...completed, ...updates].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [data]);

  const copyText = useMemo(() => {
    if (!data) return "";
    const lines = [`Daily activity — ${data.user.name} — ${formatDate(data.date)}`, ""];
    if (data.completed.length > 0) {
      lines.push("Completed:");
      for (const t of data.completed) lines.push(`- ${t.title}`);
      lines.push("");
    }
    if (data.updates.length > 0) {
      lines.push("Updates:");
      for (const u of data.updates) lines.push(`- ${u.taskTitle}: ${u.body}`);
    }
    if (data.completed.length === 0 && data.updates.length === 0) lines.push("Nothing logged.");
    return lines.join("\n");
  }, [data]);

  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; nothing to recover
      // from here, the text is still selectable on the page.
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Daily Activity</h1>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          type="date"
          className="input w-auto"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
        />
        <select className="input w-auto" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Me</option>
          {peopleOptions
            ?.filter((u) => u.id !== session?.user.id)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
        <button className="btn-secondary ml-auto" onClick={handleCopy} disabled={!data}>
          {copied ? "Copied!" : "Copy as text"}
        </button>
      </div>

      {isLoading && (
        <div className="card space-y-3 p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      )}

      {!isLoading && data && (
        <div className="card p-4">
          <p className="mb-4 text-sm font-medium text-slate-700">
            {data.user.name} &middot; {formatDate(data.date)}
          </p>

          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing logged for this day.</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 w-14 shrink-0 text-xs tabular-nums text-slate-400">{formatTime(entry.time)}</span>
                  <div className="min-w-0">
                    {entry.kind === "completed" ? (
                      <p className="text-sm">
                        <span className="mr-1.5 text-green-600">&#10003;</span>
                        Completed{" "}
                        <Link href={`/tasks/${entry.taskId}`} className="font-medium hover:underline">
                          {entry.title}
                        </Link>
                      </p>
                    ) : (
                      <p className="text-sm">
                        <Link href={`/tasks/${entry.taskId}`} className="font-medium hover:underline">
                          {entry.title}
                        </Link>
                        <span className="text-slate-500">: {entry.body}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
