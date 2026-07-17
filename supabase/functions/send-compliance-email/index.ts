import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_COLORS, emailShell } from "../_shared/email-theme.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  toEmail: string;
  workerName: string;
  requestedCerts: string[];
  uploadUrl: string;
  expiresAt: string;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify Authorization Header (JWT)
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Validate token and retrieve user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token.", details: userError }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Verify user's administrative privileges
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !["admin", "dispatcher"].includes(profile.role)) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Only admins and dispatchers can trigger compliance requests.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const payload: RequestPayload = await req.json();
    const { toEmail, workerName, requestedCerts, uploadUrl, expiresAt } = payload;

    if (!toEmail) {
      return new Response(JSON.stringify({ error: "Recipient email (toEmail) is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve settings config
    const { data: configRows, error: configError } = await supabase
      .from("decrypted_smtp_config")
      .select("key, value");

    if (configError || !configRows || configRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to load config from database.", detail: configError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    const resendApiKey = config["RESEND_API_KEY"] || Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY not found.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const formattedExpiry = new Date(expiresAt).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Compose HTML
    let bodyHtml = "";
    bodyHtml +=
      '      <p class="text-title" style="margin: 0 0 16px; font-size: 16px; font-weight: 700;">Hello ' +
      escapeHtml(workerName || "Worker") +
      ",</p>";
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">An administrator has requested that you submit compliance documentation. Please upload the required credentials before the link expires.</p>';
    if (requestedCerts && requestedCerts.length > 0) {
      bodyHtml +=
        '      <div class="bg-page border-theme" style="border: 1px solid #D9D3C7; border-radius: 8px; padding: 20px; margin-bottom: 32px;">';
      bodyHtml +=
        `        <p style="margin: 0 0 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${EMAIL_COLORS.accent};">Required Certifications:</p>`;
      bodyHtml += '        <ul class="text-title" style="margin: 0; padding-left: 20px;">';
      for (const cert of requestedCerts) {
        bodyHtml +=
          '          <li style="margin-bottom: 6px; font-weight: bold; font-size: 13px;">' +
          escapeHtml(cert) +
          "</li>";
      }
      bodyHtml += "        </ul>";
      bodyHtml += "      </div>";
    } else {
      bodyHtml +=
        '      <div class="bg-page border-theme" style="border: 1px solid #D9D3C7; border-radius: 8px; padding: 20px; margin-bottom: 32px;">';
      bodyHtml +=
        '        <p class="text-title" style="margin: 0; font-size: 13px; font-weight: bold;">Please upload all your on-site certifications and licenses using the secure link below.</p>';
      bodyHtml += "      </div>";
    }
    bodyHtml += '      <div style="text-align: center; margin-bottom: 32px;">';
    bodyHtml +=
      '        <a href="' +
      uploadUrl +
      `" style="display: inline-block; padding: 14px 28px; background-color: ${EMAIL_COLORS.accent}; color: ${EMAIL_COLORS.accentForeground.light}; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; box-shadow: 0 4px 12px rgba(181, 101, 29, 0.3);">Upload Documents</a>`;
    bodyHtml += "      </div>";
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px; font-size: 12px; text-align: center;">This link is secure and passwordless. It will expire on: <strong>' +
      formattedExpiry +
      " (UK time)</strong></p>";

    const emailHtml = emailShell({
      eyebrow: "Compliance Document Request",
      bodyHtml,
      footerName: "Opus Form Support",
      footerEmail: "support@opusform.co.uk",
    });

    const sender = config["RESEND_FROM_EMAIL"] || "support@opusform.co.uk";

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + resendApiKey,
      },
      body: JSON.stringify({
        from: "Opus Form Support <" + sender + ">",
        to: [toEmail],
        subject: "Compliance Document Request | Action Required",
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(resendData.message || JSON.stringify(resendData));
    }

    return new Response(JSON.stringify({ success: true, data: resendData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
