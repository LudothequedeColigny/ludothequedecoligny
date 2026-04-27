import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'Ludothèque de Coligny <contact@ludothequedecoligny.fr>'
const REPLY_TO = 'ludothequedecoligny@outlook.fr'
const CONFIRM_EMAIL = 'ludothequedecoligny@outlook.fr'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function urlToBase64Attachment(image_url: string, index: number) {
  try {
    let base64: string
    let mimeType = 'image/png'
    let ext = 'png'
    if (image_url.startsWith('data:')) {
      const commaIdx = image_url.indexOf(',')
      if (commaIdx === -1) return null
      const meta = image_url.substring(0, commaIdx)
      base64 = image_url.substring(commaIdx + 1)
      const mimeMatch = meta.match(/data:([^;]+)/)
      if (mimeMatch) mimeType = mimeMatch[1]
      ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png'
    } else {
      const imgRes = await fetch(image_url)
      if (!imgRes.ok) return null
      const buffer = await imgRes.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const chunkSize = 8192
      let binary = ''
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
      }
      base64 = btoa(binary)
      ext = image_url.split('?')[0].split('.').pop()?.toLowerCase() || 'png'
      mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'
    }
    const label = index === 0 ? 'affiche' : `affiche-${index + 1}`
    return { filename: `${label}.${ext}`, content: base64, type: mimeType }
  } catch (e) {
    console.warn(`Erreur pièce jointe #${index}:`, e)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { to, subject, html, image_url, image_urls, send_confirmation } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants : to, subject, html requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    // Construire les pièces jointes
    const urls: string[] = []
    if (image_urls && Array.isArray(image_urls)) urls.push(...image_urls.filter(Boolean))
    else if (image_url) urls.push(image_url)

    const attachmentResults = await Promise.all(urls.map((url, i) => urlToBase64Attachment(url, i)))
    const attachments = attachmentResults.filter(Boolean)

    const body = {
      from: FROM_EMAIL,
      reply_to: REPLY_TO,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Erreur Resend:', JSON.stringify(data), 'to:', JSON.stringify(to))
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    // Email de confirmation récapitulatif (uniquement si demandé = dernier envoi du lot)
    if (send_confirmation) {
      const recipients = Array.isArray(to) ? to : [to]
      const confirmHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
          <div style="background:#1a5f7a;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:18px;">✅ Confirmation d'envoi</h1>
          </div>
          <div style="background:#fdfaf6;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
            <p>L'email suivant a bien été envoyé :</p>
            <div style="background:white;border-left:4px solid #e38154;padding:16px;margin:16px 0;border-radius:0 8px 8px 0;">
              <p style="margin:0;"><strong>Objet :</strong> ${subject}</p>
              <p style="margin:8px 0 0 0;"><strong>Destinataires :</strong> ${recipients.join(', ')}</p>
            </div>
            <p style="color:#888;font-size:12px;">Email envoyé automatiquement par la Ludothèque de Coligny</p>
          </div>
        </div>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [CONFIRM_EMAIL],
          subject: `✅ Confirmation : "${subject}" envoyé à ${recipients.length} destinataire(s)`,
          html: confirmHtml,
        }),
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (error) {
    console.error('Erreur générale:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})