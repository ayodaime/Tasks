import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A user can mark their own account "hidden" (Manage Staff) to keep it out
  // of everyone else's assignee/manager dropdowns and staff lists — but not
  // out of their own: hidden or not, you can always see and pick yourself.
  // Admins still see hidden accounts, including each other's.
  const users = await prisma.user.findMany({
    where: session.user.role === "ADMIN" ? {} : { OR: [{ hidden: false }, { id: session.user.id }] },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      hidden: true,
      subteams: { select: { team: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users.map((u) => ({ ...u, subteams: u.subteams.map((s) => s.team) })));
}
