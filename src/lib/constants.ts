export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// OFFICER: base role; can create tasks within their own team, but can't
// reassign an existing task's assignee or manager in charge.
// SUPERVISOR / MANAGER: equivalent tiers that can create, assign, and
// reassign tasks within their own department.
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

// Digital Marketing has its own sub-teams; a Digital Marketing person belongs
// to one or more of these instead of the department as a whole, and can be on
// more than one (e.g. Online Branding + Offline Branding).
export const DIGITAL_MARKETING_TEAMS = [
  "DESIGN_TEAM",
  "ONLINE_BRANDING",
  "OFFLINE_BRANDING",
  "SOCIAL_MEDIA_TEAM",
] as const;
export type DigitalMarketingTeam = (typeof DIGITAL_MARKETING_TEAMS)[number];

export const DIGITAL_MARKETING_TEAM_LABELS: Record<DigitalMarketingTeam, string> = {
  DESIGN_TEAM: "Design Team",
  ONLINE_BRANDING: "Online Branding",
  OFFLINE_BRANDING: "Offline Branding",
  SOCIAL_MEDIA_TEAM: "Social Media",
};

// The actual scoping units used for task tagging and access control: every
// non-Digital-Marketing department, plus the 4 Digital Marketing sub-teams —
// never "DIGITAL_MARKETING" itself, since a Digital Marketing person or task
// is always scoped by specific sub-team(s). A task can be tagged with more
// than one of these at once.
export const TASK_GROUPS = [
  "ADMINISTRATION",
  "CUSTOMER_SERVICE",
  "SEO",
  "PR",
  "HR",
  ...DIGITAL_MARKETING_TEAMS,
] as const;
export type TaskGroupCode = (typeof TASK_GROUPS)[number];

export const TASK_GROUP_LABELS: Record<TaskGroupCode, string> = {
  ADMINISTRATION: "Admin",
  CUSTOMER_SERVICE: "Customer Service",
  SEO: "SEO",
  PR: "PR",
  HR: "HR",
  DESIGN_TEAM: "Digital Marketing – Design Team",
  ONLINE_BRANDING: "Digital Marketing – Online Branding",
  OFFLINE_BRANDING: "Digital Marketing – Offline Branding",
  SOCIAL_MEDIA_TEAM: "Digital Marketing – Social Media",
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

// Same hue family as STATUS_COLORS, sized for a small accent (a stat card's
// top border, a column header dot) rather than a full badge background.
export const STATUS_ACCENT: Record<TaskStatus, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  BLOCKED: "bg-red-500",
  DONE: "bg-green-500",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};
