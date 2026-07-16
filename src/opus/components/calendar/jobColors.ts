export interface JobColorClasses {
  bg: string;
  text: string;
  border: string;
  bullet: string;
  lightBg: string;
}

const PALETTES: JobColorClasses[] = [
  {
    bg: "bg-emerald-950/40 border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/60 hover:border-emerald-700/50",
    text: "text-emerald-400",
    border: "border-emerald-800/40",
    bullet: "bg-emerald-500",
    lightBg: "bg-emerald-500/10",
  },
  {
    bg: "bg-rose-950/40 border-rose-800/40 text-rose-400 hover:bg-rose-950/60 hover:border-rose-700/50",
    text: "text-rose-400",
    border: "border-rose-800/40",
    bullet: "bg-rose-500",
    lightBg: "bg-rose-500/10",
  },
  {
    bg: "bg-purple-950/40 border-purple-800/40 text-purple-400 hover:bg-purple-950/60 hover:border-purple-700/50",
    text: "text-purple-400",
    border: "border-purple-800/40",
    bullet: "bg-purple-500",
    lightBg: "bg-purple-500/10",
  },
  {
    bg: "bg-teal-950/40 border-teal-800/40 text-teal-400 hover:bg-teal-950/60 hover:border-teal-700/50",
    text: "text-teal-400",
    border: "border-teal-800/40",
    bullet: "bg-teal-500",
    lightBg: "bg-teal-500/10",
  },
  {
    bg: "bg-amber-950/40 border-amber-800/40 text-amber-400 hover:bg-amber-950/60 hover:border-amber-700/50",
    text: "text-amber-400",
    border: "border-amber-800/40",
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
