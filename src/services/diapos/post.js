// src/services/diapos/post.js
import {
  COULEURS, chargerImage, chargerPolices, nouveauCanvas, recouvrir, dessinerFlou, degradeBas, voile,
  police, couperLignes, pastille, texteContoure, rectArrondi,
} from './dessin.js'
import { espacer, largeur, baseLigne, carte, limiterLignes } from './annonce.js'

/**
 * Image d'un post de l'onglet « Posts » (1080 × 1350), d'après les maquettes validées par Victor le
 * 28/10/2026 (« Maquette bilan soirée jeux/post-simple-maquette »). Plan : post-regles.js.
 * A « photo-carte » : photo plein cadre, carte crème en bas. B « photo-encadree » : fond flouté,
 * titre deux tons, photo dans un cadre blanc. C « message » : fond bois, gros titre contouré.
 */
const L = 1080
const H = 1350
const TITRE = 'Bricolage Grotesque'
const SITE = 'ludothequedecoligny.fr'

// Plus grande taille (de max à min, pas de 2) où le texte tient en nbLignes de `large` px ; puis « … »
function ajuster(ctx, texte, { max, min, nbLignes, large, poids = 800, famille = TITRE, serre = true }) {
  let t = max
  let lignes = []
  for (; ; t -= 2) {
    police(ctx, poids, t, famille)
    espacer(ctx, serre ? -0.04 * t : 0)
    lignes = String(texte).split('\n').flatMap(p => couperLignes(ctx, p, large))
    if ((lignes.length <= nbLignes && lignes.every(l => largeur(ctx, l) <= large)) || t - 2 < min) break
  }
  return { lignes: limiterLignes(ctx, lignes, nbLignes, large), taille: t }
}

function adresse(ctx) {
  ctx.textAlign = 'center'
  police(ctx, 700, 30)
  espacer(ctx, 0)
  ctx.fillStyle = COULEURS.creme
  ctx.fillText(SITE, L / 2, H - 60)
  ctx.textAlign = 'left'
}

function photoCarte(ctx, p, logo, photo) {
  if (photo) recouvrir(ctx, photo, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  degradeBas(ctx, L, H, 0.25)
  pastille(ctx, logo, 56, 56)
  const W = 940
  const M = 52
  const titre = ajuster(ctx, p.titre, { max: 76, min: 52, nbLignes: 2, large: W - 2 * M })
  const corps = p.texte ? ajuster(ctx, p.texte, { max: 34, min: 28, nbLignes: 4, large: W - 2 * M, poids: 500, famille: 'Poppins', serre: false }) : { lignes: [], taille: 34 }
  const hT = titre.taille * 1.03
  const hC = corps.taille * 1.42
  const h = 44 + (p.surTitre ? 54 : 0) + titre.lignes.length * hT + (corps.lignes.length ? 18 + corps.lignes.length * hC : 0) + 44
  ctx.save()
  ctx.translate(L / 2, H - 90 - h / 2)
  ctx.rotate((-1.5 * Math.PI) / 180)
  const x = -W / 2
  let y = -h / 2
  carte(ctx, x, y, W, h, { rayon: 34, bord: 6, decal: 16, ombre: COULEURS.orange })
  y += 44
  if (p.surTitre) {
    police(ctx, 800, 24)
    espacer(ctx, 4)
    ctx.fillStyle = COULEURS.orange
    ctx.fillText(p.surTitre.toUpperCase(), x + M, y + 24)
    y += 54
  }
  police(ctx, 800, titre.taille, TITRE)
  espacer(ctx, -0.04 * titre.taille)
  ctx.fillStyle = COULEURS.encre
  titre.lignes.forEach(l => { ctx.fillText(l, x + M, baseLigne(ctx, y, hT)); y += hT })
  if (corps.lignes.length) {
    y += 18
    police(ctx, 500, corps.taille)
    espacer(ctx, 0)
    ctx.fillStyle = '#334155'
    corps.lignes.forEach(l => { ctx.fillText(l, x + M, baseLigne(ctx, y, hC)); y += hC })
  }
  ctx.restore()
  espacer(ctx, 0)
}

function photoEncadree(ctx, p, logo, photo) {
  if (photo) dessinerFlou(ctx, photo, L, H)
  voile(ctx, L, H, photo ? 'rgba(26,95,122,0.62)' : COULEURS.bleu)
  pastille(ctx, logo, 56, 56)
  ctx.textAlign = 'center'
  let y = 230
  if (p.intro) {
    police(ctx, 600, 46)
    espacer(ctx, 0)
    ctx.fillStyle = COULEURS.creme
    ctx.fillText(p.intro, L / 2, y)
  }
  ctx.textAlign = 'left'
  // Titre deux tons : sur une ligne si possible (100 → 64 px), sinon blanc puis orange sur deux lignes
  const a = p.titreBlanc ? `${p.titreBlanc} ` : ''
  const b = p.titreOrange
  let t = 100
  for (; t > 64; t -= 2) {
    police(ctx, 800, t, TITRE); espacer(ctx, -0.04 * t)
    if (largeur(ctx, a + b) <= 960) break
  }
  police(ctx, 800, t, TITRE); espacer(ctx, -0.04 * t)
  const uneLigne = largeur(ctx, a + b) <= 960
  const ecrire = (texte, couleur, cx, cy) => { ctx.fillStyle = couleur; ctx.fillText(texte, cx, cy) }
  let basTitre
  if (uneLigne) {
    const x0 = L / 2 - largeur(ctx, a + b) / 2
    ecrire(a, COULEURS.creme, x0, 340)
    ecrire(b, COULEURS.orange, x0 + largeur(ctx, a), 340)
    basTitre = 340
  } else {
    ecrire(a.trim(), COULEURS.creme, L / 2 - largeur(ctx, a.trim()) / 2, 320)
    ecrire(b, COULEURS.orange, L / 2 - largeur(ctx, b) / 2, 320 + t)
    basTitre = 320 + t
  }
  espacer(ctx, 0)
  // Photo dans un cadre blanc penché, légende dans le bas du cadre
  const pw = 760
  const ph = Math.min(620, H - 150 - (basTitre + 70) - 90)
  const cy = basTitre + 70 + (ph + 90) / 2
  ctx.save()
  ctx.translate(L / 2, cy)
  ctx.rotate((2 * Math.PI) / 180)
  const fx = -pw / 2
  const fy = -(ph + 90) / 2
  ctx.fillStyle = COULEURS.encre; rectArrondi(ctx, fx + 18, fy + 18, pw, ph + 90, 10); ctx.fill()
  ctx.fillStyle = '#ffffff'; rectArrondi(ctx, fx, fy, pw, ph + 90, 10); ctx.fill()
  ctx.lineWidth = 5; ctx.strokeStyle = COULEURS.encre; ctx.stroke()
  if (photo) {
    ctx.save()
    rectArrondi(ctx, fx + 28, fy + 28, pw - 56, ph - 40, 4); ctx.clip()
    recouvrir(ctx, photo, fx + 28, fy + 28, pw - 56, ph - 40)
    ctx.restore()
  }
  if (p.legende) {
    ctx.textAlign = 'center'
    police(ctx, 700, 34)
    let tl = 34
    while (tl > 24 && largeur(ctx, p.legende) > pw - 60) { tl -= 2; police(ctx, 700, tl) }
    ctx.fillStyle = COULEURS.encre
    ctx.fillText(p.legende, 0, fy + ph + 40)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  adresse(ctx)
}

function message(ctx, p, logo, bois) {
  if (bois) recouvrir(ctx, bois, 0, 0, L, H)
  else voile(ctx, L, H, COULEURS.bleu)
  pastille(ctx, logo, 56, 56)
  const titre = ajuster(ctx, p.titre, { max: 150, min: 90, nbLignes: 2, large: 900 })
  const hT = titre.taille * 1.07
  const phrases = p.phrases ? ajuster(ctx, p.phrases, { max: 44, min: 32, nbLignes: 3, large: 960, poids: 600, famille: 'Poppins', serre: false }) : { lignes: [], taille: 44 }
  const hP = phrases.taille * 1.4
  const hBoutons = p.boutons.length ? 76 + 70 : 0
  const total = titre.lignes.length * hT + (phrases.lignes.length ? 60 + phrases.lignes.length * hP : 0) + hBoutons
  let y = Math.max(220, (H - total) / 2)
  titre.lignes.forEach(l => {
    police(ctx, 800, titre.taille, TITRE); espacer(ctx, -0.04 * titre.taille)
    const w = largeur(ctx, l)
    texteContoure(ctx, l, L / 2 - w / 2, y + titre.taille * 0.85, { taille: titre.taille })
    y += hT
  })
  espacer(ctx, 0)
  ctx.textAlign = 'center'
  if (phrases.lignes.length) {
    y += 60
    police(ctx, 600, phrases.taille)
    ctx.fillStyle = COULEURS.creme
    phrases.lignes.forEach(l => { ctx.fillText(l, L / 2, baseLigne(ctx, y, hP)); y += hP })
  }
  if (p.boutons.length) {
    y += 70
    police(ctx, 700, 30)
    const ws = p.boutons.map(t => largeur(ctx, t) + 64)
    let bx = L / 2 - (ws.reduce((s, w) => s + w, 0) + 30 * (ws.length - 1)) / 2
    p.boutons.forEach((t, i) => {
      ctx.fillStyle = COULEURS.encre; rectArrondi(ctx, bx + 6, y + 6, ws[i], 76, 38); ctx.fill()
      ctx.fillStyle = COULEURS.creme; rectArrondi(ctx, bx, y, ws[i], 76, 38); ctx.fill()
      ctx.lineWidth = 4; ctx.strokeStyle = COULEURS.encre; ctx.stroke()
      ctx.fillStyle = COULEURS.encre; ctx.textBaseline = 'middle'
      ctx.fillText(t, bx + ws[i] / 2, y + 39)
      ctx.textBaseline = 'alphabetic'
      bx += ws[i] + 30
    })
  }
  ctx.textAlign = 'left'
  adresse(ctx)
}

/** Dessine le post ; renvoie le canvas 1080 × 1350 (à libérer par l'appelant). */
export async function dessinerPost(plan, { photo = null } = {}) {
  await chargerPolices()
  const [logo, image, bois] = await Promise.all([
    chargerImage('/social/logo-feuille.png'),
    photo ? chargerImage(photo) : null,
    plan.modele === 'message' ? chargerImage('/social/fond-bois.jpg') : null,
  ])
  const { canvas, ctx } = nouveauCanvas(L, H)
  if (plan.modele === 'photo-encadree') photoEncadree(ctx, plan, logo, image)
  else if (plan.modele === 'message') message(ctx, plan, logo, bois)
  else photoCarte(ctx, plan, logo, image)
  return canvas
}
