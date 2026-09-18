// A person's "groups" are the leaf-level scoping units (TASK_GROUPS) they
// actually belong to: their single department, unless that department is
// Digital Marketing, in which case it's their chosen sub-team(s) instead.
export function userGroups(user: { department?: string | null; subteams?: string[] | null }): string[] {
  if (user.department === "DIGITAL_MARKETING") return user.subteams ?? [];
  if (user.department) return [user.department];
  return [];
}

export function groupsOverlap(a: string[], b: string[]): boolean {
  return a.some((g) => b.includes(g));
}
