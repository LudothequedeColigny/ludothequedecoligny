/**
 * Outils de dessin communs aux diapositives (carrousel et story), charte
 * « papier découpé » du site. Tout est dessiné sur <canvas> pour être exporté
 * en JPEG. Pas de ctx.filter : il ne fonctionne pas sur Safari.
 */

export const COULEURS = { bleu: '#1a5f7a', orange: '#e38154', encre: '#0f172a', creme: '#fdfaf6' }

const cache = new Map()
/** Oublie les images chargées (à la fermeture de la fenêtre Bilan : mémoire des téléphones). */
export function viderCache() {
  cache.clear()
}

/** Oublie une image chargée (page publique : une jaquette déjà transformée en autocollant). */
export function oublierImage(url) {
  cache.delete(url)
}

export function chargerImage(url) {
  if (!url) return Promise.resolve(null)
  if (!cache.has(url)) {
    cache.set(url, new Promise(resolve => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => { cache.delete(url); resolve(null) }
      img.src = url
    }))
  }
  return cache.get(url)
}

export async function chargerPolices() {
  await Promise.all([
    document.fonts.load('800 100px "Bricolage Grotesque"'),
    ...[500, 600, 700, 800].map(p => document.fonts.load(`${p} 30px "Poppins"`)),
  ]).catch(() => {})
}

/** Libère la mémoire d'un canvas pleine taille (indispensable sur téléphone). */
export function liberer(canvas) {
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
}

export function nouveauCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return { canvas, ctx: canvas.getContext('2d') }
}

export function recouvrir(ctx, img, x, y, w, h) {
  const r = Math.max(w / img.width, h / img.height)
  const sw = w / r
  const sh = h / r
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

/**
 * Flou fort par réductions successives puis agrandissement lissé.
 * Le canvas rendu est pleine taille : l'appelant le libère après l'avoir dessiné.
 */
export function flou(img, w, h) {
  const { canvas: petit, ctx: p } = nouveauCanvas(Math.max(8, Math.round(w / 24)), Math.max(8, Math.round(h / 24)))
  p.imageSmoothingQuality = 'high'
  recouvrir(p, img, 0, 0, petit.width, petit.height)
  const { canvas: moyen, ctx: m } = nouveauCanvas(petit.width * 4, petit.height * 4)
  m.imageSmoothingQuality = 'high'
  m.drawImage(petit, 0, 0, moyen.width, moyen.height)
  const { canvas, ctx } = nouveauCanvas(w, h)
  ctx.imageSmoothingQuality = 'high'
  // Léger débord pour éviter les bords plus clairs
  ctx.drawImage(moyen, -w * 0.06, -h * 0.06, w * 1.12, h * 1.12)
  liberer(petit)
  liberer(moyen)
  return canvas
}

/** Dessine la photo floutée en plein cadre puis libère le canvas intermédiaire. */
export function dessinerFlou(ctx, img, w, h) {
  const f = flou(img, w, h)
  ctx.drawImage(f, 0, 0)
  liberer(f)
}

/**
 * Flou doux en plein cadre (w × h) : `source` (canvas ou image) est d'abord réduite par
 * moitiés successives (jusqu'à 40 px de large), puis floutée par `dessinerFlou`.
 * Réduite d'un coup (÷ 24), elle donnerait des pavés crénelés au lieu d'un flou doux.
 * Les canvas intermédiaires sont libérés ; `source` reste à la charge de l'appelant.
 */
export function flouDoux(ctx, source, w, h) {
  let petit = source
  try {
    while (petit.width > 40) {
      const { canvas: moitie, ctx: c } = nouveauCanvas(Math.round(petit.width / 2), Math.round(petit.height / 2))
      c.imageSmoothingQuality = 'high'
      c.drawImage(petit, 0, 0, moitie.width, moitie.height)
      if (petit !== source) liberer(petit)
      petit = moitie
    }
    dessinerFlou(ctx, petit, w, h)
  } finally {
    // Même en cas d'erreur, rien ne reste en mémoire
    if (petit !== source) liberer(petit)
  }
}

export function degradeBas(ctx, w, h, debut = 0.38) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, 'rgba(15,23,42,0)')
  g.addColorStop(debut, 'rgba(15,23,42,0)')
  g.addColorStop(Math.min(0.95, debut + 0.24), 'rgba(15,23,42,0.55)')
  g.addColorStop(1, 'rgba(15,23,42,0.92)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function voile(ctx, w, h, couleur) {
  ctx.fillStyle = couleur
  ctx.fillRect(0, 0, w, h)
}

export function rectArrondi(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

export function police(ctx, poids, taille, famille = 'Poppins') {
  ctx.font = `${poids} ${taille}px "${famille}", sans-serif`
}

/** Découpe un texte en lignes qui tiennent dans largeurMax (police déjà réglée). */
export function couperLignes(ctx, texte, largeurMax) {
  const mots = String(texte).split(/\s+/).filter(Boolean)
  const lignes = []
  let ligne = ''
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (ligne && ctx.measureText(essai).width > largeurMax) {
      lignes.push(ligne)
      ligne = mot
    } else ligne = essai
  }
  if (ligne) lignes.push(ligne)
  return lignes
}

const espacement = (ctx, valeur) => { if ('letterSpacing' in ctx) ctx.letterSpacing = valeur }

/** Étiquette orange contourée, ombre pleine décalée, légèrement penchée. */
export function etiquette(ctx, lignes, { x, y, taille, angle = -3, fond = COULEURS.orange }) {
  police(ctx, 800, taille, 'Bricolage Grotesque')
  espacement(ctx, `${-0.04 * taille}px`)
  const hautLigne = taille * 0.95
  const largeur = Math.max(...lignes.map(l => ctx.measureText(l).width)) + 68
  const hauteur = lignes.length * hautLigne + 26
  ctx.save()
  ctx.translate(x, y + hauteur / 2)
  ctx.rotate((angle * Math.PI) / 180)
  ctx.translate(0, -hauteur / 2)
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, 14, 14, largeur, hauteur, 26); ctx.fill()
  ctx.fillStyle = fond
  rectArrondi(ctx, 0, 0, largeur, hauteur, 26); ctx.fill()
  ctx.lineWidth = 6; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, 0, 0, largeur, hauteur, 26); ctx.stroke()
  ctx.fillStyle = COULEURS.encre
  ctx.textBaseline = 'alphabetic'
  lignes.forEach((l, i) => ctx.fillText(l, 34, 6 + (i + 1) * hautLigne - taille * 0.18))
  ctx.restore()
  espacement(ctx, '0px')
  return { hauteur, largeur }
}

/** Pastille « LUDOTHÈQUE DE COLIGNY » avec la feuille. */
export function pastille(ctx, logo, x, y) {
  police(ctx, 800, 24)
  espacement(ctx, '3.4px')
  const texte = 'LUDOTHÈQUE DE COLIGNY'
  const largeur = 14 + 46 + 14 + ctx.measureText(texte).width + 26
  const hauteur = 78
  ctx.fillStyle = COULEURS.encre
  rectArrondi(ctx, x + 7, y + 7, largeur, hauteur, 39); ctx.fill()
  ctx.fillStyle = COULEURS.creme
  rectArrondi(ctx, x, y, largeur, hauteur, 39); ctx.fill()
  ctx.lineWidth = 4; ctx.strokeStyle = COULEURS.encre
  rectArrondi(ctx, x, y, largeur, hauteur, 39); ctx.stroke()
  if (logo) ctx.drawImage(logo, x + 14, y + 16, 46, 46)
  ctx.fillStyle = COULEURS.encre
  ctx.textBaseline = 'middle'
  ctx.fillText(texte, x + 74, y + hauteur / 2 + 1)
  ctx.textBaseline = 'alphabetic'
  espacement(ctx, '0px')
}

/** Gros texte crème, contour encre et ombre pleine orange (« 26 », « Merci ! »). */
export function texteContoure(ctx, texte, x, y, { taille, contour = 10, ombre = 22, couleurOmbre = COULEURS.orange }) {
  ctx.save()
  police(ctx, 800, taille, 'Bricolage Grotesque')
  espacement(ctx, `${-0.04 * taille}px`)
  ctx.lineJoin = 'round'
  ctx.fillStyle = couleurOmbre
  ctx.fillText(texte, x + ombre, y + ombre)
  ctx.lineWidth = contour * 2
  ctx.strokeStyle = COULEURS.encre
  ctx.strokeText(texte, x, y)
  ctx.fillStyle = COULEURS.creme
  ctx.fillText(texte, x, y)
  ctx.restore()
}

/** Ombre pleine encre qui suit la forme d'une image détourée, puis l'image. */
export function ombrePleine(ctx, img, x, y, w, h, decalage) {
  const { canvas: o, ctx: c } = nouveauCanvas(Math.ceil(w), Math.ceil(h))
  c.drawImage(img, 0, 0, w, h)
  c.globalCompositeOperation = 'source-in'
  c.fillStyle = COULEURS.encre
  c.fillRect(0, 0, w, h)
  ctx.drawImage(o, x + decalage, y + decalage)
  liberer(o)
  ctx.drawImage(img, x, y, w, h)
}

export function versBlob(canvas) {
  return new Promise(resolve => {
    try { canvas.toBlob(b => resolve(b), 'image/jpeg', 0.9) } catch { resolve(null) }
  })
}
