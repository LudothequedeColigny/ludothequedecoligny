#!/usr/bin/env node
/**
 * Redessine le plan du bloc adresse de l'accueil (public/plan-ludotheque.svg).
 *
 *   node scripts/plan-ludotheque.mjs "419 Grande Rue, 01270 Coligny"
 *
 * 1. position exacte du numéro : Base Adresse Nationale (api-adresse.data.gouv.fr) ;
 * 2. rues, bâtiments, prés autour : OpenStreetMap (Overpass) — d'où la mention « © OpenStreetMap » ;
 * 3. dessin au style du site (rues blanches contour encre, repère orange), police Poppins incluse
 *    dans le fichier (une image SVG ne peut pas charger les polices du site).
 *
 * Le plan est une image fixe : les visiteurs n'appellent aucun service extérieur.
 * Après l'avoir redessiné, mettre la même adresse dans ADRESSE_PLAN (src/pages/Home.jsx) :
 * tant qu'elle diffère de celle des Paramètres, l'accueil masque le plan.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const adresse = process.argv[2]
if (!adresse) {
  console.error('usage : node scripts/plan-ludotheque.mjs "419 Grande Rue, 01270 Coligny"')
  process.exit(1)
}
const racine = fileURLToPath(new URL('..', import.meta.url))
const AGENT = { 'User-Agent': 'ludotheque-coligny-plan/1.0' }

const W = 640, H = 400
const ECHELLE = 1.35 // pixels par mètre
const CX = W * 0.5, CY = H * 0.56 // place du repère

const ban = await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`, { headers: AGENT })).json()
const lieu = ban.features?.[0]
if (!lieu || lieu.properties.score < 0.8) {
  console.error('Adresse introuvable ou incertaine dans la Base Adresse Nationale :', lieu?.properties.label ?? '(aucun résultat)')
  process.exit(1)
}
const [LON0, LAT0] = lieu.geometry.coordinates
console.log('Adresse trouvée :', lieu.properties.label, `(${LAT0}, ${LON0})`)

const requete = `[out:json][timeout:25];(
  way["highway"](around:450,${LAT0},${LON0});
  way["building"](around:260,${LAT0},${LON0});
  way["leisure"~"park|pitch|playground"](around:400,${LAT0},${LON0});
  way["landuse"~"grass|meadow|recreation_ground|cemetery"](around:400,${LAT0},${LON0});
);out geom tags;`
// Le serveur Overpass est parfois saturé (502/504) : trois essais espacés avant d'abandonner
let osm = null
for (let essai = 1; essai <= 3 && !osm; essai++) {
  const rep = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', headers: AGENT, body: new URLSearchParams({ data: requete }),
  })
  if (rep.ok) osm = await rep.json()
  else {
    console.error(`OpenStreetMap ne répond pas (${rep.status}), essai ${essai}/3`)
    if (essai < 3) await new Promise(r => setTimeout(r, 15000))
  }
}
if (!osm) {
  console.error('OpenStreetMap indisponible : réessayer plus tard. Le plan actuel n’a pas été modifié.')
  process.exit(1)
}

const xy = ({ lat, lon }) => [
  (lon - LON0) * Math.cos(LAT0 * Math.PI / 180) * 111320 * ECHELLE + CX,
  -(lat - LAT0) * 110540 * ECHELLE + CY,
]
const chemin = (geom, ferme = false) =>
  'M' + geom.map(p => xy(p).map(v => v.toFixed(1)).join(',')).join(' L') + (ferme ? 'Z' : '')

const LARGEURS = { primary: 15, secondary: 11, tertiary: 10, unclassified: 8, residential: 8, service: 5 }
const VERT = new Set(['meadow', 'grass', 'park', 'pitch', 'playground', 'recreation_ground', 'cemetery'])
const fonds = [], batis = [], bords = [], rues = [], sentiers = []
for (const { tags: t = {}, geometry: g } of osm.elements) {
  if (!g) continue
  if (VERT.has(t.landuse) || VERT.has(t.leisure)) fonds.push(`<path d="${chemin(g, true)}" fill="#e4ecd8"/>`)
  else if (t.building) batis.push(`<path d="${chemin(g, true)}" fill="#ebe3d6"/>`)
  else if (LARGEURS[t.highway]) {
    const w = LARGEURS[t.highway]
    bords.push(`<path d="${chemin(g)}" stroke="#0f172a" stroke-width="${w + 4}"/>`)
    rues.push([w, `<path d="${chemin(g)}" stroke="${t.highway === 'primary' ? '#fff7ef' : '#ffffff'}" stroke-width="${w}"/>`])
  } else if (['footway', 'path', 'track', 'steps'].includes(t.highway)) {
    sentiers.push(`<path d="${chemin(g)}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 5"/>`)
  }
}
rues.sort((a, b) => a[0] - b[0])

// Nom de la rue de l'adresse, posé le long du tronçon le plus proche, sous le repère
const nomRue = lieu.properties.street
let etiquette = ''
let meilleur = null
for (const e of osm.elements) {
  if (!e.geometry || e.tags?.name !== nomRue) continue
  const pts = e.geometry.map(xy)
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]]
    const long = Math.hypot(b[0] - a[0], b[1] - a[1])
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    const dist = Math.hypot(mx - CX, my - (CY + 70))
    if (long > 40 && (!meilleur || dist < meilleur.dist)) {
      let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
      if (ang > 90) ang -= 180
      if (ang < -90) ang += 180
      meilleur = { dist, mx, my, ang }
    }
  }
}
if (meilleur) {
  const { mx, my, ang } = meilleur
  etiquette = `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)})" dy="4" text-anchor="middle" font-size="11" letter-spacing="1.5" fill="#1a5f7a">${nomRue.toUpperCase()}</text>`
}

const goutte = 'M0,0 C-6,-12 -18,-20 -18,-34 A18,18 0 1 1 18,-34 C18,-20 6,-12 0,0Z'
const repere = `<g transform="translate(${CX},${CY})">
  <ellipse cx="3" cy="3" rx="11" ry="4" fill="#0f172a" opacity=".25"/>
  <path d="${goutte}" fill="#0f172a" transform="translate(3,3)"/>
  <path d="${goutte}" fill="#e38154" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="0" cy="-34" r="7" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/>
  <g transform="translate(26,-62)">
    <rect x="3" y="3" width="118" height="32" rx="16" fill="#0f172a"/>
    <rect width="118" height="32" rx="16" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/>
    <text x="59" y="21" text-anchor="middle" font-size="14" fill="#0f172a">Ludothèque</text>
  </g>
</g>`

const police = readFileSync(`${racine}public/fonts/poppins-latin-700.woff2`).toString('base64')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>@font-face{font-family:"PoppinsCarte";font-weight:700;src:url(data:font/woff2;base64,${police}) format("woff2")}text{font-family:"PoppinsCarte",sans-serif;font-weight:700}</style></defs>
<rect width="${W}" height="${H}" fill="#fdfaf6"/>
${fonds.join('')}
${batis.join('')}
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
${sentiers.join('')}
${bords.join('')}
${rues.map(r => r[1]).join('')}
</g>
${etiquette}
${repere}
<text x="${W - 26}" y="${H - 16}" text-anchor="end" font-size="10" fill="#64748b">© OpenStreetMap</text>
</svg>
`
writeFileSync(`${racine}public/plan-ludotheque.svg`, svg)
console.log(`public/plan-ludotheque.svg écrit (${Math.round(svg.length / 1024)} Ko). Pensez à ADRESSE_PLAN dans src/pages/Home.jsx.`)
