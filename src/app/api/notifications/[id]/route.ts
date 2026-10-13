import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== session.user.id) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const read = typeof body?.read === "boolean" ? body.read : true;

  const updated = await prisma.notification.update({ where: { id }, data: { read } });
  return NextResponse.json(updated);
}
