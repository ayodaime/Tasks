import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEPARTMENTS, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { canAccessTask } from "@/lib/taskAccess";

const taskDetailInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  manager: { select: { id: true, name: true, email: true } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: { author: { select: { id: true, name: true, email: true } } },
  },
  attachments: {
    orderBy: { createdAt: "asc" as const },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
  },
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskDetailInclude,
  });

  if (!task || !canAccessTask(task, session.user)) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || !canAccessTask(existing, session.user)) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

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
  if ("department" in (body ?? {})) {
    // Moving a task to another department is an org-structure change, not a
    // day-to-day edit, and could cut off the current viewer's own access —
    // reserve it for admins, who see every department regardless.
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can change a task's department." }, { status: 403 });
    }
    if (!(DEPARTMENTS as readonly string[]).includes(body.department)) {
      return NextResponse.json({ error: "Invalid department." }, { status: 400 });
    }
    data.department = body.department;
  }
  if ("assigneeId" in (body ?? {})) data.assigneeId = body.assigneeId || null;
  if ("managerId" in (body ?? {})) data.managerId = body.managerId || null;
  if ("dueDate" in (body ?? {})) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const task = await prisma.task.update({
    where: { id },
    data,
    include: taskDetailInclude,
  });

  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || !canAccessTask(task, session.user)) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const isPrivileged = session.user.role === "ADMIN" || session.user.role === "MANAGER";
  if (task.createdById !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: "You can't delete this task." }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
