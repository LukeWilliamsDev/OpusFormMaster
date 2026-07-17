import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_COLORS, emailShell } from "../_shared/email-theme.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "admin@opusform.co.uk";

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !["admin", "dispatcher"].includes(profile.role)) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Only admins and dispatchers can trigger admin alerts.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { subject, body } = await req.json();
    if (!subject || !body) {
      return new Response(JSON.stringify({ error: "subject and body are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: configRows, error: configError } = await supabase
      .from("decrypted_smtp_config")
      .select("key, value");

    if (configError || !configRows || configRows.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to load SMTP config." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    const resendApiKey = config["RESEND_API_KEY"] || Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not found." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sender = config["RESEND_FROM_EMAIL"] || "support@opusform.co.uk";
    const timestamp = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const bodyHtml = `
      <p class="text-title" style="margin: 0 0 16px; font-size: 16px; font-weight: 700;">${escapeHtml(subject)}</p>
      <p style="margin: 0 0 16px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${EMAIL_COLORS.accent};">Details</p>
      <div class="bg-page border-theme" style="border: 1px solid #D9D3C7; border-left: 3px solid ${EMAIL_COLORS.alert}; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <pre class="text-title" style="margin: 0; white-space: pre-wrap; word-break: break-word; font-family: monospace; font-size: 12px;">${escapeHtml(body)}</pre>
      </div>
      <p class="text-secondary" style="margin: 0 0 24px; font-size: 11px;">Timestamp: <strong class="text-title">${timestamp} (UK time)</strong></p>
    `;

    const emailHtml = emailShell({
      eyebrow: "System Alert",
      bodyHtml,
      footerName: "Opus Form Alerts (automated — do not reply)",
      footerEmail: "support@opusform.co.uk",
      accentColor: EMAIL_COLORS.alert,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + resendApiKey,
      },
      body: JSON.stringify({
        from: `Opus Form Alerts <${sender}>`,
        to: [ADMIN_EMAIL],
        subject: `[ALERT] ${subject}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) throw new Error(resendData.message || JSON.stringify(resendData));

    return new Response(JSON.stringify({ success: true, data: resendData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending admin alert:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
