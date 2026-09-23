import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEPARTMENTS, DIGITAL_MARKETING_TEAMS, USER_ROLES } from "@/lib/constants";

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
  const data: { role?: string; department?: string | null; hidden?: boolean } = {};

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

  if ("hidden" in (body ?? {})) {
    if (typeof body.hidden !== "boolean") {
      return NextResponse.json({ error: "Invalid hidden value." }, { status: 400 });
    }
    data.hidden = body.hidden;
  }

  // Sub-teams only mean anything for Digital Marketing, and only ever apply
  // to the department this update leaves the person in (not necessarily the
  // department they were in before this request).
  const nextDepartment = "department" in (body ?? {}) ? data.department : target.department;
  let subteamsUpdate: string[] | undefined;

  if ("subteams" in (body ?? {})) {
    const requested: string[] = Array.isArray(body.subteams)
      ? body.subteams.filter((t: unknown) => typeof t === "string")
      : [];
    if (nextDepartment === "DIGITAL_MARKETING") {
      if (requested.length === 0 || !requested.every((t) => (DIGITAL_MARKETING_TEAMS as readonly string[]).includes(t))) {
        return NextResponse.json({ error: "Select at least one valid Digital Marketing team." }, { status: 400 });
      }
      subteamsUpdate = [...new Set(requested)];
    } else {
      subteamsUpdate = [];
    }
  } else if ("department" in (body ?? {})) {
    if (nextDepartment !== "DIGITAL_MARKETING") {
      // Moved out of Digital Marketing: any sub-teams they had no longer apply.
      subteamsUpdate = [];
    } else if (target.department !== "DIGITAL_MARKETING") {
      // Newly moved into Digital Marketing but no team was picked for them.
      return NextResponse.json({ error: "Select at least one Digital Marketing team." }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0 && subteamsUpdate === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const user = await prisma.$transaction(async (tx) => {
    if (subteamsUpdate !== undefined) {
      await tx.userSubteam.deleteMany({ where: { userId: id } });
      if (subteamsUpdate!.length > 0) {
        await tx.userSubteam.createMany({ data: subteamsUpdate!.map((team) => ({ userId: id, team })) });
      }
    }
    return tx.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        hidden: true,
        subteams: { select: { team: true } },
      },
    });
  });

  return NextResponse.json({ ...user, subteams: user.subteams.map((s) => s.team) });
}
