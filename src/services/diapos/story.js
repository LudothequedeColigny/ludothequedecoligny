import {
  COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, dessinerFlou, degradeBas, voile,
  police, couperLignes, etiquette, pastille, texteContoure, liberer,
} from './dessin.js'
import { detourer, echelleDetouree, autocollant } from './autocollant.js'
import { carteRendezVous } from './carrousel.js'

/**
 * Images de la story de bilan (1080 × 1920). Instagram recouvre ~250 px en haut
 * et ~340 px en bas : aucun texte dans ces zones. Maquette : « story.html ».
 */
const L = 1080
const H = 1920
// PNG et non SVG : un SVG dessiné sur canvas peut le « bloquer » sur Safari (export impossible)
const LOGO = '/social/logo-feuille.png'
const FOND_BOIS = '/social/fond-bois.jpg'
const HAUT = 270 // sous la zone d'Instagram

async function ouverture(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) recouvrir(ctx, photo, 0, 0, L, H)
  degradeBas(ctx, L, H, 0.42)
  pastille(ctx, logo, 70, HAUT)
  police(ctx, 800, 140, 'Bricolage Grotesque')
  let taille = 140
  let lignes = couperLignes(ctx, d.etiquette, 860)
  if (lignes.length > 1) { taille = 118; police(ctx, 800, 118, 'Bricolage Grotesque'); lignes = couperLignes(ctx, d.etiquette, 860) }
  const hEtiquette = lignes.length * taille * 0.95 + 26
  const baseLieu = H - 400
  const hautEtiquette = baseLieu - 34 - 60 - hEtiquette
  ctx.fillStyle = 'rgba(253,250,246,0.85)'
  police(ctx, 600, 34)
  ctx.fillText(d.lieu, 70, baseLieu)
  etiquette(ctx, lignes, { x: 70, y: hautEtiquette, taille })
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 130, 'Bricolage Grotesque')
  const baseCetait = hautEtiquette - 32
  ctx.fillText("c'était", 70, baseCetait)
  police(ctx, 700, 58)
  ctx.fillText(d.formule, 70, baseCetait - 130 * 0.92 - 10)
}

async function nombre(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) dessinerFlou(ctx, photo, L, H)
  voile(ctx, L, H, 'rgba(26,95,122,0.62)')
  pastille(ctx, logo, 70, HAUT)
  ctx.textAlign = 'center'
  police(ctx, 800, 100, 'Bricolage Grotesque')
  const apres = couperLignes(ctx, d.apres, 1000)
  const hTotal = 74 + 50 + 560 + 60 + apres.length * 96
  let y = 380 + (H - 380 - 380 - hTotal) / 2 + 70
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 74)
  ctx.fillText('Nous étions', L / 2, y)
  y += 50 + 550
  texteContoure(ctx, String(d.nombre), L / 2 - 12, y, { taille: String(d.nombre).length > 2 ? 480 : 640, contour: 11, ombre: 24 })
  y += 60 + 90
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 100, 'Bricolage Grotesque')
  apres.forEach((l, i) => ctx.fillText(l, L / 2, y + i * 96))
  ctx.textAlign = 'left'
}

async function grille(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) dessinerFlou(ctx, photo, L, H)
  voile(ctx, L, H, 'rgba(26,95,122,0.62)')
  pastille(ctx, logo, 70, HAUT)
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 58)
  ctx.fillText('Et on a joué à…', 70, 470)
  police(ctx, 800, 120, 'Bricolage Grotesque')
  const debut = 'plein de '
  ctx.fillText(debut, 70, 590)
  ctx.fillStyle = COULEURS.orange
  ctx.fillText('jeux !', 70 + ctx.measureText(debut).width, 590)
  const colonnes = 3
  const lCase = (L - 140 - 2 * 34) / colonnes
  const jaquettes = await Promise.all(d.jeux.map(j => chargerImage(j.jaquette)))
  d.jeux.forEach((j, i) => {
    const cx = 70 + (i % colonnes) * (lCase + 34) + lCase / 2
    const yBoite = 670 + Math.floor(i / colonnes) * 430
    if (jaquettes[i]) {
      // Boîte détourée en autocollant, posée sur la même ligne ; ombre orange / bleue en
      // alternance. Détourée une à une : un seul canvas de travail à la fois
      const img = detourer(jaquettes[i])
      try {
        const r = Math.min(270 / img.height, 250 / img.width, echelleDetouree(jaquettes[i], 0.9))
        const w = img.width * r
        const h = img.height * r
        autocollant(ctx, img, {
          cx, cy: yBoite + 300 - h / 2, w, h,
          lisere: 8, bord: 3, ombre: 8, couleurOmbre: i % 2 ? COULEURS.bleu : COULEURS.orange,
        })
      } finally {
        liberer(img)
      }
    }
    ctx.textAlign = 'center'
    ctx.fillStyle = COULEURS.creme
    police(ctx, 800, 38, 'Bricolage Grotesque')
    const lignes = couperLignes(ctx, j.nom, lCase).slice(0, 2)
    lignes.forEach((l, k) => ctx.fillText(l, cx, yBoite + 356 + k * 39))
    if (j.dispo) {
      police(ctx, 600, 22)
      ctx.fillStyle = 'rgba(253,250,246,0.85)'
      ctx.fillText('✓ À emprunter', cx, yBoite + 356 + lignes.length * 39 + 8)
    }
    ctx.textAlign = 'left'
  })
}

async function merci(ctx, d, logo) {
  const bois = await chargerImage(FOND_BOIS)
  if (bois) recouvrir(ctx, bois, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  pastille(ctx, logo, 70, HAUT)
  texteContoure(ctx, 'Merci !', 70, 380 + 200, { taille: 220, contour: 6, ombre: 16 })
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 72, 'Bricolage Grotesque')
  couperLignes(ctx, "à toutes et à tous d'être venus jouer avec nous", 940)
    .forEach((l, i) => ctx.fillText(l, 70, 690 + i * 72))
  const { y, h } = await carteRendezVous(ctx, d.rdv, { x: 70, haut: 880, largeur: L - 140, affiche: 280 })
  if (y + h <= 1450) {
    ctx.textAlign = 'center'
    ctx.fillStyle = COULEURS.creme
    police(ctx, 700, 34)
    ctx.fillText('Toutes nos dates ↓', L / 2, Math.min(Math.max(y + h + 110, 1400), 1520))
    ctx.textAlign = 'left'
  }
}

const DESSINS = { ouverture, nombre, grille, merci }

/**
 * Dessine les images du plan. Avec `onDiapo(canvas, index)` (fonction async), chaque
 * image lui est confiée dès qu'elle est dessinée puis libérée : une seule image
 * pleine taille en mémoire à la fois (téléphones), et le tableau rendu est vide.
 * Sans `onDiapo`, les canvas sont rendus et l'appelant les libère.
 */
export async function dessinerStory(plan, onDiapo) {
  await chargerPolices()
  const logo = await chargerImage(LOGO)
  const canvases = []
  for (let i = 0; i < plan.length; i++) {
    const d = plan[i]
    const { canvas, ctx } = nouveauCanvas(L, H)
    try {
      ctx.fillStyle = COULEURS.encre
      ctx.fillRect(0, 0, L, H)
      await DESSINS[d.type](ctx, d, logo)
      if (onDiapo) await onDiapo(canvas, i)
    } catch (e) {
      // En cas d'échec, rien ne reste en mémoire
      liberer(canvas)
      canvases.forEach(liberer)
      throw e
    }
    if (onDiapo) liberer(canvas)
    else canvases.push(canvas)
  }
  return canvases
}

