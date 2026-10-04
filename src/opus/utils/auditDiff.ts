const IGNORED_FIELDS = ["id", "created_at", "updated_at", "tenant_id"];

// Reverting a whole JSON snapshot is unsafe: snapshots also contain related
// compliance data and derived counters. These are the only fields the server
// side revert RPC is allowed to restore.
export const REVERTIBLE_AUDIT_FIELDS: Record<string, string[]> = {
  staff: ["name", "role", "phone", "email", "postcode", "is_archived"],
  jobs: ["site_name", "main_contractor", "postcode", "email", "contract_max_pours", "status"],
};

export interface AuditRecordLike {
  action: string;
  target_type: string;
  target_id: string;
  user_email?: string | null;
  created_at?: string | null;
  details?: unknown;
}

export type AuditCategory = "changes" | "compliance" | "access" | "system";

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  changes: "Changes & decisions",
  compliance: "Compliance",
  access: "Access activity",
  system: "System activity",
};

const ACCESS_ACTIONS = new Set([
  "INSPECT",
  "VIEW_DOCUMENT",
  "VIEW_ATTACHMENT",
  "VIEW_DOCUMENTS",
  "THIRD_PARTY_ATTACHMENT_VIEWED",
]);

const COMPLIANCE_ACTIONS = new Set([
  "COMPLIANCE_REMINDER_SENT",
  "TICKET_EXPIRED",
  "CREATE_DOCUMENT_REQUEST",
  "RESEND_DOCUMENT_REQUEST",
  "REMOVE_DOCUMENT",
  "APPROVE_DOCUMENT",
  "REJECT_DOCUMENT",
  "SUBMIT_DOCUMENTS",
  "UPLOAD_ATTACHMENT",
  "DELETE_ATTACHMENT",
  "STAFF_CERTIFICATE_CHECK_RECORDED",
  "THIRD_PARTY_STAFF_DOCUMENT_SUBMITTED",
  "THIRD_PARTY_STAFF_DOCUMENT_UPLOADED",
  "THIRD_PARTY_STAFF_DOCUMENT_REVIEWED",
]);

const SYSTEM_ACTIONS = new Set([
  "LOGIN_SUCCESS",
  "LOGIN_FAIL",
  "LOGOUT",
  "PASSWORD_RESET_REQUEST",
  "PASSWORD_RESET_SUCCESS",
  "PROFILE_UPDATE",
  "TELEGRAM_LINK_CREATED",
  "TELEGRAM_LINK_REVOKED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
]);

// Exact, plain-English label for each audit action code — shared across the
// staff dossier, job history tab, and Site Log so badges read the same
// everywhere. Falls back to a title-cased version of the raw action.
const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAIL: "Sign-in failed",
  LOGOUT: "Signed out",
  PASSWORD_RESET_REQUEST: "Password reset requested",
  PASSWORD_RESET_SUCCESS: "Password changed",
  PROFILE_UPDATE: "Profile updated",
  COMPLIANCE_REMINDER_SENT: "Compliance reminder sent",
  TICKET_EXPIRED: "Certificate expired",
  QUOTE_CONVERTED_TO_JOB: "Quote converted to job",
  INSPECT: "Viewed",
  VIEW_DOCUMENT: "Document viewed",
  VIEW_ATTACHMENT: "Attachment viewed",
  REMOVE_DOCUMENT: "Document removed",
  RENAME_ATTACHMENT: "Attachment renamed",
  GENERATE_UPLOAD_LINK: "Upload link generated",
  CREATE_DOCUMENT_REQUEST: "Documents requested",
  RESEND_DOCUMENT_REQUEST: "Request resent",
  DELETE_NOTE: "Note deleted",
  ADD_NOTE: "Note added",
  UPLOAD_ATTACHMENT: "Attachment uploaded",
  DELETE_ATTACHMENT: "Attachment deleted",
  APPROVE_DOCUMENT: "Document approved",
  REJECT_DOCUMENT: "Document rejected",
  SUBMIT_DOCUMENTS: "Documents submitted",
  ASSIGN_STAFF: "Staff assigned",
  REALLOCATE_STAFF: "Staff reallocated",
  REMOVE_STAFF: "Staff removed",
  REVERT_POUR: "Pour reverted",
  SCHEDULE_POUR: "Pour scheduled",
  COMPLETE_POUR: "Pour completed",
  REMOVE_POUR: "Pour removed",
  UPDATE_POUR_NOTES: "Pour notes updated",
  STAFF_CERTIFICATE_CHECK_RECORDED: "Certificate check recorded",
  THIRD_PARTY_STAFF_DOCUMENT_SUBMITTED: "Third-party document submitted",
  THIRD_PARTY_STAFF_DOCUMENT_UPLOADED: "Third-party document uploaded",
  THIRD_PARTY_STAFF_DOCUMENT_REVIEWED: "Third-party document reviewed",
  THIRD_PARTY_ATTACHMENT_VIEWED: "Third-party attachment viewed",
  THIRD_PARTY_JOB_NOTE_ADDED: "Third-party note added",
  THIRD_PARTY_JOB_NOTE_REPLY_ADDED: "Third-party note reply added",
  TELEGRAM_LINK_CREATED: "Telegram link created",
  TELEGRAM_LINK_REVOKED: "Telegram link revoked",
  USER_CREATED: "User created",
  USER_UPDATED: "User updated",
  USER_DELETED: "User deleted",
  REVERT_AUDIT_LOG: "Audit entry reverted",
  CREATE: "Created",
  UPDATE: "Details changed",
  DELETE: "Deleted",
};

// Turns "luke.williams@opusform.co.uk" into "Luke Williams" for the actor
// column shared by the staff dossier, job history tab, and Site Log.
export function getActorName(email: string | null | undefined): string {
  if (!email) return "System";
  if (!AUDIT_EMAIL_PATTERN.test(email) || containsSensitiveAuditText(email)) {
    return "Unverified identifier";
  }
  const [name] = email.split("@");
  return name
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function getAuditActorIdentifier(email: string | null | undefined): string {
  if (!email) return "System / Automated";
  return AUDIT_EMAIL_PATTERN.test(email) && !containsSensitiveAuditText(email)
    ? email
    : "Unverified identifier";
}

export function getEventLabel(action: string | null | undefined): string {
  if (!action) return "Event";
  return (
    ACTION_LABELS[action] ??
    action
      .toLowerCase()
      .split("_")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  role: "Role",
  phone: "Phone",
  email: "Email",
  postcode: "Postcode",
  is_archived: "Archived",
  site_name: "Site name",
  main_contractor: "Main contractor",
  contract_max_pours: "Contract pours",
  status: "Status",
  job_ref: "Job reference",
  current_pours: "Completed pours",
  schedule_value: "Schedule value",
  worker_id: "Staff member",
  job_id: "Job",
  date: "Date",
  notes: "Notes",
  file_name: "File name",
  ticket_type: "Certificate type",
  ticket_number: "Certificate number",
};

const VISIBLE_AUDIT_FIELD_KEYS = new Set([
  ...Object.keys(AUDIT_FIELD_LABELS),
  "reference",
  "completed_at",
  "expires_at",
  "requested_certs",
  "reason",
  "outcome",
  "source",
]);

export function getAuditFieldLabel(field: string): string {
  if (AUDIT_FIELD_LABELS[field]) return AUDIT_FIELD_LABELS[field];
  return VISIBLE_AUDIT_FIELD_KEYS.has(field) ? field.replace(/_/g, " ") : "Other restricted field";
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return "Restricted";
  if (typeof value === "string" && containsSensitiveAuditText(value)) return "Restricted";
  return String(value);
}

const SAFE_DIFF_FIELDS = new Set([
  "name",
  "role",
  "phone",
  "email",
  "postcode",
  "is_archived",
  "site_name",
  "main_contractor",
  "contract_max_pours",
  "status",
  "job_ref",
  "current_pours",
  "schedule_value",
  "date",
  "notes",
  "file_name",
  "ticket_type",
  "ticket_number",
  "reference",
  "completed_at",
  "expires_at",
  "reason",
  "outcome",
  "source",
  "requested_certs",
]);

const SENSITIVE_AUDIT_FIELD =
  /(url|token|secret|password|passwd|hash|request[_-]?id|service[_-]?role|api[_-]?key|access[_-]?key)/i;

const AUDIT_EMAIL_PATTERN =
  /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;

function containsSensitiveAuditText(value: string): boolean {
  return (
    /(?:https?|ftp):\/\/|\/\/[a-z0-9.-]+(?:[/?#]|$)/i.test(value) ||
    /%3a%2f%2f|%2f%2f/i.test(value) ||
    /bearer\s+|(?:token|secret|password|key|signature)\s*[:=]/i.test(value) ||
    /(?:^|[\s"'(])request[-_][a-z0-9-]+(?:$|[\s"')])/i.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value)
  );
}

export function formatSafeAuditFieldValue(field: string, value: unknown): string {
  if (!SAFE_DIFF_FIELDS.has(field) || SENSITIVE_AUDIT_FIELD.test(field)) return "Restricted";
  if (Array.isArray(value)) {
    return value.every((entry) => typeof entry === "string" && !containsSensitiveAuditText(entry))
      ? value.join(", ")
      : "Restricted";
  }
  return formatAuditValue(value);
}

export interface DiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

export function computeDiff(oldVal: unknown, newVal: unknown): DiffEntry[] {
  if (!oldVal || !newVal || typeof oldVal !== "object" || typeof newVal !== "object") return [];
  const oldObj = oldVal as Record<string, unknown>;
  const newObj = newVal as Record<string, unknown>;

  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

  return allKeys
    .filter((key) => !IGNORED_FIELDS.includes(key))
    .filter((key) => {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      // Quick comparison for simple types and array/objects
      return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    })
    .map((key) => ({
      field: key,
      before: oldObj[key],
      after: newObj[key],
    }));
}

export function getRevertibleDiff(targetType: string, diff: DiffEntry[]): DiffEntry[] {
  const fields = REVERTIBLE_AUDIT_FIELDS[targetType] ?? [];
  return diff.filter((entry) => fields.includes(entry.field));
}

export function getAuditDetails(details: unknown): Record<string, unknown> | null {
  return details && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : null;
}

function inferAuditTargetName(
  targetType: string,
  details: Record<string, unknown> | null,
): string | undefined {
  const snapshots = [details?.new, details?.old];
  const fieldsByType: Record<string, string[]> = {
    staff: ["name", "email"],
    jobs: ["site_name", "job_ref"],
    quotes: ["reference", "job_ref"],
  };
  const fields = fieldsByType[targetType] ?? ["name", "reference", "file_name"];

  for (const snapshot of snapshots) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) continue;
    const values = snapshot as Record<string, unknown>;
    const label = fields
      .map((field) => values[field])
      .find(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0 &&
          !containsSensitiveAuditText(value),
      );
    if (typeof label === "string") return label;
  }
  return undefined;
}

function quoteSentenceValue(field: string, value: unknown): string {
  const formatted = formatSafeAuditFieldValue(field, value);
  if (formatted === "Restricted") return "a restricted value";
  return formatted === "Empty" ? "empty" : `“${formatted}”`;
}

function auditSubject(
  record: Pick<AuditRecordLike, "target_type" | "target_id" | "details">,
  targetName?: string,
): string {
  const details = getAuditDetails(record.details);
  const inferredName = inferAuditTargetName(record.target_type, details);
  const label = safeAuditLabel(targetName) || safeAuditLabel(inferredName);
  const targetType = getAuditTargetLabel(record.target_type).toLowerCase();
  return label ? `${targetType} “${label}”` : `${targetType} “Unnamed record”`;
}

function safeAuditLabel(value: string | undefined): string | undefined {
  if (!value || containsSensitiveAuditText(value)) return undefined;
  return value;
}

export function getAuditTargetLabel(targetType: string): string {
  return (
    {
      auth: "Account",
      jobs: "Site",
      quotes: "Quote",
      staff: "Staff",
    }[targetType] || targetType.replace(/_/g, " ")
  );
}

export function getAuditCategory(action: string): AuditCategory {
  if (ACCESS_ACTIONS.has(action)) return "access";
  if (COMPLIANCE_ACTIONS.has(action)) return "compliance";
  if (SYSTEM_ACTIONS.has(action)) return "system";
  return "changes";
}

export function getAuditCategoryLabel(category: AuditCategory): string {
  return AUDIT_CATEGORY_LABELS[category];
}

export function getAuditRecordLabel(
  record: Pick<AuditRecordLike, "target_type" | "target_id" | "details">,
  targetName?: string,
): string {
  const details = getAuditDetails(record.details);
  return (
    safeAuditLabel(targetName) ||
    safeAuditLabel(inferAuditTargetName(record.target_type, details)) ||
    "Unnamed record"
  );
}

export function getAuditOutcomeSummary(
  record: Pick<AuditRecordLike, "action" | "target_type" | "target_id" | "details">,
): string {
  const details = getAuditDetails(record.details);
  if (details?.is_derived_request === true) {
    const rawStatus = typeof details.status === "string" ? details.status : "recorded";
    const safeStatus = formatSafeAuditDetail("status", rawStatus);
    const status = safeStatus === "Restricted" ? "recorded" : safeStatus;
    return `Compliance request ${status}`;
  }
  if (record.action === "UPDATE") {
    const diff = computeDiff(details?.old, details?.new);
    if (diff.length === 0) return "Update recorded";
    return diff.length === 1 ? "1 field changed" : `${diff.length} fields changed`;
  }

  const outcomes: Record<string, string> = {
    CREATE: "Record created",
    DELETE: "Record deleted",
    INSPECT: "Record viewed",
    ADD_NOTE: "Note added",
    DELETE_NOTE: "Note deleted",
    ASSIGN_STAFF: "Staff assigned",
    REALLOCATE_STAFF: "Staff reallocated",
    REMOVE_STAFF: "Staff removed",
    CREATE_DOCUMENT_REQUEST: "Document request created",
    RESEND_DOCUMENT_REQUEST: "Document request resent",
    APPROVE_DOCUMENT: "Certificate approved",
    REJECT_DOCUMENT: "Certificate rejected",
    SUBMIT_DOCUMENTS: "Documents submitted",
    STAFF_CERTIFICATE_CHECK_RECORDED: "Certificate check recorded",
    SCHEDULE_POUR: "Pour scheduled",
    COMPLETE_POUR: "Pour completed",
    REVERT_POUR: "Pour corrected",
    UPLOAD_ATTACHMENT: "Attachment uploaded",
    DELETE_ATTACHMENT: "Attachment deleted",
    REVERT_AUDIT_LOG: "Corrective change recorded",
  };
  return outcomes[record.action] || getEventLabel(record.action);
}

export function isDerivedAuditRecord(record: Pick<AuditRecordLike, "details">): boolean {
  return getAuditDetails(record.details)?.is_derived_request === true;
}

export function getAuditSourceLabel(
  record: Pick<AuditRecordLike, "action" | "user_email" | "details">,
): string {
  const details = getAuditDetails(record.details);
  if (details?.is_derived_request === true) return "Derived from compliance request";
  if (typeof details?.audit_source === "string") {
    const source = formatSafeAuditDetail("source", details.audit_source);
    if (source !== "Restricted") return source;
  }
  return record.user_email ? "Portal user action" : "System-generated";
}

const SAFE_DETAIL_KEYS = new Set([
  "status",
  "requested_certs",
  "completed_at",
  "expires_at",
  "ticket_type",
  "ticket_number",
  "file_name",
  "reference",
  "reason",
  "outcome",
  "source",
]);

export function isSafeAuditDetailKey(key: string): boolean {
  return SAFE_DETAIL_KEYS.has(key);
}

export function formatSafeAuditDetail(key: string, value: unknown): string {
  if (!isSafeAuditDetailKey(key)) return "Restricted";
  if (typeof value === "string" && containsSensitiveAuditText(value)) return "Restricted";
  if (Array.isArray(value)) {
    return value.every((entry) => typeof entry === "string" && !containsSensitiveAuditText(entry))
      ? value.join(", ")
      : "Restricted";
  }
  if (value && typeof value === "object") return "Restricted";
  return formatAuditValue(value);
}

export function getAuditSearchText(
  record: Pick<AuditRecordLike, "action" | "target_type" | "target_id" | "details" | "user_email">,
  targetName?: string,
): string {
  return [
    getAuditOutcomeSummary(record),
    getEventLabel(record.action),
    getAuditTargetLabel(record.target_type),
    getAuditRecordLabel(record, targetName),
    record.user_email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getAuditEventSentence(
  record: Pick<AuditRecordLike, "action" | "target_type" | "target_id" | "details"> &
    Pick<AuditRecordLike, "user_email">,
  targetName?: string,
): string {
  const details = getAuditDetails(record.details);
  const subject = auditSubject(record, targetName);
  const targetNameOrSubject = safeAuditLabel(targetName) || subject;
  const diff = record.action === "UPDATE" ? computeDiff(details?.old, details?.new) : [];
  const targetNoun = getAuditTargetLabel(record.target_type).toLowerCase();

  if (diff.length > 0) {
    const changes = diff
      .slice(0, 3)
      .map(
        (entry) =>
          `${getAuditFieldLabel(entry.field)} changed from ${quoteSentenceValue(entry.field, entry.before)} to ${quoteSentenceValue(entry.field, entry.after)}`,
      );
    const remaining = diff.length - changes.length;
    return `Updated ${subject}: ${changes.join("; ")}${remaining > 0 ? `; and ${remaining} more change${remaining === 1 ? "" : "s"}` : ""}.`;
  }

  const rawPourNumber = details?.pour_number;
  const pourNumber =
    (typeof rawPourNumber === "number" && Number.isFinite(rawPourNumber)) ||
    (typeof rawPourNumber === "string" && /^\d+$/.test(rawPourNumber))
      ? `Pour #${rawPourNumber}`
      : "the pour";
  const actionSentences: Record<string, string> = {
    LOGIN_SUCCESS: "Signed in successfully.",
    LOGIN_FAIL: "A sign-in attempt failed.",
    LOGOUT: "Signed out.",
    PASSWORD_RESET_REQUEST: "Requested a password reset.",
    PASSWORD_RESET_SUCCESS: "Changed the account password.",
    PROFILE_UPDATE: "Updated the account profile.",
    COMPLIANCE_REMINDER_SENT: `Sent a compliance reminder for ${targetNameOrSubject}.`,
    TICKET_EXPIRED: `A certificate expired for ${targetNameOrSubject}.`,
    QUOTE_CONVERTED_TO_JOB: `Converted ${subject} into a site record.`,
    INSPECT: `Viewed ${subject}.`,
    VIEW_DOCUMENT: `Viewed a compliance document for ${targetNameOrSubject}.`,
    REMOVE_DOCUMENT: `Removed a compliance document from ${targetNameOrSubject}.`,
    APPROVE_DOCUMENT: `Approved a compliance document for ${targetNameOrSubject}.`,
    REJECT_DOCUMENT: `Rejected a compliance document for ${targetNameOrSubject}.`,
    SUBMIT_DOCUMENTS: `Submitted compliance documents for ${targetNameOrSubject}.`,
    CREATE_DOCUMENT_REQUEST: `Requested compliance documents for ${targetNameOrSubject}.`,
    RESEND_DOCUMENT_REQUEST: `Resent the compliance document request for ${targetNameOrSubject}.`,
    ASSIGN_STAFF: `Assigned staff to ${subject}.`,
    REALLOCATE_STAFF: `Reallocated staff on ${subject}.`,
    REMOVE_STAFF: `Removed staff from ${subject}.`,
    ADD_NOTE: `Added a note to ${subject}.`,
    DELETE_NOTE: `Deleted a note from ${subject}.`,
    UPLOAD_ATTACHMENT: `Uploaded an attachment to ${subject}.`,
    VIEW_ATTACHMENT: `Viewed an attachment on ${subject}.`,
    DELETE_ATTACHMENT: `Deleted an attachment from ${subject}.`,
    RENAME_ATTACHMENT: `Renamed an attachment on ${subject}.`,
    GENERATE_UPLOAD_LINK: `Generated an upload link for ${subject}.`,
    SCHEDULE_POUR: `Scheduled ${pourNumber} on ${subject}.`,
    COMPLETE_POUR: `Marked ${pourNumber} complete on ${subject}.`,
    REVERT_POUR: `Moved ${pourNumber} back to scheduled on ${subject}.`,
    REMOVE_POUR: `Removed ${pourNumber} from ${subject}.`,
    UPDATE_POUR_NOTES: `Updated the notes for ${pourNumber} on ${subject}.`,
    INVOICE_SENT: `Sent an invoice for ${subject}.`,
    QUOTE_SENT: `Sent a quote for ${subject}.`,
    INVOICE_MARKED_PAID: `Marked an invoice for ${subject} as paid.`,
    STAFF_CERTIFICATE_CHECK_RECORDED: `Recorded a certificate check for ${targetNameOrSubject}.`,
    THIRD_PARTY_STAFF_DOCUMENT_UPLOADED: `Uploaded a third-party document for ${targetNameOrSubject}.`,
    THIRD_PARTY_STAFF_DOCUMENT_REVIEWED: `Reviewed a third-party document for ${targetNameOrSubject}.`,
    THIRD_PARTY_ATTACHMENT_VIEWED: `Viewed a third-party attachment on ${subject}.`,
    THIRD_PARTY_JOB_NOTE_ADDED: `Added a third-party note to ${subject}.`,
    THIRD_PARTY_JOB_NOTE_REPLY_ADDED: `Replied to a third-party note on ${subject}.`,
    TELEGRAM_LINK_CREATED: `Created a Telegram link for ${targetNameOrSubject}.`,
    TELEGRAM_LINK_REVOKED: `Revoked a Telegram link for ${targetNameOrSubject}.`,
    USER_CREATED: "Created a user account.",
    USER_UPDATED: "Updated a user account.",
    USER_DELETED: "Deleted a user account.",
    CREATE: `Created ${subject}.`,
    DELETE: `Deleted ${subject}.`,
  };

  return (
    actionSentences[record.action] ||
    `Recorded system event “${getEventLabel(record.action)}” on ${subject}.`
  );
}

export function getAuditChangeSummary(
  record: Pick<AuditRecordLike, "action" | "target_type" | "target_id" | "details">,
  targetName?: string,
): string {
  return getAuditEventSentence(record, targetName);
}
