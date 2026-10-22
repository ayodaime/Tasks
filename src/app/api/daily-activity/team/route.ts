import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskAccessWhere } from "@/lib/taskAccess";
import { userGroups, groupsOverlap } from "@/lib/groups";

// A manager/supervisor/admin pulling one day's activity for everyone on
// their team at once — same four sources as the single-person endpoint
// (completed tasks, task comments, notes, next-day plans), just run per
// team member. "Team" means: for a manager/supervisor, everyone sharing at
// least one of their own groups (same as every other team-scoped picker in
// the app); for an admin, every non-hidden member of staff, since admins
// aren't on a single team themselves.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["MANAGER", "SUPERVISOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Only managers, supervisors, and admins can do this." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const isAdmin = session.user.role === "ADMIN";
  const allUsers = await prisma.user.findMany({
    where: isAdmin ? {} : { hidden: false },
    include: { subteams: true },
    orderBy: { name: "asc" },
  });

  const ownGroups = userGroups(session.user);
  const teamMembers = isAdmin
    ? allUsers
    : allUsers.filter((u) => groupsOverlap(userGroups({ department: u.department, subteams: u.subteams.map((s) => s.team) }), ownGroups));

  const accessWhere = taskAccessWhere(session.user);

  const results = await Promise.all(
    teamMembers.map(async (member) => {
      const [completed, comments, notes, plans] = await Promise.all([
        prisma.task.findMany({
          where: { ...accessWhere, assigneeId: member.id, status: "DONE", updatedAt: { gte: start, lt: end } },
          select: { id: true, title: true, updatedAt: true },
          orderBy: { updatedAt: "asc" },
        }),
        prisma.comment.findMany({
          where: { authorId: member.id, createdAt: { gte: start, lt: end }, task: accessWhere },
          select: { id: true, body: true, createdAt: true, task: { select: { id: true, title: true } } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.dailyNote.findMany({
          where: { authorId: member.id, kind: "LOG", createdAt: { gte: start, lt: end } },
          select: { id: true, body: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.dailyNote.findMany({
          where: { authorId: member.id, kind: "PLAN", forDate: date },
          select: { id: true, body: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      return {
        user: { id: member.id, name: member.name },
        completed,
        updates: comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt, taskId: c.task.id, taskTitle: c.task.title })),
        notes,
        plans,
      };
    })
  );

  return NextResponse.json({ date, members: results });
}
