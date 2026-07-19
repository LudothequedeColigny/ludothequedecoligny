import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'Ludothèque de Coligny <contact@ludothequedecoligny.fr>'
const REPLY_TO = 'ludothequedecoligny@outlook.fr'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Calendrier (Google Calendar / Outlook / .ics) ──────────────────────────

interface CalendarEventInput {
  title: string
  date: string
  end_time: string | null
  location: string
  description: string
}

interface CalendarEvent {
  title: string
  location: string
  description: string
  start: Date
  end: Date
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Format YYYYMMDDTHHMMSSZ (UTC) attendu par Google Calendar et le fichier .ics
function toIcsUtc(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

// Si end_time est absent, on utilise date + 2 heures par défaut
function computeEventTimes(ev: CalendarEventInput): { start: Date; end: Date } {
  const start = new Date(ev.date)
  let end: Date
  if (ev.end_time) {
    const [h, m] = ev.end_time.split(':').map(Number)
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h || 0, m || 0, 0)
  } else {
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  }
  return { start, end }
}

function escapeIcsText(text: string): string {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildIcs(events: CalendarEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ludothèque de Coligny//FR']
  events.forEach(ev => {
    lines.push('BEGIN:VEVENT')
    lines.push(`DTSTART:${toIcsUtc(ev.start)}`)
    lines.push(`DTEND:${toIcsUtc(ev.end)}`)
    lines.push(`SUMMARY:${escapeIcsText(ev.title)}`)
    lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`)
    lines.push(`LOCATION:${escapeIcsText(ev.location)}`)
    lines.push('END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function buildGoogleCalendarLink(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${toIcsUtc(ev.start)}/${toIcsUtc(ev.end)}`,
    details: ev.description,
    location: ev.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildOutlookLink(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    subject: ev.title,
    startdt: ev.start.toISOString(),
    enddt: ev.end.toISOString(),
    body: ev.description,
    location: ev.location,
  })
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`
}

function buildCalendarBlockHtml(events: CalendarEvent[]): string {
  if (events.length === 0) return ''
  const multi = events.length > 1
  const buttonsHtml = events.map(ev => {
    const googleLabel = multi ? `${escapeHtml(ev.title)} — Google Calendar` : 'Google Calendar'
    const outlookLabel = multi ? `${escapeHtml(ev.title)} — Outlook` : 'Outlook'
    return `
      <a href="${buildGoogleCalendarLink(ev)}" style="display:inline-block; margin:4px 8px 4px 0; padding:8px 16px; background:#1a5f7a; color:white; border-radius:6px; text-decoration:none; font-size:13px;">${googleLabel}</a>
      <a href="${buildOutlookLink(ev)}" style="display:inline-block; margin:4px 0; padding:8px 16px; background:#0078d4; color:white; border-radius:6px; text-decoration:none; font-size:13px;">${outlookLabel}</a>`
  }).join('<br/>')

  return `
    <div style="margin-top:24px; padding:16px; background:#f0f9ff; border-radius:8px; border:1px solid #bae6fd;">
      <p style="margin:0 0 12px 0; font-weight:bold; color:#1a5f7a;">📅 Ajouter à votre calendrier :</p>
      ${buttonsHtml}
      <p style="margin:12px 0 0 0; font-size:12px; color:#666;">Le fichier .ics joint est compatible avec Apple Calendar et tous les autres clients de messagerie.</p>
    </div>`
}

function base64EncodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const chunkSize = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

// ────────────────────────────────────────────────────────────────────────────

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
    const { to, subject, html, image_url, image_urls, calendar_events } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants : to, subject, html requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    const urls: string[] = []
    if (image_urls && Array.isArray(image_urls)) urls.push(...image_urls.filter(Boolean))
    else if (image_url) urls.push(image_url)

    const attachmentResults = await Promise.all(urls.map((url, i) => urlToBase64Attachment(url, i)))
    const attachments = attachmentResults.filter(Boolean)

    let finalHtml = html
    if (Array.isArray(calendar_events) && calendar_events.length > 0) {
      const enrichedEvents: CalendarEvent[] = calendar_events.map((ev: CalendarEventInput) => {
        const { start, end } = computeEventTimes(ev)
        return { title: ev.title || 'Événement', location: ev.location || '', description: ev.description || '', start, end }
      })
      attachments.push({
        filename: 'evenement-ludotheque.ics',
        content: base64EncodeUtf8(buildIcs(enrichedEvents)),
        type: 'text/calendar',
      })
      finalHtml = html + buildCalendarBlockHtml(enrichedEvents)
    }

    const body = {
      from: FROM_EMAIL,
      reply_to: REPLY_TO,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: finalHtml,
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