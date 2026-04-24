// supabase/functions/bgg-proxy/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function — recherche de jeux via MyLudo
// Reconnexion automatique si les cookies expirent
// ─────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MYLUDO_BASE  = 'https://www.myludo.fr/views'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://epzfnymfksxnhprcodec.supabase.co'

// ── Session MyLudo (cookie + csrf) ────────────────────────────────
// Stockée en mémoire le temps de l'exécution, persistée dans app_settings
let sessionCache: { cookie: string; csrf: string } | null = null

function storageKey() {
  return Deno.env.get('STORAGE_SERVICE_KEY') || ''
}

// Lit la session depuis app_settings Supabase
async function loadSession(): Promise<{ cookie: string; csrf: string } | null> {
  if (sessionCache) return sessionCache
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_settings?key=in.("myludo_cookie","myludo_csrf")&select=key,value`,
      { headers: { 'Authorization': `Bearer ${storageKey()}`, 'apikey': storageKey() } }
    )
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length < 2) return null
    const cookie = rows.find((r: any) => r.key === 'myludo_cookie')?.value || ''
    const csrf   = rows.find((r: any) => r.key === 'myludo_csrf')?.value   || ''
    if (!cookie || !csrf) return null
    sessionCache = { cookie, csrf }
    return sessionCache
  } catch {
    return null
  }
}

// Sauvegarde la session dans app_settings Supabase
async function saveSession(cookie: string, csrf: string) {
  sessionCache = { cookie, csrf }
  const upsert = [
    { key: 'myludo_cookie', value: cookie, updated_at: new Date().toISOString() },
    { key: 'myludo_csrf',   value: csrf,   updated_at: new Date().toISOString() }
  ]
  await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${storageKey()}`,
      'apikey': storageKey(),
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(upsert)
  })
}

// Se connecte à MyLudo et retourne cookie + csrf frais
async function loginToMyludo(): Promise<{ cookie: string; csrf: string }> {
  const email    = Deno.env.get('MYLUDO_EMAIL')    || ''
  const password = Deno.env.get('MYLUDO_PASSWORD') || ''

  // 1. Charger la page d'accueil pour obtenir SESSID + CSRF depuis la balise <meta>
  const homeRes = await fetch('https://www.myludo.fr/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36' }
  })
  const homeHtml = await homeRes.text()
  const homeCookies = homeRes.headers.get('set-cookie') || ''

  // Extraire le SESSID
  const sessMatch = homeCookies.match(/MYLUDO_SESSID=([^;]+)/)
  const sessid = sessMatch ? sessMatch[1] : ''

  // Extraire le CSRF depuis <meta name="csrf-token" content="...">
  const csrfMatch = homeHtml.match(/csrf-token"\s+content="([^"]+)"/)
  const csrf = csrfMatch ? csrfMatch[1] : ''

  if (!sessid || !csrf) {
    throw new Error(`Failed to get SESSID or CSRF (sessid=${!!sessid}, csrf=${!!csrf})`)
  }

  console.log(`Got SESSID: ${sessid.slice(0, 8)}... CSRF: ${csrf.slice(0, 10)}...`)

  // 2. Login avec le SESSID et le CSRF
  const loginRes = await fetch('https://www.myludo.fr/views/login/datas.php?type=login', {
    method: 'POST',
    headers: {
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'referer': 'https://www.myludo.fr/',
      'x-requested-with': 'XMLHttpRequest',
      'x-csrf-token': csrf,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'cookie': `MYLUDO_SESSID=${sessid}`
    },
    body: new URLSearchParams({ email, password, remember: '1' }).toString()
  })

  const loginData = await loginRes.json()
  console.log('Login response:', JSON.stringify(loginData).slice(0, 100))

  if (!loginData?.success) {
    throw new Error(`Login failed: ${loginData?.message}`)
  }

  const loginSetCookie = loginRes.headers.get('set-cookie') || ''

  // Construire le cookie complet
  const allCookies: Record<string, string> = {
    'MYLUDO_SESSID': sessid
  }

  // Parser les cookies de la réponse login
  const cookieMatches = loginSetCookie.matchAll(/([A-Z_]+)=([^;,\s]+)/g)
  for (const m of cookieMatches) {
    if (m[1].startsWith('MYLUDO_')) allCookies[m[1]] = m[2]
  }

  // Ajouter les infos utilisateur
  const user = loginData.user || {}
  if (user.id) allCookies['MYLUDO_UID'] = String(user.id)

  const finalCookie = Object.entries(allCookies).map(([k, v]) => `${k}=${v}`).join('; ')

  console.log('MyLudo login success, UID:', user.id)
  return { cookie: finalCookie, csrf }
}

// Headers MyLudo avec session courante
function myludoHeaders(session: { cookie: string; csrf: string }): HeadersInit {
  return {
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'fr-FR,fr;q=0.9',
    'referer': 'https://www.myludo.fr/',
    'x-requested-with': 'XMLHttpRequest',
    'x-csrf-token': session.csrf,
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'cookie': session.cookie,
  }
}

// Vérifie si la session est valide
async function isSessionValid(session: { cookie: string; csrf: string }): Promise<boolean> {
  try {
    const res = await fetch(`${MYLUDO_BASE}/login/datas.php?type=check`, {
      headers: myludoHeaders(session)
    })
    const data = await res.json()
    return data?.success !== false && !!data?.uid
  } catch {
    return false
  }
}

// Obtient une session valide (depuis la DB, ou reconnexion auto)
async function getSession(): Promise<{ cookie: string; csrf: string }> {
  // 1. Essayer la session en mémoire ou en base
  let session = await loadSession()

  // Si pas de session en base, utiliser les secrets comme fallback initial
  if (!session) {
    const cookieFromSecret = Deno.env.get('MYLUDO_COOKIE') || ''
    const csrfFromSecret   = Deno.env.get('MYLUDO_CSRF')   || ''
    if (cookieFromSecret && csrfFromSecret) {
      session = { cookie: cookieFromSecret, csrf: csrfFromSecret }
    }
  }

  // 2. Vérifier si la session est valide
  if (session && await isSessionValid(session)) {
    return session
  }

  // 3. Session invalide ou absente → reconnexion automatique
  console.log('Session expired, logging in to MyLudo...')
  session = await loginToMyludo()
  await saveSession(session.cookie, session.csrf)
  sessionCache = session
  return session
}

// ── Recherche ──────────────────────────────────────────────────────
async function searchGames(query: string) {
  const session = await getSession()
  const url = `${MYLUDO_BASE}/search/datas.php?type=search&tab=games&words=${encodeURIComponent(query)}&page=1`
  const res = await fetch(url, { headers: myludoHeaders(session) })
  const data = await res.json()

  const games = data?.list || []
  if (!Array.isArray(games) || games.length === 0) return []

  const q = query.toLowerCase()
  const scored = games.map((g: any) => {
    const title = (g.title || '').toLowerCase()
    const isBase = g.type === 'basegame'
    const score = title === q ? 0
                : title.startsWith(q) && isBase ? 1
                : title.startsWith(q) ? 2
                : isBase ? 3 : 4
    return { ...g, _score: score }
  }).sort((a: any, b: any) => a._score - b._score)

  return scored.slice(0, 5).map((g: any) => ({
    id:       String(g.id),
    name:     g.title || '',
    year:     String(g.edition || ''),
    code:     g.code || '',
    language: g.languages ? Object.values(g.languages).join(', ') : ''
  }))
}

// ── Détails ────────────────────────────────────────────────────────
async function getGameDetails(id: string) {
  const session = await getSession()
  const headers = myludoHeaders(session)

  const [gameRes, infoRes] = await Promise.all([
    fetch(`${MYLUDO_BASE}/game/datas.php?type=game&id=${id}`, { headers }),
    fetch(`${MYLUDO_BASE}/game/datas.php?type=info&id=${id}&page=1&limit=&family=&order=bytitle`, { headers })
  ])

  const game = await gameRes.json()
  const info = await infoRes.json()
  if (!game || !game.id) return null

  // On renvoie l'URL MyLudo brute — l'upload Supabase se fait uniquement à la validation
  const image = game.image?.S300 || game.image?.S160 || game.image?.S80 || ''

  const rawDesc = info.description || ''
  const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const themes = info.themes || {}
  const categories = [
    ...Object.values(themes.theme     || {}) as string[],
    ...Object.values(themes.mecanisme || {}) as string[]
  ].slice(0, 5)

  return {
    name:        game.title || '',
    description,
    minPlayers:  parseInt(game.players_min) || 1,
    maxPlayers:  parseInt(game.players_max) || 4,
    minAge:      parseInt(game.age_min)     || 0,
    duration:    parseInt(game.duration)    || 0,
    image,
    categories,
    barcode: (info.barcodes && info.barcodes.length > 0) ? String(info.barcodes[0]) : ''
  }
}

// ── Upload image sur Supabase ──────────────────────────────────────
async function uploadImageToSupabase(imageUrl: string): Promise<string> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return imageUrl
    const buffer = await res.arrayBuffer()
    const key = storageKey()
    const fileName = `myludo-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/game-images/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': res.headers.get('content-type') || 'image/png',
        'x-upsert': 'false'
      },
      body: buffer
    })
    if (!uploadRes.ok) {
      console.error('Image upload failed:', await uploadRes.text())
      return imageUrl
    }
    return `${SUPABASE_URL}/storage/v1/object/public/game-images/${fileName}`
  } catch (e) {
    console.error('uploadImageToSupabase error:', e)
    return imageUrl
  }
}

// ── Serveur ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url      = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')
    const query    = url.searchParams.get('query') || ''
    const id       = url.searchParams.get('id')    || ''

    let result: any

    if (endpoint === 'search') {
      result = await searchGames(query)
    } else if (endpoint === 'search-by-barcode') {
      // Recherche par code-barres → renvoie directement les détails complets si trouvé
      const barcode = url.searchParams.get('barcode') || ''
      const session = await getSession()
      const searchUrl = `${MYLUDO_BASE}/search/datas.php?type=search&tab=games&words=${encodeURIComponent(barcode)}&page=1`
      const searchRes = await fetch(searchUrl, { headers: myludoHeaders(session) })
      const searchData = await searchRes.json()
      const games = searchData?.list || []
      if (games.length === 0) {
        result = null  // Jeu non trouvé sur MyLudo
      } else {
        // Prend le premier résultat et récupère ses détails complets
        result = await getGameDetails(String(games[0].id))
      }
    } else if (endpoint === 'thing') {
      const numericId = /^\d+$/.test(id) ? id : null
      if (!numericId) return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      result = await getGameDetails(numericId)
    } else if (endpoint === 'upload-image') {
      // Appelé uniquement à la validation du formulaire
      const imageUrl = url.searchParams.get('imageUrl') || ''
      if (!imageUrl) return new Response(JSON.stringify({ error: 'Missing imageUrl' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
      const supabaseUrl = await uploadImageToSupabase(imageUrl)
      result = { url: supabaseUrl }
    } else {
      return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})