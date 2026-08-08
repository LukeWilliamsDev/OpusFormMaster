import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ADMIN_EMAIL = "admin@opusform.co.uk";

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
    if (callerError || !caller || caller.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only the designated admin account can create users." }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const { email, password, full_name, role, tenant_id } = await req.json();
    if (!email || !password || !role || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "email, password, role and tenant_id are required." }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }
    if (
      ![
        "admin",
        "director",
        "logistics_coordinator",
        "logistics_assistant",
        "site_foreman",
        "labourer",
      ].includes(role)
    ) {
      return new Response(JSON.stringify({ error: "Invalid role." }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
