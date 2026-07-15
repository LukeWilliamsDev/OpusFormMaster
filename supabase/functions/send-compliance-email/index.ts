import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    let emailHtml = "";
    emailHtml += "<head>";
    emailHtml += '  <meta name="color-scheme" content="light dark">';
    emailHtml += '  <meta name="supported-color-schemes" content="light dark">';
    emailHtml += "  <style>";
    emailHtml += "    :root { color-scheme: light dark; supported-color-schemes: light dark; }";
    emailHtml += "    @media (prefers-color-scheme: dark) {";
    emailHtml +=
      "      .dark-bg { background-color: #1a1b1f !important; background-image: none !important; }";
    emailHtml +=
      "      .card-bg { background-color: #242428 !important; background-image: none !important; }";
    emailHtml +=
      "      .header-bg { background-color: #26262B !important; background-image: none !important; }";
    emailHtml += "      .text-title { color: #e5e7eb !important; }";
    emailHtml += "      .text-body { color: #d1d5db !important; }";
    emailHtml += "      .text-secondary { color: #9ca3af !important; }";
    emailHtml += "    }";
    emailHtml += "    [data-ogsc] .text-title { color: #e5e7eb !important; }";
    emailHtml += "    [data-ogsc] .text-body { color: #d1d5db !important; }";
    emailHtml += "    [data-ogsc] .text-secondary { color: #9ca3af !important; }";
    emailHtml +=
      "    [data-ogsb] .dark-bg { background-color: #1a1b1f !important; background-image: none !important; }";
    emailHtml +=
      "    [data-ogsb] .card-bg { background-color: #242428 !important; background-image: none !important; }";
    emailHtml +=
      "    [data-ogsb] .header-bg { background-color: #26262B !important; background-image: none !important; }";
    emailHtml += "  </style>";
    emailHtml += "</head>";
    emailHtml +=
      '<div class="dark-bg" style="background-image: linear-gradient(#1a1b1f, #1a1b1f); background-color: #1a1b1f; padding: 40px 20px; font-family: \'Inter\', -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #d1d5db;">';
    emailHtml +=
      '  <div class="card-bg" style="max-width: 600px; margin: 0 auto; background-image: linear-gradient(#242428, #242428); background-color: #242428; border: 1px solid #2e2e33; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">';
    emailHtml += "    <!-- Header -->";
    emailHtml +=
      '    <div class="header-bg" style="background-image: linear-gradient(#26262B, #26262B); background-color: #26262B; padding: 30px 40px; border-bottom: 3px solid #526E8C; text-align: center;">';
    emailHtml +=
      '      <img src="https://fgpthpxmiroyebrzjdzo.supabase.co/functions/v1/send-quote-pdf" alt="OPUS FORM" width="180" style="display: inline-block; border: 0; outline: none; text-decoration: none;" />';
    emailHtml += "    </div>";
    emailHtml += "    ";
    emailHtml += "    <!-- Body -->";
    emailHtml += '    <div style="padding: 40px;">';
    emailHtml +=
      '      <div style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.2em; color: #526E8C; margin-bottom: 20px;">';
    emailHtml += "        Compliance Document Request";
    emailHtml += "      </div>";
    emailHtml += "      ";
    emailHtml +=
      '      <p class="text-title" style="margin: 0 0 16px; color: #e5e7eb; -webkit-text-fill-color: #e5e7eb !important; font-size: 16px; font-weight: 700;" data-ogsc="color: #e5e7eb;">Hello ' +
      (workerName || "Worker") +
      ",</p>";
    emailHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px; color: #9ca3af; -webkit-text-fill-color: #9ca3af !important;" data-ogsc="color: #9ca3af;">An administrator has requested that you submit compliance documentation. Please upload the required credentials before the link expires.</p>';
    emailHtml += "      ";
    if (requestedCerts && requestedCerts.length > 0) {
      emailHtml +=
        '      <div style="background-color: #1a1b1f; border: 1px solid #2e2e33; border-radius: 8px; padding: 20px; margin-bottom: 32px;">';
      emailHtml +=
        '        <p style="margin: 0 0 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #526E8C;">Required Certifications:</p>';
      emailHtml += '        <ul style="margin: 0; padding-left: 20px; color: #e5e7eb;">';
      for (const cert of requestedCerts) {
        emailHtml +=
          '          <li style="margin-bottom: 6px; font-weight: bold; font-size: 13px;">' +
          cert +
          "</li>";
      }
      emailHtml += "        </ul>";
      emailHtml += "      </div>";
    } else {
      emailHtml +=
        '      <div style="background-color: #1a1b1f; border: 1px solid #2e2e33; border-radius: 8px; padding: 20px; margin-bottom: 32px;">';
      emailHtml +=
        '        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #e5e7eb;">Please upload all your on-site certifications and licenses using the secure link below.</p>';
      emailHtml += "      </div>";
    }
    emailHtml += "      ";
    emailHtml += '      <div style="text-align: center; margin-bottom: 32px;">';
    emailHtml +=
      '        <a href="' +
      uploadUrl +
      '" style="display: inline-block; padding: 14px 28px; background-color: #526E8C; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; box-shadow: 0 4px 12px rgba(82, 110, 140, 0.3);">Upload Documents</a>';
    emailHtml += "      </div>";
    emailHtml += "      ";
    emailHtml +=
      '      <p class="text-secondary" style="margin: 0 0 24px; color: #9ca3af; -webkit-text-fill-color: #9ca3af !important; font-size: 12px; text-align: center;" data-ogsc="color: #9ca3af;">This link is secure and passwordless. It will expire on: <strong>' +
      formattedExpiry +
      " (UK time)</strong></p>";
    emailHtml += "      ";
    emailHtml +=
      '      <div style="border-top: 1px solid #2e2e33; padding-top: 24px; margin-top: 32px;">';
    emailHtml +=
      '        <p class="text-title" style="margin: 0 0 4px; color: #e5e7eb; -webkit-text-fill-color: #e5e7eb !important; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;" data-ogsc="color: #e5e7eb;">Kind regards,</p>';
    emailHtml +=
      '        <p class="text-title" style="margin: 0 0 4px; color: #e5e7eb; -webkit-text-fill-color: #e5e7eb !important; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;" data-ogsc="color: #e5e7eb;">Opus Form Support</p>';
    emailHtml +=
      '        <a href="mailto:support@opusform.co.uk" style="color: #526E8C; -webkit-text-fill-color: #526E8C !important; text-decoration: none; font-size: 12px; font-weight: 700;" data-ogsc="color: #526E8C;">support@opusform.co.uk</a>';
    emailHtml += "      </div>";
    emailHtml += "    </div>";
    emailHtml += "  </div>";
    emailHtml += "</div>";

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
