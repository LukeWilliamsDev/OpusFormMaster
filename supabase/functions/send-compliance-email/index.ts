import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_COLORS, emailShell } from "../_shared/email-theme.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ALLOWED_ROLES = ["admin", "director", "logistics_coordinator", "logistics_assistant"];

function jsonResponse(req: Request, body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

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
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse(req, { error: "Service unavailable." }, 503);
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization");
    const tokenMatch = authHeader?.match(/^Bearer\s+(\S+)$/);
    const token = tokenMatch?.[1];
    if (!token || token === supabaseServiceKey || token === Deno.env.get("SUPABASE_ANON_KEY")) {
      return jsonResponse(req, { error: "Unauthorized." }, 401);
    }
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse(req, { error: "Unauthorized." }, 401);
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (profileError || !profile || !ALLOWED_ROLES.includes(profile.role)) {
      return jsonResponse(req, { error: "Forbidden." }, 403);
    }

    let payload: RequestPayload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse(req, { error: "Invalid request body." }, 400);
    }
    const { toEmail, workerName, requestedCerts, uploadUrl, expiresAt } = payload;

    if (typeof toEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return jsonResponse(req, { error: "A valid recipient email is required." }, 400);
    }
    let validatedUploadUrl: URL;
    try {
      validatedUploadUrl = new URL(uploadUrl);
    } catch {
      return jsonResponse(req, { error: "Invalid upload URL." }, 400);
    }
    if (validatedUploadUrl.protocol !== "https:") {
      return jsonResponse(req, { error: "Invalid upload URL." }, 400);
    }
    if (!Array.isArray(requestedCerts) || requestedCerts.some((cert) => typeof cert !== "string")) {
      return jsonResponse(req, { error: "Invalid request." }, 400);
    }
    if (!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) {
      return jsonResponse(req, { error: "Invalid request." }, 400);
    }

    // Retrieve settings config
    const { data: configRows, error: configError } = await supabase
      .from("decrypted_smtp_config")
      .select("key, value");

    if (configError || !configRows || configRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Service unavailable." }),
        {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
          error: "Service unavailable.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
      bodyHtml += `        <p style="margin: 0 0 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${EMAIL_COLORS.accent};">Required Certifications:</p>`;
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
      escapeHtml(validatedUploadUrl.toString()) +
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

    return new Response(JSON.stringify({ success: true }),
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    return jsonResponse(req, { error: "Unable to send email." }, 500);
  }
});
