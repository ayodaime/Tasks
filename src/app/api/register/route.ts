import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEPARTMENTS, REGISTRATION_ROLES } from "@/lib/constants";

function isAllowedDomain(email: string): boolean {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS?.trim();
  if (!raw) return true;

  const domains = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return true;

  const emailDomain = email.split("@")[1]?.toLowerCase();
  return !!emailDomain && domains.includes(emailDomain);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const department = typeof body?.department === "string" ? body.department : "";
  const requestedRole = typeof body?.role === "string" ? body.role : "";

  if (!name || !email || !password || !department || !requestedRole) {
    return NextResponse.json(
      { error: "Name, email, password, department, and role are required." },
      { status: 400 }
    );
  }

  if (!(DEPARTMENTS as readonly string[]).includes(department)) {
    return NextResponse.json({ error: "Select a valid department." }, { status: 400 });
  }

  // ADMIN is granted, never self-selected (except automatically for the
  // very first account, below).
  if (!(REGISTRATION_ROLES as readonly string[]).includes(requestedRole)) {
    return NextResponse.json({ error: "Select a valid role." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!isAllowedDomain(email)) {
    return NextResponse.json(
      { error: "Please register with your office email address." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const userCount = await prisma.user.count();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      department,
      // First person to register becomes admin so someone can manage the team.
      role: userCount === 0 ? "ADMIN" : requestedRole,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
