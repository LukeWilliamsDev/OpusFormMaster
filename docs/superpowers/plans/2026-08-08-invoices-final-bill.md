# Invoices + Final Bill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add job-scoped invoices and a "final bill" aggregation/send flow, reusing the existing quote pipeline (`QuoteInvoiceBuilder.tsx` → `quotePdf.tsx` → `send-quote-pdf` edge function).

**Architecture:** Two new Supabase tables (`invoices`, `final_bills`), a job-scoped invoice list + builder UI adapted from `QuoteInvoiceBuilder.tsx`, and a final-bill builder that merges an array of invoices' `items` into one editable document before PDF-send via a cloned edge function.

**Tech Stack:** React 19 + TS, Supabase (Postgres/RLS/Deno edge fn), `@react-pdf/renderer`, Resend.

## Global Constraints

- Reuse existing patterns exactly: RLS gate is `private.can_write_ops(auth.uid())` (see `supabase/migrations/20260712033000_add_quotes_table.sql`), SELECT open to any authenticated user.
- Do NOT touch `quotes` table or `QuoteInvoiceBuilder.tsx`'s quote-saving behavior — only add new, parallel code paths.
- Final-bill send: recipient email is **hardcoded to `lukewilliams141@gmail.com`** for now (override, not read from `client_info`) — per explicit user instruction, this is temporary/testing.
- Follow existing migration file naming: `supabase/migrations/<YYYYMMDDHHMMSS>_<description>.sql`, timestamp later than `20260723120000`.

---

### Task 1: `invoices` and `final_bills` tables + RLS

**Files:**

- Create: `supabase/migrations/20260808120000_add_invoices_final_bills.sql`

**Interfaces:**

- Produces: tables `public.invoices(id, job_id, reference, date, client_info jsonb, items jsonb, vat_rate numeric, totals jsonb, status text, created_at, updated_at)` and `public.final_bills(id, job_id, reference, date, client_info jsonb, items jsonb, source_invoice_ids uuid[], vat_rate numeric, totals jsonb, status text, sent_at timestamptz, created_at, updated_at)`.

- [ ] **Step 1: Read the reference migration**

Run: open `supabase/migrations/20260712033000_add_quotes_table.sql` and copy its exact RLS policy structure (policy names, `private.can_write_ops` usage, realtime publication if any).

- [ ] **Step 2: Write the migration**

```sql
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  reference text not null unique,
  date text not null,
  client_info jsonb not null default '{}',
  items jsonb not null default '[]',
  vat_rate numeric not null default 20,
  totals jsonb not null default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

create policy "invoices_select_authenticated" on public.invoices
  for select to authenticated using (true);

create policy "invoices_write_ops" on public.invoices
  for all to authenticated
  using (private.can_write_ops(auth.uid()))
  with check (private.can_write_ops(auth.uid()));

create index invoices_job_id_idx on public.invoices(job_id);

create table public.final_bills (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  reference text not null unique,
  date text not null,
  client_info jsonb not null default '{}',
  items jsonb not null default '[]',
  source_invoice_ids uuid[] not null default '{}',
  vat_rate numeric not null default 20,
  totals jsonb not null default '{}',
  status text not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.final_bills enable row level security;

create policy "final_bills_select_authenticated" on public.final_bills
  for select to authenticated using (true);

create policy "final_bills_write_ops" on public.final_bills
  for all to authenticated
  using (private.can_write_ops(auth.uid()))
  with check (private.can_write_ops(auth.uid()));

create index final_bills_job_id_idx on public.final_bills(job_id);
```

- [ ] **Step 3: Apply migration locally**

Run: `npx supabase db push` (or the project's documented local-db command — check `.claude/QUICK_START.md` first for the exact command used in this repo)
Expected: migration applies with no errors; `invoices` and `final_bills` visible in Supabase Studio table list.

- [ ] **Step 4: Regenerate types**

Run: check `package.json` for a `supabase gen types` script (e.g. `npm run gen:types`) and run it to update `src/integrations/supabase/types.ts` with the two new tables. If no such script exists, manually add `invoices` and `final_bills` Row/Insert/Update entries to `src/integrations/supabase/types.ts` matching the `quotes` entry's shape (same file, ~line 459).
Expected: `invoices` and `final_bills` keys present in `Database["public"]["Tables"]`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260808120000_add_invoices_final_bills.sql src/integrations/supabase/types.ts
git commit -m "feat(db): add invoices and final_bills tables"
```

---

### Task 2: Job-scoped invoice list + builder UI

**Files:**

- Read first: `src/opus/components/QuoteInvoiceBuilder.tsx` (58KB — use smart_read/chunked read, do not paste it into context whole), `src/opus/pages/JobDetails.tsx`
- Create: `src/opus/components/InvoiceBuilder.tsx`
- Create: `src/opus/components/InvoiceList.tsx`
- Modify: `src/opus/pages/JobDetails.tsx` — add an "Invoices" section/tab rendering `InvoiceList` for the current `jobId`, with a "+ New Invoice" button opening `InvoiceBuilder`

**Interfaces:**

- Consumes: `invoices` table from Task 1 (`job_id`, `reference`, `client_info`, `items`, `vat_rate`, `totals`, `status`).
- Produces: `InvoiceBuilder` component with props `{ jobId: string; invoiceId?: string; onSaved: () => void; onClose: () => void }` — creates/edits one row in `invoices`. `InvoiceList` component with props `{ jobId: string; onSelectInvoice: (id: string) => void; onCreateNew: () => void }` — lists invoices for a job with reference/date/total/status, used by both the Invoices tab and the final-bill picker in Task 3.

- [ ] **Step 1: Study `QuoteInvoiceBuilder.tsx`'s save/item logic**

Identify (via smart_read or targeted grep) the exact shape of: `MeasuredItem`/`SundryItem` state, `addItem`/`removeItem`/`updateItem` (lines ~718–737 per structural index), `getLineTotal`/`isIncludedRate` (lines ~737–741), and `handleSaveDraft` (line ~481) — these are the patterns `InvoiceBuilder` must replicate against the `invoices` table instead of `quotes`.

- [ ] **Step 2: Build `InvoiceBuilder.tsx`**

Adapt the items-editing UI and save logic from `QuoteInvoiceBuilder.tsx` into a smaller, invoice-specific component: same line-item add/remove/edit table, VAT rate field, client info fields (entity/email/site/postcode), reference auto-generated as `INV-<sequential or timestamp-based>`, saves to `invoices` via Supabase client on "Save Draft". No CIS/DRC fields (those are quote-specific pricing adjustments, not needed for an already-agreed invoice — skip unless a later requirement says otherwise).

- [ ] **Step 3: Build `InvoiceList.tsx`**

Simple table querying `invoices` where `job_id = jobId`, columns: reference, date, total (from `totals.grossTotal` or computed from `items`), status badge. Row click calls `onSelectInvoice`. "+ New Invoice" button calls `onCreateNew`.

- [ ] **Step 4: Wire into `JobDetails.tsx`**

Add an "Invoices" tab/section that renders `InvoiceList` and opens `InvoiceBuilder` in a modal/panel (match the existing modal pattern used for quotes in this page, if any — otherwise match whatever panel pattern `JobDetails.tsx` already uses for pours).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open a job's detail page, create 2 invoices with different line items, confirm both appear in the Invoices list with correct totals.

- [ ] **Step 6: Commit**

```bash
git add src/opus/components/InvoiceBuilder.tsx src/opus/components/InvoiceList.tsx src/opus/pages/JobDetails.tsx
git commit -m "feat(invoices): add job-scoped invoice list and builder"
```

---

### Task 3: Final bill builder (merge invoices, edit, save)

**Files:**

- Create: `src/opus/components/FinalBillBuilder.tsx`
- Modify: `src/opus/pages/JobDetails.tsx` — add "Generate Final Bill" action near the Invoices section

**Interfaces:**

- Consumes: `InvoiceList` (Task 2) for picking source invoices; `invoices` table rows shape `{ id, items, client_info, vat_rate }`.
- Produces: `FinalBillBuilder` component, props `{ jobId: string; sourceInvoiceIds: string[]; onSaved: (finalBillId: string) => void; onClose: () => void }`. Saves/updates one row in `final_bills` with merged `items` and `source_invoice_ids`.

- [ ] **Step 1: "Generate Final Bill" entry point**

In `JobDetails.tsx`, add a button that opens a small invoice-picker (checkbox list using `InvoiceList` data) then opens `FinalBillBuilder` with the selected `sourceInvoiceIds`.

- [ ] **Step 2: Merge logic in `FinalBillBuilder.tsx`**

On mount, fetch the selected `invoices` rows, concatenate their `items` arrays into one flat array (each item keeps a reference to its source invoice id internally for traceability, not shown in the UI), and load into the same item-editing table UI pattern as `InvoiceBuilder` (add/remove/edit line, recompute totals). This is the single combined document the user reviews before send.

- [ ] **Step 3: Save**

"Save Draft" writes/upserts a `final_bills` row: `job_id`, merged `items`, `source_invoice_ids`, computed `totals`, `status: 'draft'`.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, select the 2 invoices created in Task 2, generate a final bill, confirm the combined item list equals the sum of both invoices' items, edit/remove one item, save, reload, confirm the edit persisted (not overwritten by re-merging source invoices).

- [ ] **Step 5: Commit**

```bash
git add src/opus/components/FinalBillBuilder.tsx src/opus/pages/JobDetails.tsx
git commit -m "feat(final-bill): merge job invoices into editable final bill"
```

---

### Task 4: Final bill PDF + send (Resend)

**Files:**

- Read first: `src/opus/lib/quotePdf.tsx`, `supabase/functions/send-quote-pdf/index.ts`, `supabase/functions/_shared/email-theme.ts`, `supabase/functions/_shared/cors.ts`
- Create: `src/opus/lib/finalBillPdf.tsx`
- Create: `supabase/functions/send-final-bill/index.ts`
- Modify: `src/opus/components/FinalBillBuilder.tsx` — add "Send" button

**Interfaces:**

- Consumes: `final_bills` row shape from Task 1/3.
- Produces: `finalBillPdf.tsx` exports `FinalBillPdfDocument` (react-pdf component) and a `generateFinalBillPdf(finalBill): Promise<Blob>` function, mirroring `quotePdf.tsx`'s `pdf(...)` usage. Edge function `send-final-bill` accepts `{ finalBillId, pdfUrl }` (or equivalent to `send-quote-pdf`'s payload shape), uploads/reads the PDF, emails it via Resend, and updates `final_bills.status = 'sent'`, `sent_at = now()`.

- [ ] **Step 1: Build `finalBillPdf.tsx`**

Copy `quotePdf.tsx`'s `COMPANY_INFO`, `isIncludedRate`, `getLineTotal`, and the `Document`/`Page` react-pdf layout, retitled "Final Bill" instead of "Quote", reading from a `final_bills` row instead of a `quotes` row. Keep the same visual layout/terms unless the final bill needs different terms text (if unsure, reuse `buildDefaultTerms`).

- [ ] **Step 2: Clone the edge function**

Copy `supabase/functions/send-quote-pdf/index.ts` to `supabase/functions/send-final-bill/index.ts`. Keep the same Resend HTTP call, SSRF same-origin check on `pdfUrl`, and `profiles.role` admin/dispatcher gate. Change:

- table read/update target from `quotes` to `final_bills`
- **recipient email hardcoded to `lukewilliams141@gmail.com`** instead of reading from `client_info.email` (per Global Constraints — this is a temporary override, leave a one-line comment noting it's temporary and where to remove it)
- on success, set `final_bills.status = 'sent'`, `final_bills.sent_at = now()`

- [ ] **Step 3: Wire "Send" button in `FinalBillBuilder.tsx`**

Generate PDF via `finalBillPdf.tsx`, upload to the same Supabase Storage bucket `send-quote-pdf` expects (check the bucket name inside that edge function / `handleSend` in `QuoteInvoiceBuilder.tsx` line ~607), then invoke `send-final-bill` with the resulting URL and `finalBillId`.

- [ ] **Step 4: Deploy edge function**

Run: `npx supabase functions deploy send-final-bill` (match whatever deploy command is used for existing functions — check `.claude/QUICK_START.md` or `package.json` scripts first).
Expected: deploys without error.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open the final bill created in Task 3, click Send, confirm email arrives at `lukewilliams141@gmail.com` with the PDF attached/linked, and `final_bills.status`/`sent_at` update in Supabase Studio.

- [ ] **Step 6: Commit**

```bash
git add src/opus/lib/finalBillPdf.tsx supabase/functions/send-final-bill/index.ts src/opus/components/FinalBillBuilder.tsx
git commit -m "feat(final-bill): generate PDF and send via Resend"
```
