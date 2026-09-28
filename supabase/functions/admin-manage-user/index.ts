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
const ACTIONS = ["update", "disable", "archive", "reactivate", "delete"];
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

const rest = async (base: string, key: string, path: string, init: RequestInit = {}) =>
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
    const authKey = Deno.env.get("SUPABASE_ANON_KEY") ?? key;
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!base || !key || !token) return response(req, { error: "Unauthorized." }, 401);

    const callerResponse = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: authKey!, Authorization: `Bearer ${token}` },
    });
    const caller = await callerResponse.json();
    if (!callerResponse.ok || !caller?.id) return response(req, { error: "Unauthorized." }, 401);

    const callerProfileResponse = await rest(
      base,
      key,
      `/rest/v1/profiles?id=eq.${encodeURIComponent(caller.id)}&select=role,status`,
    );
    const callerProfiles = await callerProfileResponse.json();
    const callerProfile = callerProfiles?.[0];
    if (callerProfile?.status !== "active" || !["admin", "director"].includes(callerProfile.role)) {
      return response(
        req,
        { error: "Forbidden: Only active admins and directors can manage accounts." },
        403,
      );
    }

    const { user_id, action, full_name, role, email } = await req.json();
    if (!user_id || !ACTIONS.includes(action)) {
      return response(req, { error: "user_id and a valid action are required." }, 400);
    }
    if (action === "update" && role && !ROLES.includes(role)) {
      return response(req, { error: "Invalid role." }, 400);
    }
    if (caller.id === user_id && ["disable", "archive", "delete"].includes(action)) {
      return response(
        req,
        { error: "You cannot disable, archive, or delete your own admin account." },
        400,
      );
    }

    const targetResponse = await rest(
      base,
      key,
      `/rest/v1/profiles?id=eq.${encodeURIComponent(user_id)}&select=email,tenant_id,full_name,role,status`,
    );
    const targets = await targetResponse.json();
    const target = targets?.[0];
    if (!target) return response(req, { error: "User not found." }, 404);

    if (action === "update") {
      const nextEmail = (email ?? target.email ?? "").toLowerCase();
      const nextRole = role ?? target.role;
      if (nextRole === "admin" && nextEmail !== LUKE_ADMIN_EMAIL) {
        return response(req, { error: "The admin role is reserved for Luke Williams." }, 400);
      }
      if (
        target.role === "admin" &&
        target.email?.toLowerCase() === LUKE_ADMIN_EMAIL &&
        (nextEmail !== LUKE_ADMIN_EMAIL || nextRole !== "admin")
      ) {
        return response(
          req,
          { error: "Luke Williams' admin account cannot be renamed or reassigned." },
          400,
        );
      }
    }

    if (action === "delete") {
      const deleteResponse = await fetch(`${base}/auth/v1/admin/users/${user_id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!deleteResponse.ok) return response(req, { error: await deleteResponse.text() }, 500);
      return response(req, { success: true });
    }

    let update: Record<string, unknown> = {};
    let auditAction = "";
    if (action === "update") {
      update = { full_name: full_name ?? target.full_name, role: role ?? target.role };
      if (email && email !== target.email) {
        const emailResponse = await fetch(`${base}/auth/v1/admin/users/${user_id}`, {
          method: "PUT",
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });
        if (!emailResponse.ok) return response(req, { error: await emailResponse.text() }, 500);
        update.email = email;
      }
      auditAction = "USER_UPDATED";
    } else if (action === "disable" || action === "archive" || action === "reactivate") {
      const status =
        action === "reactivate" ? "active" : action === "disable" ? "disabled" : "archived";
      const authResponse = await fetch(`${base}/auth/v1/admin/users/${user_id}`, {
        method: "PUT",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ban_duration: action === "reactivate" ? "none" : "876000h" }),
      });
      if (!authResponse.ok) return response(req, { error: await authResponse.text() }, 500);
      update = { status };
      auditAction = `USER_${action.toUpperCase()}`;
    }

    const updateResponse = await rest(
      base,
      key,
      `/rest/v1/profiles?id=eq.${encodeURIComponent(user_id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(update),
      },
    );
    if (!updateResponse.ok) return response(req, { error: await updateResponse.text() }, 500);

    return response(req, { success: true, action: auditAction });
  } catch (error) {
    console.error("admin-manage-user error:", error);
    return response(req, { error: "Unable to manage the user." }, 500);
  }
});
