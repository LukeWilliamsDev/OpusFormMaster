# Incident & Defect Handling

**Document:** QMS-005  
**Version:** 1.0  
**Last Reviewed:** July 2026

---

## 1. Purpose

Defines how incidents, defects, and complaints are reported, investigated, and resolved. This process supports the ISO 9001 requirement for non-conformance management and corrective action.

---

## 2. Incident Categories

| Category | Examples | Severity |
|:---------|:---------|:---------|
| **Data Breach** | Unauthorised access, credential compromise, data exposure | 🔴 Critical |
| **Service Outage** | Platform unavailable, database connectivity failure | 🔴 Critical |
| **Security Vulnerability** | CVE with CVSS ≥ 7.0, RLS bypass, privilege escalation | 🟠 High |
| **Compliance Failure** | Expired certificates not flagged, missing audit logs | 🟠 High |
| **Functional Defect** | UI bugs, calculation errors, broken workflows | 🟡 Medium |
| **User Complaint** | UX friction, missing features, performance issues | 🔵 Low |

---

## 3. Response Process

```
1. Incident Detected / Reported
       ↓
2. Triage — Assign Severity Level
       ↓
3. Containment — Mitigate Immediate Impact
       ↓
4. Investigation — Root Cause Analysis
       ↓
5. Corrective Action — Fix Implemented & Deployed
       ↓
6. Verification — Confirm Fix Resolves Issue
       ↓
7. Documentation — Record in Audit Log & Incident Register
       ↓
8. Review — Assess Whether Process Changes Are Needed
```

---

## 4. Response Timeframes

| Severity | Acknowledgement | Resolution Target |
|:---------|:----------------|:------------------|
| 🔴 Critical | 1 hour | 4 hours |
| 🟠 High | 4 hours | 24 hours |
| 🟡 Medium | 24 hours | 5 business days |
| 🔵 Low | 48 hours | Next scheduled release |

---

## 5. Data Breach Response (UK GDPR)

Under UK GDPR Article 33, personal data breaches must be reported to the ICO within **72 hours** if they pose a risk to individuals' rights and freedoms.

**Breach response steps:**
1. **Contain** — Isolate affected systems, revoke compromised credentials
2. **Assess** — Determine scope, data involved, and risk to individuals
3. **Notify ICO** — If risk threshold met, report via [ico.org.uk/make-a-complaint](https://ico.org.uk/make-a-complaint) within 72 hours
4. **Notify Affected Individuals** — If high risk, inform them directly without undue delay
5. **Document** — Record all details in the incident register regardless of whether ICO notification was required

---

## 6. Corrective Action & Prevention

After resolution:
- Update relevant QMS process documents if the root cause was a process gap
- Add automated checks where feasible (e.g. new validation rules, audit triggers)
- Review security headers, RLS policies, and access controls if security-related
- Schedule a follow-up review at the next quarterly management review

---

## 7. Audit Trail

All incidents are recorded in the system audit trail (`public.audit_logs`) including:
- Timestamp
- Actor
- Action taken
- Before/after state (where applicable)
- Resolution details
