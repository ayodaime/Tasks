import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TASK_GROUPS, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { taskAccessWhere } from "@/lib/taskAccess";
import { userGroups, groupsOverlap } from "@/lib/groups";

const taskListInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  manager: { select: { id: true, name: true, email: true } },
  groups: { select: { group: true } },
  _count: { select: { comments: true, attachments: true } },
} as const;

function serializeTask<T extends { groups: { group: string }[] }>(task: T) {
  return { ...task, groups: task.groups.map((g) => g.group) };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeId = searchParams.get("assigneeId");
  const managerId = searchParams.get("managerId");
  const group = searchParams.get("group");

  const where: Record<string, unknown> = { ...taskAccessWhere(session.user) };
  if (status && (TASK_STATUSES as readonly string[]).includes(status)) where.status = status;
  if (priority && (TASK_PRIORITIES as readonly string[]).includes(priority)) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (managerId) where.managerId = managerId;
  // Only admins are unrestricted, so a team filter only makes sense (and is
  // only exposed in the UI) for them; non-admins are already scoped.
  if (group && session.user.role === "ADMIN" && (TASK_GROUPS as readonly string[]).includes(group)) {
    where.groups = { some: { group } };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: taskListInclude,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks.map(serializeTask));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "OFFICER") {
    return NextResponse.json({ error: "Only supervisors, managers, and admins can create tasks." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const priority = typeof body?.priority === "string" ? body.priority : "MEDIUM";
  const assigneeId = typeof body?.assigneeId === "string" && body.assigneeId ? body.assigneeId : null;
  const managerId = typeof body?.managerId === "string" && body.managerId ? body.managerId : null;
  const dueDate = typeof body?.dueDate === "string" && body.dueDate ? new Date(body.dueDate) : null;

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!(TASK_PRIORITIES as readonly string[]).includes(priority)) {
    return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
  }

  const rawGroups: unknown[] = Array.isArray(body?.groups) ? body.groups : [];
  const requestedGroups: string[] = [...new Set(rawGroups.filter((g): g is string => typeof g === "string"))];
  if (!requestedGroups.every((g) => (TASK_GROUPS as readonly string[]).includes(g))) {
    return NextResponse.json({ error: "Invalid team." }, { status: 400 });
  }

  let groups: string[];
  if (session.user.role === "ADMIN") {
    groups = requestedGroups;
  } else {
    // Non-admins can only tag a task with team(s) they're actually on.
    const ownGroups = userGroups(session.user);
    if (ownGroups.length === 0) {
      return NextResponse.json(
        { error: "You don't have a team assigned yet. Ask an admin to set one before creating tasks." },
        { status: 400 }
      );
    }
    if (requestedGroups.length === 0 || !requestedGroups.every((g) => ownGroups.includes(g))) {
      return NextResponse.json({ error: "Select only your own team(s)." }, { status: 400 });
    }
    groups = requestedGroups;
  }

  // Non-admins can only hand a task to someone who shares one of its teams,
  // and can only name a manager in charge who shares one too — since
  // visibility is strictly by team, someone with no overlap couldn't even
  // see a task they were put in charge of. Admins are unrestricted on both.
  if (session.user.role !== "ADMIN") {
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, include: { subteams: true } });
      if (!assignee || !groupsOverlap(userGroups({ department: assignee.department, subteams: assignee.subteams.map((s) => s.team) }), groups)) {
        return NextResponse.json(
          { error: "You can only assign tasks to members of your own team." },
          { status: 400 }
        );
      }
    }
    if (managerId) {
      const manager = await prisma.user.findUnique({ where: { id: managerId }, include: { subteams: true } });
      if (!manager || !groupsOverlap(userGroups({ department: manager.department, subteams: manager.subteams.map((s) => s.team) }), groups)) {
        return NextResponse.json(
          { error: "You can only put a manager from your own team in charge." },
          { status: 400 }
        );
      }
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      assigneeId,
      managerId,
      dueDate,
      createdById: session.user.id,
      groups: { create: groups.map((group) => ({ group })) },
    },
    include: taskListInclude,
  });

  return NextResponse.json(serializeTask(task), { status: 201 });
}
