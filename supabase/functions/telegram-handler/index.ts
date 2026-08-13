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

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (
    !isValidBridgeSecret(
      req.headers.get("x-opusform-bridge-secret"),
      Deno.env.get("OPUSFORM_BRIDGE_SECRET"),
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
      // Nothing issues inline keyboards yet; the bridge still acknowledges it.
      result = { text: "" };
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
