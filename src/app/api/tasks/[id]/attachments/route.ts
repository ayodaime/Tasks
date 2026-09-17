import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UPLOAD_ROOT } from "@/lib/uploads";
import { canAccessTask } from "@/lib/taskAccess";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || !canAccessTask(task, session.user)) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is larger than 10MB." }, { status: 400 });
  }

  const taskDir = path.join(UPLOAD_ROOT, id);
  await mkdir(taskDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  const storedName = `${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(taskDir, storedName), buffer);

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.name,
      filepath: `/api/uploads/${id}/${storedName}`,
      size: file.size,
      taskId: id,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(attachment, { status: 201 });
}
