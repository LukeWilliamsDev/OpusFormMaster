import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LUKE_ADMIN_EMAIL = "luke@opusform.co.uk";
const ROLES = [
  "admin",
  "director",
  "logistics_coordinator",
  "logistics_assistant",
  "site_foreman",
  "labourer",
  "third_party",
];
const ALLOWED_ORIGINS = new Set([
  "https://opusform.co.uk",
  "https://www.opusform.co.uk",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
]);

const corsHeaders = (req: Request): Record<string, string> => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};

const response = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });

const rest = (base: string, key: string, path: string, init: RequestInit = {}) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  try {
    const base = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!base || !key || !token || token === key) {
      return response(req, { error: "Unauthorized." }, 401);
    }

    // Decode and trust no JWT payload locally. The Supabase Auth API verifies
    // the signature, expiry, issuer, and subject before we use the identity.
    const authClient = createClient(base, key);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);
    const callerId = user?.id ?? null;
    if (userError || !callerId) return response(req, { error: "Unauthorized." }, 401);

    const callerProfileResponse = await rest(
      base,
      key,
      `/rest/v1/profiles?id=eq.${encodeURIComponent(callerId)}&select=role,status,tenant_id`,
    );
    const callerProfiles = await callerProfileResponse.json();
    const callerProfile = callerProfiles?.[0];
    if (callerProfile?.status !== "active" || !["admin", "director"].includes(callerProfile.role)) {
      return response(
        req,
        { error: "Forbidden: Only active admins and directors can invite accounts." },
        403,
      );
    }

    const { email, full_name, role, tenant_id, redirectTo } = await req.json();
    if (!email || !role || !tenant_id) {
      return response(req, { error: "email, role and tenant_id are required." }, 400);
    }
    if (
      !callerProfile.tenant_id ||
      String(tenant_id).toLowerCase() !== String(callerProfile.tenant_id).toLowerCase()
    ) {
      return response(req, { error: "You may only create users in your own tenant." }, 403);
    }
    if (!ROLES.includes(role)) return response(req, { error: "Invalid role." }, 400);
    if (role === "admin" && email.toLowerCase() !== LUKE_ADMIN_EMAIL) {
      return response(req, { error: "The admin role is reserved for Luke Williams." }, 400);
    }

    const inviteResponse = await fetch(`${base}/auth/v1/invite`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        data: { full_name: full_name ?? "" },
        redirect_to: redirectTo,
      }),
    });
    const invited = await inviteResponse.json();
    if (!inviteResponse.ok || !invited?.id) {
      const message = String(invited?.msg ?? invited?.message ?? "");
      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("registered")
      ) {
        return response(
          req,
          {
            error: `An account already exists for ${email}. Use Edit User instead of Create User.`,
          },
          400,
        );
      }
      return response(req, { error: message || "Failed to send the account invitation." }, 400);
    }

    const profileResponse = await rest(
      base,
      key,
      `/rest/v1/profiles?id=eq.${encodeURIComponent(invited.id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          role,
          tenant_id: callerProfile.tenant_id,
          full_name: full_name ?? "",
          must_change_password: true,
        }),
      },
    );
    if (!profileResponse.ok) {
      // The Auth invitation has already created a user. Compensate so a failed
      // profile write cannot leave an invited account outside the application.
      const rollback = await fetch(`${base}/auth/v1/admin/users/${invited.id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!rollback.ok) {
        console.error("admin-create-user rollback failed:", await rollback.text());
      }
      return response(req, { error: await profileResponse.text() }, 500);
    }
    return response(req, { success: true, user_id: invited.id });
  } catch (error) {
    console.error("admin-create-user error:", error);
    return response(req, { error: "Unable to create the user." }, 500);
  }
});
