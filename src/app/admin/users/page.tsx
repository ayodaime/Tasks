import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminUsersTable from "@/components/AdminUsersTable";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Manage Staff</h1>
      <AdminUsersTable currentUserId={session.user.id} />
    </div>
  );
}
