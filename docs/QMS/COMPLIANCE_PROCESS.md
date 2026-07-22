# Compliance Document Process

**Document:** QMS-003  
**Version:** 1.0  
**Last Reviewed:** July 2026

---

## 1. Purpose

Defines how staff compliance documents (CSCS cards, certificates, right-to-work evidence) are requested, submitted, validated, and stored.

---

## 2. Process Flow

```
1. Admin/Dispatcher Creates Document Request
       ↓
2. System Generates 48-Hour Expiry Token
       ↓
3. Compliance Email Sent to Worker (Resend Edge Function)
       ↓
4. Worker Accesses /submit-credentials (Passwordless)
       ↓
5. Worker Uploads Documents (Drag-and-Drop)
       ↓
6. Files Stored in Private Supabase Bucket (compliance-documents)
       ↓
7. Admin Reviews & Validates Documents
       ↓
8. Staff Compliance Status Updated (tickets JSONB)
       ↓
9. Audit Log Entry Created
```

---

## 3. Security Controls

| Control                  | Description                                                                                                  |
| :----------------------- | :----------------------------------------------------------------------------------------------------------- |
| **48-hour token expiry** | Upload links expire automatically. Previous pending requests are auto-expired when a new request is created. |
| **Signed URLs**          | Private files accessed via 60-second signed URLs. No permanent direct links.                                 |
| **Storage RLS**          | Workers can only INSERT into `requests/<token>/` path. Only authenticated admins can read/list files.        |
| **Edge function auth**   | JWT and role checks enforced on all compliance email dispatch functions.                                     |
| **Audit logging**        | `COMPLIANCE_REMINDER_SENT`, document upload, and validation events all logged.                               |

---

## 4. Expiry Monitoring

- The **Expiry Radar** dashboard widget displays workers with certificates expiring within 30/60/90 days
- Compliance warnings panel shows colour-coded severity indicators (red/amber/green)
- Admins can trigger reminder emails directly from the dashboard

---

## 5. Data Retention

- Compliance documents are retained for **6 years** after the worker's last engagement (CDM Regulations 2015)
- After 6 years, records are flagged for admin review before deletion
- Upload tokens are ephemeral and automatically expire after 48 hours

---

## 6. Legal Basis

Processing compliance documents is performed under **Legal Obligation** (UK GDPR Article 6(1)(c)):

- CDM Regulations 2015 require verification of worker competence
- Health and Safety at Work Act 1974 mandates safe working practices
- Construction (Design and Management) Regulations require proof of qualification
