export interface RoleColorClasses {
  lightBg: string;
  border: string;
  text: string;
}

// Light-theme text uses -700 (not -600) and border uses /50 opacity (not /30) —
// WCAG AA needs ~4.5:1 against the --card cream (#FDFAF5), which -600/30 fell
// short of. See feedback_accessibility_contrast memory: staff have ADHD,
// autism, dyslexia, and astigmatism, so badges need to read at a glance, not
// on close inspection.
const PALETTES: RoleColorClasses[] = [
  {
    lightBg: "bg-sky-500/15 [.light-theme_&]:bg-sky-500/20",
    border: "border-sky-500/45 [.light-theme_&]:border-sky-700/70",
    text: "text-sky-300 [.light-theme_&]:text-sky-800",
  },
  {
    lightBg: "bg-amber-500/15 [.light-theme_&]:bg-amber-500/20",
    border: "border-amber-500/45 [.light-theme_&]:border-amber-700/70",
    text: "text-amber-300 [.light-theme_&]:text-amber-800",
  },
  {
    lightBg: "bg-purple-500/15 [.light-theme_&]:bg-purple-500/20",
    border: "border-purple-500/45 [.light-theme_&]:border-purple-700/70",
    text: "text-purple-300 [.light-theme_&]:text-purple-800",
  },
  {
    lightBg: "bg-teal-500/15 [.light-theme_&]:bg-teal-500/20",
    border: "border-teal-500/45 [.light-theme_&]:border-teal-700/70",
    text: "text-teal-300 [.light-theme_&]:text-teal-800",
  },
  {
    lightBg: "bg-indigo-500/15 [.light-theme_&]:bg-indigo-500/20",
    border: "border-indigo-500/45 [.light-theme_&]:border-indigo-700/70",
    text: "text-indigo-300 [.light-theme_&]:text-indigo-800",
  },
  {
    lightBg: "bg-fuchsia-500/15 [.light-theme_&]:bg-fuchsia-500/20",
    border: "border-fuchsia-500/45 [.light-theme_&]:border-fuchsia-700/70",
    text: "text-fuchsia-300 [.light-theme_&]:text-fuchsia-800",
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
