# Job Details: header + billing/history visual alignment

Date: 2026-08-11

## Problem

`JobDetails.tsx` header (lines 922-1007) packs job-ref, title, and status/weather into one 3-column flex row separated by vertical dividers. The title only gets `flex-1 min-w-0` between two fixed-width side blocks, so on realistic viewport widths long site names (e.g. "Manchester College - Openshaw Campus") wrap to two lines. Billing and History tab panels also predate the recent Overview panel redesign and don't share its card-shell/spacing/typography conventions.

## Scope

1. Header restructure so the title reliably fits one line.
2. Visual-only alignment pass on Billing (`InvoiceList.tsx`, `FinalBillList.tsx`) and History (`HistoryTab.tsx`) panels to match Overview's card language. No behavior/functional changes.

Out of scope: tabs row (kept as-is, already responsive), Overview/Attachments/Suppliers panels (no known issues raised), any data/query changes.

## Design

### 1. Header (`src/opus/components/JobDetails.tsx:922-1007`)

Replace the 3-column-with-dividers flex row with a two-row stack inside the same `bg-card border border-border rounded-xl p-6 md:p-8` container:

- **Row 1 — title, full width.** `text-2xl md:text-3xl font-extrabold text-foreground tracking-tight`. No sibling competes for its row, so it stays on one line at all supported widths down to mobile (wraps only if truly necessary at very narrow widths — acceptable, `line-clamp-2` kept as a safety net).
- **Row 2 — metadata chip row.** `flex flex-wrap items-center justify-between gap-2` containing two groups:
  - Left group: Job Reference chip, Contractor·Postcode chip, Email chip (same chip styling as today).
  - Right group: Status dropdown, Weather chip, Risk chip — same components as today, just relocated. Wraps below the left group on narrow screens instead of being pinned to a fixed-width `w-[150px]` column.
- Drop the two `hidden sm:block w-px bg-border shrink-0` divider elements — they belonged to the 3-column layout and have no place in the stacked structure.
- Remove the `order-*` utilities used to sequence the old 3-column layout; JSX order now matches visual order directly (lesson from prior header work — order-* on divider siblings is unreliable).

### 2. Tabs row

No change. Icon-only grid below `sm` stays as-is per existing pattern.

### 3. Billing / History visual alignment (`InvoiceList.tsx`, `FinalBillList.tsx`, `HistoryTab.tsx`)

Purely a spacing/typography/card-shell consistency pass — bring these three components in line with the conventions already established in the Overview panel (`Scheduled Pours` / `Staff On Site` cards in `JobDetails.tsx`):

- Section heading style: `text-sm font-bold text-foreground` for titles, `text-xs text-muted-foreground` for subtext/help copy — verify all three components use this exact scale (InvoiceList already does at line 110-113; audit FinalBillList and HistoryTab headings against it).
- Card shell: `bg-card border border-border rounded-xl p-4` wrapper, `space-y-4` internal rhythm — confirm consistent when each panel renders standalone (non-`embedded`) inside its `TabsContent`.
- List row rhythm: adopt InvoiceList's row pattern as the reference (`py-2.5`, primary text `text-sm font-semibold`, meta text `text-xs text-muted-foreground`, status badges as `rounded-full` pills) — apply the same row height/type-scale to History's audit log rows.
- No changes to data fetching, filtering, revert logic, or any other behavior — this is presentation-layer only.

## Testing

Manual verification in browser at desktop, tablet, and mobile widths (per project convention — no automated visual regression suite exists for this page):

- Long site name stays on one line at desktop/tablet widths; header doesn't overflow or clip at mobile width.
- Status/weather/risk chips wrap sensibly under the metadata row on narrow viewports.
- Billing and History panels visually match Overview's spacing/type scale when tabbed between.
