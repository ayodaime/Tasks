import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { taskAccessWhere } from "@/lib/taskAccess";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const accessWhere = taskAccessWhere(session.user);

  const [statusCounts, totalTasks, overdueTasks, myTasks, recentTasks] = await Promise.all([
    prisma.task.groupBy({ where: accessWhere, by: ["status"], _count: { _all: true } }),
    prisma.task.count({ where: accessWhere }),
    prisma.task.findMany({
      where: { ...accessWhere, dueDate: { lt: new Date() }, status: { not: "DONE" } },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { assignee: { select: { id: true, name: true, email: true } } },
    }),
    prisma.task.findMany({
      where: { ...accessWhere, assigneeId: session.user.id, status: { not: "DONE" } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: accessWhere,
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const countByStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  for (const row of statusCounts) countByStatus[row.status] = row._count._all;

  const doneCount = countByStatus.DONE ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/tasks/new" className="btn-primary">
          + New Task
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="card p-4">
            <p className="text-sm text-slate-500">{STATUS_LABELS[status]}</p>
            <p className="mt-1 text-2xl font-semibold">{countByStatus[status]}</p>
          </div>
        ))}
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Overall progress</p>
          <p className="text-sm text-slate-500">{completionRate}% done ({doneCount}/{totalTasks})</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-brand-500" style={{ width: `${completionRate}%` }} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 font-medium">My open tasks</h2>
          {myTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing assigned to you right now.</p>
          ) : (
            <ul className="space-y-2">
              {myTasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex items-center justify-between rounded-md p-2 hover:bg-slate-50">
                    <span className="truncate">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-medium text-red-700">Overdue</h2>
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing overdue. Nice work.</p>
          ) : (
            <ul className="space-y-2">
              {overdueTasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex items-center justify-between rounded-md p-2 hover:bg-slate-50">
                    <span className="truncate">{t.title}</span>
                    <span className="text-xs text-slate-500">{t.assignee?.name ?? "Unassigned"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Recent tasks</h2>
          <Link href="/tasks" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {recentTasks.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    Assignee: {t.assignee?.name ?? "Unassigned"} &middot; Manager: {t.manager?.name ?? "None"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
