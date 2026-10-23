import {
  COULEURS, chargerImage, nouveauCanvas, recouvrir, flouDoux, voile, rectArrondi, police, couperLignes,
  etiquette, pastille, texteContoure, liberer,
} from './dessin.js'
import { espacer, largeur, baseLigne, limiterLignes, dessinerPlan } from './annonce.js'
import { fondMosaique, prochaine } from './permanence.js'

/**
 * Carrousel « Nouveaux jeux » (images 1080 × 1350), d'après la maquette validée par Victor
 * le 23/10/2026 (« Maquette bilan soirée jeux/nouveaux-jeux-maquette »).
 * Règles et textes : nouveaux-jeux-regles.js. Même contrat que dessinerBilanPermanence.
 */
const L = 1080
const H = 1350
const TITRE = 'Bricolage Grotesque'

// ---------- détourage ----------

// Blanc du fond d'une photo de boîte : clair et sans couleur
const SEUIL_BLANC = 228
const ECART_GRIS = 18
// Au-delà, c'est la boîte elle-même qui est blanche : on n'y touche pas
const PART_RETIREE_MAX = 0.85

/**
 * Retire le fond blanc d'une jaquette : seulement le blanc relié aux bords (remplissage
 * depuis les bords, le blanc de l'illustration reste), puis recadre sur la boîte.
 * Sécurité : si plus de 85 % de l'image serait retirée (boîte blanche sur fond blanc),
 * l'image est gardée telle quelle. Calcul sur 900 px de côté au plus.
 * Renvoie un canvas, à libérer par l'appelant.
 */
export function detourer(img, coteMax = 900) {
  const e = Math.min(1, coteMax / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * e))
  const h = Math.max(1, Math.round(img.height * e))
  const { canvas, ctx } = nouveauCanvas(w, h)
  ctx.drawImage(img, 0, 0, w, h)
  let donnees
  try {
    donnees = ctx.getImageData(0, 0, w, h)
  } catch {
    // Pixels illisibles (image d'un autre site) : pas de détourage
    return canvas
  }
  const px = donnees.data
  const blanc = k => {
    const r = px[k * 4]
    const g = px[k * 4 + 1]
    const b = px[k * 4 + 2]
    return r > SEUIL_BLANC && g > SEUIL_BLANC && b > SEUIL_BLANC && Math.max(r, g, b) - Math.min(r, g, b) < ECART_GRIS
  }
  // Parcours en largeur depuis les quatre bords
  const vu = new Uint8Array(w * h)
  const file = new Int32Array(w * h)
  let debut = 0
  let fin = 0
  const pousser = k => { if (!vu[k] && blanc(k)) { vu[k] = 1; file[fin++] = k } }
  for (let x = 0; x < w; x++) { pousser(x); pousser((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { pousser(y * w); pousser(y * w + w - 1) }
  while (debut < fin) {
    const k = file[debut++]
    const x = k % w
    if (x > 0) pousser(k - 1)
    if (x < w - 1) pousser(k + 1)
    if (k >= w) pousser(k - w)
    if (k < (h - 1) * w) pousser(k + w)
  }
  if (fin === 0 || fin > PART_RETIREE_MAX * w * h) return canvas

  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let k = 0; k < w * h; k++) {
    if (vu[k]) { px[k * 4 + 3] = 0; continue }
    const x = k % w
    const y = (k - x) / w
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  ctx.putImageData(donnees, 0, 0)
  // Recadrage sur la boîte (marges devenues transparentes retirées)
  const lw = x1 - x0 + 1
  const lh = y1 - y0 + 1
  if (lw === w && lh === h) return canvas
  const { canvas: rogne, ctx: r } = nouveauCanvas(lw, lh)
  r.drawImage(canvas, x0, y0, lw, lh, 0, 0, lw, lh)
  liberer(canvas)
  return rogne
}

/** Jaquette chargée et détourée (canvas à libérer), ou null si absente ou illisible. */
async function jaquetteDetouree(url) {
  const img = await chargerImage(url)
  return img ? detourer(img) : null
}

// ---------- autocollant ----------

/**
 * Silhouette pleine de l'image (taille w × h) élargie de `r` px, de couleur `couleur`.
 * Renvoie { canvas, m } : `m` = marge ajoutée de chaque côté.
 */
function silhouette(img, w, h, r, couleur) {
  const m = Math.ceil(r) + 2
  const { canvas: forme, ctx: f } = nouveauCanvas(Math.ceil(w), Math.ceil(h))
  f.drawImage(img, 0, 0, w, h)
  f.globalCompositeOperation = 'source-in'
  f.fillStyle = couleur
  f.fillRect(0, 0, w, h)
  const { canvas, ctx } = nouveauCanvas(Math.ceil(w) + 2 * m, Math.ceil(h) + 2 * m)
  // La forme recopiée tout autour (36 directions, à r et r/2) : contour arrondi sans ctx.filter
  for (let a = 0; a < 360; a += 10) {
    const rad = (a * Math.PI) / 180
    for (const rr of [r, r * 0.5]) ctx.drawImage(forme, m + Math.cos(rad) * rr, m + Math.sin(rad) * rr)
  }
  ctx.drawImage(forme, m, m)
  liberer(forme)
  return { canvas, m }
}

/** Même forme, autre couleur (l'ombre pleine reprend la silhouette du contour). */
function recolorer(canvas, couleur) {
  const { canvas: copie, ctx } = nouveauCanvas(canvas.width, canvas.height)
  ctx.drawImage(canvas, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = couleur
  ctx.fillRect(0, 0, copie.width, copie.height)
  return copie
}

/**
 * Boîte détourée façon autocollant, centrée en (cx, cy), taille w × h, penchée de `angle`
 * degrés : ombre pleine décalée, contour encre, liseré blanc, puis l'image.
 */
function autocollant(ctx, img, { cx, cy, w, h, angle = 0, lisere = 14, bord = 4, ombre = 16, couleurOmbre = COULEURS.orange }) {
  const contour = silhouette(img, w, h, lisere + bord, COULEURS.encre)
  const blanc = silhouette(img, w, h, lisere, '#ffffff')
  const formeOmbre = recolorer(contour.canvas, couleurOmbre)
  try {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((angle * Math.PI) / 180)
    ctx.drawImage(formeOmbre, -w / 2 - contour.m + ombre, -h / 2 - contour.m + ombre)
    ctx.drawImage(contour.canvas, -w / 2 - contour.m, -h / 2 - contour.m)
    ctx.drawImage(blanc.canvas, -w / 2 - blanc.m, -h / 2 - blanc.m)
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
    ctx.restore()
  } finally {
    liberer(contour.canvas)
    liberer(blanc.canvas)
    liberer(formeOmbre)
  }
}

/** Taille qui fait tenir l'image dans w × h, proportions gardées. */
function tenir(img, w, h) {
  const e = Math.min(w / img.width, h / img.height)
  return { w: img.width * e, h: img.height * e }
}

/** Étiquette orange centrée horizontalement. */
function etiquetteCentree(ctx, texte, y, taille, angle = -2) {
  police(ctx, 800, taille, TITRE)
  espacer(ctx, -0.04 * taille)
  const w = largeur(ctx, texte) + 68
  espacer(ctx, 0)
  return etiquette(ctx, [texte], { x: (L - w) / 2, y, taille, angle })
}

// ---------- 1 · Couverture ----------

// Éventail : angle de chaque jaquette selon leur nombre
const ANGLES = { 1: [0], 2: [-6, 6], 3: [-9, 0, 9], 4: [-10, -4, 4, 10], 5: [-12, -6, 0, 6, 12] }

async function couverture(ctx, d, logo) {
  await fondMosaique(ctx, d.mosaique)
  pastille(ctx, logo, 56, 56)
  etiquetteCentree(ctx, 'Du nouveau à la ludothèque\u00A0!', 175, 58)

  // Éventail des jaquettes détourées (5 au plus), les plus excentrées dessinées d'abord
  const n = d.jaquettes.length
  if (n) {
    // Peu de jaquettes : plus grandes, pour ne pas laisser de vide
    const [lMax, hMax] = n === 1 ? [460, 500] : n === 2 ? [380, 450] : [330, 400]
    const pas = n === 2 ? 220 : n > 1 ? Math.min(150, 540 / (n - 1)) : 0
    const ordre = [...Array(n).keys()].sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2))
    const images = await Promise.all(d.jaquettes.map(jaquetteDetouree))
    try {
      for (const i of ordre) {
        const img = images[i]
        if (!img) continue
        const dx = (i - (n - 1) / 2) * pas
        const t = tenir(img, lMax, hMax)
        autocollant(ctx, img, {
          cx: L / 2 + dx, cy: 570 + Math.abs(dx) * 0.14, w: t.w, h: t.h, angle: ANGLES[n][i],
          lisere: 10, bord: 4, ombre: 12, couleurOmbre: i % 2 ? COULEURS.orange : COULEURS.bleu,
        })
      }
    } finally {
      images.forEach(liberer)
    }
  }

  // Le nombre de jeux, en grand
  const nb = String(d.nombre)
  police(ctx, 800, 300, TITRE)
  espacer(ctx, -0.04 * 300)
  const w = largeur(ctx, nb)
  espacer(ctx, 0)
  ctx.textAlign = 'left'
  texteContoure(ctx, nb, L / 2 - w / 2, 1090, { taille: 300, contour: 5, ombre: 18 })

  // « nouveaux jeux à emprunter ! »
  police(ctx, 800, 72, TITRE)
  espacer(ctx, -0.04 * 72)
  ctx.fillStyle = COULEURS.creme
  ctx.textAlign = 'center'
  couperLignes(ctx, d.phrase, 940).forEach((l, i) => ctx.fillText(l, L / 2, 1200 + i * 72))
  espacer(ctx, 0)
  ctx.textAlign = 'left'
}

// ---------- 2 · Un jeu ----------

/** Nom du jeu : 84 px, réduit jusqu'à 60 px pour tenir en 2 lignes de 940 px ; sinon « … ». */
function lignesDuNom(ctx, nom) {
  let t = 84
  let lignes
  for (; ; t -= 4) {
    police(ctx, 800, t, TITRE)
    espacer(ctx, -0.04 * t)
    lignes = couperLignes(ctx, nom, 940)
    if ((lignes.length <= 2 && lignes.every(l => largeur(ctx, l) <= 940)) || t <= 60) break
  }
  lignes = limiterLignes(ctx, lignes, 2, 940).map(l => {
    // Mot seul plus large que l'image, même à 60 px
    if (largeur(ctx, l) <= 940) return l
    let c = l
    while (c.length > 1 && largeur(ctx, `${c}…`) > 940) c = c.slice(0, -1)
    return `${c.trimEnd()}…`
  })
  return { lignes, taille: t }
}

async function jeu(ctx, d, logo) {
  const img = await jaquetteDetouree(d.jaquette)
  try {
    // Fond : la boîte elle-même floutée (pas son fond blanc, qui donnerait du gris)
    if (img) {
      const { canvas: fond, ctx: f } = nouveauCanvas(L, H)
      try {
        f.fillStyle = COULEURS.encre
        f.fillRect(0, 0, L, H)
        recouvrir(f, img, 0, 0, L, H)
        flouDoux(ctx, fond, L, H)
      } finally {
        liberer(fond)
      }
    } else voile(ctx, L, H, COULEURS.bleu)
    voile(ctx, L, H, 'rgba(15,23,42,0.5)')
    pastille(ctx, logo, 56, 56)
    etiquetteCentree(ctx, 'Nouveau\u00A0!', 160, 64)

    // La boîte en autocollant, penchée de ±2° en alternance
    if (img) {
      const t = tenir(img, 720, 620)
      autocollant(ctx, img, { cx: L / 2, cy: 610, w: t.w, h: t.h, angle: d.index % 2 ? -2 : 2, lisere: 16, bord: 5, ombre: 18 })
    }
  } finally {
    liberer(img)
  }

  // Nom, centré (une seule ligne : au milieu de la place de deux)
  const nom = lignesDuNom(ctx, d.nom)
  const hLigne = nom.taille * 0.98
  const haut = 1010 + (nom.lignes.length === 1 ? hLigne / 2 : 0)
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  nom.lignes.forEach((l, k) => ctx.fillText(l, L / 2, baseLigne(ctx, haut + k * hLigne, hLigne)))
  espacer(ctx, 0)

  // Pastilles crème : joueurs, âge
  police(ctx, 700, 34)
  const largeurs = d.infos.map(x => largeur(ctx, x) + 56)
  const total = largeurs.reduce((s, x) => s + x, 0) + 24 * (d.infos.length - 1)
  let x = (L - total) / 2
  const y = 1225
  d.infos.forEach((texte, k) => {
    const lp = largeurs[k]
    ctx.fillStyle = COULEURS.encre
    rectArrondi(ctx, x + 6, y + 6, lp, 64, 32); ctx.fill()
    ctx.fillStyle = COULEURS.creme
    rectArrondi(ctx, x, y, lp, 64, 32); ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = COULEURS.encre
    rectArrondi(ctx, x + 2, y + 2, lp - 4, 60, 30); ctx.stroke()
    ctx.fillStyle = COULEURS.encre
    ctx.fillText(texte, x + lp / 2, y + 44)
    x += lp + 24
  })
  ctx.textAlign = 'left'
}

// ---------- 3 · Prochaine permanence : la diapositive du bilan de permanence ----------

const DESSINS = { couverture, jeu, prochaine }

/**
 * Dessine les images du carrousel (4:5). Avec `onDiapo(canvas, index)` (fonction async),
 * chaque image lui est confiée dès qu'elle est dessinée puis libérée : une seule image
 * pleine taille en mémoire à la fois (téléphones). Sans `onDiapo`, les canvas sont rendus
 * et l'appelant les libère. En cas d'erreur, tout est libéré puis l'erreur relancée.
 */
export function dessinerNouveauxJeux(plan, onDiapo) {
  return dessinerPlan(plan, H, DESSINS, onDiapo)
}
