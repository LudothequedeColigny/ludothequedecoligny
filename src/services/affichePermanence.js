// Affiche « Permanence » (la boîte qui déborde) : le fond est l'affiche sans ses textes variables ;
// le jour, le numéro, le mois, l'horaire et l'adresse sont redessinés ici, aux places et dans le style
// du modèle SVG (Bureau/PERSO/Ludothèque/Affiche ludothèque/PERMANENCES LUDOTHEQUE/), puis le grain
// du modèle est reposé dessus pour qu'ils ne paraissent pas collés sur l'image.
// Coordonnées en unités du modèle SVG (595,28 × 841,89), mises à l'échelle du canvas.

export const PAGE_W = 595.28
// Fraunces 144pt SuperSoft Black : police libre (SIL Open Font License, licence dans public/fonts/fraunces-OFL.txt)
export const POLICE = 'Fraunces Affiche'
export const POLICE_URL = '/fonts/fraunces-144pt-supersoft-black.otf'
export const GRAIN_URL = '/affiches/grain-permanence.png'
const GRAIN_TUILE = 144          // côté de la tuile de grain, en unités du modèle

const ENCRE = '#1d1d1b'
const CREME = '#fbedda'
const MOUTARDE = '#e2ac4a'
const MOUTARDE_FONCE = '#a9782a'

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
              'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function heure(h, m) {
  return h + 'h' + (m > 0 ? String(m).padStart(2, '0') : '')
}

// dateStr : valeur d'un champ datetime-local ; fin : « 14:00 » ou vide
export function textesPermanence(dateStr, fin) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const debut = heure(d.getHours(), d.getMinutes())
  let horaire = 'dès ' + debut
  if (fin) {
    const [h, m] = fin.split(':').map(Number)
    horaire = debut + ' – ' + heure(h, m)
  }
  return { jour: JOURS[d.getDay()], numero: String(d.getDate()), mois: MOIS[d.getMonth()], horaire }
}

// taille de police réduite si le texte dépasse la largeur permise
function ajuste(ctx, texte, taille, largeurMax) {
  ctx.font = taille + 'px "' + POLICE + '"'
  const w = ctx.measureText(texte).width
  if (w <= largeurMax) return taille
  return Math.floor(taille * largeurMax / w)
}

function texte(ctx, t, x, y, taille, couleur, largeurMax = Infinity) {
  ctx.font = ajuste(ctx, t, taille, largeurMax) + 'px "' + POLICE + '"'
  ctx.fillStyle = couleur
  ctx.fillText(t, x, y)
}

// chiffre en relief : même construction que titre3d() du modèle (profondeur décalée, contour encre)
function relief(ctx, t, x, y, taille, face, prof, epaisseur, trait, largeurMax) {
  ctx.font = ajuste(ctx, t, taille, largeurMax) + 'px "' + POLICE + '"'
  ctx.lineJoin = 'round'
  ctx.fillStyle = prof
  ctx.strokeStyle = ENCRE; ctx.lineWidth = trait * 2
  ctx.strokeText(t, x + epaisseur * 0.8, y + epaisseur); ctx.fillText(t, x + epaisseur * 0.8, y + epaisseur)
  ctx.strokeStyle = prof; ctx.lineWidth = trait
  for (let k = epaisseur; k > 0; k--) {
    ctx.strokeText(t, x + k * 0.8, y + k); ctx.fillText(t, x + k * 0.8, y + k)
  }
  ctx.strokeStyle = ENCRE; ctx.lineWidth = trait * 2
  ctx.fillStyle = face
  ctx.strokeText(t, x, y); ctx.fillText(t, x, y)
}

function pastille(ctx, t, x, y, w, h, taille) {
  const r = h / 2
  ctx.fillStyle = ENCRE
  ctx.beginPath(); ctx.roundRect(x - w / 2 + 4, y - h / 2 + 5, w, h, r); ctx.fill()
  ctx.fillStyle = CREME; ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.4
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, r); ctx.fill(); ctx.stroke()
  texte(ctx, t, x, y + taille * 0.36, taille, ENCRE, w - 26)
}

function adresse(ctx, t) {
  ctx.save()
  ctx.translate(557, 252)
  ctx.rotate(-4 * Math.PI / 180)
  ctx.textAlign = 'end'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.6px'
  ctx.font = ajuste(ctx, t, 17, 300) + 'px "' + POLICE + '"'
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.4; ctx.strokeStyle = ENCRE
  ctx.globalAlpha = 0.45; ctx.fillStyle = ENCRE
  ctx.strokeText(t, 1.6, 2.4); ctx.fillText(t, 1.6, 2.4)
  ctx.globalAlpha = 1; ctx.fillStyle = CREME
  ctx.strokeText(t, 0, 0); ctx.fillText(t, 0, 0)
  ctx.restore()
}

// Dessine les textes variables sur le canvas (le fond doit déjà y être).
// textes : { jour, numero, mois, horaire, adresse } ; grain : image de la tuile de grain (ou null)
export function dessinerPermanence(canvas, textes, grain) {
  const s = canvas.width / PAGE_W
  const calque = document.createElement('canvas')
  calque.width = canvas.width; calque.height = canvas.height
  const ctx = calque.getContext('2d')
  ctx.scale(s, s)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  // bloc « Prochaine permanence » : translate(22 256) dans le modèle, centre à x = 140
  if (textes.jour) texte(ctx, textes.jour, 140, 382, 38, CREME, 210)
  if (textes.numero) relief(ctx, textes.numero, 140, 496, 130, MOUTARDE, MOUTARDE_FONCE, 6, 2.6, 200)
  if (textes.mois) texte(ctx, textes.mois, 140, 542, 40, CREME, 210)
  if (textes.horaire) pastille(ctx, textes.horaire, 140, 590, 180, 48, 29)
  if (textes.adresse) adresse(ctx, textes.adresse)
  // grain du modèle, seulement sur les textes
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

export async function chargerPolicePermanence() {
  if ([...document.fonts].some(f => f.family === POLICE || f.family === '"' + POLICE + '"')) return
  const face = new FontFace(POLICE, 'url(' + POLICE_URL + ')')
  await face.load()
  document.fonts.add(face)
}

let grainEnCours = null
// tuile de grain, chargée une fois (null si elle manque : les textes restent alors sans grain)
export function chargerGrainPermanence() {
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
export const EXEMPLE_PERMANENCE = { jour: 'samedi', numero: '14', mois: 'novembre', horaire: '10h – 14h', adresse: '419 Grande Rue à Coligny' }
