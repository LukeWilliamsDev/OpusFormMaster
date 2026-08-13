// Pure helpers for the Telegram handler. Deliberately free of Deno imports so
// Vitest can exercise them directly.

export type UploadFilePayload = {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  caption?: string;
};

export type BridgeRequest = {
  telegram_user_id: string;
  chat_id: string;
  message_id?: number;
  kind: "text" | "callback" | "file";
  payload: { text?: string; file?: UploadFilePayload };
  sender?: { username?: string; first_name?: string };
};

export type HandlerResponse = {
  text: string;
  keyboard?: unknown;
  ack?: { link_added?: string; link_revoked?: string };
};

export const DENY_TEXT = "This bot is invite only. Please contact your dispatcher.";

export function parseCommand(text: string): { command: string; argument: string } | null {
  const match = String(text ?? "")
    .trim()
    .match(/^\/([a-z_]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return {
    command: match[1].toLowerCase(),
    argument: (match[2] ?? "").trim(),
  };
}

export function isValidBridgeSecret(header: string | null, expected: string | undefined): boolean {
  if (!expected || !header) return false;
  if (header.length !== expected.length) return false;
  // Constant-time compare: XOR accumulation over the whole string, so a wrong
  // secret cannot be recovered by timing the response.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function renderWeek(
  shifts: Array<{ date: string; site_name: string; postcode: string | null }>,
): string {
  if (shifts.length === 0) return "No shifts booked in the next 7 days.";
  const lines = shifts.map((shift) => {
    const day = new Date(`${shift.date}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    const where = shift.postcode ? `${shift.site_name} (${shift.postcode})` : shift.site_name;
    return `${day} — ${where}`;
  });
  return `Your next 7 days:\n${lines.join("\n")}`;
}

export function cleanPostcode(postcode: string): string {
  return postcode.trim().toUpperCase().replace(/\s+/g, "");
}

export type GeoPoint = { lat: number; lng: number };

// Ported from src/opus/utils/geo.ts's calculateDistance — edge functions
// cannot import from src/opus, so this is a deliberate small duplicate.
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export type NearbyStaff = { name: string; postcode: string; distanceMiles: number };

export function nearestByDistance(
  origin: GeoPoint,
  candidates: Array<{ name: string; postcode: string; coords: GeoPoint }>,
  limit: number,
): NearbyStaff[] {
  return candidates
    .map((c) => ({
      name: c.name,
      postcode: c.postcode,
      distanceMiles: haversineMiles(origin, c.coords),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
}

export function renderWho(rows: NearbyStaff[]): string {
  if (rows.length === 0) return "No staff records have a postcode set.";
  const lines = rows.map((r) => `${r.name} — ${r.postcode} (${r.distanceMiles.toFixed(1)} mi)`);
  return `Nearest staff:\n${lines.join("\n")}`;
}

// Same whole-day-count logic as supabase/functions/telegram-notify/index.ts's
// daysUntil — duplicated rather than shared across functions (this codebase's
// existing pattern; see isValidBridgeSecret vs telegram-notify's secretOk).
// Kept in sync deliberately: the bot must never give a different compliance
// answer here than the daily digest gives.
export function daysUntil(expiryDate: string, todayIso: string): number | null {
  const expiry = Date.parse(`${expiryDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(expiry)) return null;
  return Math.round((expiry - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

export function ticketStatusLine(what: string, days: number | null, expiryDate?: string): string {
  if (days === null) return `${what}: no expiry date on file`;
  if (days > 0) return `${what} — expires in ${days} day${days === 1 ? "" : "s"} (${expiryDate})`;
  if (days === 0) return `${what} — expires today`;
  return `${what} — expired ${-days} day${days === -1 ? "" : "s"} ago (${expiryDate})`;
}

export function renderStaffStatus(
  name: string,
  ticketLines: string[],
  nextShift: { date: string; site_name: string } | null,
): string {
  const parts = [
    name,
    ticketLines.length ? ticketLines.join("\n") : "No certificates on file.",
    nextShift ? `Next shift: ${nextShift.date} — ${nextShift.site_name}` : "No upcoming shifts.",
  ];
  return parts.join("\n\n");
}

export function renderStaffMatches(names: string[]): string {
  return `Multiple matches — be more specific:\n${names.join("\n")}`;
}

export type JobNoteView = { author: string; body: string };
export type CrewMember = { name: string };

export function renderJobStatus(
  job: {
    job_ref: string;
    site_name: string;
    status: string;
    current_pours: number;
    contract_max_pours: number;
  },
  crew: CrewMember[],
  notes: JobNoteView[],
): string {
  const lines = [
    `${job.job_ref} — ${job.site_name}`,
    `Status: ${job.status}`,
    `Pours: ${job.current_pours}/${job.contract_max_pours}`,
    crew.length ? `Today's crew: ${crew.map((c) => c.name).join(", ")}` : "No crew booked today.",
  ];
  if (notes.length) {
    lines.push("Latest notes:");
    for (const note of notes) lines.push(`• ${note.author}: ${note.body}`);
  }
  return lines.join("\n");
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

// Cheap pre-download filter on client-declared metadata. Not a security
// boundary — sniffFileType() on the downloaded bytes is the real gate,
// since mime_type and the filename extension both come from the client.
export function isDeclaredUploadTypeAllowed(mimeType?: string, fileName?: string): boolean {
  if (mimeType && ALLOWED_UPLOAD_MIME_TYPES.has(mimeType.toLowerCase())) return true;
  const ext = fileName?.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_UPLOAD_EXTENSIONS.has(ext);
}

// Ground truth for what a file actually is. mime_type is client-supplied and
// not evidence (design spec §7.3) — only the bytes decide.
export function sniffFileType(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { mime: "application/pdf", ext: "pdf" };
  }
  return null;
}

// Never the client-supplied filename (design spec §7.3: path-traversal and
// overwrite risk) — a fresh uuid under a server-chosen prefix.
export function buildUploadPath(prefix: string, uuid: string, ext: string): string {
  return `${prefix}/${uuid}.${ext}`;
}
