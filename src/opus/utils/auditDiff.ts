const IGNORED_FIELDS = ["id", "created_at", "updated_at", "tenant_id"];

export interface DiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

export function computeDiff(oldVal: unknown, newVal: unknown): DiffEntry[] {
  if (!oldVal || !newVal || typeof oldVal !== "object" || typeof newVal !== "object") return [];
  const oldObj = oldVal as Record<string, unknown>;
  const newObj = newVal as Record<string, unknown>;

  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

  return allKeys
    .filter((key) => !IGNORED_FIELDS.includes(key))
    .filter((key) => {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      // Quick comparison for simple types and array/objects
      return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    })
    .map((key) => ({
      field: key,
      before: oldObj[key],
      after: newObj[key],
    }));
}
