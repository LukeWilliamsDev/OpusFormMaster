import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "admin@opusform.co.uk";
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
    Vary: "Origin",
  };
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header." }),
        {
          status: 401,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser(token);
    const { data: callerProfile } = caller
      ? await supabase.from("profiles").select("role, status").eq("id", caller.id).maybeSingle()
      : { data: null };
    const canInvite =
      callerProfile?.status === "active" &&
      (callerProfile.role === "admin" || callerProfile.role === "director");
    if (callerError || !caller || !canInvite) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Only active admins and directors can invite accounts.",
        }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const { email, full_name, role, tenant_id, redirectTo } = await req.json();
    if (!email || !role || !tenant_id) {
      return new Response(JSON.stringify({ error: "email, role and tenant_id are required." }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (
      ![
        "admin",
        "director",
        "logistics_coordinator",
        "logistics_assistant",
        "site_foreman",
        "labourer",
        "third_party",
      ].includes(role)
    ) {
      return new Response(JSON.stringify({ error: "Invalid role." }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    // There is one admin seat: Luke Williams' designated account. Keep this
    // invariant in the trusted function rather than relying on the UI role
    // selector.
    if (role === "admin" && email.toLowerCase() !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: "The admin role is reserved for Luke Williams." }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const { data: created, error: createError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: full_name ?? "" }, redirectTo },
    );
    if (createError || !created.user) {
      if (createError?.message?.toLowerCase().includes("already been registered")) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        let accountLabel = email;
        if (existing) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", existing.id)
            .single();
          if (existingProfile?.full_name) {
            accountLabel = `${existingProfile.full_name} (${existingProfile.role})`;
          }
        }
        return new Response(
          JSON.stringify({
            error: `An account already exists for ${email} — ${accountLabel}. Use Edit User instead of Create User.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ error: createError?.message ?? "Failed to create user." }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role,
        tenant_id,
        full_name: full_name ?? "",
        must_change_password: true,
      })
      .eq("id", created.user.id);
    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: created.user.id }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-create-user error:", error);
    return new Response(JSON.stringify({ error: "Unable to create the user." }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
