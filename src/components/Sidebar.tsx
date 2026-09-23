"use client";

import { useState } from "react";
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

function NavIcon({ href, className }: { href: string; className?: string }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, className };
  if (href === "/") {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    );
  }
  if (href === "/tasks") {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    );
  }
  if (href === "/tasks/new") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8.5" />
        <path strokeLinecap="round" d="M12 8.5v7M8.5 12h7" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19c.6-3 2.7-5 5.5-5s4.9 2 5.5 5M16 8.5a2.7 2.7 0 1 0 0-5.4M17.5 14c2.3.3 4 2 4.5 4.5" />
    </svg>
  );
}

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!session) return null;

  const links = [...BASE_LINKS, { href: "/tasks/new", label: "New Task" }];
  if (session.user.role === "ADMIN") {
    links.push({ href: "/admin/users", label: "Manage Staff" });
  }

  const nav = (
    <>
      <div className="px-4 py-5">
        <Link href="/" className="inline-block overflow-hidden rounded-lg" onClick={() => setOpen(false)}>
          <Image src="/ilotbet-logo.png" alt="iLOTBET" width={440} height={115} className="h-9 w-auto" priority />
        </Link>
        <p className="mt-1.5 text-xs font-medium text-slate-400">Task Tracker</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const className = `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`;
          const content = (
            <>
              <NavIcon href={link.href} className={active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-500"} />
              {link.label}
            </>
          );
          // Plain <a> for /tasks/new: Next's client-side Link would trigger the
          // @modal intercepting route for /tasks/[id], mistaking "new" for a
          // task id. A full navigation bypasses interception entirely.
          if (link.href === "/tasks/new") {
            return (
              <a key={link.href} href={link.href} className={className} onClick={() => setOpen(false)}>
                {content}
              </a>
            );
          }
          return (
            <Link key={link.href} href={link.href} className={className} onClick={() => setOpen(false)}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-2">
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
    </>
  );

  return (
    <>
      {/* Mobile top bar: the full sidebar is off-canvas below md, reachable via this hamburger. */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/" className="inline-block overflow-hidden rounded-lg">
          <Image src="/ilotbet-logo.png" alt="iLOTBET" width={440} height={115} className="h-7 w-auto" priority />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 max-w-[80vw] flex-col bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
