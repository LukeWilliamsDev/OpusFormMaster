import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  BridgeRequest,
  buildUploadPath,
  cleanPostcode,
  daysUntil,
  DENY_TEXT,
  GeoPoint,
  HandlerResponse,
  isDeclaredUploadTypeAllowed,
  isManagementRole,
  isValidBridgeSecret,
  MAX_UPLOAD_BYTES,
  nearestByDistance,
  parseCommand,
  renderJobStatus,
  renderStaffMatches,
  renderStaffStatus,
  renderToday,
  renderWeek,
  renderWho,
  sniffFileType,
  ticketStatusLine,
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

// staff.email → profiles.role, the same join notifyDispatchers uses below.
// Roles are read fresh on every call, never cached — a role change in the
// portal must take effect on the sender's very next message (design spec §5).
async function resolveRole(targetId: string): Promise<string | null> {
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("email")
    .eq("id", targetId)
    .maybeSingle();
  if (staffError) {
    console.error("resolveRole: staff query failed", staffError.message);
    return null;
  }
  const email = staff?.email?.toLowerCase();
  if (!email) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    console.error("resolveRole: profiles query failed", error.message);
    return null;
  }
  return profile?.role ?? null;
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

function hashFallbackCoords(postcode: string): GeoPoint {
  let hash = 0;
  for (let i = 0; i < postcode.length; i += 1) hash = postcode.charCodeAt(i) + ((hash << 5) - hash);
  const lat = 52.5 + (Math.abs(hash % 100) / 100) * 1.5;
  const lng = -1.5 - (Math.abs((hash >> 2) % 100) / 100) * 1.5;
  return { lat, lng };
}

// One postcodes.io bulk POST for the whole candidate set rather than one
// fetch per staff member — a 30-strong roster would otherwise mean 30
// sequential HTTP round trips per /who. Falls back to the same hash-based
// math src/opus/utils/geo.ts uses for unrecognized postcodes (not its
// hardcoded-prefix shortcuts) on API failure.
async function bulkGeocode(
  postcodes: string[],
): Promise<{ coords: Map<string, GeoPoint>; resolved: Set<string> }> {
  const unique = [...new Set(postcodes.map(cleanPostcode))].filter(Boolean);
  const coords = new Map<string, GeoPoint>();
  const resolved = new Set<string>();
  if (unique.length === 0) return { coords, resolved };

  try {
    const res = await fetch("https://api.postcodes.io/postcodes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postcodes: unique.slice(0, 100) }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const body = await res.json();
      for (const entry of body.result ?? []) {
        if (entry?.result) {
          const code = cleanPostcode(entry.query);
          coords.set(code, {
            lat: entry.result.latitude,
            lng: entry.result.longitude,
          });
          resolved.add(code);
        }
      }
    }
  } catch (err) {
    console.error("bulkGeocode: postcodes.io request failed", err);
  }

  for (const code of unique) {
    if (!coords.has(code)) coords.set(code, hashFallbackCoords(code));
  }
  return { coords, resolved };
}

async function handleWho(argument: string): Promise<HandlerResponse> {
  const postcode = argument.trim();
  if (!postcode) return { text: "Usage: /who <postcode>" };

  const { data: staff, error } = await supabase
    .from("staff")
    .select("name, postcode")
    .eq("is_archived", false)
    .not("postcode", "is", null);

  if (error) {
    console.error("handleWho: staff query failed", error.message);
    return { text: "Something went wrong — please try again shortly." };
  }
  if (!staff || staff.length === 0) {
    return { text: "No staff records have a postcode set." };
  }

  const { coords, resolved } = await bulkGeocode([
    postcode,
    ...staff.map((s) => s.postcode as string),
  ]);
  const originKey = cleanPostcode(postcode);
  if (!resolved.has(originKey)) return { text: "Couldn't look up that postcode." };
  const origin = coords.get(originKey)!;

  const candidates = staff
    .map((s) => {
      const key = cleanPostcode(s.postcode as string);
      if (!resolved.has(key)) return null;
      const point = coords.get(key);
      return point
        ? { name: s.name as string, postcode: s.postcode as string, coords: point }
        : null;
    })
    .filter((c): c is { name: string; postcode: string; coords: GeoPoint } => c !== null);

  if (candidates.length === 0) return { text: "Couldn't locate any staff postcodes." };

  return { text: renderWho(nearestByDistance(origin, candidates, 5)) };
}

async function handleJob(argument: string): Promise<HandlerResponse> {
  const ref = argument.trim();
  if (!ref) return { text: "Usage: /job <ref>" };

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, job_ref, site_name, status, current_pours, contract_max_pours")
    .ilike("job_ref", ref)
    .maybeSingle();

  if (error) {
    console.error("handleJob: jobs query failed", error.message);
    return { text: "Something went wrong — please try again shortly." };
  }
  if (!job) return { text: `No job found matching ${ref}.` };

  const today = new Date().toISOString().slice(0, 10);

  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("staff(name)")
    .eq("job_id", job.id)
    .eq("date", today);
  if (shiftsError) {
    console.error("handleJob: shifts query failed", shiftsError.message);
    return { text: "Something went wrong — please try again shortly." };
  }
  const crew = (shifts ?? [])
    .map((row) => (row as Record<string, unknown>).staff as { name?: string } | null)
    .filter((s): s is { name: string } => Boolean(s?.name))
    .map((s) => ({ name: s.name }));

  const { data: notes, error: notesError } = await supabase
    .from("job_notes")
    .select("body, author_type, author_staff_id, user_email")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })
    .limit(3);
  if (notesError) {
    console.error("handleJob: job_notes query failed", notesError.message);
    return { text: "Something went wrong — please try again shortly." };
  }

  const authorIds = (notes ?? [])
    .filter((n) => n.author_type === "operative" && n.author_staff_id)
    .map((n) => n.author_staff_id as string);

  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: authors, error: authorsError } = await supabase
      .from("staff")
      .select("id, name")
      .in("id", authorIds);
    if (authorsError) {
      console.error("handleJob: staff query failed", authorsError.message);
      return { text: "Something went wrong — please try again shortly." };
    }
    for (const a of authors ?? []) authorNames.set(a.id as string, a.name as string);
  }

  const noteViews = (notes ?? []).map((n) => ({
    author:
      n.author_type === "operative"
        ? authorNames.get(n.author_staff_id as string) || "Operative"
        : (n.user_email as string) || "Dispatcher",
    body: n.body as string,
  }));

  return { text: renderJobStatus(job, crew, noteViews) };
}

async function handleStaff(argument: string): Promise<HandlerResponse> {
  const name = argument.trim();
  if (!name) return { text: "Usage: /staff <name>" };

  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, name, tickets")
    .eq("is_archived", false)
    .ilike("name", `%${name}%`);

  if (error) {
    console.error("handleStaff: staff query failed", error.message);
    return { text: "Something went wrong — please try again shortly." };
  }

  if (!staff || staff.length === 0) {
    return { text: `No staff found matching ${name}.` };
  }

  if (staff.length >= 2) {
    const names = staff.slice(0, 5).map((s) => s.name as string);
    return { text: renderStaffMatches(names) };
  }

  // Exactly 1 match
  const member = staff[0];
  const today = new Date().toISOString().slice(0, 10);

  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("date, jobs(site_name)")
    .eq("worker_id", member.id as string)
    .gte("date", today)
    .order("date")
    .limit(1);

  if (shiftsError) {
    console.error("handleStaff: shifts query failed", shiftsError.message);
    return { text: "Something went wrong — please try again shortly." };
  }

  const nextShift =
    shifts && shifts.length > 0
      ? {
          date: (shifts[0] as Record<string, unknown>).date as string,
          site_name:
            ((shifts[0] as Record<string, unknown>).jobs as { site_name?: string } | null)
              ?.site_name || "Unassigned site",
        }
      : null;

  const tickets = (member.tickets as Array<{ type?: string; expiryDate?: string }> | null) ?? [];
  const ticketLines = tickets.map((t) => {
    const days = t.expiryDate ? daysUntil(t.expiryDate, today) : null;
    return ticketStatusLine(t.type || "Certificate", days, t.expiryDate);
  });

  return { text: renderStaffStatus(member.name as string, ticketLines, nextShift) };
}

async function handleToday(): Promise<HandlerResponse> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("job_id, jobs(site_name, postcode)")
    .eq("date", today);

  if (error) {
    console.error("handleToday: shifts query failed", error.message);
    return { text: "Something went wrong — please try again shortly." };
  }

  const byJob = new Map<
    string,
    { site_name: string; postcode: string | null; crewCount: number }
  >();
  for (const row of shifts ?? []) {
    const jobId = row.job_id as string;
    const job = (row as Record<string, unknown>).jobs as {
      site_name?: string;
      postcode?: string;
    } | null;
    const existing = byJob.get(jobId);
    if (existing) {
      existing.crewCount += 1;
    } else {
      byJob.set(jobId, {
        site_name: job?.site_name || "Unassigned site",
        postcode: job?.postcode ?? null,
        crewCount: 1,
      });
    }
  }

  return { text: renderToday([...byJob.values()]) };
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

  const byEmail = new Map<string, string>();
  for (const link of links ?? []) {
    const row = link as Record<string, unknown>;
    const email = (row.staff as { email?: string } | null)?.email?.toLowerCase();
    if (email) byEmail.set(email, row.telegram_user_id as string);
  }
  if (byEmail.size === 0) return;

  // One lookup for the whole set rather than one per link. Filtering by role
  // rather than by email keeps it case-safe — matching happens in the map below,
  // where both sides are already lowercased.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("email")
    // Matches private.can_write_ops and MANAGEMENT_ROLES in
    // src/opus/context/PortalContext.tsx:100. There is no 'dispatcher' member of
    // the app_role enum: naming one made Postgres reject the whole query, so
    // every decline alert was silently dropped from the day this shipped.
    .in("role", ["admin", "director", "logistics_coordinator"]);

  if (error) {
    console.error("notifyDispatchers: profiles query failed", error.message);
    return;
  }

  const recipients = (profiles ?? [])
    .map((p) => byEmail.get(String(p.email).toLowerCase()))
    .filter((id): id is string => Boolean(id));

  // Independent sends — one slow or failing recipient must not delay the rest,
  // and none of them should delay the reply to the operative who tapped.
  await Promise.allSettled(
    recipients.map((chatId) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }),
    ),
  );
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

const UPLOAD_RATE_LIMIT_PER_HOUR = 10;

type UploadContext =
  | { kind: "document_request"; requestId: string }
  | { kind: "job"; jobId: string; tenantId: string }
  | { kind: "none" }
  | { kind: "ambiguous"; message: string }
  | { kind: "error" };

// "Open request" per design spec §7.2: a live document_requests row wins —
// it's the reason the operative was messaged at all. Falling back to today's
// shift lets an unprompted job photo still land somewhere sensible. Either
// query erroring must not fall through to the other path silently (handoff
// §6: a query that errors returns null, indistinguishable from "no rows").
async function resolveUploadContext(targetId: string): Promise<UploadContext> {
  const { data: requests, error: requestsError } = await supabase
    .from("document_requests")
    .select("id")
    .eq("worker_id", targetId)
    .is("completed_at", null)
    .gt("expires_at", new Date().toISOString());

  if (requestsError) {
    console.error("resolveUploadContext: document_requests query failed", requestsError.message);
    return { kind: "error" };
  }
  if (requests.length === 1) {
    return { kind: "document_request", requestId: requests[0].id };
  }
  if (requests.length > 1) {
    return {
      kind: "ambiguous",
      message:
        "You have more than one open document request — please use the link you were sent instead.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("job_id, tenant_id")
    .eq("worker_id", targetId)
    .eq("date", today);

  if (shiftsError) {
    console.error("resolveUploadContext: shifts query failed", shiftsError.message);
    return { kind: "error" };
  }
  if (shifts.length === 1 && shifts[0].job_id) {
    return { kind: "job", jobId: shifts[0].job_id, tenantId: shifts[0].tenant_id };
  }
  if (shifts.length > 1) {
    return {
      kind: "ambiguous",
      message: "You're on more than one job today — please add this from the portal instead.",
    };
  }

  return { kind: "none" };
}

// Fails closed on a query error — an unreadable count must not be treated as
// zero, or a flaky read becomes a bypassed limit.
async function isUploadRateLimited(context: UploadContext, staffLabel: string): Promise<boolean> {
  const since = new Date(Date.now() - 3_600_000).toISOString();

  if (context.kind === "document_request") {
    // The Storage API's own list(), not a PostgREST query against
    // storage.objects — that schema isn't exposed to PostgREST on this
    // project and returns 406.
    const { data, error } = await supabase.storage
      .from("compliance-documents")
      .list(`requests/${context.requestId}`, { limit: 100 });
    if (error) {
      console.error("isUploadRateLimited: storage list failed", error.message);
      return true;
    }
    const recent = (data ?? []).filter((obj) => (obj.created_at ?? "") >= since);
    return recent.length >= UPLOAD_RATE_LIMIT_PER_HOUR;
  }

  if (context.kind === "job") {
    const { count, error } = await supabase
      .from("job_attachments")
      .select("id", { count: "exact", head: true })
      .eq("job_id", context.jobId)
      .eq("uploaded_by", staffLabel)
      .gte("uploaded_at", since);
    if (error) {
      console.error("isUploadRateLimited: job_attachments count failed", error.message);
      return true;
    }
    return (count ?? 0) >= UPLOAD_RATE_LIMIT_PER_HOUR;
  }

  return false;
}

// The bot token never leaves Supabase (design spec §4) — getFile and the
// download both happen here, never on the bridge.
async function fetchTelegramFile(fileId: string, token: string): Promise<Uint8Array | null> {
  const metaRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  const meta = await metaRes.json();
  if (!meta.ok || !meta.result?.file_path) return null;

  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${meta.result.file_path}`);
  if (!fileRes.ok) return null;

  return new Uint8Array(await fileRes.arrayBuffer());
}

async function handleFile(body: BridgeRequest, targetId: string): Promise<HandlerResponse> {
  const file = body.payload?.file;
  if (!file?.file_id) return { text: "" };

  if (file.file_size && file.file_size > MAX_UPLOAD_BYTES) {
    return { text: "That file's too large — 20 MB max." };
  }
  if (!isDeclaredUploadTypeAllowed(file.mime_type, file.file_name)) {
    return { text: "Only photos and PDFs are accepted." };
  }

  const context = await resolveUploadContext(targetId);
  if (context.kind === "error") {
    return { text: "Something went wrong — please try again shortly." };
  }
  if (context.kind === "none") {
    return { text: "Nothing open to attach this to right now." };
  }
  if (context.kind === "ambiguous") {
    return { text: context.message };
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("name")
    .eq("id", targetId)
    .maybeSingle();
  const staffLabel = `Telegram: ${staff?.name ?? "Operative"}`;

  if (await isUploadRateLimited(context, staffLabel)) {
    return { text: "You've hit the upload limit for now — try again in an hour." };
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return { text: "Uploads aren't available right now." };

  const bytes = await fetchTelegramFile(file.file_id, token);
  if (!bytes || bytes.byteLength === 0) {
    return { text: "Couldn't retrieve that file — please try again." };
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return { text: "That file's too large — 20 MB max." };
  }

  const sniffed = sniffFileType(bytes);
  if (!sniffed) {
    return { text: "Only photos and PDFs are accepted." };
  }

  if (context.kind === "document_request") {
    const path = buildUploadPath(`requests/${context.requestId}`, crypto.randomUUID(), sniffed.ext);
    const { error: uploadError } = await supabase.storage
      .from("compliance-documents")
      .upload(path, bytes, { contentType: sniffed.mime, upsert: false });
    if (uploadError) {
      console.error("handleFile: compliance-documents upload failed", uploadError.message);
      return { text: "Something went wrong saving that file — please try again." };
    }

    const { error: appendError } = await supabase.rpc("append_document_request_upload", {
      p_request_id: context.requestId,
      p_upload: {
        path,
        file_name: file.file_name || null,
        caption: file.caption || null,
        telegram_user_id: body.telegram_user_id,
        uploaded_at: new Date().toISOString(),
      },
    });
    if (appendError) {
      console.error("handleFile: append_document_request_upload failed", appendError.message);
      return { text: "Something went wrong saving that file — please try again." };
    }

    return {
      text: "Got it — that's been added to your document request. Your dispatcher will follow up if anything else is needed.",
    };
  }

  // context.kind === "job"
  const path = buildUploadPath(`jobs/${context.jobId}`, crypto.randomUUID(), sniffed.ext);
  const { error: uploadError } = await supabase.storage
    .from("job-attachments")
    .upload(path, bytes, { contentType: sniffed.mime, upsert: false });
  if (uploadError) {
    console.error("handleFile: job-attachments upload failed", uploadError.message);
    return { text: "Something went wrong saving that file — please try again." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("job-attachments").getPublicUrl(path);

  const { error: insertError } = await supabase.from("job_attachments").insert({
    job_id: context.jobId,
    // job_attachments has no tenant_id column despite its original migration
    // declaring one — live schema has diverged from the repo (handoff §4).
    type: "document",
    file_name: file.file_name || `telegram-${crypto.randomUUID()}.${sniffed.ext}`,
    file_url: publicUrl,
    file_size_bytes: bytes.byteLength,
    uploaded_by: staffLabel,
  });
  if (insertError) {
    console.error("handleFile: job_attachments insert failed", insertError.message);
    return { text: "Something went wrong saving that file — please try again." };
  }

  if (file.caption?.trim()) {
    await supabase.from("job_notes").insert({
      job_id: context.jobId,
      tenant_id: context.tenantId,
      author_type: "operative",
      author_staff_id: targetId,
      body: file.caption.trim(),
    });
  }

  return { text: "Added to the job. Thanks!" };
}

// Fire-and-forget — never awaited, so a slow or failed indicator can't delay
// or break the real reply. Only telegram-handler can send this — the bridge
// deliberately holds no bot token (design spec §4.3).
function sendTypingIndicator(chatId: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch((err) => console.error("sendTypingIndicator: request failed", err));
}

// Telegram's typing indicator auto-expires after ~5s, so a single call goes
// stale on anything slower (a cold geocode lookup, a slow query). Resend every
// 4s — under the expiry, so the indicator never visibly drops — until the
// caller stops it right before the real reply is sent.
function startTypingLoop(chatId: string): () => void {
  sendTypingIndicator(chatId);
  const interval = setInterval(() => sendTypingIndicator(chatId), 4000);
  return () => clearInterval(interval);
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

  let result: HandlerResponse = { text: DENY_TEXT };

  const stopTyping = startTypingLoop(body.chat_id);
  try {
    const command = parseCommand(body.payload?.text ?? "");

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
        result = await handleFile(body, targetId);
      } else {
        await supabase
          .from("telegram_links")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("telegram_user_id", body.telegram_user_id);

        const cmd = command?.command;
        if (cmd === "myweek") {
          result = await handleMyWeek(targetId);
        } else if (cmd === "who" || cmd === "job" || cmd === "staff" || cmd === "today") {
          const role = await resolveRole(targetId);
          if (!isManagementRole(role)) {
            result = { text: "Commands: /myweek" };
          } else if (cmd === "who") {
            result = await handleWho(command?.argument ?? "");
          } else if (cmd === "job") {
            result = await handleJob(command?.argument ?? "");
          } else if (cmd === "staff") {
            result = await handleStaff(command?.argument ?? "");
          } else {
            result = await handleToday();
          }
        } else {
          result = { text: "Commands: /myweek" };
        }
      }
    }
  } finally {
    // Stop before the response goes out, not after — the caller must never
    // see the indicator outlive the reply it was standing in for.
    stopTyping();
  }

  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
  });
});
