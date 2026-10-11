import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_COLORS, emailShell } from "../_shared/email-theme.ts";
import { corsHeaders } from "../_shared/cors.ts";

const RECIPIENT_EMAIL = "luke@opusform.co.uk";

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
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const headers = { ...corsHeaders(req), "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Service configuration is incomplete." }), {
        status: 500,
        headers,
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();
    if (profileError || !profile || profile.status !== "active") {
      return new Response(
        JSON.stringify({ error: "This account cannot submit portal help requests." }),
        {
          status: 403,
          headers,
        },
      );
    }

    const payload = await req.json();
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    if (!subject || subject.length > 120 || !message || message.length > 5000) {
      return new Response(
        JSON.stringify({
          error: "Please provide a subject and message within the allowed lengths.",
        }),
        {
          status: 400,
          headers,
        },
      );
    }

    const { data: configRows, error: configError } = await adminClient
      .from("decrypted_smtp_config")
      .select("key, value");
    if (configError || !configRows?.length) {
      return new Response(
        JSON.stringify({ error: "Email service configuration is unavailable." }),
        { status: 500, headers },
      );
    }
    const config: Record<string, string> = {};
    for (const row of configRows) config[row.key] = row.value;
    // Prefer the current project secret, with the database configuration as a
    // fallback for legacy deployments.
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || config.RESEND_API_KEY;
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service configuration is unavailable." }),
        {
          status: 500,
          headers,
        },
      );
    }

    const timestamp = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const sender =
      config.RESEND_FROM_EMAIL || Deno.env.get("RESEND_FROM_EMAIL") || "support@opusform.co.uk";
    const bodyHtml = `
      <p class="text-title" style="margin: 0 0 16px; font-size: 16px; font-weight: 700;">${escapeHtml(subject)}</p>
      <p class="text-secondary" style="margin: 0 0 8px; font-size: 12px;">From: <strong class="text-title">${escapeHtml(user.email ?? "Unknown account")}</strong></p>
      <p class="text-secondary" style="margin: 0 0 16px; font-size: 11px;">Sent: ${escapeHtml(timestamp)} (UK time)</p>
      <div class="bg-page border-theme" style="border: 1px solid #D9D3C7; border-left: 3px solid ${EMAIL_COLORS.accent}; border-radius: 6px; padding: 16px; white-space: pre-wrap; word-break: break-word; font-size: 12px;">${escapeHtml(message)}</div>
    `;
    const emailHtml = emailShell({
      eyebrow:
        profile.role === "site_foreman"
          ? "Foreman portal help request"
          : "Third-party portal help request",
      bodyHtml,
      footerName: "Opus Form Portal",
      footerEmail: "",
      accentColor: EMAIL_COLORS.accent,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: `Opus Form Portal <${sender}>`,
        to: [RECIPIENT_EMAIL],
        reply_to: user.email ?? undefined,
        subject: `[Portal help · ${profile.role === "site_foreman" ? "Foreman" : "Third party"}] ${subject}`,
        html: emailHtml,
      }),
    });
    const resendData = await resendResponse.json();
    if (!resendResponse.ok) throw new Error(resendData.message || "Email delivery failed.");

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (error) {
    console.error("Error sending portal help request:", error);
    return new Response(JSON.stringify({ error: "Email delivery failed." }), {
      status: 500,
      headers,
    });
  }
});
