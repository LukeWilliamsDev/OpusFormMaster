# Job Lifecycle Management

**Document:** QMS-004  
**Version:** 1.0  
**Last Reviewed:** July 2026

---

## 1. Purpose

Defines how construction jobs are created, scheduled, tracked, and completed through the Opus Form platform.

---

## 2. Lifecycle Stages

```
1. Job Created (Dashboard → Add Job Form)
       ↓
2. Job Appears in Pipeline (Quote/Contract stage)
       ↓
3. Workers Assigned via Calendar (Proximity Scheduling)
       ↓
4. Shifts Logged to public.shifts Table
       ↓
5. Daily Site Operations (H&S Checklists, Pour Logs, Diary)
       ↓
6. Pour Progress Tracked (current vs. contract max)
       ↓
7. Job Marked Complete When Contract Pours Fulfilled
       ↓
8. Final Invoice Generated & Sent
       ↓
9. Job Archived
```

---

## 3. Job Creation Controls

| Field                  | Validation                                  |
| :--------------------- | :------------------------------------------ |
| **Job Reference**      | Auto-generated unique ID (OP-XXXX-X format) |
| **Site Name**          | Required                                    |
| **Main Contractor**    | Required                                    |
| **Postcode**           | UK postcode format validated                |
| **Contract Max Pours** | Positive integer required                   |
| **Schedule Value**     | Positive number required (£)                |

---

## 4. Scheduling & Assignment

- Workers are assigned to shifts via the Calendar view
- **Proximity scheduling** uses postcode geocoding (postcodes.io API) and Haversine distance calculation to suggest nearest available workers
- Assignments are stored in `public.shifts` (single source of truth)
- Role-Based Access: only `admin` and `dispatcher` roles can assign shifts

---

## 5. On-Site Operations

| Feature                 | Description                                                                                                                     |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **H&S Daily Checklist** | PPE verification, toolbox briefing, delivery access, weather risk assessment. Must be completed before pour logging is enabled. |
| **Pour Logs**           | Records pours against the contract maximum. Tracks progress percentage.                                                         |
| **Site Diary**          | Free-text daily notes for site conditions, incidents, or progress.                                                              |
| **Photo Gallery**       | Before/after photos uploaded to Supabase storage for evidence trail.                                                            |
| **Weather Risk**        | Real-time OpenWeatherMap API integration flags adverse conditions.                                                              |

---

## 6. Completion & Archival

- Job status transitions to `completed` when contract pours are fulfilled
- Final invoice is generated through the Quote Builder
- Completed jobs remain in the ledger for historical reference
- Financial records (schedule values, invoices) retained for 7 years (HMRC)
