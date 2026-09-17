import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEPARTMENTS, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { taskAccessWhere } from "@/lib/taskAccess";

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
  const department = searchParams.get("department");

  const where: Record<string, unknown> = { ...taskAccessWhere(session.user) };
  if (status && (TASK_STATUSES as readonly string[]).includes(status)) where.status = status;
  if (priority && (TASK_PRIORITIES as readonly string[]).includes(priority)) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (managerId) where.managerId = managerId;
  // Only admins are unrestricted, so a department filter only makes sense
  // (and is only exposed in the UI) for them; non-admins are already scoped.
  if (department && session.user.role === "ADMIN" && (DEPARTMENTS as readonly string[]).includes(department)) {
    where.department = department;
  }

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

  // Admins place a task in any department; everyone else's tasks are
  // implicitly scoped to their own department, so it's never editable here.
  let department: string;
  if (session.user.role === "ADMIN") {
    const requested = typeof body?.department === "string" ? body.department : "";
    if (!(DEPARTMENTS as readonly string[]).includes(requested)) {
      return NextResponse.json({ error: "Select a valid department." }, { status: 400 });
    }
    department = requested;
  } else {
    if (!session.user.department) {
      return NextResponse.json(
        { error: "You don't have a department assigned yet. Ask an admin to set one before creating tasks." },
        { status: 400 }
      );
    }
    department = session.user.department;
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      department,
      assigneeId,
      managerId,
      dueDate,
      createdById: session.user.id,
    },
    include: taskListInclude,
  });

  return NextResponse.json(task, { status: 201 });
}
