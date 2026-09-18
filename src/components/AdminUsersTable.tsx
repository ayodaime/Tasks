"use client";

import { useState } from "react";
import useSWR from "swr";
import { DEPARTMENTS, DEPARTMENT_LABELS, USER_ROLES, ROLE_LABELS, type Department } from "@/lib/constants";
import type { UserSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const GROUPS: { key: Department | "UNASSIGNED"; label: string }[] = [
  ...DEPARTMENTS.map((d) => ({ key: d, label: DEPARTMENT_LABELS[d] })),
  { key: "UNASSIGNED", label: "Not yet assigned" },
];

export default function AdminUsersTable({ currentUserId }: { currentUserId: string }) {
  const { data: users, mutate, isLoading } = useSWR<UserSummary[]>("/api/users", fetcher);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeField(userId: string, field: "role" | "department" | "hidden", value: string | boolean) {
    setError(null);
    setSavingId(userId);

    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    setSavingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Could not update ${field}.`);
      return;
    }

    mutate();
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {GROUPS.map((group) => {
        const members = users?.filter((u) =>
          group.key === "UNASSIGNED" ? !u.department : u.department === group.key
        );
        if (!members || members.length === 0) return null;

        return (
          <div key={group.key} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
              <h2 className="text-sm font-semibold text-slate-700">{group.label}</h2>
              <span className="text-xs text-slate-400">{members.length}</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Hidden</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.id === currentUserId ? (
                        <span className="text-slate-500">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role} (you)</span>
                      ) : (
                        <select
                          className="input w-auto"
                          value={u.role}
                          disabled={savingId === u.id}
                          onChange={(e) => changeField(u.id, "role", e.target.value)}
                        >
                          {USER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input w-auto"
                        value={u.department ?? ""}
                        disabled={savingId === u.id}
                        onChange={(e) => changeField(u.id, "department", e.target.value)}
                      >
                        {!u.department && <option value="">Not set</option>}
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {DEPARTMENT_LABELS[d]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-slate-600">
                        <input
                          type="checkbox"
                          checked={!!u.hidden}
                          disabled={savingId === u.id}
                          onChange={(e) => changeField(u.id, "hidden", e.target.checked)}
                        />
                        <span className="text-xs">{u.hidden ? "Hidden" : "Visible"}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
