/**
 * Primitives d'étiquettes (dessin.js) → SVG, pour l'aperçu à l'écran.
 * Mêmes primitives que le PDF : l'aperçu est l'image exacte de ce qui est imprimé.
 */
const POLICES = {
  titre: `font-family="'Bricolage Grotesque', system-ui, sans-serif" font-weight="800"`,
  texte: `font-family="Poppins, system-ui, sans-serif" font-weight="600"`,
  chiffres: `font-family="'Courier New', Courier, monospace" font-weight="400"`,
}
const IMAGES = { feuille: '/logo-feuille.svg' }
const n = v => Math.round(v * 1000) / 1000
const echapper = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function element(p) {
  if (p.t === 'rect') {
    return `<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.l)}" height="${n(p.h)}"${p.rayon ? ` rx="${n(p.rayon)}"` : ''}`
      + ` fill="${p.fond || 'none'}"${p.trait ? ` stroke="${p.trait}" stroke-width="${p.ep}"` : ''}/>`
  }
  if (p.t === 'ligne') return `<line x1="${n(p.x1)}" y1="${n(p.y1)}" x2="${n(p.x2)}" y2="${n(p.y2)}" stroke="${p.trait}" stroke-width="${p.ep}"/>`
  if (p.t === 'cercle') return `<circle cx="${n(p.cx)}" cy="${n(p.cy)}" r="${n(p.r)}" fill="${p.fond || 'none'}"${p.trait ? ` stroke="${p.trait}" stroke-width="${p.ep}"` : ''}/>`
  if (p.t === 'image') return `<image href="${IMAGES[p.src]}" x="${n(p.x)}" y="${n(p.y)}" width="${n(p.l)}" height="${n(p.h)}"/>`
  const rot = p.rotation ? ` transform="rotate(${p.rotation} ${n(p.x)} ${n(p.y)})"` : ''
  const morceaux = p.morceaux.map(m => `<tspan fill="${m.couleur}">${echapper(m.texte)}</tspan>`).join('')
  return `<text x="${n(p.x)}" y="${n(p.y)}" font-size="${n(p.taille)}" text-anchor="${p.ancre}" ${POLICES[p.police]} xml:space="preserve"${rot}>${morceaux}</text>`
}

export function versSvg(primitives, largeur, hauteur) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}">${primitives.map(element).join('')}</svg>`
}
