// Non-admins can only see a task if it belongs to their own department, or
// they're personally tied to it (assignee, manager in charge, or creator) —
// this keeps cross-assigned tasks visible even when a manager or admin
// assigned someone outside the task's department. Admins see everything.

type SessionUser = { id: string; role: string; department: string | null };

type TaskLike = {
  department: string | null;
  assigneeId: string | null;
  managerId: string | null;
  createdById: string;
};

export function taskAccessWhere(user: SessionUser) {
  if (user.role === "ADMIN") return {};

  return {
    OR: [
      ...(user.department ? [{ department: user.department }] : []),
      { assigneeId: user.id },
      { managerId: user.id },
      { createdById: user.id },
    ],
  };
}

export function canAccessTask(task: TaskLike, user: SessionUser): boolean {
  if (user.role === "ADMIN") return true;
  if (user.department && task.department === user.department) return true;
  if (task.assigneeId === user.id) return true;
  if (task.managerId === user.id) return true;
  if (task.createdById === user.id) return true;
  return false;
}
