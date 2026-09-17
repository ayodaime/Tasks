import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-brand-700">
            Company Tasks
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <Link href="/" className="hover:text-brand-600">
              Dashboard
            </Link>
            <Link href="/tasks" className="hover:text-brand-600">
              All Tasks
            </Link>
            <Link href="/tasks/new" className="hover:text-brand-600">
              New Task
            </Link>
            {session.user.role === "ADMIN" && (
              <Link href="/admin/users" className="hover:text-brand-600">
                Manage Staff
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">
            {session.user?.name} <span className="text-slate-400">({session.user?.role})</span>
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
