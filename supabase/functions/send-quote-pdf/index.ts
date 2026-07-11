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
    const { toEmail, clientName, quoteRef, pdfBase64, pdfUrl, netTotal, vatAmount, grossTotal, fromEmail } = payload

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

    // Resolve Resend API Key (fallback to database config if env is not set)
    let resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      resendApiKey = config['RESEND_API_KEY']
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

    // Compose HTML message body
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333; line-height: 1.6;">
        <h2 style="color: #26262B; border-bottom: 2px solid #526E8C; padding-bottom: 10px;">Opus Form Quote Estimate</h2>
        <p>Dear ${clientName || 'Valued Client'},</p>
        <p>Please find attached the formal concrete works quote estimate <strong>#${quoteRef}</strong> for your review.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8f7f4; border-bottom: 1px solid #EDEAE4;">
            <td style="padding: 10px; font-weight: bold;">Net Subtotal:</td>
            <td style="padding: 10px; text-align: right;">£${Number(netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background-color: #f8f7f4; border-bottom: 1px solid #EDEAE4;">
            <td style="padding: 10px; font-weight: bold;">VAT Amount:</td>
            <td style="padding: 10px; text-align: right;">£${Number(vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background-color: #26262B; color: #FFF; font-weight: bold;">
            <td style="padding: 10px;">Gross Total:</td>
            <td style="padding: 10px; text-align: right;">£${Number(grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
        
        <p>The PDF contains complete project details, structural scopes, and payment terms.</p>
        <p>Kind regards,</p>
        <p><strong>Opus Form Operations Team</strong><br>
        <a href="mailto:billing@opusform.co.uk" style="color: #526E8C; text-decoration: none;">billing@opusform.co.uk</a></p>
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
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: `Opus Form Billing <${sender}>`,
        to: [toEmail],
        subject: `Formal Quote: #${quoteRef} - ${clientName || 'Project'}`,
        html: emailHtml,
        attachments: [
          {
            content: attachmentContent,
            filename: `Quote_${quoteRef}.pdf`
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
