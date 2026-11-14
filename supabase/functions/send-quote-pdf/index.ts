import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailShell, logoSvg } from "../_shared/email-theme.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { renderBillingPdf } from "../_shared/billing-pdf.ts";

// NOTE: This Edge Function MUST be deployed with `verify_jwt: false`
// to allow email clients (Gmail, Outlook, etc.) to fetch the corporate SVG logo
// via the GET endpoint without Supabase authorization headers.

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

interface RequestPayload {
  quoteId: string;
  documentTable?: "quotes" | "invoices";
  // Legacy fields are optional while callers roll forward. The server derives
  // all recipient, metadata, totals, and PDF content from the saved row.
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

  let claimedDocumentId: string | null = null;
  let claimedDocumentTable: "quotes" | "invoices" | null = null;
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
    const { quoteId, documentTable = "quotes", toEmail: legacyToEmail } = payload;

    if (!quoteId || !["quotes", "invoices"].includes(documentTable)) {
      return jsonError(req, "A valid document reference is required.", 400);
    }
    const documentQuery =
      documentTable === "quotes"
        ? supabase
            .from("quotes")
            .select(
              "id,tenant_id,reference,client_info,items,totals,vat_rate,date,is_sent,send_status,job_id",
            )
            .eq("id", quoteId)
            .eq("tenant_id", profile.tenant_id)
            .maybeSingle()
        : supabase
            .from("invoices")
            .select("id,tenant_id,reference,client_info,items,totals,vat_rate,date,status,job_id")
            .eq("id", quoteId)
            .eq("tenant_id", profile.tenant_id)
            .maybeSingle();
    let { data: document, error: documentError } = await documentQuery;
    if (documentError || !document) return jsonError(req, "Quotation not found.", 404);
    let storedClientInfo =
      document.client_info && typeof document.client_info === "object"
        ? (document.client_info as Record<string, unknown>)
        : {};
    let storedEmail =
      typeof storedClientInfo.email === "string" ? storedClientInfo.email.trim() : "";
    if (!isValidEmail(storedEmail)) {
      return jsonError(req, "The saved document recipient is unavailable.", 409);
    }
    if (
      legacyToEmail &&
      (!isValidEmail(legacyToEmail) ||
        legacyToEmail.trim().toLowerCase() !== storedEmail.toLowerCase())
    ) {
      return jsonError(req, "The recipient does not match the saved quotation.", 403);
    }
    let safeClientName =
      typeof storedClientInfo.entity === "string" ? storedClientInfo.entity : "Valued Client";
    let safeSiteName = typeof storedClientInfo.site === "string" ? storedClientInfo.site : "Site";
    let safePostcode =
      typeof storedClientInfo.postcode === "string" ? storedClientInfo.postcode : "";
    if (
      (documentTable === "quotes" && document.is_sent === true) ||
      (documentTable === "invoices" && ["sent", "billed"].includes(document.status))
    ) {
      return new Response(JSON.stringify({ success: true, alreadySent: true }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        status: 200,
      });
    }
    if (
      (documentTable === "quotes" && document.send_status === "sending") ||
      (documentTable === "invoices" && document.status === "sending")
    ) {
      return jsonError(req, "This invoice is already being sent. Please retry later.", 409);
    }

    // Claim first, then take the authoritative snapshot. The database trigger
    // prevents draft edits while this claim is in flight.
    if (documentTable === "quotes") {
      const { data: claimedQuote, error: claimError } = await supabase
        .from("quotes")
        .update({ send_status: "sending" })
        .eq("id", quoteId)
        .eq("tenant_id", profile.tenant_id)
        .eq("send_status", "draft")
        .select("id")
        .maybeSingle();
      if (claimError) {
        console.error("Failed to claim quote for sending:", claimError);
        return jsonError(req, "Unable to reserve the quotation for sending.", 503);
      }
      if (!claimedQuote) {
        return jsonError(req, "This quotation is already being sent. Please retry later.", 409);
      }
    } else {
      const { data: claimedInvoice, error: claimError } = await supabase
        .from("invoices")
        .update({ status: "sending" })
        .eq("id", quoteId)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();
      if (claimError) {
        console.error("Failed to claim invoice for sending:", claimError);
        return jsonError(req, "Unable to reserve the invoice for sending.", 503);
      }
      if (!claimedInvoice) {
        return jsonError(req, "This invoice is already being sent. Please retry later.", 409);
      }
    }
    claimedDocumentId = quoteId;
    claimedDocumentTable = documentTable;

    const claimedDocumentQuery =
      documentTable === "quotes"
        ? supabase
            .from("quotes")
            .select(
              "id,tenant_id,reference,client_info,items,totals,vat_rate,date,is_sent,send_status,job_id",
            )
            .eq("id", quoteId)
            .eq("tenant_id", profile.tenant_id)
            .eq("send_status", "sending")
            .maybeSingle()
        : supabase
            .from("invoices")
            .select("id,tenant_id,reference,client_info,items,totals,vat_rate,date,status,job_id")
            .eq("id", quoteId)
            .eq("tenant_id", profile.tenant_id)
            .eq("status", "sending")
            .maybeSingle();
    const { data: claimedSnapshot, error: claimedSnapshotError } = await claimedDocumentQuery;
    if (claimedSnapshotError || !claimedSnapshot) {
      throw new Error("The claimed document snapshot could not be loaded.");
    }
    document = claimedSnapshot;
    storedClientInfo =
      document.client_info && typeof document.client_info === "object"
        ? (document.client_info as Record<string, unknown>)
        : {};
    storedEmail = typeof storedClientInfo.email === "string" ? storedClientInfo.email.trim() : "";
    if (!isValidEmail(storedEmail)) {
      throw new Error("The saved document recipient is unavailable.");
    }
    if (
      legacyToEmail &&
      (!isValidEmail(legacyToEmail) ||
        legacyToEmail.trim().toLowerCase() !== storedEmail.toLowerCase())
    ) {
      throw new Error("The recipient does not match the saved document.");
    }
    safeClientName =
      typeof storedClientInfo.entity === "string" ? storedClientInfo.entity : "Valued Client";
    safeSiteName = typeof storedClientInfo.site === "string" ? storedClientInfo.site : "Site";
    safePostcode = typeof storedClientInfo.postcode === "string" ? storedClientInfo.postcode : "";

    const { data: job } = await supabase
      .from("jobs")
      .select("job_ref")
      .eq("id", document.job_id)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    let renderedPdf;
    try {
      renderedPdf = await renderBillingPdf({
        kind: documentTable === "invoices" ? "invoice" : "quote",
        reference: document.reference,
        date: document.date,
        jobRef: job?.job_ref,
        clientInfo: storedClientInfo,
        items: Array.isArray(document.items) ? document.items : [],
        vatRate: document.vat_rate,
        totals: document.totals,
      });
    } catch (renderError) {
      console.error("Failed to render authoritative billing PDF:", renderError);
      throw new Error("The saved document cannot be rendered safely.");
    }
    const safeQuoteRef = document.reference;
    const documentKind = documentTable === "invoices" ? "invoice" : "quotation";
    const documentKindTitle = documentTable === "invoices" ? "Invoice" : "Quotation";
    const safeLabel = `${documentKindTitle} #${safeQuoteRef}`;
    const toEmail = storedEmail.toLowerCase();
    const normalizedToEmail = toEmail;
    const storedCcEmails = Array.isArray(storedClientInfo.ccEmails)
      ? storedClientInfo.ccEmails.filter((email): email is string => typeof email === "string")
      : [];
    if (storedCcEmails.length > 20) {
      throw new Error("Too many CC recipients.");
    }
    const normalizedCcEmails = Array.from(
      new Set(storedCcEmails.map((email) => email.trim().toLowerCase())),
    ).filter((email) => email !== normalizedToEmail);
    if (normalizedCcEmails.some((email) => !isValidEmail(email))) {
      throw new Error("Each CC recipient must be a valid email address.");
    }

    // Retrieve settings config from the secure smtp_config table
    const { data: configRows, error: configError } = await supabase
      .from("decrypted_smtp_config")
      .select("key, value");

    if (configError || !configRows || configRows.length === 0) {
      console.error("send-quote-pdf: failed to load email configuration", configError);
      throw new Error("Email service unavailable.");
    }

    // Convert rows to a keyed object
    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    // Resolve Resend API Key, preferring the current Edge Function secret over
    // the legacy database config view.
    let resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) resendApiKey = config["RESEND_API_KEY"];

    if (!resendApiKey) {
      console.error("send-quote-pdf: RESEND_API_KEY is not configured");
      throw new Error("Email service unavailable.");
    }

    artifactPath = `${profile.tenant_id}/${documentTable === "invoices" ? "invoice" : "quote"}/${document.id}/${renderedPdf.sha256}.pdf`;
    const { error: artifactUploadError } = await supabase.storage
      .from("billing-artifacts")
      .upload(artifactPath, renderedPdf.bytes, { contentType: "application/pdf", upsert: true });
    if (artifactUploadError) {
      console.error("Failed to store authoritative billing PDF:", artifactUploadError);
      throw new Error("The document artifact could not be stored.");
    }
    const { error: artifactError } = await supabase.from("billing_artifacts").upsert(
      {
        tenant_id: profile.tenant_id,
        document_kind: documentTable === "invoices" ? "invoice" : "quote",
        document_id: document.id,
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
      console.error("Failed to record authoritative billing PDF:", artifactError);
      throw new Error("The document artifact could not be recorded.");
    }

    let bodyHtml = "";
    bodyHtml +=
      '      <p class="text-title" style="margin: 0 0 16px; font-size: 16px; font-weight: 700;">Dear ' +
      escapeHtml(safeClientName) +
      ",</p>";
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">Please find attached our formal ' +
      documentKind +
      ' <strong class="text-title">#' +
      escapeHtml(safeQuoteRef) +
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
      renderedPdf.financials.vatTotal.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      }) +
      "</td>";
    bodyHtml += "        </tr>";
    bodyHtml += '        <tr class="bg-header">';
    bodyHtml +=
      '          <td class="text-title" style="padding: 16px; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em;">Total</td>';
    bodyHtml +=
      '          <td class="text-title" style="padding: 16px; text-align: right; font-weight: 900; font-size: 16px;">£' +
      renderedPdf.financials.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) +
      "</td>";
    bodyHtml += "        </tr>";
    bodyHtml += "      </table>";
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">The attached PDF includes the full bill of quantities, structural scopes, our standard terms and conditions, and banking details for your reference.</p>';
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">Should you have any questions or wish to discuss the quotation further, please do not hesitate to get in touch.</p>';

    const emailHtml = emailShell({
      eyebrow: `${documentKindTitle} Summary`,
      bodyHtml,
      footerName: "Opus Form Billing",
      footerEmail: "billing@opusform.co.uk",
    });

    // The sender is configuration-derived; callers cannot spoof it.
    const defaultSender = config["RESEND_FROM_EMAIL"] || "onboarding@resend.dev";
    const sender = defaultSender;

    // Send via Resend HTTP API. Once this call starts, an unknown transport
    // outcome may still mean the provider accepted the message.
    providerCallStarted = true;
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + resendApiKey,
      },
      body: JSON.stringify({
        from: "Opus Form Billing <" + sender + ">",
        to: [normalizedToEmail],
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

    if (documentTable === "invoices") {
      const { error: statusError } = await supabase
        .from("invoices")
        .update({ status: "sent" })
        .eq("id", quoteId)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "sending");
      if (statusError) {
        console.error("Failed to mark invoice as sent:", statusError);
        await supabase
          .from("billing_artifacts")
          .update({ status: "reconciliation_required" })
          .eq("storage_path", artifactPath);
        return jsonError(
          req,
          `${documentKindTitle} delivered, but its billing record needs reconciliation before retrying.`,
          503,
        );
      }
    } else {
      const { error: statusError } = await supabase
        .from("quotes")
        .update({ is_sent: true, send_status: "sent" })
        .eq("id", quoteId)
        .eq("tenant_id", profile.tenant_id)
        .eq("send_status", "sending");
      if (statusError) {
        console.error("Failed to mark quote as sent:", statusError);
        await supabase
          .from("billing_artifacts")
          .update({ status: "reconciliation_required" })
          .eq("storage_path", artifactPath);
        return jsonError(
          req,
          `${documentKindTitle} delivered, but its billing record needs reconciliation before retrying.`,
          503,
        );
      }
    }
    const { error: artifactSentError } = await supabase
      .from("billing_artifacts")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("storage_path", artifactPath);
    if (artifactSentError) {
      console.error("Failed to mark billing artifact as sent:", artifactSentError);
      return jsonError(
        req,
        `${documentKindTitle} delivered, but its artifact record needs reconciliation before retrying.`,
        503,
      );
    }
    claimedDocumentId = null;
    claimedDocumentTable = null;

    return new Response(JSON.stringify({ success: true, id: resendData?.id ?? null }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Reset only for work that never reached the provider or an explicit
    // provider rejection. Preserve a claim after an unknown transport outcome
    // because resetting it could cause a duplicate email on retry.
    if (
      claimedDocumentId &&
      claimedDocumentTable &&
      (!providerCallStarted || providerRejected) &&
      !providerAccepted
    ) {
      const recoveryUrl = Deno.env.get("SUPABASE_URL");
      const recoveryKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (recoveryUrl && recoveryKey) {
        const recoveryClient = createClient(recoveryUrl, recoveryKey);
        const { error: releaseError } =
          claimedDocumentTable === "quotes"
            ? await recoveryClient
                .from("quotes")
                .update({ send_status: "draft" })
                .eq("id", claimedDocumentId)
                .eq("send_status", "sending")
            : await recoveryClient
                .from("invoices")
                .update({ status: "draft" })
                .eq("id", claimedDocumentId)
                .eq("status", "sending");
        if (releaseError) console.error("Failed to release document send claim:", releaseError);
      }
    }
    if (claimedDocumentId && providerCallStarted && !providerAccepted && !providerRejected) {
      console.error("Quote/invoice provider outcome is unknown; preserving send claim");
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
    console.error("Error sending email via Resend:", error);
    return jsonError(req, "Unable to send the quote email.", 502);
  }
});
