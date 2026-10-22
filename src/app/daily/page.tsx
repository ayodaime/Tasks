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

export default function DailyActivityPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [date, setDate] = useState(todayISO());
  const [userId, setUserId] = useState("");

  const { data: users } = useSWR<UserSummary[]>("/api/users", fetcher);
  const ownGroups = session ? userGroups(session.user) : [];
  const peopleOptions = isAdmin ? users : users?.filter((u) => u.id === session?.user.id || groupsOverlap(userGroups(u), ownGroups));

  const effectiveUserId = userId || session?.user.id || "";
  const isOwnDay = effectiveUserId === session?.user.id;
  const isToday = date === todayISO();
  const { data, isLoading, mutate } = useSWR<DailyActivity>(
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
    const notes = data.notes.map((n) => ({
      kind: "note" as const,
      time: n.createdAt,
      id: n.id,
      body: n.body,
    }));
    return [...completed, ...updates, ...notes].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [data]);

  const [noteText, setNoteText] = useState("");
  const [posting, setPosting] = useState(false);
  async function addNotes(e: React.FormEvent) {
    e.preventDefault();
    // One line, one activity — lets someone paste or type their whole list
    // at once instead of adding items one at a time.
    const lines = noteText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setPosting(true);
    await Promise.all(
      lines.map((line) =>
        fetch("/api/daily-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: line }),
        })
      )
    );
    setNoteText("");
    setPosting(false);
    mutate();
  }

  async function removeNote(id: string) {
    mutate((current) => (current ? { ...current, notes: current.notes.filter((n) => n.id !== id) } : current), {
      revalidate: false,
    });
    await fetch(`/api/daily-activity/${id}`, { method: "DELETE" });
    mutate();
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
            <ul className="space-y-2.5">
              {entries.map((entry, i) => (
                <li key={i} className="group flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  <div className="min-w-0 flex-1">
                    {entry.kind === "completed" ? (
                      <p className="text-sm">
                        <span className="mr-1.5 text-green-600">&#10003;</span>
                        Completed{" "}
                        <Link href={`/tasks/${entry.taskId}`} className="font-medium hover:underline">
                          {entry.title}
                        </Link>
                      </p>
                    ) : entry.kind === "update" ? (
                      <p className="text-sm">
                        <Link href={`/tasks/${entry.taskId}`} className="font-medium hover:underline">
                          {entry.title}
                        </Link>
                        <span className="text-slate-500">: {entry.body}</span>
                      </p>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-slate-700">{entry.body}</p>
                        {isOwnDay && (
                          <button
                            onClick={() => removeNote(entry.id)}
                            className="shrink-0 text-xs text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isOwnDay && isToday && (
            <form onSubmit={addNotes} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <textarea
                className="input"
                rows={3}
                placeholder={"List what you worked on today, one per line—not tied to a task\ne.g.\nFollowed up with vendor on invoice\nSat in on the 2pm ops sync"}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={posting || !noteText.trim()}>
                  {posting ? "Adding..." : "Add to today's list"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
