import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer@6.9.13"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { toEmail, clientName, quoteRef, pdfBase64, netTotal, vatAmount, grossTotal } = await req.json()

    if (!toEmail || !pdfBase64) {
      return new Response(JSON.stringify({ error: "Missing required fields (toEmail, pdfBase64)" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Get IONOS SMTP credentials from env
    const host = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.co.uk"
    const port = parseInt(Deno.env.get("IONOS_SMTP_PORT") || "465")
    const secure = port === 465 // Use SSL/TLS for port 465
    const user = Deno.env.get("IONOS_SMTP_USER")
    const pass = Deno.env.get("IONOS_SMTP_PASS")

    if (!user || !pass) {
      return new Response(JSON.stringify({ error: "IONOS_SMTP_USER or IONOS_SMTP_PASS environment secrets are not configured in Supabase." }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    })

    // 3. Compose email html body
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
        <a href="mailto:operations@opusform.co.uk" style="color: #526E8C; text-decoration: none;">operations@opusform.co.uk</a></p>
      </div>
    `

    // 4. Send email with PDF attachment
    await transporter.sendMail({
      from: `"Opus Form Operations" <${user}>`,
      to: toEmail,
      subject: `Formal Quote: #${quoteRef} - ${clientName || 'Project'}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Quote_${quoteRef}.pdf`,
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      ]
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error sending email:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
