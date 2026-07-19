export type RoleCategory = "Concrete Crew" | "Logistics" | "Office & Admin" | "Other";

const ROLE_CATEGORY_MAP: Record<string, RoleCategory> = {
  "Concrete Finisher": "Concrete Crew",
  "Concrete Operative": "Concrete Crew",
  "Concrete Pour Supervisor": "Concrete Crew",
  "Concrete Pump Operator": "Concrete Crew",
  "Decking Assistant": "Concrete Crew",
  Ganger: "Concrete Crew",
  "General Construction Labourer": "Concrete Crew",
  "Telehandler Operator": "Concrete Crew",
  "Logistics and Operations Assistant": "Logistics",
  "Material Handler": "Logistics",
  Director: "Office & Admin",
  IT: "Office & Admin",
  "Inbound Sales Representative": "Office & Admin",
};

export const CATEGORY_ORDER: RoleCategory[] = [
  "Concrete Crew",
  "Logistics",
  "Office & Admin",
  "Other",
];

export const getRoleCategory = (role: string): RoleCategory => ROLE_CATEGORY_MAP[role] ?? "Other";

export const groupWorkersByCategory = <T>(
  items: T[],
  getRole: (item: T) => string,
): { category: RoleCategory; items: T[] }[] => {
  const buckets = new Map<RoleCategory, T[]>();
  for (const item of items) {
    const category = getRoleCategory(getRole(item));
    const bucket = buckets.get(category);
    if (bucket) bucket.push(item);
    else buckets.set(category, [item]);
  }
  return CATEGORY_ORDER.filter((category) => buckets.has(category)).map((category) => ({
    category,
    items: buckets.get(category)!,
  }));
};
