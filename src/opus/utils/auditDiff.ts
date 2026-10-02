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
  const [name] = email.split("@");
  return name
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
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

export function getAuditFieldLabel(field: string): string {
  return AUDIT_FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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
      .find((value) => typeof value === "string" && value.trim().length > 0);
    if (typeof label === "string") return label;
  }
  return undefined;
}

function quoteSentenceValue(value: unknown): string {
  const formatted = formatAuditValue(value);
  return formatted === "Empty" ? "empty" : `“${formatted}”`;
}

function auditSubject(
  record: Pick<AuditRecordLike, "target_type" | "target_id" | "details">,
  targetName?: string,
): string {
  const details = getAuditDetails(record.details);
  const inferredName = inferAuditTargetName(record.target_type, details);
  const label = targetName || inferredName;
  const targetType = getAuditTargetLabel(record.target_type).toLowerCase();
  return label ? `${targetType} “${label}”` : `${targetType} (ID ${record.target_id})`;
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

export function getAuditEventSentence(
  record: Pick<AuditRecordLike, "action" | "target_type" | "target_id" | "details"> &
    Pick<AuditRecordLike, "user_email">,
  targetName?: string,
): string {
  const details = getAuditDetails(record.details);
  const subject = auditSubject(record, targetName);
  const targetNameOrSubject =
    targetName || inferAuditTargetName(record.target_type, details) || subject;
  const diff = record.action === "UPDATE" ? computeDiff(details?.old, details?.new) : [];
  const targetNoun = getAuditTargetLabel(record.target_type).toLowerCase();

  if (diff.length > 0) {
    const changes = diff
      .slice(0, 3)
      .map(
        (entry) =>
          `${getAuditFieldLabel(entry.field)} changed from ${quoteSentenceValue(entry.before)} to ${quoteSentenceValue(entry.after)}`,
      );
    const remaining = diff.length - changes.length;
    return `Updated ${subject}: ${changes.join("; ")}${remaining > 0 ? `; and ${remaining} more change${remaining === 1 ? "" : "s"}` : ""}.`;
  }

  const pourNumber = details?.pour_number != null ? `Pour #${details.pour_number}` : "the pour";
  const actionSentences: Record<string, string> = {
    LOGIN_SUCCESS: "Signed in successfully.",
    LOGIN_FAIL: `A sign-in attempt failed for ${record.user_email || "this account"}.`,
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
