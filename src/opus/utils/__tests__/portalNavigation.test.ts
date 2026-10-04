import { describe, expect, it } from "vitest";
import {
  findActivePortalNavigation,
  getPortalNavigationGroups,
  getPortalSearchItems,
  getPortalSecondaryNavigation,
  getPortalWorkspaces,
  isPortalNavItemActive,
} from "../portalNavigation";

describe("getPortalWorkspaces", () => {
  it("gives management users Operations and Partners workspaces", () => {
    const workspaces = getPortalWorkspaces("logistics_coordinator");
    expect(workspaces.map((workspace) => workspace.id)).toEqual(["operations", "partners"]);
    expect(workspaces[0].items.map((item) => item.label)).toEqual([
      "Overview",
      "Jobs",
      "Schedule",
      "Staff",
      "Quotes & invoices",
      "Certificate checker",
    ]);
  });

  it("keeps governance and approval access capability-aware", () => {
    expect(getPortalWorkspaces("logistics_assistant").map((workspace) => workspace.id)).toEqual([
      "operations",
    ]);
    expect(getPortalWorkspaces("admin").map((workspace) => workspace.id)).toEqual([
      "operations",
      "partners",
      "administration",
    ]);
  });

  it("gives foremen and third-party users focused workspaces", () => {
    expect(getPortalWorkspaces("site_foreman").map((workspace) => workspace.id)).toEqual(["field"]);
    expect(getPortalWorkspaces("third_party").map((workspace) => workspace.id)).toEqual([
      "partners",
    ]);
  });

  it.each(["labourer", null])("does not give %s a navigation workspace", (role) => {
    expect(getPortalWorkspaces(role).length).toBe(0);
  });
});

describe("complete navigation groups", () => {
  it("keeps every normal management destination in the full sitemap", () => {
    const groups = getPortalNavigationGroups("logistics_assistant");
    expect(groups.map((group) => group.label)).toEqual(["Operations"]);
    expect(groups[0].items.map((item) => item.label)).toEqual([
      "Overview",
      "Jobs",
      "Schedule",
      "Staff",
      "Quotes & invoices",
      "Certificate checker",
    ]);
  });

  it("keeps partner and administration destinations as peer groups", () => {
    expect(getPortalNavigationGroups("admin").map((group) => group.label)).toEqual([
      "Operations",
      "Partners",
      "Administration",
    ]);
    expect(getPortalNavigationGroups("third_party")[0].items.map((item) => item.label)).toEqual([
      "Overview",
      "Staff",
      "Sites",
    ]);
  });

  it("indexes support destinations without replacing normal navigation", () => {
    const results = getPortalSearchItems("site_foreman");
    expect(results.some((item) => item.label === "Help")).toBe(true);
    expect(results.some((item) => item.label === "Contact")).toBe(true);
    expect(results.some((item) => item.label === "Policies & legal")).toBe(true);
  });
});

describe("isPortalNavItemActive", () => {
  const planning = getPortalWorkspaces("logistics_coordinator")[0].items.find(
    (item) => item.id === "planning",
  )!;
  const work = getPortalWorkspaces("logistics_coordinator")[0].items.find(
    (item) => item.id === "work",
  )!;
  const partnerSites = getPortalWorkspaces("third_party")[0].items.find(
    (item) => item.id === "partner-sites",
  )!;

  it("keeps schedule and people query views distinct", () => {
    expect(isPortalNavItemActive("/portal/roster", "?view=calendar", planning)).toBe(true);
    expect(isPortalNavItemActive("/portal/roster", "?view=staff", planning)).toBe(false);
  });

  it("keeps work active for job details and planning active for calendar view", () => {
    expect(isPortalNavItemActive("/portal/ledger", "?jobId=job-1", work)).toBe(true);
    expect(isPortalNavItemActive("/portal/calendar", "", planning)).toBe(true);
  });

  it("keeps the commercial section active for quote builder flows", () => {
    const commercial = getPortalWorkspaces("logistics_coordinator")[0].items.find(
      (item) => item.id === "commercial",
    )!;
    expect(
      isPortalNavItemActive("/portal/pipeline", "?view=quote-builder&quoteId=quote-1", commercial),
    ).toBe(true);
  });

  it("keeps policy pages active in Administration", () => {
    const policies = getPortalWorkspaces("admin")
      .find((workspace) => workspace.id === "administration")!
      .items.find((item) => item.id === "policies")!;
    expect(isPortalNavItemActive("/portal/legal", "", policies)).toBe(true);
    expect(isPortalNavItemActive("/portal/policies/privacy", "", policies)).toBe(true);
    expect(isPortalNavItemActive("/portal/privacy", "", policies)).toBe(true);
  });

  it("keeps partner sites active for detail and legacy job routes", () => {
    expect(isPortalNavItemActive("/portal/third-party/sites/site-1", "", partnerSites)).toBe(true);
    expect(isPortalNavItemActive("/portal/third-party/jobs/site-1", "", partnerSites)).toBe(true);
    expect(isPortalNavItemActive("/portal/third-party/sites-archive", "", partnerSites)).toBe(
      false,
    );
  });
});

describe("findActivePortalNavigation and search", () => {
  it("exposes the complete role-filtered destination groups", () => {
    expect(
      getPortalSecondaryNavigation("logistics_coordinator").map((group) => group.label),
    ).toEqual(["Operations", "Partners"]);
    expect(getPortalSecondaryNavigation("admin").map((group) => group.label)).toEqual([
      "Operations",
      "Partners",
      "Administration",
    ]);
    expect(getPortalSecondaryNavigation("site_foreman").map((group) => group.label)).toEqual([
      "Field",
    ]);
    expect(getPortalSecondaryNavigation("third_party").map((group) => group.label)).toEqual([
      "Partners",
    ]);
  });

  it("returns the workspace and item for a deep link", () => {
    const result = findActivePortalNavigation(
      "logistics_coordinator",
      "/portal/ledger",
      "?jobId=1",
    );
    expect(result.workspace?.id).toBe("operations");
    expect(result.item?.id).toBe("work");
  });

  it("exposes aliases while keeping results permission-filtered", () => {
    const assistantResults = getPortalSearchItems("logistics_assistant");
    expect(assistantResults.some((item) => item.label === "Schedule")).toBe(true);
    expect(assistantResults.some((item) => item.label === "Partner submissions")).toBe(false);
    expect(assistantResults.some((item) => item.label === "Certificate checker")).toBe(true);
    expect(assistantResults.some((item) => item.aliases?.includes("calendar"))).toBe(true);
  });
});
