import { COULEURS, chargerImage, nouveauCanvas, liberer } from './dessin.js'

/**
 * Effet « autocollant » des boîtes de jeu, validé par Victor le 23/10/2026 (nouveaux jeux)
 * et repris partout où une boîte apparaît dans les publications : boîte détourée de son
 * fond blanc, recadrée, liseré blanc, contour encre, ombre pleine décalée.
 * Sans ctx.filter (Safari) ; tous les canvas de travail sont libérés, même en cas d'erreur.
 */

// ---------- détourage ----------

// Blanc du fond d'une photo de boîte : clair et sans couleur
const SEUIL_BLANC = 228
const ECART_GRIS = 18
// Au-delà, c'est la boîte elle-même qui est blanche : on n'y touche pas
const PART_RETIREE_MAX = 0.85
// Côté maximal du calcul de détourage (mémoire des téléphones)
export const COTE_DETOURAGE = 900

/**
 * Retire le fond blanc d'une jaquette : seulement le blanc relié aux bords (remplissage
 * depuis les bords, le blanc de l'illustration reste), puis recadre sur la boîte.
 * Sécurité : si plus de 85 % de l'image serait retirée (boîte blanche sur fond blanc),
 * l'image est gardée telle quelle. Calcul sur 900 px de côté au plus.
 * Renvoie un canvas, à libérer par l'appelant.
 */
export function detourer(img, coteMax = COTE_DETOURAGE) {
  const e = Math.min(1, coteMax / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * e))
  const h = Math.max(1, Math.round(img.height * e))
  const { canvas, ctx } = nouveauCanvas(w, h)
  try {
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
    try {
      r.drawImage(canvas, x0, y0, lw, lh, 0, 0, lw, lh)
    } catch (err) {
      liberer(rogne)
      throw err
    }
    liberer(canvas)
    return rogne
  } catch (err) {
    // Rien ne reste en mémoire en cas d'échec
    liberer(canvas)
    throw err
  }
}

/** Jaquette chargée et détourée (canvas à libérer), ou null si absente ou illisible. */
export async function jaquetteDetouree(url) {
  const img = await chargerImage(url)
  return img ? detourer(img) : null
}

/**
 * Échelle maximale d'une image détourée qui équivaut à `echelleMax` sur l'image d'origine
 * (le détourage réduit les grandes images à 900 px de côté).
 */
export function echelleDetouree(img, echelleMax) {
  return echelleMax / Math.min(1, COTE_DETOURAGE / Math.max(img.width, img.height))
}

// ---------- autocollant ----------

/**
 * Silhouette pleine de l'image (taille w × h) élargie de `r` px, de couleur `couleur`.
 * Renvoie { canvas, m } : `m` = marge ajoutée de chaque côté. Canvas à libérer par l'appelant.
 */
export function silhouette(img, w, h, r, couleur) {
  const m = Math.ceil(r) + 2
  const { canvas: forme, ctx: f } = nouveauCanvas(Math.ceil(w), Math.ceil(h))
  let canvas = null
  try {
    f.drawImage(img, 0, 0, w, h)
    f.globalCompositeOperation = 'source-in'
    f.fillStyle = couleur
    f.fillRect(0, 0, w, h)
    const res = nouveauCanvas(Math.ceil(w) + 2 * m, Math.ceil(h) + 2 * m)
    canvas = res.canvas
    const ctx = res.ctx
    // La forme recopiée tout autour (36 directions, à r et r/2) : contour arrondi sans ctx.filter
    for (let a = 0; a < 360; a += 10) {
      const rad = (a * Math.PI) / 180
      for (const rr of [r, r * 0.5]) ctx.drawImage(forme, m + Math.cos(rad) * rr, m + Math.sin(rad) * rr)
    }
    ctx.drawImage(forme, m, m)
    return { canvas, m }
  } catch (err) {
    liberer(canvas)
    throw err
  } finally {
    liberer(forme)
  }
}

/** Même forme, autre couleur (l'ombre pleine reprend la silhouette du contour). Canvas à libérer. */
export function recolorer(canvas, couleur) {
  const { canvas: copie, ctx } = nouveauCanvas(canvas.width, canvas.height)
  try {
    ctx.drawImage(canvas, 0, 0)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = couleur
    ctx.fillRect(0, 0, copie.width, copie.height)
    return copie
  } catch (err) {
    liberer(copie)
    throw err
  }
}

/**
 * Boîte détourée façon autocollant, centrée en (cx, cy), taille w × h, penchée de `angle`
 * degrés : ombre pleine décalée, contour encre, liseré blanc, puis l'image.
 * Le tout déborde de la boîte de `lisere + bord` px (plus l'ombre, en bas à droite).
 */
export function autocollant(ctx, img, { cx, cy, w, h, angle = 0, lisere = 14, bord = 4, ombre = 16, couleurOmbre = COULEURS.orange }) {
  let contour = null
  let blanc = null
  let formeOmbre = null
  try {
    contour = silhouette(img, w, h, lisere + bord, COULEURS.encre)
    blanc = silhouette(img, w, h, lisere, '#ffffff')
    formeOmbre = recolorer(contour.canvas, couleurOmbre)
    ctx.save()
    try {
      ctx.translate(cx, cy)
      ctx.rotate((angle * Math.PI) / 180)
      ctx.drawImage(formeOmbre, -w / 2 - contour.m + ombre, -h / 2 - contour.m + ombre)
      ctx.drawImage(contour.canvas, -w / 2 - contour.m, -h / 2 - contour.m)
      ctx.drawImage(blanc.canvas, -w / 2 - blanc.m, -h / 2 - blanc.m)
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
    } finally {
      ctx.restore()
    }
  } finally {
    liberer(contour?.canvas)
    liberer(blanc?.canvas)
    liberer(formeOmbre)
  }
}

/** Taille qui fait tenir l'image dans w × h, proportions gardées. */
export function tenir(img, w, h) {
  const e = Math.min(w / img.width, h / img.height)
  return { w: img.width * e, h: img.height * e }
}
