# Quote & Invoice Process

**Document:** QMS-002  
**Version:** 1.0  
**Last Reviewed:** July 2026

---

## 1. Purpose

Defines the process for creating, reviewing, sending, and tracking quotes and invoices through the Opus Form pipeline.

---

## 2. Process Flow

```
1. New Quote Created (Pipeline → Quote Builder)
       ↓
2. Line Items & Client Details Entered
       ↓
3. VAT Calculation & Total Validated
       ↓
4. PDF Generated (client-side, html2pdf.js, 794×1122px A4)
       ↓
5. Quote Saved to Database (public.quotes)
       ↓
6. Quote Sent to Client (Resend API via Edge Function)
       ↓
7. Pipeline Stage Updated (Quote → Contract → Job → Complete)
       ↓
8. Audit Log Entry Created
```

---

## 3. Controls & Validation

| Control             | Description                                                                             |
| :------------------ | :-------------------------------------------------------------------------------------- |
| **UI validation**   | All required fields enforced before PDF generation. Toast modal alerts on missing data. |
| **VAT calculation** | Automatic 20% UK VAT computation. Net and gross totals displayed.                       |
| **PDF format lock** | Viewport clamped to 794×1122px (A4) to prevent scaling issues.                          |
| **Colour fallback** | `oklch()`/`lch()`/`lab()` values stripped before html2canvas render to prevent crashes. |
| **Audit trail**     | Quote creation, edits, and deletions logged to `public.audit_logs`.                     |
| **Access control**  | Only `admin` and `dispatcher` roles can access the pipeline and quote builder.          |

---

## 4. Data Retention

- Quotes and invoices are retained for **7 years** from creation date (HMRC requirement)
- After 7 years, records are flagged for admin review before deletion
- PDF files are stored in Supabase and follow the same retention policy

---

## 5. Pipeline Stages

| Stage        | Description                                          |
| :----------- | :--------------------------------------------------- |
| **Quote**    | Initial pricing proposal sent to client              |
| **Contract** | Client has accepted the quote; engagement formalised |
| **Job**      | Work is scheduled and in progress                    |
| **Complete** | Work finished; final invoice issued                  |
