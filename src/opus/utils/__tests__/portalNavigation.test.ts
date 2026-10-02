import { describe, expect, it } from "vitest";
import {
  getMobilePortalNavItems,
  INTERNAL_MOBILE_NAV_ITEMS,
  isPortalNavItemActive,
  THIRD_PARTY_MOBILE_NAV_ITEMS,
} from "../portalNavigation";

const MANAGEMENT_ROLES = [
  "admin",
  "director",
  "logistics_coordinator",
  "logistics_assistant",
] as const;

describe("getMobilePortalNavItems", () => {
  it.each(MANAGEMENT_ROLES)("gives %s the internal navigation", (role) => {
    expect(getMobilePortalNavItems(role, MANAGEMENT_ROLES)).toEqual(INTERNAL_MOBILE_NAV_ITEMS);
  });

  it("gives third-party users the partner navigation", () => {
    expect(getMobilePortalNavItems("third_party", MANAGEMENT_ROLES)).toEqual(
      THIRD_PARTY_MOBILE_NAV_ITEMS,
    );
  });

  it.each(["site_foreman", "labourer", null])("does not give %s a portal navigation", (role) => {
    expect(getMobilePortalNavItems(role, MANAGEMENT_ROLES)).toEqual([]);
  });
});

describe("isPortalNavItemActive", () => {
  it("keeps the internal roster tabs distinct", () => {
    expect(
      isPortalNavItemActive("/portal/roster", "?view=calendar", "/portal/roster?view=calendar"),
    ).toBe(true);
    expect(
      isPortalNavItemActive("/portal/roster", "?view=calendar", "/portal/roster?view=staff"),
    ).toBe(false);
    expect(isPortalNavItemActive("/portal/roster", "", "/portal/roster?view=calendar")).toBe(true);
  });

  it("keeps the staff tab active for new and detail routes", () => {
    const staffPath = "/portal/third-party/staff";
    expect(isPortalNavItemActive(staffPath, "", staffPath)).toBe(true);
    expect(isPortalNavItemActive(`${staffPath}/new`, "", staffPath)).toBe(true);
    expect(isPortalNavItemActive(`${staffPath}/staff-1`, "", staffPath)).toBe(true);
    expect(isPortalNavItemActive("/portal/third-party/staff-archive", "", staffPath)).toBe(false);
  });

  it("keeps the sites tab active for site and legacy job detail routes", () => {
    const sitesPath = "/portal/third-party/sites";
    expect(isPortalNavItemActive(sitesPath, "", sitesPath)).toBe(true);
    expect(isPortalNavItemActive(`${sitesPath}/job-1`, "", sitesPath)).toBe(true);
    expect(isPortalNavItemActive("/portal/third-party/jobs/job-1", "", sitesPath)).toBe(true);
    expect(isPortalNavItemActive("/portal/third-party/sites-archive", "", sitesPath)).toBe(false);
  });

  it("does not make the home tab active for child routes", () => {
    expect(isPortalNavItemActive("/portal/third-party/staff", "", "/portal/third-party")).toBe(
      false,
    );
  });
});
