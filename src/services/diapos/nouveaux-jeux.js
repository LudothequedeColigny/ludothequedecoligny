import {
  COULEURS, chargerImage, nouveauCanvas, recouvrir, flouDoux, voile, rectArrondi, police, couperLignes,
  etiquette, pastille, texteContoure, liberer,
} from './dessin.js'
import { espacer, largeur, baseLigne, limiterLignes, dessinerPlan } from './annonce.js'
import { fondMosaique, prochaine } from './permanence.js'
import { detourer, jaquetteDetouree, autocollant, tenir } from './autocollant.js'

/**
 * Carrousel « Nouveaux jeux » (images 1080 × 1350), d'après la maquette validée par Victor
 * le 23/10/2026 (« Maquette bilan soirée jeux/nouveaux-jeux-maquette »).
 * Règles et textes : nouveaux-jeux-regles.js. Même contrat que dessinerBilanPermanence.
 */
const L = 1080
const H = 1350
const TITRE = 'Bricolage Grotesque'

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
    // Chargées ensemble, détourées une à une au moment du dessin : un seul canvas de
    // détourage en mémoire, et rien ne reste si l'un d'eux échoue
    const originales = await Promise.all(d.jaquettes.map(u => chargerImage(u)))
    for (const i of ordre) {
      if (!originales[i]) continue
      const img = detourer(originales[i])
      try {
        const dx = (i - (n - 1) / 2) * pas
        const t = tenir(img, lMax, hMax)
        autocollant(ctx, img, {
          cx: L / 2 + dx, cy: 570 + Math.abs(dx) * 0.14, w: t.w, h: t.h, angle: ANGLES[n][i],
          lisere: 10, bord: 4, ombre: 12, couleurOmbre: i % 2 ? COULEURS.orange : COULEURS.bleu,
        })
      } finally {
        liberer(img)
      }
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
