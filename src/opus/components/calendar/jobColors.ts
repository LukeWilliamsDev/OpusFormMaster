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
    bg: "bg-blue-950/40 border-blue-800/40 text-blue-400 hover:bg-blue-950/60 hover:border-blue-700/50",
    text: "text-blue-400",
    border: "border-blue-800/40",
    bullet: "bg-blue-500",
    lightBg: "bg-blue-500/10",
  },
  {
    bg: "bg-purple-950/40 border-purple-800/40 text-purple-400 hover:bg-purple-950/60 hover:border-purple-700/50",
    text: "text-purple-400",
    border: "border-purple-800/40",
    bullet: "bg-purple-500",
    lightBg: "bg-purple-500/10",
  },
  {
    bg: "bg-sky-950/40 border-sky-800/40 text-sky-400 hover:bg-sky-950/60 hover:border-sky-700/50",
    text: "text-sky-400",
    border: "border-sky-800/40",
    bullet: "bg-sky-500",
    lightBg: "bg-sky-500/10",
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
