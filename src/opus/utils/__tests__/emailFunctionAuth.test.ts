import { describe, expect, test } from "vitest";
import { getBearerToken, isStaffRole } from "../../../../supabase/functions/_shared/auth";

describe("email function authorization helpers", () => {
  test("requires a well-formed bearer token", () => {
    expect(getBearerToken(null)).toBeNull();
    expect(getBearerToken("")).toBeNull();
    expect(getBearerToken("Basic abc")).toBeNull();
    expect(getBearerToken("Bearer")).toBeNull();
    expect(getBearerToken("Bearer ")).toBeNull();
    expect(getBearerToken("Bearer user-jwt")).toBe("user-jwt");
    expect(getBearerToken("bearer user-jwt")).toBe("user-jwt");
  });

  test("only permits administrative staff roles", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("dispatcher")).toBe(true);
    expect(isStaffRole("operative")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });
});
