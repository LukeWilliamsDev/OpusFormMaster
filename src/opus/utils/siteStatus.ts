export type SiteState = "open" | "attention" | "completed";

export type SiteStatusRecord = { status?: string | null };

export const isCompletedSite = (site: SiteStatusRecord) =>
  ["completed", "complete", "closed"].includes(String(site.status).toLowerCase());

export const siteNeedsAttention = (site: SiteStatusRecord) =>
  ["pending", "on-hold", "on hold"].includes(String(site.status).toLowerCase());

export const getSiteState = (site: SiteStatusRecord): SiteState =>
  isCompletedSite(site) ? "completed" : siteNeedsAttention(site) ? "attention" : "open";

export const siteStateLabel = (state: SiteState) =>
  state === "completed" ? "Completed" : state === "attention" ? "Needs attention" : "Open";

export const siteStateStyles: Record<
  SiteState,
  { row: string; icon: string; badge: string; detail: string; card: string }
> = {
  open: {
    row: "bg-sky-50/60 hover:bg-sky-100/80 dark:bg-sky-950/20 dark:hover:bg-sky-950/40",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-200",
    badge:
      "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-400/20 dark:text-sky-100 dark:ring-sky-400/30",
    detail:
      "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-400/40 dark:bg-sky-950/30 dark:text-sky-100",
    card: "border-sky-200 bg-sky-50/40 dark:border-sky-400/20 dark:bg-sky-950/15",
  },
  attention: {
    row: "bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/40",
    icon: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-100",
    badge:
      "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-400/20 dark:text-amber-100 dark:ring-amber-400/30",
    detail:
      "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-100",
    card: "border-amber-200 bg-amber-50/40 dark:border-amber-400/20 dark:bg-amber-950/15",
  },
  completed: {
    row: "bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40",
    icon: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-100",
    badge:
      "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-400/20 dark:text-emerald-100 dark:ring-emerald-400/30",
    detail:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-950/30 dark:text-emerald-100",
    card: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-400/20 dark:bg-emerald-950/15",
  },
};
