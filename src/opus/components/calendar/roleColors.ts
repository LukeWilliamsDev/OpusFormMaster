export interface RoleColorClasses {
  lightBg: string;
  border: string;
  text: string;
}

const PALETTES: RoleColorClasses[] = [
  { lightBg: "bg-sky-500/10", border: "border-sky-800/40", text: "text-sky-400" },
  { lightBg: "bg-amber-500/10", border: "border-amber-800/40", text: "text-amber-400" },
  { lightBg: "bg-purple-500/10", border: "border-purple-800/40", text: "text-purple-400" },
  { lightBg: "bg-teal-500/10", border: "border-teal-800/40", text: "text-teal-400" },
  { lightBg: "bg-indigo-500/10", border: "border-indigo-800/40", text: "text-indigo-400" },
  { lightBg: "bg-fuchsia-500/10", border: "border-fuchsia-800/40", text: "text-fuchsia-400" },
];

// Roles are free-text job titles, not a fixed enum, and there are too few of
// them for a hash to reliably avoid collisions. Assign colors by first-seen
// order instead, so distinct roles never share a color until the palette
// (6 colors) is exhausted.
const assignedColors = new Map<string, RoleColorClasses>();

export const getRoleColorClasses = (role: string): RoleColorClasses => {
  let color = assignedColors.get(role);
  if (!color) {
    color = PALETTES[assignedColors.size % PALETTES.length];
    assignedColors.set(role, color);
  }
  return color;
};
