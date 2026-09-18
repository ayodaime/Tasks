"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Avatar from "@/components/Avatar";
import SignOutButton from "@/components/SignOutButton";
import {
  DEPARTMENT_LABELS,
  DIGITAL_MARKETING_TEAM_LABELS,
  ROLE_LABELS,
  type Department,
  type DigitalMarketingTeam,
  type UserRole,
} from "@/lib/constants";

const BASE_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/tasks", label: "All Tasks" },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const links = [...BASE_LINKS];
  // Task creation/assignment is a supervisor+ responsibility; officers track
  // and update the tasks they're given, but don't create or hand out new ones.
  if (session.user.role !== "OFFICER") {
    links.push({ href: "/tasks/new", label: "New Task" });
  }
  if (session.user.role === "ADMIN") {
    links.push({ href: "/admin/users", label: "Manage Staff" });
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-4 py-5">
        <Link href="/" className="inline-block overflow-hidden rounded-lg">
          <Image src="/ilotbet-logo.png" alt="iLOTBET" width={440} height={115} className="h-9 w-auto" priority />
        </Link>
        <p className="mt-1.5 text-xs font-medium text-slate-400">Task Tracker</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const className = `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`;
          // Plain <a> for /tasks/new: Next's client-side Link would trigger the
          // @modal intercepting route for /tasks/[id], mistaking "new" for a
          // task id. A full navigation bypasses interception entirely.
          if (link.href === "/tasks/new") {
            return (
              <a key={link.href} href={link.href} className={className}>
                {link.label}
              </a>
            );
          }
          return (
            <Link key={link.href} href={link.href} className={className}>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 px-1 py-2">
          <Avatar name={session.user?.name ?? "?"} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{session.user?.name}</p>
            <p className="truncate text-xs text-slate-400">
              {ROLE_LABELS[session.user.role as UserRole] ?? session.user.role}
              {session.user.department &&
                ` · ${DEPARTMENT_LABELS[session.user.department as Department] ?? session.user.department}`}
              {session.user.department === "DIGITAL_MARKETING" &&
                session.user.subteams.length > 0 &&
                ` (${session.user.subteams
                  .map((t) => DIGITAL_MARKETING_TEAM_LABELS[t as DigitalMarketingTeam] ?? t)
                  .join(", ")})`}
            </p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
