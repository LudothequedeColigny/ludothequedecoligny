import {
  COULEURS, chargerImage, recouvrir, dessinerFlou, degradeBas, voile, police, pastille,
} from './dessin.js'
import { espacer, largeur, baseLigne, carte, limiterLignes } from './annonce.js'

/**
 * Image « expression libre » des bilans (phrase saisie dans la fenêtre Bilan), d'après la
 * maquette validée par Victor le 26/10/2026 (« Maquette bilan soirée jeux/expression-libre-maquette »).
 * Partagée par le carrousel (carrousel.js), la story (story.js) et le bilan de permanence
 * (permanence.js). d = { texte, photo, fond } (soirée) ou { texte, photo, mosaique } (permanence).
 */
const L = 1080
const TITRE = 'Bricolage Grotesque'
const L_CARTE = 940
const MARGE = 52 // marge intérieure gauche / droite du texte dans la carte
const PADDING = 44 // marge intérieure haut / bas
const L_TEXTE = L_CARTE - 2 * MARGE
const NB_LIGNES = 3
const T_MAX = 96
const T_MIN = 60
// Story : Instagram recouvre ~250 px en haut et ~340 px en bas (rien dans ces zones)
const HAUT_STORY = 270 // même place que la pastille des autres images de la story
const BAS_STORY = 1580

/**
 * Coupe le texte en lignes de `max` px (police réglée). « ! », « ? », « : », « ; », « » »
 * restent collés au mot qui les précède, « « » au mot qui le suit : jamais seuls en bout de ligne.
 */
function couper(ctx, texte, max) {
  const mots = []
  for (const m of String(texte).split(/\s+/).filter(Boolean)) {
    const precedent = mots[mots.length - 1]
    if (precedent && (/^[!?:;»]+$/.test(m) || precedent === '«')) mots[mots.length - 1] = `${precedent}\u00A0${m}`
    else mots.push(m)
  }
  const lignes = []
  let ligne = ''
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (ligne && largeur(ctx, essai) > max) {
      lignes.push(ligne)
      ligne = mot
    } else ligne = essai
  }
  if (ligne) lignes.push(ligne)
  return lignes
}

/** Raccourcit une ligne trop large (mot très long) en finissant par « … ». */
function tronquer(ctx, ligne, max) {
  if (largeur(ctx, ligne) <= max) return ligne
  let t = ligne
  while (t.length > 1 && largeur(ctx, `${t}…`) > max) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Taille la plus grande (96 → 60 px) où le texte tient sur 3 lignes ; au-delà, « … ». Police réglée. */
function ajuster(ctx, texte) {
  let taille = T_MAX
  let lignes = []
  for (; ; taille -= 4) {
    police(ctx, 800, taille, TITRE)
    espacer(ctx, -0.04 * taille)
    lignes = couper(ctx, texte, L_TEXTE)
    const tient = lignes.length <= NB_LIGNES && lignes.every(l => largeur(ctx, l) <= L_TEXTE)
    if (tient || taille - 4 < T_MIN) break
  }
  lignes = limiterLignes(ctx, lignes, NB_LIGNES, L_TEXTE).map(l => tronquer(ctx, l, L_TEXTE))
  return { lignes, taille }
}

/**
 * Dessine l'image sur `ctx` (1080 × `hauteur`).
 * - Photo choisie (et chargée) : plein cadre + dégradé, carte en bas (story : au-dessus de la
 *   zone d'Instagram du bas).
 * - Sinon fond flouté, carte au centre : `fondFloute(ctx)` s'il est fourni (permanence :
 *   mosaïque des jaquettes), sinon la photo `d.fond` floutée sous un voile bleu.
 */
export async function dessinerLibre(ctx, d, logo, { hauteur, story = false, fondFloute = null }) {
  const H = hauteur
  const photo = d.photo ? await chargerImage(d.photo) : null
  if (photo) {
    recouvrir(ctx, photo, 0, 0, L, H)
    degradeBas(ctx, L, H, 0.3)
  } else if (fondFloute) {
    await fondFloute(ctx)
  } else {
    const fond = await chargerImage(d.fond)
    if (fond) dessinerFlou(ctx, fond, L, H)
    else voile(ctx, L, H, COULEURS.bleu)
    voile(ctx, L, H, 'rgba(26,95,122,0.62)')
  }
  if (story) pastille(ctx, logo, 70, HAUT_STORY)
  else pastille(ctx, logo, 56, 56)

  // Carte crème penchée de −1,5°, ombre pleine orange, texte centré
  const { lignes, taille } = ajuster(ctx, d.texte)
  const hLigne = taille
  const hCarte = lignes.length * hLigne + 2 * PADDING
  let cy = H / 2
  if (photo) cy = (story ? BAS_STORY - 60 : H - 90) - hCarte / 2
  ctx.save()
  ctx.translate(L / 2, cy)
  ctx.rotate((-1.5 * Math.PI) / 180)
  const x = -L_CARTE / 2
  const y = -hCarte / 2
  carte(ctx, x, y, L_CARTE, hCarte, { rayon: 34, bord: 6, decal: 16, ombre: COULEURS.orange })
  ctx.fillStyle = COULEURS.encre
  ctx.textAlign = 'center'
  police(ctx, 800, taille, TITRE)
  espacer(ctx, -0.04 * taille)
  lignes.forEach((l, i) => ctx.fillText(l, 0, baseLigne(ctx, y + PADDING + i * hLigne, hLigne)))
  ctx.restore()
  espacer(ctx, 0)
  ctx.textAlign = 'left'
}
