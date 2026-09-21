// supabase/functions/send-password-reset/index.ts
// ─────────────────────────────────────────────────────────────────
// Envoie à un bénévole un lien pour choisir un nouveau mot de passe.
// Déclenché depuis Paramètres → Équipe & accès, par un bénévole connecté.
//
// Le lien est fabriqué par Supabase (clé de service) puis envoyé par Resend,
// avec l'adresse de la ludothèque : l'envoi d'emails intégré à Supabase est
// limité à quelques messages par heure.
// ─────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = 'Ludothèque de Coligny <contact@ludothequedecoligny.fr>'
const REPLY_TO = 'ludothequedecoligny@outlook.fr'
const RESET_PAGE = 'https://www.ludothequedecoligny.fr/nouveau-mot-de-passe'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })

const serviceHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

function escapeHtml(text: string): string {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Même contrôle que send-email : la clé publique du site ne prouve rien
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (!(await isVolunteer(req))) return json({ error: 'Non autorisé' }, 401)

  try {
    const { email } = await req.json()
    const target = String(email || '').trim().toLowerCase()
    if (!target.includes('@')) return json({ error: 'Adresse email manquante' }, 400)

    // Uniquement vers un compte de l'équipe : jamais vers une adresse quelconque
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=ilike.${encodeURIComponent(target)}&select=first_name`,
      { headers: serviceHeaders }
    )
    const profiles = profileRes.ok ? await profileRes.json() : []
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return json({ error: "Cette adresse ne correspond à aucun compte de l'équipe" }, 404)
    }
    const firstName = profiles[0]?.first_name || ''

    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({ type: 'recovery', email: target, redirect_to: RESET_PAGE }),
    })
    const linkData = await linkRes.json()
    const actionLink = linkData?.action_link || linkData?.properties?.action_link
    if (!linkRes.ok || !actionLink) {
      console.error('Lien de réinitialisation non créé:', linkRes.status, JSON.stringify(linkData))
      return json({ error: 'Lien non créé' }, 500)
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#1a5f7a;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">Ludothèque de Coligny</h1>
        </div>
        <div style="background:#fdfaf6;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
          <p>Bonjour${firstName ? ' ' + escapeHtml(firstName) : ''},</p>
          <p>Pour choisir un nouveau mot de passe pour l'espace bénévoles de la ludothèque, cliquez sur le bouton ci-dessous.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:14px 26px;background:#e38154;color:white;border-radius:10px;text-decoration:none;font-weight:bold;">Choisir mon mot de passe</a>
          </p>
          <p style="font-size:13px;color:#555;">Ce lien est valable <strong>1 heure</strong> et ne sert qu'une fois. S'il a expiré, demandez-en un nouveau à un membre de l'équipe.</p>
          <p style="font-size:13px;color:#555;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe actuel reste valable.</p>
        </div>
      </div>`

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        reply_to: REPLY_TO,
        to: [target],
        subject: 'Votre nouveau mot de passe — Ludothèque de Coligny',
        html,
      }),
    })
    const sendData = await sendRes.json()
    if (!sendRes.ok) {
      console.error('Erreur Resend:', JSON.stringify(sendData))
      return json({ error: sendData }, sendRes.status)
    }
    return json({ success: true })
  } catch (error) {
    console.error('Erreur générale send-password-reset:', error)
    return json({ error: error.message }, 500)
  }
})
