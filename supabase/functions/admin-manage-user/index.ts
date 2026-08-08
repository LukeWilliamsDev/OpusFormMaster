import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ADMIN_EMAIL = "admin@opusform.co.uk";
const ROLES = [
  "admin",
  "director",
  "logistics_coordinator",
  "logistics_assistant",
  "site_foreman",
  "labourer",
];
const ACTIONS = ["update", "disable", "archive", "reactivate", "delete"];

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
        JSON.stringify({ error: "Forbidden: Only the designated admin account can manage users." }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const { user_id, action, full_name, role, email } = await req.json();
    if (!user_id || !ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: "user_id and a valid action are required." }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (action === "update" && role && !ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role." }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (
      caller.id === user_id &&
      (action === "disable" || action === "archive" || action === "delete")
    ) {
      return new Response(
        JSON.stringify({ error: "You cannot disable, archive, or delete your own admin account." }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("email, tenant_id, full_name, role, status")
      .eq("id", user_id)
      .single();
    if (targetError || !target) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      await supabase.from("audit_logs").insert({
        user_id: caller.id,
        user_email: caller.email,
        tenant_id: target.tenant_id,
        action: "USER_DELETED",
        target_type: "profile",
        target_id: user_id,
        details: { target_email: target.email },
      });
      const { error: deleteError } = await supabase.rpc("admin_delete_user", {
        target_id: user_id,
      });
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    let update: Record<string, unknown> = {};
    let auditAction = "";
    let banDuration: string | undefined;

    if (action === "update") {
      update = { full_name: full_name ?? target.full_name, role: role ?? target.role };
      if (email && email !== target.email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(user_id, { email });
        if (emailError) {
          return new Response(JSON.stringify({ error: emailError.message }), {
            status: 500,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
        update.email = email;
      }
      auditAction = "USER_UPDATED";
    } else if (action === "disable") {
      update = { status: "disabled" };
      banDuration = "876000h"; // ~100 years
      auditAction = "USER_DISABLED";
    } else if (action === "archive") {
      update = { status: "archived" };
      banDuration = "876000h";
      auditAction = "USER_ARCHIVED";
    } else if (action === "reactivate") {
      update = { status: "active" };
      banDuration = "none";
      auditAction = "USER_REACTIVATED";
    }

    if (banDuration) {
      const { error: banError } = await supabase.auth.admin.updateUserById(user_id, {
        ban_duration: banDuration,
      });
      if (banError) {
        return new Response(JSON.stringify({ error: banError.message }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    const { error: updateError } = await supabase.from("profiles").update(update).eq("id", user_id);
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    await supabase.from("audit_logs").insert({
      user_id: caller.id,
      user_email: caller.email,
      tenant_id: target.tenant_id,
      action: auditAction,
      target_type: "profile",
      target_id: user_id,
      details: { target_email: target.email, ...update },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-manage-user error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
