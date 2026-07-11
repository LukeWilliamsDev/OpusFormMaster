import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestPayload {
  toEmail: string;
  clientName?: string;
  quoteRef: string;
  pdfBase64?: string;      // Base64 encoded string from frontend
  pdfUrl?: string;         // Public URL pointer to PDF
  logoUrl?: string;        // Absolute URL of corporate SVG logo
  netTotal?: number;
  vatAmount?: number;
  grossTotal?: number;
  fromEmail?: string;      // Optional custom sender
}

serve(async (req) => {
  // Handle CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: RequestPayload = await req.json()
    const { toEmail, clientName, quoteRef, pdfBase64, pdfUrl, logoUrl, netTotal, vatAmount, grossTotal, fromEmail } = payload

    if (!toEmail) {
      return new Response(JSON.stringify({ error: "Recipient email (toEmail) is required." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Connect to Supabase using the built-in service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Retrieve settings config from the secure smtp_config table
    const { data: configRows, error: configError } = await supabase
      .from('smtp_config')
      .select('key, value')

    if (configError || !configRows || configRows.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to load config from database.", detail: configError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Convert rows to a keyed object
    const config: Record<string, string> = {}
    for (const row of configRows) {
      config[row.key] = row.value
    }


    // Resolve Resend API Key (prioritize database config, fallback to env)
    let resendApiKey = config['RESEND_API_KEY']
    if (!resendApiKey) {
      resendApiKey = Deno.env.get('RESEND_API_KEY')
    }



    if (!resendApiKey) {
      return new Response(JSON.stringify({ 
        error: "RESEND_API_KEY not found in Supabase environment variables or smtp_config database table." 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Resolve PDF attachment content (handles Base64 or Public URL pointer)
    let attachmentContent = ""
    if (pdfBase64) {
      attachmentContent = pdfBase64
    } else if (pdfUrl) {
      // Fetch PDF binary from the public URL and convert to Base64
      const response = await fetch(pdfUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${pdfUrl}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Convert Uint8Array to Base64 in a Deno-compatible way
      let binary = ""
      const len = uint8Array.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i])
      }
      attachmentContent = btoa(binary)
    } else {
      return new Response(JSON.stringify({ error: "No PDF attachment provided (pdfBase64 or pdfUrl is required)." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Resolve logoUrl host (rewrite local dev localhost hosts to GitHub Dev branch asset)
    let resolvedLogoUrl = logoUrl
    if (resolvedLogoUrl && (resolvedLogoUrl.includes("localhost") || resolvedLogoUrl.includes("127.0.0.1"))) {
      resolvedLogoUrl = "https://raw.githubusercontent.com/LukeWilliamsDev/lovable-opus-form/Dev/public/opus-form-primary.svg"
    }

    // Compose HTML message body
    const emailHtml = `
      <div style="background-color: #1a1b1f; padding: 40px 20px; font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #d1d5db;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #242428; border: 1px solid #2e2e33; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
          <!-- Header -->
          <div style="background-color: #26262B; padding: 30px 40px; border-bottom: 3px solid #526E8C; text-align: center;">
            ${resolvedLogoUrl ? `
              <img src="${resolvedLogoUrl}" alt="OPUS FORM" width="180" style="display: inline-block; border: 0; outline: none; text-decoration: none;" />
            ` : `
              <div style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 900; color: #F4F4F0; letter-spacing: 4px;">OPUS FORM</div>
            `}
          </div>
          
          <!-- Body -->
          <div style="padding: 40px;">
            <div style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.2em; color: #526E8C; margin-bottom: 20px;">
              Quote Estimate Details
            </div>
            
            <p style="margin: 0 0 16px; color: #e5e7eb; font-size: 16px; font-weight: 700;">Dear ${clientName || 'Valued Client'},</p>
            <p style="margin: 0 0 24px; color: #9ca3af;">Please find attached the formal concrete works quote estimate <strong>#${quoteRef}</strong> for your review.</p>
            
            <!-- Summary Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 1px solid #2e2e33; border-radius: 8px; overflow: hidden;">
              <tr style="background-color: #1a1b1f; border-bottom: 1px solid #2e2e33;">
                <td style="padding: 14px 16px; font-weight: bold; color: #9ca3af; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Net Subtotal</td>
                <td style="padding: 14px 16px; text-align: right; font-weight: 900; color: #e5e7eb;">£${Number(netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="background-color: #1a1b1f; border-bottom: 1px solid #2e2e33;">
                <td style="padding: 14px 16px; font-weight: bold; color: #9ca3af; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">UK Standard VAT (20%)</td>
                <td style="padding: 14px 16px; text-align: right; font-weight: 900; color: #e5e7eb;">£${Number(vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="background-color: #26262B;">
                <td style="padding: 16px; font-weight: 900; color: #e5e7eb; text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em;">Concrete Works Total</td>
                <td style="padding: 16px; text-align: right; font-weight: 900; color: #e5e7eb; font-size: 16px;">£${Number(grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
            
            <p style="margin: 0 0 24px; color: #9ca3af;">The attached PDF contains the complete bill of quantities, structural scopes, standard terms, and banking details.</p>
            
            <div style="border-top: 1px solid #2e2e33; padding-top: 24px; margin-top: 32px;">
              <p style="margin: 0 0 4px; color: #e5e7eb; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Opus Form Billing</p>
              <a href="mailto:billing@opusform.co.uk" style="color: #526E8C; text-decoration: none; font-size: 12px; font-weight: 700;">billing@opusform.co.uk</a>
            </div>
          </div>
        </div>
      </div>
    `

    // Determine the sender address (sandbox domain onboarding@resend.dev if custom domain is not verified yet)
    // Resolves key RESEND_FROM_EMAIL first, defaults to onboarding@resend.dev
    const sender = fromEmail || config['RESEND_FROM_EMAIL'] || "onboarding@resend.dev"

    // Send via Resend HTTP API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + resendApiKey
      },
      body: JSON.stringify({
        from: 'Opus Form Billing <' + sender + '>',
        to: [toEmail],
        subject: 'Formal Quote: #' + quoteRef + ' - ' + (clientName || 'Project'),
        html: emailHtml,
        attachments: [
          {
            content: attachmentContent,
            filename: 'Quote_' + quoteRef + '.pdf'
          }
        ]
      })
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(resendData.message || JSON.stringify(resendData))
    }

    return new Response(JSON.stringify({ success: true, data: resendData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error sending email via Resend:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
