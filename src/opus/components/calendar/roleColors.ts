export interface RoleColorClasses {
  lightBg: string;
  border: string;
  text: string;
}

// Role colours are muted semantic tokens rather than pastel fills. The token
// values change with the light/dark theme in styles.css, so role identity stays
// stable without duplicating theme-specific utility classes.
const PALETTES: RoleColorClasses[] = [
  {
    lightBg: "bg-role-teal/12",
    border: "border-role-teal/35",
    text: "text-role-teal",
  },
  {
    lightBg: "bg-role-ochre/12",
    border: "border-role-ochre/35",
    text: "text-role-ochre",
  },
  {
    lightBg: "bg-role-plum/12",
    border: "border-role-plum/35",
    text: "text-role-plum",
  },
  {
    lightBg: "bg-role-slate/12",
    border: "border-role-slate/35",
    text: "text-role-slate",
  },
  {
    lightBg: "bg-role-blue/12",
    border: "border-role-blue/35",
    text: "text-role-blue",
  },
  {
    lightBg: "bg-role-rose/12",
    border: "border-role-rose/35",
    text: "text-role-rose",
  },
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
