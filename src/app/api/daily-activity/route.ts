import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskAccessWhere } from "@/lib/taskAccess";
import { userGroups, groupsOverlap } from "@/lib/groups";

// What someone "did" (and planned) on a given day, from four sources merged
// into one feed: tasks they're the assignee on that moved to Done that day
// (the task's updatedAt is the closest signal we have to a completion time,
// since status changes aren't logged separately), progress comments they
// posted that day, free-form notes they wrote themselves (not tied to any
// task), and plans for that day written on an earlier day (matched by
// `forDate`, not `createdAt`). Tasks and comments are naturally scoped by
// taskAccessWhere, same as everywhere else in the app; notes/plans have no
// task to inherit that scoping from, so viewing someone else's is checked
// explicitly below.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || session.user.id;
  const dateParam = searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subteams: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (userId !== session.user.id && session.user.role !== "ADMIN") {
    const targetGroups = userGroups({ department: user.department, subteams: user.subteams.map((s) => s.team) });
    if (!groupsOverlap(userGroups(session.user), targetGroups)) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
  }

  const accessWhere = taskAccessWhere(session.user);

  const [completedTasks, comments, notes, plans] = await Promise.all([
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
    prisma.dailyNote.findMany({
      where: { authorId: userId, kind: "LOG", createdAt: { gte: start, lt: end } },
      select: { id: true, body: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dailyNote.findMany({
      where: { authorId: userId, kind: "PLAN", forDate: date },
      select: { id: true, body: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    date,
    user: { id: user.id, name: user.name },
    completed: completedTasks,
    updates: comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt, taskId: c.task.id, taskTitle: c.task.title })),
    notes,
    plans,
  });
}

// Writing a note (or a plan) for yourself. A "LOG" note is always for
// "right now" — there's no way to backdate one, which keeps it an honest
// log of what you did rather than something filled in after the fact. A
// "PLAN" note instead carries a `forDate` saying which future day it's
// for; the client only ever sends tomorrow's date, keeping this a
// next-day plan rather than an open-ended scheduler.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Note can't be empty." }, { status: 400 });

  const kind = body?.kind === "PLAN" ? "PLAN" : "LOG";
  let forDate: string | null = null;
  if (kind === "PLAN") {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    forDate = typeof body?.forDate === "string" && body.forDate === tomorrow ? body.forDate : tomorrow;
  }

  const note = await prisma.dailyNote.create({
    data: { body: text, authorId: session.user.id, kind, forDate },
    select: { id: true, body: true, createdAt: true },
  });

  return NextResponse.json(note, { status: 201 });
}
