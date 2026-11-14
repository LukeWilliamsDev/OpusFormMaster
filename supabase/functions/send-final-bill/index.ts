import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderBillingPdf } from "../_shared/billing-pdf.ts";

// NOTE: This Edge Function MUST be deployed with `verify_jwt: false`
// to allow email clients (Gmail, Outlook, etc.) to fetch the corporate SVG logo
// via the GET endpoint without Supabase authorization headers.

// The email shell remains inline for the legacy deployment bundle. The
// authoritative PDF renderer is imported from _shared and must be deployed
// with a bundle-aware Supabase CLI/management path; a single-file deployment
// that drops this import is not an approved release artifact.

const ALLOWED_ORIGINS = [
  "https://opusform.co.uk",
  "https://www.opusform.co.uk",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

const EMAIL_COLORS = {
  light: {
    bg: "#F5F1EA",
    card: "#FDFAF5",
    header: "#EAE5DC",
    foreground: "#2B2F33",
    muted: "#5A5450",
    border: "#D9D3C7",
  },
  dark: {
    bg: "#1B1C20",
    card: "#232429",
    header: "#2E3036",
    foreground: "#EDEBE6",
    muted: "#ACA89F",
    border: "#2E3036",
  },
  accent: "#B5651D",
};

function emailHeadStyles(): string {
  const c = EMAIL_COLORS;
  return [
    "<head>",
    '  <meta name="color-scheme" content="light dark">',
    '  <meta name="supported-color-schemes" content="light dark">',
    "  <style>",
    "    :root { color-scheme: light dark; supported-color-schemes: light dark; }",
    `    .bg-page { background-color: ${c.light.bg} !important; background-image: none !important; }`,
    `    .bg-card { background-color: ${c.light.card} !important; background-image: none !important; }`,
    `    .bg-header { background-color: ${c.light.header} !important; background-image: none !important; }`,
    `    .text-title { color: ${c.light.foreground} !important; }`,
    `    .text-body { color: ${c.light.foreground} !important; }`,
    `    .text-secondary { color: ${c.light.muted} !important; }`,
    `    .border-theme { border-color: ${c.light.border} !important; }`,
    "    @media (prefers-color-scheme: dark) {",
    `      .bg-page { background-color: ${c.dark.bg} !important; background-image: none !important; }`,
    `      .bg-card { background-color: ${c.dark.card} !important; background-image: none !important; }`,
    `      .bg-header { background-color: ${c.dark.header} !important; background-image: none !important; }`,
    `      .text-title { color: ${c.dark.foreground} !important; }`,
    `      .text-body { color: ${c.dark.foreground} !important; }`,
    `      .text-secondary { color: ${c.dark.muted} !important; }`,
    `      .border-theme { border-color: ${c.dark.border} !important; }`,
    "    }",
    `    [data-ogsc] .text-title { color: ${c.dark.foreground} !important; }`,
    `    [data-ogsc] .text-body { color: ${c.dark.foreground} !important; }`,
    `    [data-ogsc] .text-secondary { color: ${c.dark.muted} !important; }`,
    `    [data-ogsb] .bg-page { background-color: ${c.dark.bg} !important; background-image: none !important; }`,
    `    [data-ogsb] .bg-card { background-color: ${c.dark.card} !important; background-image: none !important; }`,
    `    [data-ogsb] .bg-header { background-color: ${c.dark.header} !important; background-image: none !important; }`,
    "  </style>",
    "</head>",
  ].join("");
}

function emailLogoBlock(): string {
  return (
    '<span class="text-title" style="font-family: \'Arial Black\', Arial, sans-serif; ' +
    `font-weight: 900; font-size: 30px; letter-spacing: 3px;">OPUS` +
    `<span style="color: ${EMAIL_COLORS.accent}; padding: 0 8px; font-size: 22px;">&bull;</span>` +
    "FORM</span>"
  );
}

interface EmailShellOptions {
  eyebrow: string;
  bodyHtml: string;
  footerName: string;
  footerEmail: string;
  accentColor?: string;
}

function emailShell(opts: EmailShellOptions): string {
  const accent = opts.accentColor || EMAIL_COLORS.accent;
  return (
    emailHeadStyles() +
    `<div class="bg-page" style="background-color: ${EMAIL_COLORS.light.bg}; padding: 40px 20px; font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; line-height: 1.6;">` +
    `  <div class="bg-card border-theme" style="max-width: 600px; margin: 0 auto; background-color: ${EMAIL_COLORS.light.card}; border: 1px solid ${EMAIL_COLORS.light.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">` +
    `    <div class="bg-header border-theme" style="background-color: ${EMAIL_COLORS.light.header}; padding: 30px 40px; border-bottom: 3px solid ${accent}; text-align: center;">` +
    emailLogoBlock() +
    "    </div>" +
    '    <div style="padding: 40px;">' +
    `      <div style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.2em; color: ${accent}; margin-bottom: 20px;">` +
    opts.eyebrow +
    "      </div>" +
    opts.bodyHtml +
    `      <div class="border-theme" style="border-top: 1px solid ${EMAIL_COLORS.light.border}; padding-top: 24px; margin-top: 32px;">` +
    `        <p class="text-title" style="margin: 0 0 4px; color: ${EMAIL_COLORS.light.foreground}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Kind regards,</p>` +
    `        <p class="text-title" style="margin: 0 0 4px; color: ${EMAIL_COLORS.light.foreground}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${opts.footerName}</p>` +
    `        <a href="mailto:${opts.footerEmail}" style="color: ${accent}; text-decoration: none; font-size: 12px; font-weight: 700;">${opts.footerEmail}</a>` +
    "      </div>" +
    "    </div>" +
    "  </div>" +
    "</div>"
  );
}

function logoSvg(theme: "light" | "dark"): string {
  const textFill = theme === "dark" ? "#E9E6E1" : "#2B2F33";
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 120" width="100%" height="100%">' +
    `<text x="40" y="76" font-family="'Inter', 'Arial Black', system-ui, -apple-system, sans-serif" font-weight="900" font-size="48" letter-spacing="6" fill="${textFill}">OPUS</text>` +
    `<circle cx="231" cy="59" r="5" fill="${EMAIL_COLORS.accent}"/>` +
    `<text x="246" y="76" font-family="'Inter', 'Arial Black', system-ui, -apple-system, sans-serif" font-weight="900" font-size="48" letter-spacing="6" fill="${textFill}">FORM</text>` +
    "</svg>"
  );
}

const AUTHORIZED_SEND_ROLES = new Set(["admin", "director", "logistics_coordinator"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 320 && EMAIL_PATTERN.test(value.trim());
}

function jsonError(req: Request, error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface RequestPayload {
  finalBillId: string;
  // Legacy fields remain optional while clients roll forward. The server
  // derives recipient, metadata, totals, and PDF bytes from the saved row.
  toEmail?: string;
}

serve(async (req) => {
  // Handle GET request to serve the SVG logo directly
  if (req.method === "GET") {
    const theme = new URL(req.url).searchParams.get("theme") === "dark" ? "dark" : "light";
    const svg = logoSvg(theme);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
        ...corsHeaders(req),
      },
      status: 200,
    });
  }

  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") return jsonError(req, "Method not allowed.", 405);

  let claimedFinalBillId: string | null = null;
  let providerCallStarted = false;
  let providerAccepted = false;
  let providerRejected = false;
  let artifactPath: string | null = null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) return jsonError(req, "Service unavailable.", 503);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError(req, "Unauthorized.", 401);
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token === supabaseServiceKey || token === Deno.env.get("SUPABASE_ANON_KEY")) {
      return jsonError(req, "Unauthorized.", 401);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) return jsonError(req, "Unauthorized.", 401);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status,tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) return jsonError(req, "Forbidden.", 403);
    if (profile.status !== "active" || !AUTHORIZED_SEND_ROLES.has(profile.role)) {
      return jsonError(req, "Forbidden.", 403);
    }

    const payload: RequestPayload = await req.json();
    const { finalBillId, toEmail: legacyToEmail } = payload;

    if (!finalBillId) {
      return jsonError(req, "finalBillId is required.", 400);
    }
    // The service-role client bypasses RLS, so re-apply tenant/object checks
    // explicitly before reading or mutating billing state. A sent bill is
    // idempotent: do not send it again when a client retries the same request.
    let { data: finalBill, error: finalBillError } = await supabase
      .from("final_bills")
      .select("id,tenant_id,status,reference,client_info,items,totals,vat_rate,date,job_id")
      .eq("id", finalBillId)
      .maybeSingle();
    if (finalBillError || !finalBill) return jsonError(req, "Invoice not found.", 404);
    if (!profile.tenant_id || finalBill.tenant_id !== profile.tenant_id) {
      return jsonError(req, "Forbidden.", 403);
    }
    let storedClientInfo =
      finalBill.client_info && typeof finalBill.client_info === "object"
        ? (finalBill.client_info as Record<string, unknown>)
        : {};
    let storedEmail =
      typeof storedClientInfo.email === "string" ? storedClientInfo.email.trim() : "";
    if (!isValidEmail(storedEmail)) {
      return jsonError(req, "The saved invoice recipient is unavailable.", 409);
    }
    if (
      legacyToEmail &&
      (!isValidEmail(legacyToEmail) ||
        legacyToEmail.trim().toLowerCase() !== storedEmail.toLowerCase())
    ) {
      return jsonError(req, "The recipient does not match the saved invoice.", 403);
    }
    let safeClientName =
      typeof storedClientInfo.entity === "string" ? storedClientInfo.entity : "Valued Client";
    let safeSiteName = typeof storedClientInfo.site === "string" ? storedClientInfo.site : "Site";
    let safePostcode =
      typeof storedClientInfo.postcode === "string" ? storedClientInfo.postcode : "";
    if (finalBill.status === "sent") {
      return new Response(JSON.stringify({ success: true, alreadySent: true }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        status: 200,
      });
    }
    if (finalBill.status === "sending") {
      return jsonError(req, "This invoice is already being sent. Please retry later.", 409);
    }

    // Claim first, then take the authoritative snapshot. The database trigger
    // prevents draft edits while this claim is in flight.
    const { data: claimedFinalBill, error: claimError } = await supabase
      .from("final_bills")
      .update({ status: "sending" })
      .eq("id", finalBillId)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (claimError) {
      console.error("Failed to claim final bill for sending:", claimError);
      return jsonError(req, "Unable to reserve the invoice for sending.", 503);
    }
    if (!claimedFinalBill) {
      return jsonError(req, "This invoice is already being sent. Please retry later.", 409);
    }
    claimedFinalBillId = claimedFinalBill.id;

    const { data: claimedSnapshot, error: claimedSnapshotError } = await supabase
      .from("final_bills")
      .select("id,tenant_id,status,reference,client_info,items,totals,vat_rate,date,job_id")
      .eq("id", finalBillId)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "sending")
      .maybeSingle();
    if (claimedSnapshotError || !claimedSnapshot) {
      throw new Error("The claimed invoice snapshot could not be loaded.");
    }
    finalBill = claimedSnapshot;
    storedClientInfo =
      finalBill.client_info && typeof finalBill.client_info === "object"
        ? (finalBill.client_info as Record<string, unknown>)
        : {};
    storedEmail = typeof storedClientInfo.email === "string" ? storedClientInfo.email.trim() : "";
    if (!isValidEmail(storedEmail)) {
      throw new Error("The saved invoice recipient is unavailable.");
    }
    if (
      legacyToEmail &&
      (!isValidEmail(legacyToEmail) ||
        legacyToEmail.trim().toLowerCase() !== storedEmail.toLowerCase())
    ) {
      throw new Error("The recipient does not match the saved invoice.");
    }
    safeClientName =
      typeof storedClientInfo.entity === "string" ? storedClientInfo.entity : "Valued Client";
    safeSiteName = typeof storedClientInfo.site === "string" ? storedClientInfo.site : "Site";
    safePostcode = typeof storedClientInfo.postcode === "string" ? storedClientInfo.postcode : "";

    const { data: job } = await supabase
      .from("jobs")
      .select("job_ref")
      .eq("id", finalBill.job_id)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    let renderedPdf;
    try {
      renderedPdf = await renderBillingPdf({
        kind: "final_bill",
        reference: finalBill.reference,
        date: finalBill.date,
        jobRef: job?.job_ref,
        clientInfo: storedClientInfo,
        items: Array.isArray(finalBill.items) ? finalBill.items : [],
        vatRate: finalBill.vat_rate,
        totals: finalBill.totals,
      });
    } catch (renderError) {
      console.error("Failed to render authoritative final-bill PDF:", renderError);
      throw new Error("The saved invoice cannot be rendered safely.");
    }
    const safeBillRef = finalBill.reference;
    const safeLabel = `Invoice #${safeBillRef}`;
    const toEmail = storedEmail.toLowerCase();
    const storedCcEmails = Array.isArray(storedClientInfo.ccEmails)
      ? storedClientInfo.ccEmails.filter((email): email is string => typeof email === "string")
      : [];
    if (storedCcEmails.length > 20) {
      throw new Error("Too many CC recipients.");
    }
    if (storedCcEmails.some((email) => !isValidEmail(email))) {
      throw new Error("Each CC recipient must be a valid email address.");
    }

    // Retrieve settings config from the secure smtp_config table
    const { data: configRows, error: configError } = await supabase
      .from("decrypted_smtp_config")
      .select("key, value");

    if (configError || !configRows || configRows.length === 0) {
      console.error("send-final-bill: failed to load email configuration", configError);
      throw new Error("Email service unavailable.");
    }

    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    let resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) resendApiKey = config["RESEND_API_KEY"];

    if (!resendApiKey) {
      console.error("send-final-bill: RESEND_API_KEY is not configured");
      throw new Error("Email service unavailable.");
    }

    let bodyHtml = "";
    bodyHtml +=
      '      <p class="text-title" style="margin: 0 0 16px; font-size: 16px; font-weight: 700;">Dear ' +
      escapeHtml(safeClientName) +
      ",</p>";
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">Please find attached the invoice <strong class="text-title">#' +
      escapeHtml(safeBillRef) +
      "</strong> for the concrete works at " +
      escapeHtml(safeSiteName) +
      (safePostcode ? ", " + escapeHtml(safePostcode) : "") +
      ".</p>";
    bodyHtml += "      <!-- Summary Table -->";
    bodyHtml +=
      '      <table class="border-theme" style="width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 1px solid #D9D3C7; border-radius: 8px; overflow: hidden;">';
    bodyHtml +=
      '        <tr class="bg-page border-theme" style="border-bottom: 1px solid #D9D3C7;">';
    bodyHtml +=
      '          <td class="text-secondary" style="padding: 14px 16px; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Net Subtotal</td>';
    bodyHtml +=
      '          <td class="text-title" style="padding: 14px 16px; text-align: right; font-weight: 900;">£' +
      renderedPdf.financials.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) +
      "</td>";
    bodyHtml += "        </tr>";
    bodyHtml +=
      '        <tr class="bg-page border-theme" style="border-bottom: 1px solid #D9D3C7;">';
    bodyHtml +=
      '          <td class="text-secondary" style="padding: 14px 16px; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">VAT (' +
      renderedPdf.financials.vatRate +
      "%)</td>";
    bodyHtml +=
      '          <td class="text-title" style="padding: 14px 16px; text-align: right; font-weight: 900;">£' +
      renderedPdf.financials.vatTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) +
      "</td>";
    bodyHtml += "        </tr>";
    bodyHtml += '        <tr class="bg-header">';
    bodyHtml +=
      '          <td class="text-title" style="padding: 16px; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em;">Total Due</td>';
    bodyHtml +=
      '          <td class="text-title" style="padding: 16px; text-align: right; font-weight: 900; font-size: 16px;">£' +
      renderedPdf.financials.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) +
      "</td>";
    bodyHtml += "        </tr>";
    bodyHtml += "      </table>";
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">The attached PDF includes the full breakdown of invoiced works, our standard terms and conditions, and banking details for payment.</p>';
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">Should you have any questions regarding this invoice, please do not hesitate to get in touch.</p>';

    const emailHtml = emailShell({
      eyebrow: "Invoice",
      bodyHtml,
      footerName: "Opus Form Billing",
      footerEmail: "billing@opusform.co.uk",
    });

    const defaultSender = config["RESEND_FROM_EMAIL"] || "onboarding@resend.dev";
    const sender = defaultSender;
    const normalizedCcEmails = Array.from(
      new Set(storedCcEmails.map((email) => email.trim().toLowerCase())),
    ).filter((email) => email !== toEmail && isValidEmail(email));

    artifactPath = `${profile.tenant_id}/final_bill/${finalBill.id}/${renderedPdf.sha256}.pdf`;
    const { error: artifactUploadError } = await supabase.storage
      .from("billing-artifacts")
      .upload(artifactPath, renderedPdf.bytes, { contentType: "application/pdf", upsert: true });
    if (artifactUploadError) {
      console.error("Failed to store authoritative final-bill PDF:", artifactUploadError);
      throw new Error("The invoice artifact could not be stored.");
    }
    const { error: artifactError } = await supabase.from("billing_artifacts").upsert(
      {
        tenant_id: profile.tenant_id,
        document_kind: "final_bill",
        document_id: finalBill.id,
        storage_path: artifactPath,
        sha256: renderedPdf.sha256,
        byte_size: renderedPdf.byteSize,
        status: "generated",
        generated_at: new Date().toISOString(),
        sent_at: null,
      },
      { onConflict: "document_kind,document_id" },
    );
    if (artifactError) {
      console.error("Failed to record authoritative final-bill PDF:", artifactError);
      throw new Error("The invoice artifact could not be recorded.");
    }

    providerCallStarted = true;
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + resendApiKey,
      },
      body: JSON.stringify({
        from: "Opus Form Billing <" + sender + ">",
        to: [toEmail],
        ...(normalizedCcEmails.length > 0 ? { cc: normalizedCcEmails } : {}),
        subject:
          safeLabel +
          " | " +
          safeSiteName +
          (safePostcode ? ", " + safePostcode : "") +
          " – " +
          safeClientName,
        html: emailHtml,
        attachments: [
          {
            content: renderedPdf.base64,
            filename: renderedPdf.filename,
          },
        ],
      }),
    });

    providerRejected = !resendResponse.ok;
    providerAccepted = resendResponse.ok;
    const resendData = await resendResponse.json();

    if (providerRejected) {
      throw new Error(resendData.message || JSON.stringify(resendData));
    }

    const { error: updateError } = await supabase
      .from("final_bills")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", finalBillId)
      .eq("tenant_id", profile.tenant_id)
      .neq("status", "sent");

    if (updateError) {
      console.error("Failed to mark final bill as sent:", updateError);
      await supabase
        .from("billing_artifacts")
        .update({ status: "reconciliation_required" })
        .eq("tenant_id", profile.tenant_id)
        .eq("document_kind", "final_bill")
        .eq("document_id", finalBill.id);
      // Do not reset a bill after the provider accepted the email: a retry
      // could send a duplicate. Leave the explicit `sending` state for a
      // reviewed reconciliation job/operator instead.
      return jsonError(
        req,
        "Invoice delivered, but its billing record needs reconciliation before retrying.",
        503,
      );
    }
    const { error: artifactSentError } = await supabase
      .from("billing_artifacts")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("tenant_id", profile.tenant_id)
      .eq("document_kind", "final_bill")
      .eq("document_id", finalBill.id)
      .eq("sha256", renderedPdf.sha256);
    if (artifactSentError) {
      console.error("Failed to mark final-bill artifact as sent:", artifactSentError);
      return jsonError(
        req,
        "Invoice delivered, but its artifact record needs reconciliation before retrying.",
        503,
      );
    }
    claimedFinalBillId = null;

    return new Response(JSON.stringify({ success: true, id: resendData?.id ?? null }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Reset only when the provider call never started or explicitly rejected
    // the request. A timeout/transport error can hide provider acceptance, so
    // preserve `sending` and require reconciliation rather than duplicating an
    // invoice on retry.
    if (claimedFinalBillId && (!providerCallStarted || providerRejected) && !providerAccepted) {
      const recoveryUrl = Deno.env.get("SUPABASE_URL");
      const recoveryKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (recoveryUrl && recoveryKey) {
        const recoveryClient = createClient(recoveryUrl, recoveryKey);
        const { error: releaseError } = await recoveryClient
          .from("final_bills")
          .update({ status: "draft" })
          .eq("id", claimedFinalBillId)
          .eq("status", "sending");
        if (releaseError) console.error("Failed to release final-bill send claim:", releaseError);
      }
    }
    if (claimedFinalBillId && providerCallStarted && !providerAccepted && !providerRejected) {
      console.error("Final-bill provider outcome is unknown; preserving sending claim");
      const recoveryUrl = Deno.env.get("SUPABASE_URL");
      const recoveryKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (recoveryUrl && recoveryKey && artifactPath) {
        const recoveryClient = createClient(recoveryUrl, recoveryKey);
        await recoveryClient
          .from("billing_artifacts")
          .update({ status: "reconciliation_required" })
          .eq("storage_path", artifactPath);
      }
    }
    console.error("Error sending final bill via Resend:", error);
    return jsonError(req, "Unable to send the final bill.", 502);
  }
});
