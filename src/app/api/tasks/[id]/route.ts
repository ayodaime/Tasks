import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TASK_GROUPS, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { canAccessTask } from "@/lib/taskAccess";
import { userGroups, groupsOverlap } from "@/lib/groups";

const taskDetailInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  manager: { select: { id: true, name: true, email: true } },
  groups: { select: { group: true } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: { author: { select: { id: true, name: true, email: true } } },
  },
  attachments: {
    orderBy: { createdAt: "asc" as const },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
  },
};

function serializeTask<T extends { groups: { group: string }[] }>(task: T) {
  return { ...task, groups: task.groups.map((g) => g.group) };
}

async function memberGroups(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subteams: true } });
  if (!user) return [];
  return userGroups({ department: user.department, subteams: user.subteams.map((s) => s.team) });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskDetailInclude,
  });

  if (!task || !canAccessTask({ groups: task.groups }, session.user)) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  return NextResponse.json(serializeTask(task));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id }, include: { groups: { select: { group: true } } } });
  if (!existing || !canAccessTask({ groups: existing.groups }, session.user)) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  const existingGroups = existing.groups.map((g) => g.group);

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body?.description === "string") data.description = body.description.trim();
  if (typeof body?.status === "string") {
    if (!(TASK_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
  }
  if (typeof body?.priority === "string") {
    if (!(TASK_PRIORITIES as readonly string[]).includes(body.priority)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }
    data.priority = body.priority;
  }

  let newGroups: string[] | null = null;
  if ("groups" in (body ?? {})) {
    // Moving a task to other teams is an org-structure change, not a
    // day-to-day edit, and could cut off the current viewer's own access —
    // reserve it for admins, who see every team regardless.
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can change a task's team(s)." }, { status: 403 });
    }
    const rawGroups: unknown[] = Array.isArray(body.groups) ? body.groups : [];
    const requested: string[] = [...new Set(rawGroups.filter((g): g is string => typeof g === "string"))];
    if (!requested.every((g) => (TASK_GROUPS as readonly string[]).includes(g))) {
      return NextResponse.json({ error: "Invalid team." }, { status: 400 });
    }
    newGroups = requested;
  }

  const effectiveGroups = newGroups ?? existingGroups;

  if ("assigneeId" in (body ?? {})) {
    // Assigning is a manager/supervisor/admin decision, same as creating a task.
    if (session.user.role === "OFFICER") {
      return NextResponse.json({ error: "Only managers and admins can assign tasks." }, { status: 403 });
    }
    const newAssigneeId = body.assigneeId || null;
    // Non-admins can only hand a task to someone who shares one of its teams.
    // A non-admin can never have set `newGroups` above (that's admin-only),
    // so the task's existing teams are always the right ones to check against.
    if (newAssigneeId && session.user.role !== "ADMIN") {
      const groups = await memberGroups(newAssigneeId);
      if (groups.length === 0 || !groupsOverlap(groups, effectiveGroups)) {
        return NextResponse.json(
          { error: "You can only assign tasks to members of your own team." },
          { status: 400 }
        );
      }
    }
    data.assigneeId = newAssigneeId;
  }
  if ("managerId" in (body ?? {})) {
    // Naming a manager in charge is a manager/supervisor/admin decision too.
    if (session.user.role === "OFFICER") {
      return NextResponse.json({ error: "Only managers and admins can set who's in charge." }, { status: 403 });
    }
    const newManagerId = body.managerId || null;
    // A non-admin manager with no shared team couldn't even see this task
    // under the strict team-only visibility rule, so they can only be named
    // manager in charge of tasks that share one of their own teams.
    if (newManagerId && session.user.role !== "ADMIN") {
      const groups = await memberGroups(newManagerId);
      if (groups.length === 0 || !groupsOverlap(groups, effectiveGroups)) {
        return NextResponse.json(
          { error: "You can only put a manager from your own team in charge." },
          { status: 400 }
        );
      }
    }
    data.managerId = newManagerId;
  }
  if ("dueDate" in (body ?? {})) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const task = await prisma.$transaction(async (tx) => {
    if (newGroups !== null) {
      await tx.taskGroup.deleteMany({ where: { taskId: id } });
      if (newGroups!.length > 0) {
        await tx.taskGroup.createMany({ data: newGroups!.map((group) => ({ taskId: id, group })) });
      }
    }
    return tx.task.update({
      where: { id },
      data,
      include: taskDetailInclude,
    });
  });

  return NextResponse.json(serializeTask(task));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, include: { groups: { select: { group: true } } } });
  if (!task || !canAccessTask({ groups: task.groups }, session.user)) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const isPrivileged = ["ADMIN", "MANAGER", "SUPERVISOR"].includes(session.user.role);
  if (task.createdById !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: "You can't delete this task." }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
