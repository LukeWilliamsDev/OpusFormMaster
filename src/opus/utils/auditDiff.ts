const IGNORED_FIELDS = ['id', 'created_at', 'updated_at', 'user_id', 'user_email'];

export function computeDiff(oldObj: Record<string, any> | null | undefined, newObj: Record<string, any> | null | undefined) {
  if (!oldObj || !newObj) return [];
  
  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
  
  return allKeys
    .filter(key => !IGNORED_FIELDS.includes(key))
    .filter(key => {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      // Quick comparison for simple types and array/objects
      return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    })
    .map(key => ({
      field: key,
      before: oldObj[key],
      after: newObj[key]
    }));
}
