// Task visibility is strictly by group for everyone except admins: a
// non-admin sees a task only if it shares at least one group with them
// (their department, or their Digital Marketing sub-team(s)) — even being
// the assignee, manager in charge, or creator of a task with no shared group
// doesn't grant access. Only admins see across every team.
import { userGroups } from "@/lib/groups";

type SessionUser = { id: string; role: string; department: string | null; subteams?: string[] | null };

type TaskLike = {
  groups: { group: string }[];
};

export function taskAccessWhere(user: SessionUser) {
  if (user.role === "ADMIN") return {};
  const groups = userGroups(user);
  // No group yet means no tasks are visible until an admin assigns one.
  if (groups.length === 0) return { id: "__none__" };
  return { groups: { some: { group: { in: groups } } } };
}

export function canAccessTask(task: TaskLike, user: SessionUser): boolean {
  if (user.role === "ADMIN") return true;
  const groups = userGroups(user);
  return task.groups.some((g) => groups.includes(g.group));
}
