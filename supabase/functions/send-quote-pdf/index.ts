import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailShell, logoSvg } from "../_shared/email-theme.ts";
import { corsHeaders } from "../_shared/cors.ts";

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

interface RequestPayload {
  toEmail: string;
  clientName?: string;
  siteName?: string;
  postcode?: string;
  quoteRef: string;
  pdfBase64?: string; // Base64 encoded string from frontend
  pdfUrl?: string; // Public URL pointer to PDF
  logoUrl?: string; // Absolute URL of corporate SVG logo
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
    // Verify caller identity before performing any send/relay action (POST is otherwise
    // unauthenticated since this function must run with verify_jwt: false for the GET logo route)
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

    // Connect to Supabase using the built-in service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
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

    if (profileError || !profile || !["admin", "dispatcher"].includes(profile.role)) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Only admins and dispatchers can send quote PDFs.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const payload: RequestPayload = await req.json();
    const {
      toEmail,
      clientName,
      siteName,
      postcode,
      quoteRef,
      pdfBase64,
      pdfUrl,
      logoUrl,
      netTotal,
      grossTotal,
      fromEmail,
    } = payload;

    if (!toEmail) {
      return new Response(JSON.stringify({ error: "Recipient email (toEmail) is required." }), {
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

    // Convert rows to a keyed object
    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    // Resolve Resend API Key (prioritize database config, fallback to env)
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

    // Resolve PDF attachment content (handles Base64 or Public URL pointer)
    let attachmentContent = "";
    if (pdfBase64) {
      attachmentContent = pdfBase64;
    } else if (pdfUrl) {
      // Only allow fetching PDFs from this project's own Supabase Storage to prevent SSRF
      // (e.g. probing internal/metadata endpoints via an arbitrary attacker-supplied URL).
      let parsedPdfUrl: URL;
      try {
        parsedPdfUrl = new URL(pdfUrl);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid pdfUrl." }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const allowedHost = new URL(supabaseUrl).host;
      if (parsedPdfUrl.protocol !== "https:" || parsedPdfUrl.host !== allowedHost) {
        return new Response(
          JSON.stringify({ error: "pdfUrl must point to this project's Supabase Storage." }),
          {
            status: 400,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          },
        );
      }

      // Fetch PDF binary from the public URL and convert to Base64
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${pdfUrl}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Convert Uint8Array to Base64 in a Deno-compatible way
      let binary = "";
      const len = uint8Array.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      attachmentContent = btoa(binary);
    } else {
      return new Response(
        JSON.stringify({ error: "No PDF attachment provided (pdfBase64 or pdfUrl is required)." }),
        {
          status: 400,
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
      '      <p class="text-secondary" style="margin: 0 0 24px;">Please find attached our formal quotation <strong class="text-title">#' +
      escapeHtml(quoteRef) +
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
      '          <td class="text-title" style="padding: 16px; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em;">Total</td>';
    bodyHtml +=
      '          <td class="text-title" style="padding: 16px; text-align: right; font-weight: 900; font-size: 16px;">£' +
      Number(grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) +
      "</td>";
    bodyHtml += "        </tr>";
    bodyHtml += "      </table>";
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">The attached PDF includes the full bill of quantities, structural scopes, our standard terms and conditions, and banking details for your reference.</p>';
    bodyHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px;">Should you have any questions or wish to discuss the quotation further, please do not hesitate to get in touch.</p>';

    const emailHtml = emailShell({
      eyebrow: "Quotation Summary",
      bodyHtml,
      footerName: "Opus Form Billing",
      footerEmail: "billing@opusform.co.uk",
    });

    // Determine the sender address (sandbox domain onboarding@resend.dev if custom domain is not verified yet)
    // Resolves key RESEND_FROM_EMAIL first, defaults to onboarding@resend.dev.
    // Never trust a client-supplied fromEmail (sender-spoofing risk) — only allow it when it
    // matches the configured/default sender.
    const defaultSender = config["RESEND_FROM_EMAIL"] || "onboarding@resend.dev";
    const sender = fromEmail && fromEmail === defaultSender ? fromEmail : defaultSender;

    // Send via Resend HTTP API
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
          "Quote #" +
          quoteRef +
          " | " +
          (siteName || "Project") +
          (postcode ? ", " + postcode : "") +
          " – " +
          (clientName || "Client"),
        html: emailHtml,
        attachments: [
          {
            content: attachmentContent,
            filename: "Quote_" + quoteRef + ".pdf",
          },
        ],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(resendData.message || JSON.stringify(resendData));
    }

    return new Response(JSON.stringify({ success: true, data: resendData }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
