import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailShell, logoSvg } from "../_shared/email-theme.ts";
import { corsHeaders } from "../_shared/cors.ts";

// NOTE: This Edge Function MUST be deployed with `verify_jwt: false`
// to allow email clients (Gmail, Outlook, etc.) to fetch the corporate SVG logo
// via the GET endpoint without Supabase authorization headers.

// TEMPORARY: recipient is hardcoded to the requester's own address while this
// feature is under test, instead of clientInfo.email. Remove OVERRIDE_TO_EMAIL
// and use payload.toEmail once final bills are ready to go to real clients.
const OVERRIDE_TO_EMAIL = "lukewilliams141@gmail.com";

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
  clientName?: string;
  siteName?: string;
  postcode?: string;
  billRef: string;
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

    const authHeader = req.headers.get("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : "";
    if (token && token !== supabaseServiceKey && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await supabase.auth.getUser(token);
      const user = data?.user ?? null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile && !["admin", "dispatcher"].includes(profile.role)) {
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
      }
    }

    const payload: RequestPayload = await req.json();
    const {
      finalBillId,
      clientName,
      siteName,
      postcode,
      billRef,
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
      '      <p class="text-secondary" style="margin: 0 0 24px;">Please find attached the final bill <strong class="text-title">#' +
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
      '      <p class="text-secondary" style="margin: 0 0 24px;">Should you have any questions regarding this final bill, please do not hesitate to get in touch.</p>';

    const emailHtml = emailShell({
      eyebrow: "Final Bill",
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
        to: [OVERRIDE_TO_EMAIL],
        subject:
          "Final Bill #" +
          billRef +
          " | " +
          (siteName || "Project") +
          (postcode ? ", " + postcode : "") +
          " – " +
          (clientName || "Client"),
        html: emailHtml,
        attachments: [
          {
            content: pdfBase64,
            filename: "FinalBill_" + billRef + ".pdf",
          },
        ],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(resendData.message || JSON.stringify(resendData));
    }

    const { error: updateError } = await supabase
      .from("final_bills")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", finalBillId);

    if (updateError) {
      console.error("Failed to mark final bill as sent:", updateError);
    }

    return new Response(JSON.stringify({ success: true, data: resendData }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending final bill via Resend:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
