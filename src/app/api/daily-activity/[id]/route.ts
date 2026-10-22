import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.dailyNote.findUnique({ where: { id } });
  // Only the person who wrote it can remove it, same as it's only ever
  // written in their own name to begin with.
  if (!note || note.authorId !== session.user.id) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  await prisma.dailyNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
