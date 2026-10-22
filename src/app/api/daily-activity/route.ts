import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskAccessWhere } from "@/lib/taskAccess";

// What someone "did" on a given day, built from data that already exists —
// no separate daily-log entry to fill in. Two sources, merged into one feed:
// tasks they're the assignee on that moved to Done that day (status + the
// task's updatedAt is the closest signal we have to a completion time, since
// status changes aren't logged separately), and progress comments they
// posted that day. Access is naturally scoped the same way the rest of the
// app is: every query stays inside taskAccessWhere(viewer), so asking about
// someone outside your own team(s) just comes back empty rather than needing
// a separate permission check.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || session.user.id;
  const dateParam = searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const accessWhere = taskAccessWhere(session.user);

  const [user, completedTasks, comments] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } }),
    prisma.task.findMany({
      where: { ...accessWhere, assigneeId: userId, status: "DONE", updatedAt: { gte: start, lt: end } },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.comment.findMany({
      where: { authorId: userId, createdAt: { gte: start, lt: end }, task: accessWhere },
      select: { id: true, body: true, createdAt: true, task: { select: { id: true, title: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({
    date,
    user,
    completed: completedTasks,
    updates: comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt, taskId: c.task.id, taskTitle: c.task.title })),
  });
}
