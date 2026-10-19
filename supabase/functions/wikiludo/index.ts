// supabase/functions/wikiludo/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function — fiche d'un jeu sur Wikiludo, la base de notices de
// l'ALF (Association des Ludothèques Françaises), à partir de son code-barres.
//
// Wikiludo répond au protocole SRU, en notices UNIMARC. Format exact fourni par
// l'ALF (octobre 2026) — le serveur n'accepte rien d'autre :
//   - identifiants dans deux en-têtes nommés « username » et « password »
//   - en-tête « Content-Type: application/xml » obligatoire (sans lui : refus 401)
//   - requête « bib.ean all <code> »
//
// Identifiants : secrets Supabase WIKILUDO_IDENTIFIANT et WIKILUDO_MOT_DE_PASSE.
// ─────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SRU_URL = 'https://sigb01.decalog.net/sru/4524165944576420266'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// Réservé aux bénévoles connectés, comme la recherche MyLudo.
async function isVolunteer(req: Request): Promise<boolean> {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token || token === anonKey) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return false
  const user = await res.json()
  return !!user?.id && user?.role === 'authenticated'
}

// ── Lecture de la notice UNIMARC ───────────────────────────────────
// Une notice est une liste de zones numérotées (200 = titre, 330 = résumé…),
// chacune découpée en sous-zones lettrées ($a, $b…). Voir l'annexe 6 du guide
// de catalogage Wikiludo.

type Zone = Record<string, string[]>   // sous-zone → valeurs

function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    // Le serveur de Wikiludo remplace l'apostrophe typographique (’) par « ? »
    // (« d?Onibi », « n?êtes »). Un vrai point d'interrogation n'est jamais collé
    // à une lettre de chaque côté en français : on rétablit l'apostrophe.
    .replace(/(\p{L})\?(?=\p{L})/gu, '$1’')
    .trim()
}

function zones(xml: string): Record<string, Zone[]> {
  const out: Record<string, Zone[]> = {}
  const re = /<mxc:datafield[^>]*tag="(\d+)"[^>]*>([\s\S]*?)<\/mxc:datafield>/g
  for (const [, tag, body] of xml.matchAll(re)) {
    const zone: Zone = {}
    for (const [, code, value] of body.matchAll(/<mxc:subfield[^>]*code="([^"]+)"[^>]*>([\s\S]*?)<\/mxc:subfield>/g)) {
      ;(zone[code] ||= []).push(decode(value))
    }
    ;(out[tag] ||= []).push(zone)
  }
  return out
}

const premier = (z: Record<string, Zone[]>, tag: string, code: string) => z[tag]?.[0]?.[code]?.[0] || ''
const tous = (z: Record<string, Zone[]>, tag: string, code: string) =>
  (z[tag] || []).flatMap(zone => zone[code] || []).filter(Boolean)

function personnes(z: Record<string, Zone[]>, tags: string[]) {
  return tags.flatMap(t => (z[t] || []).map(p => [p.b?.[0], p.a?.[0]].filter(Boolean).join(' '))).filter(Boolean)
}

function lireNotice(xml: string, ean: string) {
  const z = zones(xml)
  const liens = (z['856'] || []).map(l => ({ url: l.u?.[0] || '', type: (l['2']?.[0] || '').toLowerCase() }))
    .filter(l => /^https?:\/\//.test(l.url))
  const image = liens.find(l => l.type.includes('visuel'))?.url
    || liens.find(l => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(l.url))?.url || ''
  const video = liens.find(l => /youtu\.?be/.test(l.url))?.url || ''
  // Règles en PDF (et non la vidéo-règle, dont le type contient aussi « règle »)
  const regles = liens.find(l => /\.pdf(\?|$)/i.test(l.url) || (l.type.includes('pdf') && !/youtu\.?be/.test(l.url)))?.url || ''

  const age = premier(z, '692', 'a').match(/(\d+)/)
  const minJ = parseInt(premier(z, '693', 'a')) || 0
  const maxJ = parseInt(premier(z, '693', 'b')) || 0

  const titre = premier(z, '200', 'a')
  const complement = premier(z, '200', 'e')

  return {
    source: 'wikiludo',
    ean,
    name: titre + (complement ? ` – ${complement}` : ''),
    description: premier(z, '330', 'a'),
    minAge: age ? parseInt(age[1]) : 0,
    minPlayers: minJ,
    maxPlayers: maxJ || minJ,
    // Wikiludo ne donne pas de minutes : « Jeu court / moyen / long »
    durationLabel: premier(z, '694', 'a'),
    image,
    video,
    rules: regles,
    publisher: premier(z, '214', 'c'),
    authors: personnes(z, ['700', '701']),
    illustrators: personnes(z, ['702']),
    mechanisms: tous(z, '695', 'a'),
    keywords: tous(z, '606', 'a'),
    esar: (z['686'] || []).filter(c => (c['2']?.[0] || '').toUpperCase() === 'ESAR').map(c => c.c?.[0] || c.a?.[0] || ''),
    contents: premier(z, '307', 'a'),
    awards: (z['334'] || []).map(r => [r.b?.[0], r.c?.[0]].filter(Boolean).join(' ')).filter(Boolean),
  }
}

// ── Serveur ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!(await isVolunteer(req))) return json({ error: 'Non autorisé' }, 401)

  const ean = (new URL(req.url).searchParams.get('ean') || '').trim()
  if (!/^\d{8,14}$/.test(ean)) return json({ error: 'Code-barres invalide' }, 400)

  const identifiant = Deno.env.get('WIKILUDO_IDENTIFIANT') || ''
  const motDePasse = Deno.env.get('WIKILUDO_MOT_DE_PASSE') || ''
  if (!identifiant || !motDePasse) return json({ error: 'Identifiants Wikiludo absents des secrets' }, 500)

  // Paramètres dans l'ordre exact de l'exemple de l'ALF
  const url = `${SRU_URL}?operation=searchRetrieve&version=1.2`
    + `&query=${encodeURIComponent(`bib.ean all ${ean}`)}`
    + `&queryType=searchTerms&maximumRecords=1&recordSchema=unimarcxchange`

  try {
    const res = await fetch(url, {
      headers: { username: identifiant, password: motDePasse, 'Content-Type': 'application/xml' },
      signal: AbortSignal.timeout(12000),
    })
    const xml = await res.text()
    // Identifiants refusés : 401, ou une page d'erreur HTML au lieu d'une réponse SRU
    if (!res.ok || !xml.includes('searchRetrieveResponse')) {
      console.error('Wikiludo a refusé la requête :', res.status, xml.slice(0, 200))
      return json({ error: 'Wikiludo indisponible ou identifiants refusés' }, 502)
    }
    const n = parseInt(xml.match(/numberOfRecords>(\d+)</)?.[1] || '0')
    return json(n > 0 ? lireNotice(xml, ean) : null)
  } catch (err) {
    console.error('Erreur Wikiludo :', err)
    return json({ error: 'Wikiludo ne répond pas' }, 504)
  }
})
