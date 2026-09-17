"use client";

import { useState } from "react";
import useSWR from "swr";
import { USER_ROLES } from "@/lib/constants";
import type { UserSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminUsersTable({ currentUserId }: { currentUserId: string }) {
  const { data: users, mutate, isLoading } = useSWR<UserSummary[]>("/api/users", fetcher);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(userId: string, role: string) {
    setError(null);
    setSavingId(userId);

    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    setSavingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update role.");
      return;
    }

    mutate();
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="card overflow-hidden">
      {error && <p className="border-b border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users?.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3">{u.name}</td>
              <td className="px-4 py-3 text-slate-500">{u.email}</td>
              <td className="px-4 py-3">
                {u.id === currentUserId ? (
                  <span className="text-slate-500">{u.role} (you)</span>
                ) : (
                  <select
                    className="input w-auto"
                    value={u.role}
                    disabled={savingId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
