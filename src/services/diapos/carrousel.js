import {
  COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, flou, degradeBas, voile,
  rectArrondi, police, couperLignes, etiquette, pastille, texteContoure, ombrePleine,
} from './dessin.js'

/**
 * Diapositives du carrousel de bilan (1080 × 1350), d'après la maquette validée
 * par Victor (« Maquette bilan soirée jeux/bilan.html »).
 */
const L = 1080
const H = 1350
const LOGO = '/logo-feuille.svg'
const FOND_BOIS = '/social/fond-bois.jpg'

async function ouverture(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) recouvrir(ctx, photo, 0, 0, L, H)
  degradeBas(ctx, L, H)
  pastille(ctx, logo, 56, 56)
  // Placement de bas en haut : lieu, étiquette, « c'était », formule
  police(ctx, 800, 132, 'Bricolage Grotesque')
  let taille = 132
  let lignes = couperLignes(ctx, d.etiquette, 860)
  if (lignes.length > 1) { taille = 112; police(ctx, 800, 112, 'Bricolage Grotesque'); lignes = couperLignes(ctx, d.etiquette, 860) }
  const hEtiquette = lignes.length * taille * 0.95 + 26
  const baseLieu = H - 96
  const hautEtiquette = baseLieu - 30 - 58 - hEtiquette
  ctx.fillStyle = 'rgba(253,250,246,0.85)'
  police(ctx, 600, 30)
  ctx.fillText(d.lieu, 70, baseLieu)
  etiquette(ctx, lignes, { x: 70, y: hautEtiquette, taille })
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 118, 'Bricolage Grotesque')
  const baseCetait = hautEtiquette - 30
  ctx.fillText("c'était", 70, baseCetait)
  police(ctx, 700, 52)
  ctx.fillText(d.formule, 70, baseCetait - 118 * 0.92 - 10)
}

async function nombre(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) ctx.drawImage(flou(photo, L, H), 0, 0)
  voile(ctx, L, H, 'rgba(26,95,122,0.62)')
  pastille(ctx, logo, 56, 56)
  ctx.textAlign = 'center'
  police(ctx, 800, 92, 'Bricolage Grotesque')
  const apres = couperLignes(ctx, d.apres, 940)
  const hTotal = 66 + 40 + 480 + 50 + apres.length * 88
  let y = (H - hTotal) / 2 + 60
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 66)
  ctx.fillText('Nous étions', L / 2, y)
  y += 40 + 470
  texteContoure(ctx, String(d.nombre), L / 2 - 11, y, { taille: String(d.nombre).length > 2 ? 420 : 560 })
  y += 50 + 80
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 92, 'Bricolage Grotesque')
  apres.forEach((l, i) => ctx.fillText(l, L / 2, y + i * 88))
  ctx.textAlign = 'left'
}

async function transition(ctx, d, logo) {
  const photo = await chargerImage(d.photo)
  if (photo) recouvrir(ctx, photo, 0, 0, L, H)
  // Carte crème penchée
  ctx.save()
  ctx.translate(70, 170)
  ctx.rotate((-1.5 * Math.PI) / 180)
  const w = 870
  const h = 300
  ctx.fillStyle = COULEURS.bleu
  rectArrondi(ctx, 16, 16, w, h, 34); ctx.fill()
  ctx.fillStyle = COULEURS.creme
  rectArrondi(ctx, 0, 0, w, h, 34); ctx.fill()
  ctx.lineWidth = 6; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, 0, 0, w, h, 34); ctx.stroke()
  ctx.fillStyle = COULEURS.bleu
  police(ctx, 700, 50)
  ctx.fillText('Et on a joué à…', 48, 96)
  police(ctx, 800, 124, 'Bricolage Grotesque')
  ctx.fillStyle = COULEURS.encre
  const debut = 'plein de '
  ctx.fillText(debut, 48, 236)
  ctx.fillStyle = COULEURS.orange
  ctx.fillText('jeux !', 48 + ctx.measureText(debut).width, 236)
  ctx.restore()
  pastille(ctx, logo, 56, H - 70 - 78)
  // « Les voici → »
  police(ctx, 800, 32)
  const texte = 'LES VOICI →'
  const lw = ctx.measureText(texte).width + 72
  const x = L - 56 - lw
  const y = H - 70 - 80
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, x + 9, y + 9, lw, 80, 40); ctx.fill()
  ctx.fillStyle = COULEURS.bleu
  rectArrondi(ctx, x, y, lw, 80, 40); ctx.fill()
  ctx.lineWidth = 5; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, x, y, lw, 80, 40); ctx.stroke()
  ctx.fillStyle = COULEURS.creme
  ctx.textBaseline = 'middle'
  ctx.fillText(texte, x + 36, y + 41)
  ctx.textBaseline = 'alphabetic'
}

function blocNom(ctx, d) {
  police(ctx, 800, 104, 'Bricolage Grotesque')
  let taille = 104
  let lignes = couperLignes(ctx, d.nom, 560)
  if (lignes.length > 2) { taille = 84; police(ctx, 800, 84, 'Bricolage Grotesque'); lignes = couperLignes(ctx, d.nom, 560) }
  const hNom = lignes.length * taille * 0.92
  const bas = H - 92
  const baseDispo = bas
  const baseNom = d.dispo ? baseDispo - 36 - 26 : bas
  // Nom
  ctx.fillStyle = COULEURS.creme
  lignes.forEach((l, i) => ctx.fillText(l, 70, baseNom - (lignes.length - 1 - i) * taille * 0.92))
  // « On a joué à »
  police(ctx, 800, 24)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '3.8px'
  const texte = 'ON A JOUÉ À'
  const pw = ctx.measureText(texte).width + 44
  const py = baseNom - hNom - 22 - 50
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, 70 + 6, py + 6, pw, 50, 25); ctx.fill()
  ctx.fillStyle = COULEURS.bleu
  rectArrondi(ctx, 70, py, pw, 50, 25); ctx.fill()
  ctx.lineWidth = 4; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, 70, py, pw, 50, 25); ctx.stroke()
  ctx.fillStyle = COULEURS.creme
  ctx.textBaseline = 'middle'
  ctx.fillText(texte, 92, py + 26)
  ctx.textBaseline = 'alphabetic'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  // « ✓ À emprunter à la ludothèque »
  if (d.dispo) {
    ctx.fillStyle = COULEURS.creme
    ctx.beginPath(); ctx.arc(88, baseDispo - 9, 18, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = COULEURS.bleu; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(79, baseDispo - 9); ctx.lineTo(86, baseDispo - 2); ctx.lineTo(98, baseDispo - 17); ctx.stroke()
    ctx.fillStyle = 'rgba(253,250,246,0.9)'
    police(ctx, 600, 26)
    ctx.fillText('À emprunter à la ludothèque', 118, baseDispo)
  }
}

async function jeu(ctx, d, logo) {
  const jaquette = await chargerImage(d.jaquette)
  if (d.photo) {
    const photo = await chargerImage(d.photo)
    if (photo) recouvrir(ctx, photo, 0, 0, L, H)
    degradeBas(ctx, L, H)
  } else {
    const fond = await chargerImage(d.fond)
    if (fond) ctx.drawImage(flou(fond, L, H), 0, 0)
    voile(ctx, L, H, 'rgba(26,95,122,0.62)')
    // Halo crème derrière la jaquette
    const g = ctx.createRadialGradient(L / 2, H * 0.45, 0, L / 2, H * 0.45, 320)
    g.addColorStop(0, 'rgba(253,250,246,0.55)')
    g.addColorStop(1, 'rgba(253,250,246,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L, H)
    const g2 = ctx.createLinearGradient(0, 0, 0, H)
    g2.addColorStop(0.6, 'rgba(15,23,42,0)')
    g2.addColorStop(1, 'rgba(15,23,42,0.75)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, L, H)
  }
  pastille(ctx, logo, 56, 56)
  if (jaquette) {
    const echelleMax = d.photo ? 1.35 : 1.6
    const hMax = d.photo ? 400 : 470
    const wMax = d.photo ? 360 : 460
    const r = Math.min(hMax / jaquette.height, wMax / jaquette.width, echelleMax)
    const w = jaquette.width * r
    const h = jaquette.height * r
    ctx.save()
    if (d.photo) {
      ctx.translate(L - 60 - w / 2, H - 80 - h / 2)
      ctx.rotate((5 * Math.PI) / 180)
    } else {
      ctx.translate(L / 2, H * 0.45)
      ctx.rotate((-4 * Math.PI) / 180)
    }
    ombrePleine(ctx, jaquette, -w / 2, -h / 2, w, h, d.photo ? 14 : 18)
    ctx.restore()
  }
  blocNom(ctx, d)
}

async function merci(ctx, d, logo) {
  const bois = await chargerImage(FOND_BOIS)
  if (bois) recouvrir(ctx, bois, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  pastille(ctx, logo, 56, 56)
  texteContoure(ctx, 'Merci !', 70, 190 + 190, { taille: 210, contour: 6, ombre: 16 })
  ctx.fillStyle = COULEURS.creme
  police(ctx, 800, 74, 'Bricolage Grotesque')
  couperLignes(ctx, "à toutes et à tous d'être venus jouer avec nous", 940)
    .forEach((l, i) => ctx.fillText(l, 70, 470 + i * 72))
  await carteRendezVous(ctx, d.rdv, { x: 70, bas: H - 150, largeur: L - 140, affiche: 250 })
  ctx.textAlign = 'center'
  ctx.fillStyle = COULEURS.creme
  police(ctx, 700, 30)
  ctx.fillText('ludothequedecoligny.fr', L / 2, H - 56)
  ctx.textAlign = 'left'
}

/** Carte « Prochain rendez-vous » (crème, ombre orange), affiche à droite. Exportée pour la story. */
export async function carteRendezVous(ctx, rdv, { x, bas, haut, largeur, affiche: lAffiche }) {
  const affiche = rdv?.affiche ? await chargerImage(rdv.affiche) : null
  const hAffiche = affiche ? lAffiche * (affiche.height / affiche.width) : 0
  const lTexte = largeur - 80 - (affiche ? lAffiche + 36 : 0)
  police(ctx, 800, 66, 'Bricolage Grotesque')
  const titre = rdv ? couperLignes(ctx, rdv.titre, lTexte) : ['Toutes nos dates']
  const hTexte = 36 + titre.length * 64 + 24 + 44 + (rdv?.lieu ? 40 : 0)
  const h = Math.max(hTexte, hAffiche * 0.8) + 80
  const y = haut ?? bas - h
  ctx.fillStyle = COULEURS.orange
  rectArrondi(ctx, x + 16, y + 16, largeur, h, 34); ctx.fill()
  ctx.fillStyle = COULEURS.creme
  rectArrondi(ctx, x, y, largeur, h, 34); ctx.fill()
  ctx.lineWidth = 6; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, x, y, largeur, h, 34); ctx.stroke()
  let ty = y + (h - hTexte) / 2 + 24
  ctx.fillStyle = COULEURS.orange
  police(ctx, 800, 24)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4.3px'
  ctx.fillText('PROCHAIN RENDEZ-VOUS', x + 40, ty)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  ty += 12
  ctx.fillStyle = COULEURS.encre
  police(ctx, 800, 66, 'Bricolage Grotesque')
  titre.forEach(l => { ty += 64; ctx.fillText(l, x + 40, ty) })
  ty += 24 + 38
  ctx.fillStyle = COULEURS.bleu
  police(ctx, 700, 38)
  ctx.fillText(rdv ? rdv.quand : 'ludothequedecoligny.fr', x + 40, ty)
  if (rdv?.lieu) {
    ty += 40
    ctx.fillStyle = '#475569'
    police(ctx, 500, 29)
    ctx.fillText(rdv.lieu, x + 40, ty)
  }
  if (affiche) {
    const ax = x + largeur - 40 - lAffiche
    const ay = y + (h - hAffiche) / 2
    ctx.save()
    ctx.translate(ax + lAffiche / 2, ay + hAffiche / 2)
    ctx.rotate((4 * Math.PI) / 180)
    ctx.fillStyle = COULEURS.bleu
    rectArrondi(ctx, -lAffiche / 2 + 10, -hAffiche / 2 + 10, lAffiche, hAffiche, 12); ctx.fill()
    ctx.drawImage(affiche, -lAffiche / 2, -hAffiche / 2, lAffiche, hAffiche)
    ctx.lineWidth = 5; ctx.strokeStyle = COULEURS.encre
    rectArrondi(ctx, -lAffiche / 2, -hAffiche / 2, lAffiche, hAffiche, 12); ctx.stroke()
    ctx.restore()
  }
  return { y, h }
}

const DESSINS = { ouverture, nombre, transition, jeu, merci }

export async function dessinerCarrousel(plan) {
  await chargerPolices()
  const logo = await chargerImage(LOGO)
  const canvases = []
  for (const d of plan) {
    const { canvas, ctx } = nouveauCanvas(L, H)
    ctx.fillStyle = COULEURS.encre
    ctx.fillRect(0, 0, L, H)
    await DESSINS[d.type](ctx, d, logo)
    canvases.push(canvas)
  }
  return canvases
}
