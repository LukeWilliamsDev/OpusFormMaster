export interface JobColorClasses {
  bg: string;
  text: string;
  border: string;
  bullet: string;
  lightBg: string;
}

// Muted/earthy palette tuned to sit alongside the brand's warm cream (light)
// / charcoal (dark) surfaces and burnt-orange primary. Green remains reserved
// app-wide for positive states rather than being used for arbitrary jobs.
const PALETTES: JobColorClasses[] = [
  {
    bg: "bg-job-teal/12 border-job-teal/35 text-job-teal hover:bg-job-teal/18 hover:border-job-teal/50",
    text: "text-job-teal",
    border: "border-job-teal/35",
    bullet: "bg-job-teal/75",
    lightBg: "bg-job-teal/12",
  },
  {
    bg: "bg-job-slate/12 border-job-slate/35 text-job-slate hover:bg-job-slate/18 hover:border-job-slate/50",
    text: "text-job-slate",
    border: "border-job-slate/35",
    bullet: "bg-job-slate/75",
    lightBg: "bg-job-slate/12",
  },
  {
    bg: "bg-job-plum/12 border-job-plum/35 text-job-plum hover:bg-job-plum/18 hover:border-job-plum/50",
    text: "text-job-plum",
    border: "border-job-plum/35",
    bullet: "bg-job-plum/75",
    lightBg: "bg-job-plum/12",
  },
  {
    bg: "bg-job-ochre/12 border-job-ochre/35 text-job-ochre hover:bg-job-ochre/18 hover:border-job-ochre/50",
    text: "text-job-ochre",
    border: "border-job-ochre/35",
    bullet: "bg-job-ochre/75",
    lightBg: "bg-job-ochre/12",
  },
  {
    bg: "bg-job-stone/12 border-job-stone/35 text-job-stone hover:bg-job-stone/18 hover:border-job-stone/50",
    text: "text-job-stone",
    border: "border-job-stone/35",
    bullet: "bg-job-stone/75",
    lightBg: "bg-job-stone/12",
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
