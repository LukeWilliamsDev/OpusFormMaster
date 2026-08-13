import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Scheduled sender. Called by pg_cron via pg_net, never by the bridge — a dead
// bridge must not stop a crew being told about tomorrow's shift.
//
// Holds the BotFather token and talks to api.telegram.org directly. The bridge
// deliberately has no token, so this is the only outbound path for messages
// nobody replied to first.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

function secretOk(header: string | null): boolean {
  const expected = Deno.env.get("OPUSFORM_HANDLER_SECRET");
  if (!expected || !header || header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

async function sendTelegram(chatId: string, text: string, keyboard?: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    }),
  });
  const body = await res.json().catch(() => null);
  return Boolean(body?.ok);
}

/**
 * Claim a send before making it. The unique index on (kind, dedupe_key) means a
 * second attempt inserts nothing, so a cron that fires twice — or overlaps with
 * a retry — cannot double-send. If the send then fails we release the claim so
 * the next run picks it up again.
 */
async function claim(
  telegramUserId: string,
  kind: string,
  dedupeKey: string,
  tenantId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("telegram_notifications")
    .insert({
      telegram_user_id: telegramUserId,
      kind,
      dedupe_key: dedupeKey,
      tenant_id: tenantId,
    })
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

async function release(kind: string, dedupeKey: string) {
  await supabase
    .from("telegram_notifications")
    .delete()
    .eq("kind", kind)
    .eq("dedupe_key", dedupeKey);
}

async function sendShiftReminders() {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, worker_id, date, tenant_id, jobs(site_name, postcode)")
    .eq("date", tomorrow);

  // A failed query previously returned null and looked identical to "nothing to
  // send". Surface it instead — that ambiguity hid a missing foreign key.
  if (error) return { error: error.message, candidates: 0, sent: 0, failed: 0, skipped: 0 };

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const shift of shifts ?? []) {
    const row = shift as Record<string, unknown>;
    const shiftId = row.id as string;

    const { data: link } = await supabase
      .from("telegram_links")
      .select("telegram_user_id")
      .eq("target_id", row.worker_id as string)
      .is("revoked_at", null)
      .maybeSingle();

    if (!link) {
      skipped += 1;
      continue;
    }

    const kind = "shift_reminder";
    const dedupeKey = shiftId;
    if (!(await claim(link.telegram_user_id, kind, dedupeKey, row.tenant_id as string))) {
      // Already claimed by an earlier run, or the insert failed. Either way it
      // is a deliberate no-send, not a success.
      skipped += 1;
      continue;
    }

    const job = row.jobs as { site_name?: string; postcode?: string } | null;
    // shifts carries a date but no start time, so the reminder names the site
    // rather than a time. Adding a time means adding it to the roster editor too.
    const where = job?.postcode
      ? `${job.site_name ?? "your site"} (${job.postcode})`
      : (job?.site_name ?? "your site");

    const ok = await sendTelegram(
      link.telegram_user_id,
      `Tomorrow you are on site at ${where}.\n\nCan you make it?`,
      [
        [
          { text: "Yes, I'll be there", callback_data: `shift:confirm:${shiftId}` },
          { text: "Can't make it", callback_data: `shift:decline:${shiftId}` },
        ],
      ],
    );

    if (ok) {
      sent += 1;
    } else {
      failed += 1;
      await release(kind, dedupeKey);
    }
  }

  return { candidates: (shifts ?? []).length, sent, failed, skipped };
}

// Same thresholds the Dashboard uses at src/opus/pages/Dashboard.tsx:239 — a 30
// day window, day zero being the lockout. The bot and the portal must not give
// different answers to the same compliance question.
const EXPIRY_THRESHOLDS = [30, 14, 7, 0];

// How far past expiry a ticket still earns a lockout notice. Without a floor,
// the first run after deploy would message everyone holding a certificate that
// lapsed years ago. Wide enough to cover a run of missed crons, no wider.
const EXPIRY_LOOKBACK_DAYS = 14;

// Who counts as a dispatcher. Matches private.can_write_ops and MANAGEMENT_ROLES
// in src/opus/context/PortalContext.tsx:100 — there is no 'dispatcher' member of
// the app_role enum, and naming one errors the query rather than matching nothing.
const OPS_ROLES = ["admin", "director", "logistics_coordinator"];

type Ticket = { id?: string; type?: string; expiryDate?: string; ticketNumber?: string };

/**
 * The threshold a ticket currently sits in: the tightest one it has already
 * reached. Matching a band rather than an exact day means a missed cron run
 * catches up the next day instead of losing that warning — and because the
 * ledger key carries the threshold, a band that has already been sent stays
 * sent. A long outage skips straight to the tightest band reached, which is the
 * only one still worth sending.
 */
function expiryThreshold(days: number): number | null {
  if (days < -EXPIRY_LOOKBACK_DAYS) return null;
  const reached = EXPIRY_THRESHOLDS.filter((t) => t >= days);
  return reached.length === 0 ? null : Math.min(...reached);
}

/** Whole days from UTC midnight today to UTC midnight on the expiry date. */
function daysUntil(expiryDate: string, todayIso: string): number | null {
  const expiry = Date.parse(`${expiryDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(expiry)) return null;
  return Math.round((expiry - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

/**
 * Telegram ids of everyone with a dispatcher or admin profile and a live link,
 * with the tenant of the staff row behind the link.
 *
 * Two plain queries rather than a staff(...) embed. An embed that PostgREST
 * cannot resolve returns null, which is indistinguishable from "no dispatchers"
 * — the same ambiguity that hid the missing shifts foreign key. Nothing here is
 * hot enough to be worth that risk.
 */
async function dispatcherRecipients(): Promise<Array<{ chatId: string; tenantId: string }>> {
  const { data: links } = await supabase
    .from("telegram_links")
    .select("telegram_user_id, target_id")
    .is("revoked_at", null);

  if (!links?.length) return [];

  const { data: staff } = await supabase
    .from("staff")
    .select("id, email, tenant_id")
    .in(
      "id",
      links.map((l) => l.target_id),
    );

  const staffById = new Map(
    (staff ?? []).map((s) => [s.id as string, s as { email?: string; tenant_id?: string }]),
  );

  const byEmail = new Map<string, { chatId: string; tenantId: string }>();
  for (const link of links) {
    const person = staffById.get(link.target_id as string);
    const email = person?.email?.toLowerCase();
    if (email && person?.tenant_id) {
      byEmail.set(email, {
        chatId: link.telegram_user_id as string,
        tenantId: person.tenant_id,
      });
    }
  }
  if (byEmail.size === 0) return [];

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("email")
    .in("role", OPS_ROLES);

  // profiles.role is the app_role enum. Filtering on a label the enum does not
  // have makes Postgres reject the whole query, and a null result reads exactly
  // like "no dispatchers exist" — which is how 'dispatcher' silently swallowed
  // every alert. Never let this one fail quietly again.
  if (error) {
    console.error("dispatcherRecipients: profiles query failed", error.message);
    return [];
  }

  return (profiles ?? [])
    .map((p) => byEmail.get(String(p.email).toLowerCase()))
    .filter((r): r is { chatId: string; tenantId: string } => Boolean(r));
}

async function sendCertExpiryWarnings() {
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, name, tenant_id, tickets")
    .eq("is_archived", false);

  if (error) return { error: error.message, candidates: 0, sent: 0, failed: 0, skipped: 0 };

  // Every ticket at a threshold today, whether or not its holder has a link —
  // the digest reports on the whole crew, not only the reachable part.
  const due: Array<{
    staffId: string;
    staffName: string;
    tenantId: string;
    ticket: Ticket;
    days: number;
    threshold: number;
  }> = [];

  for (const person of staff ?? []) {
    const row = person as Record<string, unknown>;
    for (const ticket of (row.tickets as Ticket[] | null) ?? []) {
      if (!ticket?.expiryDate) continue;
      const days = daysUntil(ticket.expiryDate, todayIso);
      if (days === null) continue;
      const threshold = expiryThreshold(days);
      if (threshold === null) continue;
      due.push({
        staffId: row.id as string,
        staffName: (row.name as string) ?? "An operative",
        tenantId: row.tenant_id as string,
        ticket,
        days,
        threshold,
      });
    }
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const kind = "cert_expiry";

  for (const item of due) {
    const { data: link } = await supabase
      .from("telegram_links")
      .select("telegram_user_id")
      .eq("target_id", item.staffId)
      .is("revoked_at", null)
      .maybeSingle();

    if (!link) {
      skipped += 1;
      continue;
    }

    const ticketId = item.ticket.id ?? item.ticket.type ?? "ticket";
    const dedupeKey = `${item.staffId}:${ticketId}:${item.threshold}`;
    if (!(await claim(link.telegram_user_id, kind, dedupeKey, item.tenantId))) {
      skipped += 1;
      continue;
    }

    const what = item.ticket.type ?? "certificate";
    const lockout =
      " Until it is renewed you cannot be booked on site — send your dispatcher the new one as soon as you have it.";
    const text =
      item.days > 0
        ? `Your ${what} expires in ${item.days} day${item.days === 1 ? "" : "s"} (${item.ticket.expiryDate}).\n\nGet it renewed and send your dispatcher the new one.`
        : item.days === 0
          ? `Your ${what} expires today.${lockout}`
          : `Your ${what} expired on ${item.ticket.expiryDate}.${lockout}`;

    if (await sendTelegram(link.telegram_user_id, text)) {
      sent += 1;
    } else {
      failed += 1;
      await release(kind, dedupeKey);
    }
  }

  const digest = await sendDispatcherDigest(due, todayIso);

  return { candidates: due.length, sent, failed, skipped, digest };
}

/**
 * One message a day per dispatcher — a count and the most urgent cases. One
 * message per ticket would make the channel unreadable in a week.
 */
async function sendDispatcherDigest(
  due: Array<{ staffName: string; ticket: Ticket; days: number }>,
  todayIso: string,
) {
  if (due.length === 0) return { recipients: 0, sent: 0, failed: 0, skipped: 0 };

  const urgent = [...due].sort((a, b) => a.days - b.days).slice(0, 5);
  const lines = urgent.map(
    (d) =>
      `• ${d.staffName} — ${d.ticket.type ?? "certificate"} ${
        d.days > 0
          ? `expires in ${d.days} day${d.days === 1 ? "" : "s"}`
          : d.days === 0
            ? "expires today"
            : `expired ${-d.days} day${d.days === -1 ? "" : "s"} ago`
      }`,
  );
  const more = due.length > urgent.length ? `\n…and ${due.length - urgent.length} more.` : "";
  const text = `Certificate expiries — ${due.length} to action.\n\n${lines.join("\n")}${more}`;

  const kind = "cert_expiry";
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Reported so that zero recipients is visible as zero recipients, and never
  // again mistaken for a quiet success.
  const recipients = await dispatcherRecipients();

  for (const recipient of recipients) {
    const dedupeKey = `digest:${todayIso}:${recipient.chatId}`;
    if (!(await claim(recipient.chatId, kind, dedupeKey, recipient.tenantId))) {
      skipped += 1;
      continue;
    }
    if (await sendTelegram(recipient.chatId, text)) {
      sent += 1;
    } else {
      failed += 1;
      await release(kind, dedupeKey);
    }
  }

  return { recipients: recipients.length, sent, failed, skipped };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!secretOk(req.headers.get("x-opusform-bridge-secret"))) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const reminders = await sendShiftReminders();
  const certExpiry = await sendCertExpiryWarnings();

  return new Response(JSON.stringify({ reminders, certExpiry }), {
    headers: { "content-type": "application/json" },
  });
});
