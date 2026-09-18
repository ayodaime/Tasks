export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// OFFICER: base role, works on assigned tasks only.
// SUPERVISOR / MANAGER: equivalent tiers that can create and assign tasks
// within their own department.
// ADMIN: full access across departments; never self-selectable at
// registration, only granted via Manage Staff (or automatically to the
// very first account created).
export const USER_ROLES = ["OFFICER", "SUPERVISOR", "MANAGER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Roles someone can pick for themselves when registering.
export const REGISTRATION_ROLES = ["MANAGER", "SUPERVISOR", "OFFICER"] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  OFFICER: "Officer",
  SUPERVISOR: "Supervisor",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export const DEPARTMENTS = [
  "ADMINISTRATION",
  "CUSTOMER_SERVICE",
  "DIGITAL_MARKETING",
  "SEO",
  "PR",
  "HR",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  ADMINISTRATION: "Admin",
  CUSTOMER_SERVICE: "Customer Service",
  DIGITAL_MARKETING: "Digital Marketing",
  SEO: "SEO",
  PR: "PR",
  HR: "HR",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  BLOCKED: "bg-red-100 text-red-700",
  DONE: "bg-green-100 text-green-700",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};
