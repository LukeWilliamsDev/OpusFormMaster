export type SiteState = "open" | "attention" | "completed";

export type SiteStatusRecord = { status?: string | null };

export const isCompletedSite = (site: SiteStatusRecord) =>
  ["completed", "complete", "closed"].includes(String(site.status).toLowerCase().trim());

export const siteNeedsAttention = (site: SiteStatusRecord) =>
  ["pending", "on-hold", "on hold"].includes(String(site.status).toLowerCase().trim());

export const getSiteState = (site: SiteStatusRecord): SiteState =>
  isCompletedSite(site) ? "completed" : siteNeedsAttention(site) ? "attention" : "open";

export const siteStateLabel = (state: SiteState) =>
  state === "completed" ? "Completed" : state === "attention" ? "Needs attention" : "Open";

export const siteStateStyles: Record<
  SiteState,
  { row: string; icon: string; badge: string; detail: string; card: string }
> = {
  open: {
    row: "bg-status-open/8 hover:bg-status-open/14",
    icon: "bg-status-open/12 text-status-open",
    badge: "bg-status-open/12 text-status-open ring-1 ring-inset ring-status-open/25",
    detail: "border-status-open/35 bg-status-open/8 text-status-open",
    card: "border-status-open/25 bg-status-open/6",
  },
  attention: {
    row: "bg-status-attention/8 hover:bg-status-attention/14",
    icon: "bg-status-attention/12 text-status-attention",
    badge:
      "bg-status-attention/12 text-status-attention ring-1 ring-inset ring-status-attention/25",
    detail: "border-status-attention/35 bg-status-attention/8 text-status-attention",
    card: "border-status-attention/25 bg-status-attention/6",
  },
  completed: {
    row: "bg-status-complete/8 hover:bg-status-complete/14",
    icon: "bg-status-complete/12 text-status-complete",
    badge: "bg-status-complete/12 text-status-complete ring-1 ring-inset ring-status-complete/25",
    detail: "border-status-complete/35 bg-status-complete/8 text-status-complete",
    card: "border-status-complete/25 bg-status-complete/6",
  },
};
