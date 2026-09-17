import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";

const taskListInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  manager: { select: { id: true, name: true, email: true } },
  _count: { select: { comments: true, attachments: true } },
} as const;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeId = searchParams.get("assigneeId");
  const managerId = searchParams.get("managerId");

  const where: Record<string, unknown> = {};
  if (status && (TASK_STATUSES as readonly string[]).includes(status)) where.status = status;
  if (priority && (TASK_PRIORITIES as readonly string[]).includes(priority)) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (managerId) where.managerId = managerId;

  const tasks = await prisma.task.findMany({
    where,
    include: taskListInclude,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      assigneeId,
      managerId,
      dueDate,
      createdById: session.user.id,
    },
    include: taskListInclude,
  });

  return NextResponse.json(task, { status: 201 });
}
