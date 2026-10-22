import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

// Si end_time est absent, on utilise date + 2 heures par défaut.
// end_time est une heure de Coligny (« 22:00 ») : on mesure l'écart avec l'heure
// de début lue à Paris, le serveur tournant à l'heure universelle.
function computeEventTimes(ev: CalendarEventInput): { start: Date; end: Date } {
  const start = new Date(ev.date)
  let end: Date
  if (ev.end_time) {
    const [h, m] = ev.end_time.split(':').map(Number)
    const [sh, sm] = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(start).split(':').map(Number)
    let minutes = ((h || 0) * 60 + (m || 0)) - (sh * 60 + sm)
    if (minutes <= 0) minutes += 24 * 60   // fin après minuit
    end = new Date(start.getTime() + minutes * 60 * 1000)
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

// ── Qui appelle ? ───────────────────────────────────────────────────────────
// La clé publique du site suffit à joindre cette fonction : elle ne prouve rien.
// Seul un bénévole connecté peut choisir destinataires, contenu et pièces jointes.

async function isVolunteer(req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token || token === SUPABASE_ANON_KEY) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return false
  const user = await res.json()
  return !!user?.id && user?.role === 'authenticated'
}

// Formulaire de contact du site public : destinataire imposé (la ludothèque),
// message mis en forme ici et échappé, aucune pièce jointe.
async function buildContactEmail(contact: { nom?: string; email?: string; message?: string }) {
  const nom = String(contact?.nom || '').trim().slice(0, 100)
  const email = String(contact?.email || '').trim().slice(0, 200)
  const message = String(contact?.message || '').trim().slice(0, 5000)
  if (!nom || !message || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null

  const recipients = [REPLY_TO]
  const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.contact_email&select=value`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  })
  const rows = res.ok ? await res.json() : []
  const contactEmail = String(rows?.[0]?.value || '').replace(/^"|"$/g, '').trim()
  if (contactEmail.includes('@') && contactEmail !== REPLY_TO) recipients.push(contactEmail)

  return {
    from: FROM_EMAIL,
    reply_to: email,
    to: recipients,
    subject: `Message de ${nom.replace(/[\r\n]/g, ' ')} via le site`,
    html: `
      <p><strong>De :</strong> ${escapeHtml(nom)} (${escapeHtml(email)})</p>
      <p><strong>Message :</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `,
  }
}

// ────────────────────────────────────────────────────────────────────────────


// ── Pré-inscription et inscription aux dates (site public) ─────────────────
// Le visiteur ne choisit ni le destinataire ni le texte : il donne seulement
// le numéro de sa demande (ou son adresse). Le mail part une seule fois, et
// seulement pour une demande enregistrée il y a moins de 15 minutes.

const SITE_URL = 'https://www.ludothequedecoligny.fr'
const SERVICE_HEADERS = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...SERVICE_HEADERS, ...(init.headers || {}) } })
  if (!res.ok) throw new Error(`Base : ${res.status} ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function lireReglages(): Promise<Record<string, string>> {
  const rows = await rest('settings?select=id,value')
  const obj: Record<string, string> = {}
  for (const r of rows || []) obj[r.id] = String(r.value ?? '').replace(/^"|"$/g, '')
  return obj
}

const RANGS: Record<string, string> = { '1': '1ers', '2': '2es', '3': '3es', '4': '4es', '5': 'derniers' }
const heure = (h: string) => (h || '').slice(0, 5).replace(':00', 'h').replace(':', 'h')

// « les 1ers samedis de 10h à 12h et les 3es samedis de 14h à 16h »
function permanencesEnClair(r: Record<string, string>): string {
  const creneau = (n: number) =>
    `les ${RANGS[r[`horaire_${n}_rang`]] || ''} ${(r[`horaire_${n}_jour`] || 'samedi').toLowerCase()}s de ${heure(r[`horaire_${n}_debut`])} à ${heure(r[`horaire_${n}_fin`])}`
  return r.horaire_2_actif === 'true' ? `${creneau(1)} et ${creneau(2)}` : creneau(1)
}

// Même habillage que les mails envoyés depuis l'espace de gestion
function habillage(contenu: string, piedDePage = ''): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
    <div style="background:#1a5f7a;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="color:white;margin:0;font-size:18px;">Ludothèque de Coligny</h1>
    </div>
    <div style="background:#fdfaf6;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;line-height:1.55;">
      ${contenu}
      <p style="margin-top:24px;font-size:12px;"><a href="${SITE_URL}" style="color:#1a5f7a;">www.ludothequedecoligny.fr</a></p>
      ${piedDePage ? `<p style="margin-top:16px;font-size:11px;line-height:1.5;color:#64748b;">${piedDePage}</p>` : ''}
    </div>
  </div>`
}

async function envoyer(body: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, reply_to: REPLY_TO, ...body }),
  })
  if (!res.ok) console.error('Erreur Resend:', await res.text())
  return res.ok
}

async function destinatairesLudotheque(r: Record<string, string>): Promise<string[]> {
  const liste = [REPLY_TO]
  const contact = (r.contact_email || '').trim()
  if (contact.includes('@') && contact !== REPLY_TO) liste.push(contact)
  return liste
}

async function alerterBenevoles(title: string, body: string, url: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST', headers: SERVICE_HEADERS, body: JSON.stringify({ title, body, url }),
    })
  } catch (e) {
    console.warn('Alerte bénévoles non envoyée :', e)
  }
}

const RECENTE = () => new Date(Date.now() - 15 * 60 * 1000).toISOString()

async function traiterPreinscription(id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false
  const rows = await rest(`preinscriptions?id=eq.${id}&confirmation_envoyee=eq.false&created_at=gte.${encodeURIComponent(RECENTE())}&select=*`)
  const d = rows?.[0]
  if (!d) return false
  // Marquée d'abord : un second appel simultané ne renverra rien
  await rest(`preinscriptions?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ confirmation_envoyee: true }) })

  const r = await lireReglages()
  const nomAffiche = d.type === 'Association' ? d.nom : `${d.prenom || ''} ${d.nom}`.trim()
  const adresse = `${r.adresse_rue || '419 Grande Rue'} à ${r.adresse_ville || 'Coligny'}`

  await envoyer({
    to: [d.email],
    subject: 'Votre pré-inscription à la ludothèque de Coligny',
    html: habillage(`
      <p>Bonjour ${escapeHtml(d.type === 'Association' ? d.nom : (d.prenom || d.nom))},</p>
      <p>Merci ! Nous avons bien reçu votre pré-inscription à la ludothèque de Coligny.</p>
      <p>Pour la finaliser, passez nous voir lors d'une permanence, au ${escapeHtml(adresse)} : ${escapeHtml(permanencesEnClair(r))}.
      Nous ferons ensemble le règlement de la cotisation et la signature de la charte de prêt, et vous repartirez avec vos premiers jeux.
      Vous pouvez aussi adhérer pendant l'une de nos soirées jeux.</p>
      ${d.recevoir_dates ? '<p>Vous recevrez aussi nos prochaines dates par e-mail.</p>' : ''}
      <p style="color:#64748b;font-size:13px;">Sans visite de votre part sous 3 mois, cette pré-inscription sera effacée.</p>
      <p>À très bientôt !<br/>L'équipe de la Ludothèque de Coligny</p>`),
  })

  const lignes = [
    ['Type', d.type], ['Nom', nomAffiche], ['E-mail', d.email], ['Téléphone', d.telephone],
    ['Commune', d.commune], ['Foyer', d.foyer], ['Nous a connus', d.origine],
    ['Recevoir les dates', d.recevoir_dates ? 'oui' : 'non'],
  ].filter(([, v]) => v)
  await envoyer({
    to: await destinatairesLudotheque(r),
    reply_to: d.email,
    subject: `Nouvelle pré-inscription : ${nomAffiche.replace(/[\r\n]/g, ' ')}`,
    html: habillage(`
      <p><strong>Nouvelle pré-inscription reçue sur le site.</strong></p>
      <table style="font-size:14px;border-collapse:collapse;">${lignes.map(([k, v]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#64748b;">${k}</td><td style="padding:4px 0;"><strong>${escapeHtml(String(v))}</strong></td></tr>`).join('')}
      </table>
      <p>Elle attend dans l'écran <a href="${SITE_URL}/admin/adherents" style="color:#1a5f7a;">Adhérents</a>, rubrique « Pré-inscriptions à valider ».</p>`),
  })

  await alerterBenevoles('Nouvelle pré-inscription', `${nomAffiche}${d.commune ? ` (${d.commune})` : ''} veut adhérer.`, '/admin/adherents')
  return true
}

async function traiterAbonnement(adresse: string): Promise<boolean> {
  const email = String(adresse || '').trim().toLowerCase()
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return false
  const rows = await rest(`abonnes_dates?email=eq.${encodeURIComponent(email)}&bienvenue_envoyee=eq.false&created_at=gte.${encodeURIComponent(RECENTE())}&select=id,jeton_desabonnement,source`)
  const a = rows?.[0]
  // Les inscrits par le formulaire d'adhésion ont déjà reçu la confirmation
  if (!a || a.source === 'preinscription') return false
  await rest(`abonnes_dates?id=eq.${a.id}`, { method: 'PATCH', body: JSON.stringify({ bienvenue_envoyee: true }) })

  const events = await rest(`events?select=title,date,location&archived_at=is.null&date=gte.${encodeURIComponent(new Date().toISOString())}&order=date.asc&limit=3`)
  const prochaines = (events || []).map((e: { title: string; date: string; location?: string }) => {
    const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(e.date))
    return `<li><strong>${escapeHtml(e.title)}</strong> — ${escapeHtml(jour)}${e.location ? `, ${escapeHtml(e.location)}` : ''}</li>`
  }).join('')

  const lien = `${SITE_URL}/desabonnement?jeton=${encodeURIComponent(a.jeton_desabonnement)}`
  await envoyer({
    to: [email],
    subject: 'Vous recevrez nos prochaines dates',
    html: habillage(`
      <p>Bonjour,</p>
      <p>C'est noté : vous recevrez désormais les dates de nos soirées et après-midi jeux par e-mail, une fois par mois au plus.</p>
      ${prochaines ? `<p>Nos prochains rendez-vous :</p><ul>${prochaines}</ul>` : ''}
      <p>Ces soirées sont ouvertes à tous. Et si l'envie vous prend d'emporter des jeux à la maison, l'adhésion se fait sur place ou en ligne : <a href="${SITE_URL}/adherer" style="color:#1a5f7a;">ludothequedecoligny.fr/adherer</a>.</p>
      <p>À très bientôt autour d'une table !<br/>L'équipe de la Ludothèque de Coligny</p>`,
      `Vous recevez ce message car vous avez demandé à recevoir nos prochaines dates. <a href="${lien}" style="color:#64748b;">Ne plus recevoir nos actualités</a>`),
  })
  return true
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
    const payload = await req.json()

    if (!(await isVolunteer(req))) {
      // Visiteur : confirmation de pré-inscription ou bienvenue aux dates
      if (payload?.preinscription || payload?.abonnement) {
        const fait = payload.preinscription
          ? await traiterPreinscription(String(payload.preinscription))
          : await traiterAbonnement(String(payload.abonnement))
        return new Response(JSON.stringify({ success: fait }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        })
      }
      // Sinon, seul le formulaire de contact est accepté
      const contactBody = payload?.contact ? await buildContactEmail(payload.contact) : null
      if (!contactBody) {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        })
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify(contactBody),
      })
      const data = await res.json()
      return new Response(JSON.stringify(res.ok ? { success: true, id: data.id } : { error: data }), {
        status: res.ok ? 200 : res.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const { to, subject, html, image_url, image_urls, calendar_events } = payload

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