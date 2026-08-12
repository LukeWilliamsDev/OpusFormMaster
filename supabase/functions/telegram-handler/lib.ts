// Pure helpers for the Telegram handler. Deliberately free of Deno imports so
// Vitest can exercise them directly.

export type BridgeRequest = {
  telegram_user_id: string;
  chat_id: string;
  message_id?: number;
  kind: "text" | "callback" | "file";
  payload: { text?: string };
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
