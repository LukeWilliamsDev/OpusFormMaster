export interface JobColorClasses {
  bg: string;
  text: string;
  border: string;
  bullet: string;
  lightBg: string;
}

const PALETTES: JobColorClasses[] = [
  {
    bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 [.light-theme_&]:text-emerald-600 hover:bg-emerald-500/15 hover:border-emerald-500/40",
    text: "text-emerald-400 [.light-theme_&]:text-emerald-600",
    border: "border-emerald-500/30",
    bullet: "bg-emerald-500",
    lightBg: "bg-emerald-500/10",
  },
  {
    bg: "bg-rose-500/10 border-rose-500/30 text-rose-400 [.light-theme_&]:text-rose-600 hover:bg-rose-500/15 hover:border-rose-500/40",
    text: "text-rose-400 [.light-theme_&]:text-rose-600",
    border: "border-rose-500/30",
    bullet: "bg-rose-500",
    lightBg: "bg-rose-500/10",
  },
  {
    bg: "bg-purple-500/10 border-purple-500/30 text-purple-400 [.light-theme_&]:text-purple-600 hover:bg-purple-500/15 hover:border-purple-500/40",
    text: "text-purple-400 [.light-theme_&]:text-purple-600",
    border: "border-purple-500/30",
    bullet: "bg-purple-500",
    lightBg: "bg-purple-500/10",
  },
  {
    bg: "bg-teal-500/10 border-teal-500/30 text-teal-400 [.light-theme_&]:text-teal-600 hover:bg-teal-500/15 hover:border-teal-500/40",
    text: "text-teal-400 [.light-theme_&]:text-teal-600",
    border: "border-teal-500/30",
    bullet: "bg-teal-500",
    lightBg: "bg-teal-500/10",
  },
  {
    bg: "bg-amber-500/10 border-amber-500/30 text-amber-400 [.light-theme_&]:text-amber-600 hover:bg-amber-500/15 hover:border-amber-500/40",
    text: "text-amber-400 [.light-theme_&]:text-amber-600",
    border: "border-amber-500/30",
    bullet: "bg-amber-500",
    lightBg: "bg-amber-500/10",
  },
];

/**
 * Stable palette per job id. Numeric seed ids ('1'..'5') keep their original
 * colors; arbitrary ids (e.g. 'job-x7f2k') hash into the same 5 palettes.
 */
export const getJobColorClasses = (jobId: string): JobColorClasses => {
  const numeric = Number(jobId);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= PALETTES.length) {
    return PALETTES[numeric - 1];
  }
  let hash = 0;
  for (let i = 0; i < jobId.length; i++) {
    hash = (hash * 31 + jobId.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
};
