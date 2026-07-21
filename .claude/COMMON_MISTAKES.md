# Common Mistakes

**⚠️ CRITICAL - Read at session start**

---

### 1. Bypassing RLS assumptions
Never assume a query works client-side without checking the table's RLS policy first (see [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md)). `audit_logs` is readable only by `admin@opusform.co.uk` — any other role gets empty results, not an error.

### 2. Confusing the two routers
Root routing is TanStack Start/Router; everything under the portal splat is `react-router-dom`. Don't add TanStack route files for portal pages — they live in `src/opus/` under react-router-dom.

### 3. Role self-escalation
`public.profiles` role changes are blocked by a DB trigger unless the caller already holds `admin`. Don't "fix" a permissions bug by writing directly to `role` — route through `private.has_role()`.

### 4. Public policy bucket reads
The `policies` storage bucket hardcodes file keys instead of listing — don't add a listing API call expecting bucket enumeration to work.

### 5. job_attachment_size_limits migration
Prior fix (`821477d`) addressed a function-overload risk here — check migration history before re-adding a function of the same name/signature.

---

**Last Updated**: 2026-07-22
