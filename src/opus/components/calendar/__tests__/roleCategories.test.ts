import { describe, it, expect } from "vitest";
import { getRoleCategory, groupWorkersByCategory, CATEGORY_ORDER } from "../roleCategories";

describe("getRoleCategory", () => {
  it("maps a known Concrete Crew role", () => {
    expect(getRoleCategory("Concrete Operative")).toBe("Concrete Crew");
  });

  it("maps a known Logistics role", () => {
    expect(getRoleCategory("Material Handler")).toBe("Logistics");
  });

  it("maps a known Office & Admin role", () => {
    expect(getRoleCategory("Director")).toBe("Office & Admin");
  });

  it("falls back to Other for an unmapped role", () => {
    expect(getRoleCategory("Some Future Role")).toBe("Other");
  });
});

describe("groupWorkersByCategory", () => {
  interface Item {
    role: string;
  }
  const getRole = (item: Item) => item.role;

  it("buckets items into their category and preserves CATEGORY_ORDER", () => {
    const items: Item[] = [
      { role: "Director" },
      { role: "Concrete Operative" },
      { role: "Material Handler" },
    ];
    const groups = groupWorkersByCategory(items, getRole);
    expect(groups.map((g) => g.category)).toEqual(["Concrete Crew", "Logistics", "Office & Admin"]);
    expect(groups[0].items).toEqual([{ role: "Concrete Operative" }]);
    expect(groups[1].items).toEqual([{ role: "Material Handler" }]);
    expect(groups[2].items).toEqual([{ role: "Director" }]);
  });

  it("omits categories with zero items", () => {
    const items: Item[] = [{ role: "Concrete Operative" }];
    const groups = groupWorkersByCategory(items, getRole);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("Concrete Crew");
  });

  it("routes unmapped roles into Other", () => {
    const items: Item[] = [{ role: "Mystery Role" }];
    const groups = groupWorkersByCategory(items, getRole);
    expect(groups).toEqual([{ category: "Other", items: [{ role: "Mystery Role" }] }]);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupWorkersByCategory([], getRole)).toEqual([]);
  });

  it("CATEGORY_ORDER has the four categories in display order", () => {
    expect(CATEGORY_ORDER).toEqual(["Concrete Crew", "Logistics", "Office & Admin", "Other"]);
  });
});
