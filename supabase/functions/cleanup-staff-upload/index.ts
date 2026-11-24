import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type Bucket = "compliance-documents" | "third-party-staff-documents" | "certificate-check-evidence";

const BUCKETS = new Set<Bucket>([
  "compliance-documents",
  "third-party-staff-documents",
  "certificate-check-evidence",
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECKER_ROLES = new Set([
  "admin",
  "director",
  "logistics_coordinator",
  "logistics_assistant",
]);

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

const isActiveRequest = (row: { completed_at: string | null; expires_at: string }) =>
  row.completed_at === null && new Date(row.expires_at).getTime() > Date.now();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json(req, { error: "Service unavailable." }, 500);

  try {
    const payload = await req.json();
    const bucket = payload?.bucket as Bucket;
    const path = typeof payload?.path === "string" ? payload.path : "";
    const requestId = typeof payload?.requestId === "string" ? payload.requestId : null;
    if (!BUCKETS.has(bucket) || !path || path.length > 500) {
      return json(req, { error: "Invalid cleanup request." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const segments = path.split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
      return json(req, { error: "Invalid storage path." }, 400);
    }

    if (bucket === "compliance-documents" && segments[0] === "requests") {
      const authHeader = req.headers.get("Authorization");
      const bearer = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
      if (
        !requestId ||
        !UUID.test(requestId) ||
        bearer !== requestId ||
        segments.length !== 3 ||
        segments[0] !== "requests" ||
        segments[1] !== requestId
      ) {
        return json(req, { error: "Invalid credential upload path." }, 400);
      }
      const { data: requestRow, error: requestError } = await adminClient
        .from("document_requests")
        .select("worker_id, completed_at, expires_at")
        .eq("id", requestId)
        .maybeSingle();
      if (requestError || !requestRow || !isActiveRequest(requestRow)) {
        return json(req, { error: "Credential request is no longer active." }, 409);
      }
      const { data: staffRow, error: staffError } = await adminClient
        .from("staff")
        .select("tickets")
        .eq("id", requestRow.worker_id)
        .maybeSingle();
      if (staffError) return json(req, { error: "Unable to verify the upload link." }, 500);
      const linked = Array.isArray(staffRow?.tickets)
        ? staffRow.tickets.some((ticket: unknown) => {
            if (!ticket || typeof ticket !== "object") return false;
            const documentUrl = String((ticket as { documentUrl?: unknown }).documentUrl ?? "");
            if (documentUrl === path) return true;
            try {
              const parsed = new URL(documentUrl);
              const prefix = "/storage/v1/object/public/compliance-documents/";
              return (
                parsed.pathname.startsWith(prefix) &&
                decodeURIComponent(parsed.pathname.slice(prefix.length)) === path
              );
            } catch {
              return false;
            }
          })
        : false;
      if (linked) return json(req, { error: "Linked certificate files cannot be removed." }, 409);
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json(req, { error: "Unauthorized." }, 401);
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const {
        data: { user },
        error: userError,
      } = await adminClient.auth.getUser(token);
      if (userError || !user) return json(req, { error: "Unauthorized." }, 401);
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("tenant_id, role, status")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError || !profile || profile.status !== "active") {
        return json(req, { error: "Account is not active." }, 403);
      }

      if (bucket === "compliance-documents") {
        if (segments.length !== 3 || segments[0] !== "manual") {
          return json(req, { error: "Invalid manual certificate path." }, 400);
        }
        if (!CHECKER_ROLES.has(profile.role)) return json(req, { error: "Not authorised." }, 403);
        const { data: staff, error: staffError } = await adminClient
          .from("staff")
          .select("id, tenant_id, tickets")
          .eq("id", segments[1])
          .maybeSingle();
        if (staffError) return json(req, { error: "Unable to verify the staff record." }, 500);
        if (!staff || staff.tenant_id !== profile.tenant_id) {
          return json(req, { error: "Not authorised for this staff record." }, 403);
        }
        const linked = Array.isArray(staff.tickets)
          ? staff.tickets.some((ticket: unknown) => {
              if (!ticket || typeof ticket !== "object") return false;
              return (ticket as { documentUrl?: unknown }).documentUrl === path;
            })
          : false;
        if (linked) return json(req, { error: "Linked certificate files cannot be removed." }, 409);
      } else if (bucket === "third-party-staff-documents") {
        if (segments.length !== 3 || segments[0] !== user.id || !UUID.test(segments[1])) {
          return json(req, { error: "Invalid third-party certificate path." }, 400);
        }
        if (profile.role !== "third_party") return json(req, { error: "Not authorised." }, 403);
        const { data: submission, error: submissionError } = await adminClient
          .from("third_party_staff_submissions")
          .select("tenant_id, submitted_by")
          .eq("id", segments[1])
          .maybeSingle();
        if (
          submissionError ||
          !submission ||
          submission.submitted_by !== user.id ||
          submission.tenant_id !== profile.tenant_id
        ) {
          return json(req, { error: "Not authorised for this upload." }, 403);
        }
        const { data: linked, error: linkedError } = await adminClient
          .from("third_party_staff_documents")
          .select("id")
          .eq("file_path", path)
          .maybeSingle();
        if (linkedError) return json(req, { error: "Unable to verify the certificate link." }, 500);
        if (linked) return json(req, { error: "Linked certificate files cannot be removed." }, 409);
      } else {
        if (segments.length !== 3 || segments[0] !== profile.tenant_id || segments[1] !== user.id) {
          return json(req, { error: "Invalid checker evidence path." }, 400);
        }
        if (!CHECKER_ROLES.has(profile.role)) return json(req, { error: "Not authorised." }, 403);
        const { data: linked, error: linkedError } = await adminClient
          .from("staff_certificate_checks")
          .select("id")
          .eq("evidence_path", path)
          .maybeSingle();
        if (linkedError) return json(req, { error: "Unable to verify the evidence link." }, 500);
        if (linked) return json(req, { error: "Linked evidence cannot be removed." }, 409);
      }
    }

    const { error: removeError } = await adminClient.storage.from(bucket).remove([path]);
    if (removeError) throw removeError;
    return json(req, { success: true });
  } catch (error) {
    console.error("cleanup-staff-upload error:", error);
    return json(req, { error: "Unable to clean up the upload." }, 500);
  }
});
