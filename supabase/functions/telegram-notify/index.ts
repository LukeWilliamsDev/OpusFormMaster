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

  return new Response(JSON.stringify({ reminders }), {
    headers: { "content-type": "application/json" },
  });
});
