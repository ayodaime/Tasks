import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTask } from "@/lib/taskAccess";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, include: { groups: { select: { group: true } } } });
  if (!task || !canAccessTask(task, session.user)) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });

  const comment = await prisma.comment.create({
    data: {
      body: text,
      taskId: id,
      authorId: session.user.id,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
