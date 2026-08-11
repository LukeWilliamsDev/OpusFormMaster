const STAFF_ROLES = ["admin", "dispatcher"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function getBearerToken(authHeader: string | null): string | null {
  const match = authHeader?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function isStaffRole(role: unknown): role is StaffRole {
  return typeof role === "string" && STAFF_ROLES.includes(role as StaffRole);
}
