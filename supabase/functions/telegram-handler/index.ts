import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  BridgeRequest,
  DENY_TEXT,
  HandlerResponse,
  isValidBridgeSecret,
  parseCommand,
  renderWeek,
} from "./lib.ts";

// The bridge authenticates with a shared secret, not a user JWT — it acts for
// Telegram senders who have no Supabase session. Service role is required so
// the function can resolve links regardless of RLS.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function handleStart(body: BridgeRequest, token: string): Promise<HandlerResponse> {
  if (!token) return { text: DENY_TEXT };

  const { data: invite } = await supabase
    .from("telegram_invites")
    .select("token, target_id, expires_at, used_at, tenant_id")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    return { text: DENY_TEXT };
  }

  // One Telegram account binds to exactly one identity.
  const { data: existing } = await supabase
    .from("telegram_links")
    .select("telegram_user_id, target_id")
    .eq("telegram_user_id", body.telegram_user_id)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing && existing.target_id !== invite.target_id) {
    return {
      text: "This Telegram account is already linked to a different Opus Form user.",
    };
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id, name")
    .eq("id", invite.target_id)
    .maybeSingle();

  if (!staff) return { text: DENY_TEXT };

  await supabase.from("telegram_links").upsert(
    {
      telegram_user_id: body.telegram_user_id,
      target_id: invite.target_id,
      class: "staff",
      telegram_username: body.sender?.username ?? null,
      linked_at: new Date().toISOString(),
      revoked_at: null,
      tenant_id: invite.tenant_id,
    },
    { onConflict: "telegram_user_id" },
  );

  await supabase
    .from("telegram_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  // tenant_id is NOT NULL with no default, and under the service role
  // private.current_tenant_id() resolves to null — take it from the invite.
  await supabase.from("audit_logs").insert({
    user_email: null,
    action: "telegram_link_created",
    target_type: "staff",
    target_id: invite.target_id,
    tenant_id: invite.tenant_id,
    details: {
      telegram_user_id: body.telegram_user_id,
      telegram_username: body.sender?.username ?? null,
    },
  });

  return {
    text: `Linked as ${staff.name}. Send /myweek to see your shifts.`,
    ack: { link_added: body.telegram_user_id },
  };
}

async function resolveLink(telegramUserId: string) {
  const { data } = await supabase
    .from("telegram_links")
    .select("target_id")
    .eq("telegram_user_id", telegramUserId)
    .is("revoked_at", null)
    .maybeSingle();
  return data?.target_id ?? null;
}

async function handleMyWeek(targetId: string): Promise<HandlerResponse> {
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("date, jobs(site_name, postcode)")
    .eq("worker_id", targetId)
    .gte("date", today)
    .lte("date", weekEnd)
    .order("date");

  const rows = (shifts ?? []).map((shift: Record<string, unknown>) => {
    const job = shift.jobs as { site_name?: string; postcode?: string } | null;
    return {
      date: shift.date as string,
      site_name: job?.site_name ?? "Unassigned site",
      postcode: job?.postcode ?? null,
    };
  });

  return { text: renderWeek(rows) };
}

/**
 * Alert every linked dispatcher or admin. Roles live on profiles, links point
 * at staff, so the two are joined on email. Sent directly rather than returned,
 * because the reply belongs to the operative who tapped the button.
 */
async function notifyDispatchers(text: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;

  const { data: links } = await supabase
    .from("telegram_links")
    .select("telegram_user_id, staff(email)")
    .is("revoked_at", null);

  for (const link of links ?? []) {
    const email = (link as Record<string, unknown>).staff as { email?: string } | null;
    if (!email?.email) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", email.email)
      .maybeSingle();

    if (profile?.role !== "dispatcher" && profile?.role !== "admin") continue;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: (link as Record<string, unknown>).telegram_user_id,
        text,
      }),
    });
  }
}

async function handleCallback(body: BridgeRequest, targetId: string): Promise<HandlerResponse> {
  const data = String((body.payload as Record<string, unknown>)?.callback_data ?? "");
  const [scope, action, shiftId] = data.split(":");
  if (scope !== "shift" || !shiftId) return { text: "" };

  // Scoped to the tapper's own shift, so a guessed callback_data cannot touch
  // anyone else's roster.
  const { data: shift } = await supabase
    .from("shifts")
    .select("id, date, tenant_id, jobs(site_name)")
    .eq("id", shiftId)
    .eq("worker_id", targetId)
    .maybeSingle();

  if (!shift) return { text: "That shift is no longer assigned to you." };

  const confirming = action === "confirm";
  await supabase
    .from("shifts")
    .update(
      confirming
        ? { confirmed_at: new Date().toISOString(), declined_at: null }
        : { declined_at: new Date().toISOString(), confirmed_at: null },
    )
    .eq("id", shiftId);

  const { data: staff } = await supabase
    .from("staff")
    .select("name")
    .eq("id", targetId)
    .maybeSingle();

  const job = (shift as Record<string, unknown>).jobs as { site_name?: string } | null;
  const site = job?.site_name ?? "site";
  const when = (shift as Record<string, unknown>).date as string;

  await supabase.from("audit_logs").insert({
    user_email: null,
    action: confirming ? "telegram_shift_confirmed" : "telegram_shift_declined",
    target_type: "shift",
    target_id: shiftId,
    tenant_id: (shift as Record<string, unknown>).tenant_id as string,
    details: { worker_id: targetId, telegram_user_id: body.telegram_user_id },
  });

  if (!confirming) {
    await notifyDispatchers(`${staff?.name ?? "An operative"} cannot make ${site} on ${when}.`);
  }

  return {
    text: confirming
      ? `Thanks — you're confirmed for ${site} on ${when}.`
      : `Noted. Your dispatcher has been told you can't make ${site} on ${when}.`,
  };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (
    !isValidBridgeSecret(
      req.headers.get("x-opusform-bridge-secret"),
      // Named to match the VPS pair OPUSFORM_HANDLER_URL / OPUSFORM_HANDLER_SECRET.
      Deno.env.get("OPUSFORM_HANDLER_SECRET"),
    )
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await req.json()) as BridgeRequest;
  const command = parseCommand(body.payload?.text ?? "");

  let result: HandlerResponse = { text: DENY_TEXT };

  if (command?.command === "start") {
    result = await handleStart(body, command.argument);
  } else {
    const targetId = await resolveLink(body.telegram_user_id);
    if (!targetId) {
      // The bridge only forwards non-/start traffic for senders it believes are
      // allowlisted, so no active link means access was revoked in the portal.
      // Tell the bridge to drop them locally. Senders learn nothing either way.
      result = { text: DENY_TEXT, ack: { link_revoked: body.telegram_user_id } };
    } else if (body.kind === "callback") {
      result = await handleCallback(body, targetId);
    } else if (body.kind === "file") {
      result = {
        text: "Sending files here is not available yet. Please use the upload link you were sent.",
      };
    } else {
      await supabase
        .from("telegram_links")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("telegram_user_id", body.telegram_user_id);

      result =
        command?.command === "myweek"
          ? await handleMyWeek(targetId)
          : { text: "Commands: /myweek" };
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
  });
});
