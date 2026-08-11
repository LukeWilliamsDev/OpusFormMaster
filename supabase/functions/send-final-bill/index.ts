import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The GET logo endpoint is intentionally public for mail-client image loading.
// POST requests still require a valid authenticated admin/dispatcher because
// this function can send arbitrary outbound email through the Resend account.

// _shared/cors.ts and _shared/email-theme.ts are duplicated inline below
// instead of imported: this function is deployed via the Supabase Management
// API as a single-file bundle (no local CLI session), which can't resolve
// relative imports. If CLI deploy access is restored, switch back to
// `import { corsHeaders } from "../_shared/cors.ts"` and
// `import { emailShell, logoSvg } from "../_shared/email-theme.ts"` and delete
// the block below.

const ALLOWED_ORIGINS = [
  "https://opusform.co.uk",
  "https://www.opusform.co.uk",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
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

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// `send-final-bill` is deployed as a single-file bundle through the Supabase
// Management API, so its authorization helpers stay inline rather than using a
// relative import that the deployment path cannot resolve.
function getBearerToken(authHeader: string | null): string | null {
  const match = authHeader?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

function isStaffRole(role: unknown): boolean {
  return role === "admin" || role === "dispatcher";
}

interface RequestPayload {
  finalBillId: string;
  toEmail: string;
  clientName?: string;
  siteName?: string;
  postcode?: string;
  billRef: string;
  label?: string;
  pdfBase64: string; // Base64 encoded string from frontend
  netTotal?: number;
  grossTotal?: number;
  fromEmail?: string; // Optional custom sender
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authToken = getBearerToken(req.headers.get("Authorization"));
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header." }),
        {
          status: 401,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authToken);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token." }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !isStaffRole(profile.role)) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Only admins and dispatchers can send final bills.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const payload: RequestPayload = await req.json();
    const {
      finalBillId,
      toEmail,
      clientName,
      siteName,
      postcode,
      billRef,
      label,
      pdfBase64,
      netTotal,
      grossTotal,
      fromEmail,
    } = payload;

    if (!finalBillId) {
      return new Response(JSON.stringify({ error: "finalBillId is required." }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!toEmail) {
      return new Response(JSON.stringify({ error: "Recipient email (toEmail) is required." }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "pdfBase64 is required." }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Retrieve settings config from the secure smtp_config table
    const { data: configRows, error: configError } = await supabase
      .from("decrypted_smtp_config")
      .select("key, value");

    if (configError || !configRows || configRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to load config from database.", detail: configError }),
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

    let resendApiKey = config["RESEND_API_KEY"];
    if (!resendApiKey) {
      resendApiKey = Deno.env.get("RESEND_API_KEY");
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "RESEND_API_KEY not found in Supabase environment variables or smtp_config database table.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    let bodyHtml = "";
    bodyHtml +=
      '      <p class="text-title" style="margin: 0 0 16px; font-size: 16px; font-weight: 700;">Dear ' +
      escapeHtml(clientName || "Valued Client") +
      ",</p>";
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">Please find attached the invoice <strong class="text-title">#' +
      escapeHtml(billRef) +
      "</strong> for the concrete works at " +
      escapeHtml(siteName || "Site") +
      (postcode ? ", " + escapeHtml(postcode) : "") +
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
      Number(netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) +
      "</td>";
    bodyHtml += "        </tr>";
    bodyHtml += '        <tr class="bg-header">';
    bodyHtml +=
      '          <td class="text-title" style="padding: 16px; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em;">Total Due</td>';
    bodyHtml +=
      '          <td class="text-title" style="padding: 16px; text-align: right; font-weight: 900; font-size: 16px;">£' +
      Number(grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) +
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
    const sender = fromEmail && fromEmail === defaultSender ? fromEmail : defaultSender;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + resendApiKey,
      },
      body: JSON.stringify({
        from: "Opus Form Billing <" + sender + ">",
        to: [toEmail],
        subject:
          (label || "Invoice #" + billRef) +
          " | " +
          (siteName || "Project") +
          (postcode ? ", " + postcode : "") +
          " – " +
          (clientName || "Client"),
        html: emailHtml,
        attachments: [
          {
            content: pdfBase64,
            filename: (label ? "OpusForm_" + label : "Invoice_" + billRef) + ".pdf",
          },
        ],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(resendData.message || JSON.stringify(resendData));
    }

    const sentAt = new Date().toISOString();
    const { data: updatedBill, error: updateError } = await supabase
      .from("final_bills")
      .update({ status: "sent", sent_at: sentAt })
      .eq("id", finalBillId)
      .select("id, status, sent_at")
      .single();

    if (updateError || !updatedBill?.sent_at) {
      console.error(
        "Failed to persist final bill sent state:",
        updateError || "sent_at was not returned",
      );
      return new Response(
        JSON.stringify({
          success: false,
          emailSent: true,
          databaseUpdated: false,
          error: "Email sent, but the final bill status could not be recorded.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: true,
        databaseUpdated: true,
        sentAt: updatedBill.sent_at,
        data: resendData,
      }),
      {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error sending final bill via Resend:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
