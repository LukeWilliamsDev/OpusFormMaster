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
    bg: "bg-teal-600/15 dark:bg-teal-600/15 border-teal-600/40 dark:border-teal-600/45 text-teal-700 dark:text-teal-200 hover:bg-teal-600/20 dark:hover:bg-teal-600/20 hover:border-teal-600/50 dark:hover:border-teal-600/55",
    text: "text-teal-700 dark:text-teal-200",
    border: "border-teal-600/40 dark:border-teal-600/45",
    bullet: "bg-teal-600/70 dark:bg-teal-400",
    lightBg: "bg-teal-600/15 dark:bg-teal-600/15",
  },
  {
    // Slate blue
    bg: "bg-slate-500/15 dark:bg-slate-500/15 border-slate-500/40 dark:border-slate-500/45 text-slate-700 dark:text-slate-200 hover:bg-slate-500/20 dark:hover:bg-slate-500/20 hover:border-slate-500/50 dark:hover:border-slate-500/55",
    text: "text-slate-700 dark:text-slate-200",
    border: "border-slate-500/40 dark:border-slate-500/45",
    bullet: "bg-slate-500/70 dark:bg-slate-300",
    lightBg: "bg-slate-500/15 dark:bg-slate-500/15",
  },
  {
    // Plum
    bg: "bg-purple-600/15 dark:bg-purple-600/15 border-purple-600/40 dark:border-purple-600/45 text-purple-700 dark:text-purple-200 hover:bg-purple-600/20 dark:hover:bg-purple-600/20 hover:border-purple-600/50 dark:hover:border-purple-600/55",
    text: "text-purple-700 dark:text-purple-200",
    border: "border-purple-600/40 dark:border-purple-600/45",
    bullet: "bg-purple-600/70 dark:bg-purple-400",
    lightBg: "bg-purple-600/15 dark:bg-purple-600/15",
  },
  {
    // Ochre
    bg: "bg-amber-600/15 dark:bg-amber-600/15 border-amber-600/40 dark:border-amber-600/45 text-amber-700 dark:text-amber-200 hover:bg-amber-600/20 dark:hover:bg-amber-600/20 hover:border-amber-600/50 dark:hover:border-amber-600/55",
    text: "text-amber-700 dark:text-amber-200",
    border: "border-amber-600/40 dark:border-amber-600/45",
    bullet: "bg-amber-600/70 dark:bg-amber-400",
    lightBg: "bg-amber-600/15 dark:bg-amber-600/15",
  },
  {
    // Warm stone
    bg: "bg-stone-500/15 dark:bg-stone-500/15 border-stone-500/40 dark:border-stone-500/45 text-stone-700 dark:text-stone-200 hover:bg-stone-500/20 dark:hover:bg-stone-500/20 hover:border-stone-500/50 dark:hover:border-stone-500/55",
    text: "text-stone-700 dark:text-stone-200",
    border: "border-stone-500/40 dark:border-stone-500/45",
    bullet: "bg-stone-500/70 dark:bg-stone-300",
    lightBg: "bg-stone-500/15 dark:bg-stone-500/15",
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
