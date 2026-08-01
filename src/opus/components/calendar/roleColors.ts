export interface RoleColorClasses {
  lightBg: string;
  border: string;
  text: string;
}

// Base (unprefixed) classes are the light-theme pastel; dark: overrides for
// dark mode. Previously these used an arbitrary `[.light-theme_&]:` variant,
// but the app only ever toggles a `.dark` class (see @custom-variant dark in
// styles.css) — that selector never matched anything, so the "dark" colors
// applied unconditionally in both themes and were unreadable on light
// backgrounds. WCAG AA needs ~4.5:1 against the --card cream (#FDFAF5); text
// -700/800 + border -300/70 hits that. See feedback_accessibility_contrast
// memory: staff have ADHD, autism, dyslexia, and astigmatism, so badges need
// to read at a glance, not on close inspection.
const PALETTES: RoleColorClasses[] = [
  {
    lightBg: "bg-sky-100 dark:bg-sky-500/20",
    border: "border-sky-300 dark:border-sky-500/55",
    text: "text-sky-800 dark:text-sky-200",
  },
  {
    lightBg: "bg-amber-100 dark:bg-amber-500/20",
    border: "border-amber-300 dark:border-amber-500/55",
    text: "text-amber-800 dark:text-amber-200",
  },
  {
    lightBg: "bg-purple-100 dark:bg-purple-500/20",
    border: "border-purple-300 dark:border-purple-500/55",
    text: "text-purple-800 dark:text-purple-200",
  },
  {
    lightBg: "bg-teal-100 dark:bg-teal-500/20",
    border: "border-teal-300 dark:border-teal-500/55",
    text: "text-teal-800 dark:text-teal-200",
  },
  {
    lightBg: "bg-indigo-100 dark:bg-indigo-500/20",
    border: "border-indigo-300 dark:border-indigo-500/55",
    text: "text-indigo-800 dark:text-indigo-200",
  },
  {
    lightBg: "bg-fuchsia-100 dark:bg-fuchsia-500/20",
    border: "border-fuchsia-300 dark:border-fuchsia-500/55",
    text: "text-fuchsia-800 dark:text-fuchsia-200",
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
