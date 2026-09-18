// Task visibility is strictly by department for everyone except admins: a
// non-admin sees a task only if it belongs to their own department, full
// stop — even being the assignee, manager in charge, or creator of a task
// in another department doesn't grant access. Only admins see across teams.

type SessionUser = { id: string; role: string; department: string | null };

type TaskLike = {
  department: string | null;
};

export function taskAccessWhere(user: SessionUser) {
  if (user.role === "ADMIN") return {};
  // No department yet means no tasks are visible until an admin assigns one.
  return { department: user.department ?? "__none__" };
}

export function canAccessTask(task: TaskLike, user: SessionUser): boolean {
  if (user.role === "ADMIN") return true;
  return !!user.department && task.department === user.department;
}
