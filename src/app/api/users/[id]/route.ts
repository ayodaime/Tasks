import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEPARTMENTS, USER_ROLES } from "@/lib/constants";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can edit staff." }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { role?: string; department?: string | null } = {};

  if ("role" in (body ?? {})) {
    if (id === session.user.id) {
      return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
    }
    if (!(USER_ROLES as readonly string[]).includes(body.role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    data.role = body.role;
  }

  if ("department" in (body ?? {})) {
    if (!(DEPARTMENTS as readonly string[]).includes(body.department)) {
      return NextResponse.json({ error: "Invalid department." }, { status: 400 });
    }
    data.department = body.department;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, department: true },
  });

  return NextResponse.json(user);
}
