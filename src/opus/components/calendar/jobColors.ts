export interface JobColorClasses {
  bg: string;
  text: string;
  border: string;
  bullet: string;
  lightBg: string;
}

// Muted/earthy palette tuned to sit alongside the brand's warm cream (light)
// / charcoal (dark) surfaces and burnt-orange primary — desaturated hues
// instead of stock bright Tailwind colors. Green is deliberately excluded:
// it's reserved app-wide for "good" states (compliance received, etc.), same
// as red/rose being reserved for warnings/errors.
const PALETTES: JobColorClasses[] = [
  {
    // Dusty teal
    bg: "bg-teal-600/15 dark:bg-teal-600/10 border-teal-600/40 dark:border-teal-600/30 text-teal-700 dark:text-teal-300 hover:bg-teal-600/20 dark:hover:bg-teal-600/15 hover:border-teal-600/50 dark:hover:border-teal-600/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-600/40 dark:border-teal-600/30",
    bullet: "bg-teal-600/70",
    lightBg: "bg-teal-600/15 dark:bg-teal-600/10",
  },
  {
    // Slate blue
    bg: "bg-slate-500/15 dark:bg-slate-500/10 border-slate-500/40 dark:border-slate-500/30 text-slate-700 dark:text-slate-300 hover:bg-slate-500/20 dark:hover:bg-slate-500/15 hover:border-slate-500/50 dark:hover:border-slate-500/40",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/40 dark:border-slate-500/30",
    bullet: "bg-slate-500/70",
    lightBg: "bg-slate-500/15 dark:bg-slate-500/10",
  },
  {
    // Plum
    bg: "bg-purple-600/15 dark:bg-purple-600/10 border-purple-600/40 dark:border-purple-600/30 text-purple-700 dark:text-purple-300 hover:bg-purple-600/20 dark:hover:bg-purple-600/15 hover:border-purple-600/50 dark:hover:border-purple-600/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-600/40 dark:border-purple-600/30",
    bullet: "bg-purple-600/70",
    lightBg: "bg-purple-600/15 dark:bg-purple-600/10",
  },
  {
    // Ochre
    bg: "bg-amber-600/15 dark:bg-amber-600/10 border-amber-600/40 dark:border-amber-600/30 text-amber-700 dark:text-amber-300 hover:bg-amber-600/20 dark:hover:bg-amber-600/15 hover:border-amber-600/50 dark:hover:border-amber-600/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-600/40 dark:border-amber-600/30",
    bullet: "bg-amber-600/70",
    lightBg: "bg-amber-600/15 dark:bg-amber-600/10",
  },
  {
    // Warm stone
    bg: "bg-stone-500/15 dark:bg-stone-500/10 border-stone-500/40 dark:border-stone-500/30 text-stone-700 dark:text-stone-300 hover:bg-stone-500/20 dark:hover:bg-stone-500/15 hover:border-stone-500/50 dark:hover:border-stone-500/40",
    text: "text-stone-700 dark:text-stone-300",
    border: "border-stone-500/40 dark:border-stone-500/30",
    bullet: "bg-stone-500/70",
    lightBg: "bg-stone-500/15 dark:bg-stone-500/10",
  },
];

// Assign by first-seen order, not a hash of the id — a hash mod 5 can put two
// different jobs in the same slot. First-seen keeps every job distinct until
// the palette (5 colors) is actually exhausted, same convention as roleColors.ts.
const assignedColors = new Map<string, JobColorClasses>();

export const getJobColorClasses = (jobId: string): JobColorClasses => {
  let color = assignedColors.get(jobId);
  if (!color) {
    color = PALETTES[assignedColors.size % PALETTES.length];
    assignedColors.set(jobId, color);
  }
  return color;
};
