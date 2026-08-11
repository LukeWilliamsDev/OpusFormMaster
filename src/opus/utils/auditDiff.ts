const IGNORED_FIELDS = ["id", "created_at", "updated_at", "tenant_id"];

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
  TICKET_EXPIRED: "Ticket expired",
  QUOTE_CONVERTED_TO_JOB: "Quote converted to job",
  INSPECT: "Record viewed",
  VIEW_DOCUMENT: "Document viewed",
  REMOVE_DOCUMENT: "Document removed",
  CREATE_DOCUMENT_REQUEST: "Document request created",
  RESEND_DOCUMENT_REQUEST: "Document request resent",
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
  CREATE: "Record created",
  UPDATE: "Record updated",
  DELETE: "Record deleted",
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
