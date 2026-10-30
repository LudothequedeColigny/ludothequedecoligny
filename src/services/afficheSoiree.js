// Affiches « Soirée jeux » (modèle « profondeur » et ses variantes, octobre 2026) : la date est écrite en haut,
// entre le paquet de cartes et les dés, dans le style du titre « SOIRÉE JEUX » (lettres crème cerclées d'encre,
// épaisseur noire décalée) ; l'horaire et le lieu dessous, en blanc. Toutes les variantes gardent cette place libre.
// Le grain du fond est reposé sur les textes pour qu'ils ne paraissent pas collés sur l'image.
// Coordonnées en unités du modèle SVG (595,28 × 841,89), mises à l'échelle du canvas.

export const PAGE_W = 595.28
// Lilita One (titre) et Roboto (texte) : polices libres, hébergées sur le site
export const POLICE_DATE = 'Lilita Affiche'
export const POLICE_TEXTE = 'Roboto Affiche'
const POLICES = [
  [POLICE_DATE, '/fonts/lilita-one.ttf'],
  [POLICE_TEXTE, '/fonts/roboto-bold.ttf'],
]
export const GRAIN_URL = '/affiches/grain-soiree.png'
const GRAIN_TUILE = 144          // côté de la tuile de grain, en unités du modèle

const CREME = '#fbedda'
const NOIR = '#000'
const CENTRE = 297.64            // axe du titre
const LARGEUR_DATE = 400         // entre le paquet de cartes et les dés
const LARGEUR_LIGNE = 420

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
              'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function heure(h, m) {
  return h + 'h' + (m > 0 ? String(m).padStart(2, '0') : '')
}

// dateStr : valeur d'un champ datetime-local ; fin : « 23:00 » ou vide ; lieu : texte libre
export function textesSoiree(dateStr, fin, lieu) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const date = (JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]).toUpperCase()
  const debut = heure(d.getHours(), d.getMinutes())
  let horaire = 'à partir de ' + debut
  if (fin) {
    const [h, m] = fin.split(':').map(Number)
    horaire = 'de ' + debut + ' à ' + heure(h, m)
  }
  const l = (lieu || '').trim()
  const ligne = l ? horaire + ' · ' + l.charAt(0).toUpperCase() + l.slice(1) : horaire
  return { date, ligne }
}

// taille de police réduite si le texte dépasse la largeur permise
function ajuste(ctx, texte, taille, police, largeurMax) {
  ctx.font = taille + 'px "' + police + '"'
  const w = ctx.measureText(texte).width
  return w <= largeurMax ? taille : Math.floor(taille * largeurMax / w * 10) / 10
}

// même construction que le titre : épaisseur noire décalée, lettres crème, contour d'encre par-dessus
function dateTitre(ctx, t, y) {
  const taille = ajuste(ctx, t, 31, POLICE_DATE, LARGEUR_DATE)
  ctx.font = taille + 'px "' + POLICE_DATE + '"'
  if ('letterSpacing' in ctx) ctx.letterSpacing = (taille * 0.02) + 'px'
  const k = taille / 31
  ctx.fillStyle = NOIR
  ctx.fillText(t, CENTRE + 1.8 * k, y + 2 * k)
  ctx.fillStyle = CREME
  ctx.fillText(t, CENTRE, y)
  ctx.lineJoin = 'miter'; ctx.lineWidth = k; ctx.strokeStyle = NOIR
  ctx.strokeText(t, CENTRE, y)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
}

// texte blanc avec l'ombre douce de « Gratuit et ouvert à tous » (s : échelle du canvas, l'ombre ne la suit pas)
function ligneBlanche(ctx, t, y, s) {
  ctx.font = ajuste(ctx, t, 16, POLICE_TEXTE, LARGEUR_LIGNE) + 'px "' + POLICE_TEXTE + '"'
  ctx.save()
  ctx.shadowColor = 'rgba(6, 35, 27, 0.35)'
  ctx.shadowBlur = 10 * s; ctx.shadowOffsetX = 10 * s; ctx.shadowOffsetY = 13 * s
  ctx.fillStyle = '#fff'
  ctx.fillText(t, CENTRE, y)
  ctx.restore()
  ctx.fillStyle = '#fff'
  ctx.fillText(t, CENTRE, y)
}

// Dessine la date et la ligne horaire · lieu sur le canvas (le fond doit déjà y être).
// textes : { date, ligne } ; grain : image de la tuile de grain (ou null)
export function dessinerSoiree(canvas, textes, grain) {
  const s = canvas.width / PAGE_W
  const calque = document.createElement('canvas')
  calque.width = canvas.width; calque.height = canvas.height
  const ctx = calque.getContext('2d')
  ctx.scale(s, s)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  if (textes.date) dateTitre(ctx, textes.date, 49)
  if (textes.ligne) ligneBlanche(ctx, textes.ligne, 71, s)
  // grain du fond, seulement sur les textes
  if (grain) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-atop'
    const motif = ctx.createPattern(grain, 'repeat')
    const k = (GRAIN_TUILE * s) / grain.width
    motif.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]))
    ctx.fillStyle = motif
    ctx.fillRect(0, 0, calque.width, calque.height)
  }
  canvas.getContext('2d').drawImage(calque, 0, 0)
}

export async function chargerPolicesSoiree() {
  await Promise.all(POLICES.map(async ([nom, url]) => {
    if ([...document.fonts].some(f => f.family === nom || f.family === '"' + nom + '"')) return
    const face = new FontFace(nom, 'url(' + url + ')')
    await face.load()
    document.fonts.add(face)
  }))
}

let grainEnCours = null
// tuile de grain, chargée une fois (null si elle manque : les textes restent alors sans grain)
export function chargerGrainSoiree() {
  if (!grainEnCours) {
    grainEnCours = new Promise(resolve => {
      const img = new window.Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = GRAIN_URL
    })
  }
  return grainEnCours
}

// textes d'exemple pour l'aperçu des Paramètres
export const EXEMPLE_SOIREE = { date: 'VENDREDI 3 AVRIL', ligne: 'à partir de 19h · Salle des fêtes de Coligny' }
