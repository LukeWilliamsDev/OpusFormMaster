import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser(token);
    const { data: callerProfile } = caller
      ? await supabase
          .from("profiles")
          .select("role, status, tenant_id")
          .eq("id", caller.id)
          .maybeSingle()
      : { data: null };
    const canListUsers =
      callerProfile?.status === "active" &&
      (callerProfile.role === "admin" || callerProfile.role === "director");

    if (callerError || !caller || !canListUsers || !callerProfile.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only active admins and directors can list accounts." }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, status")
      .eq("tenant_id", callerProfile.tenant_id)
      .order("email");
    if (profileError) throw profileError;

    // Auth metadata such as last_sign_in_at is only available through the
    // service-role admin API, so join it here instead of exposing auth.users.
    const authUsers = new Map<string, string | null>();
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      for (const authUser of data.users) {
        authUsers.set(authUser.id, authUser.last_sign_in_at ?? null);
      }
      if (data.users.length < 1000) break;
      page += 1;
    }

    const users = (profiles ?? []).map((profile) => ({
      ...profile,
      last_sign_in_at: authUsers.get(profile.id) ?? null,
    }));

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-list-users error:", error);
    return new Response(JSON.stringify({ error: "Unable to load users." }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
