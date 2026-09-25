import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_COLORS, emailShell } from "../_shared/email-theme.ts";
import { corsHeaders } from "../_shared/cors.ts";

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

const AUTHORIZED_SEND_ROLES = new Set([
  "admin",
  "director",
  "logistics_coordinator",
  "logistics_assistant",
]);
const ALLOWED_UPLOAD_HOSTS = new Set(["opusform.co.uk", "www.opusform.co.uk"]);
const SAFE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 320 && SAFE_EMAIL_PATTERN.test(value.trim());
}

function jsonError(req: Request, error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") return jsonError(req, "Method not allowed.", 405);

  try {
    // 1. Verify Authorization Header (JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError(req, "Unauthorized.", 401);

    const token = authHeader.slice("Bearer ".length).trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey || !token) return jsonError(req, "Unauthorized.", 401);
    if (token === supabaseServiceKey || token === Deno.env.get("SUPABASE_ANON_KEY")) {
      return jsonError(req, "Unauthorized.", 401);
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Validate token and retrieve user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonError(req, "Unauthorized.", 401);
    }

    // 3. Verify user's administrative privileges
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !AUTHORIZED_SEND_ROLES.has(profile.role)) {
      return jsonError(req, "Forbidden.", 403);
    }

    const payload: RequestPayload = await req.json();
    const { toEmail, workerName, requestedCerts, uploadUrl, expiresAt } = payload;

    if (!isValidEmail(toEmail)) return jsonError(req, "A valid recipient email is required.", 400);

    let safeUploadUrl: string;
    try {
      const parsedUploadUrl = new URL(uploadUrl);
      if (
        parsedUploadUrl.protocol !== "https:" ||
        !ALLOWED_UPLOAD_HOSTS.has(parsedUploadUrl.host)
      ) {
        return jsonError(req, "The upload link is invalid.", 400);
      }
      safeUploadUrl = escapeHtml(parsedUploadUrl.toString());
    } catch {
      return jsonError(req, "The upload link is invalid.", 400);
    }

    // Retrieve settings config
    const { data: configRows, error: configError } = await supabase
      .from("decrypted_smtp_config")
      .select("key, value");

    if (configError || !configRows || configRows.length === 0) {
      console.error("send-compliance-email: failed to load email configuration", configError);
      return jsonError(req, "Email service unavailable.", 503);
    }

    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    const resendApiKey = config["RESEND_API_KEY"] || Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("send-compliance-email: RESEND_API_KEY is not configured");
      return jsonError(req, "Email service unavailable.", 503);
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
      safeUploadUrl +
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
        to: [toEmail.trim()],
        subject: "Compliance Document Request | Action Required",
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(resendData.message || JSON.stringify(resendData));
    }

    return new Response(JSON.stringify({ success: true, id: resendData?.id ?? null }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    return jsonError(req, "Unable to send the compliance email.", 502);
  }
});
