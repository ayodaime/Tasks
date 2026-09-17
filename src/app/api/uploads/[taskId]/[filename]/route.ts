import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile, stat } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { UPLOAD_ROOT } from "@/lib/uploads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string; filename: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, filename } = await params;

  // Reject anything that could escape the task's upload directory.
  const safeTaskId = path.basename(taskId);
  const safeFilename = path.basename(filename);
  if (safeTaskId !== taskId || safeFilename !== filename) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_ROOT, safeTaskId, safeFilename);

  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Disposition": `inline; filename="${safeFilename.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
