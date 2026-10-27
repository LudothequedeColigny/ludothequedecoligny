/**
 * Dessin d'une étiquette code-barres et d'une planche A4, sous forme de primitives
 * (mm) lues à l'identique par l'aperçu (rendu-svg.js) et par le PDF (pdf.js) :
 * l'aperçu est l'image exacte de ce qui est imprimé. Maquette validée par Victor
 * le 27/10/2026 (style « bandeau de couleur », papier découpé du site).
 */
import { motifEan13 } from './ean13.js'
import { HAUTEUR, BANDE_NOM, MARGE, PAGE, MODULE, CALME, miseEnPage, estMini, nomSousEtiquette } from './regles.js'

const ENCRE = '#0f172a', CANARD = '#1a5f7a', ORANGE = '#e38154', CREME = '#fdfaf6', BLANC = '#ffffff'
const OMBRE = 0.9, TRAIT = 0.45

const texte = (x, y, morceaux, taille, police, ancre = 'start', rotation = 0) =>
  ({ t: 'texte', x, y, morceaux: typeof morceaux === 'string' ? [{ texte: morceaux, couleur: ENCRE }] : morceaux, taille, police, ancre, rotation })

// Les barres du motif : modules noirs consécutifs réunis en une seule barre ({ debut, longueur } en modules)
function barresDuMotif(code) {
  const barres = []
  let debut = -1
  const motif = motifEan13(code)
  for (let i = 0; i <= motif.length; i++) {
    if (motif[i] === '1') { if (debut < 0) debut = i } else if (debut >= 0) { barres.push({ debut, longueur: i - debut }); debut = -1 }
  }
  return barres
}

// Code-barres : barres + chiffres, à plat (origine en haut à gauche, marges blanches comprises)
function codeBarres(code, x, y, barres) {
  const q = CALME * MODULE
  const p = barresDuMotif(code).map(b => ({ t: 'rect', x: x + q + b.debut * MODULE, y, l: b.longueur * MODULE, h: barres, fond: ENCRE }))
  const yc = y + barres + 2.2
  p.push(texte(x + q * 0.45, yc, code[0], 2.2, 'chiffres', 'middle'))
  p.push(texte(x + q + 24 * MODULE, yc, code.slice(1, 7), 2.2, 'chiffres', 'middle'))
  p.push(texte(x + q + 71 * MODULE, yc, code.slice(7), 2.2, 'chiffres', 'middle'))
  return p
}
const longueurCode = () => 2 * CALME * MODULE + 95 * MODULE
const hauteurCode = barres => barres + 2.5

// Même code-barres tourné d'un quart de tour (sens horaire) : il se lit de haut en bas
function codeBarresTourne(code, x, y, barres) {
  const q = CALME * MODULE, h = hauteurCode(barres)
  // à plat, un point (u, v) devient (x + h − v, y + u) une fois tourné
  const p = barresDuMotif(code).map(b => ({ t: 'rect', x: x + h - barres, y: y + q + b.debut * MODULE, l: barres, h: b.longueur * MODULE, fond: ENCRE }))
  const xc = x + h - barres - 2.2
  const chiffres = (u, s) => texte(xc, y + u, s, 2.2, 'chiffres', 'middle', 90)
  p.push(chiffres(q * 0.45, code[0]), chiffres(q + 24 * MODULE, code.slice(1, 7)), chiffres(q + 71 * MODULE, code.slice(7)))
  return p
}

const fenetre = (x, y, l, h) => ({ t: 'rect', x, y, l, h, fond: BLANC, trait: ENCRE, ep: 0.3, rayon: 1.1 })

export function dessinerEtiquette(e, ox = 0, oy = 0) {
  const W = e.largeur, H = HAUTEUR, cw = W - OMBRE, ch = H - OMBRE
  const forme = miseEnPage(W), mini = estMini(W)
  const hh = forme === 'etroite' ? 10 : 11
  const p = [
    { t: 'rect', x: 0, y: 0, l: W, h: H, fond: BLANC },
    // ombre pleine décalée, à l'intérieur du rectangle de coupe
    { t: 'rect', x: OMBRE, y: OMBRE, l: W - OMBRE, h: H - OMBRE, fond: ENCRE },
    { t: 'rect', x: 0, y: 0, l: cw, h: ch, fond: CREME },
    { t: 'rect', x: 0, y: 0, l: cw, h: hh, fond: e.couleur },
    { t: 'ligne', x1: 0, y1: hh, x2: cw, y2: hh, trait: ENCRE, ep: 0.35 },
    { t: 'rect', x: TRAIT / 2, y: TRAIT / 2, l: cw - TRAIT / 2, h: ch - TRAIT / 2, trait: ENCRE, ep: TRAIT },
    // contour de coupe
    { t: 'rect', x: 0.1, y: 0.1, l: W - 0.2, h: H - 0.2, trait: ENCRE, ep: 0.2 },
  ]
  // médaillon de la feuille
  const r = mini ? 2.8 : forme === 'etroite' ? 3.3 : 4.1, cy = hh / 2 + 0.2, cx = 1.7 + r
  p.push({ t: 'cercle', cx: cx + 0.5, cy: cy + 0.5, r, fond: ENCRE })
  p.push({ t: 'cercle', cx, cy, r, fond: BLANC, trait: ENCRE, ep: 0.35 })
  p.push({ t: 'image', x: cx - r * 0.775, y: cy - r * 0.775, l: r * 1.55, h: r * 1.55, src: 'feuille' })
  // titre en deux lignes, juste à droite du médaillon (taille réduite si la place manque)
  const tx = cx + r + 1.5, tt = Math.min(2.9, (cw - tx - 1.2) / (10 * 0.64))
  p.push(texte(tx, cy - tt * 0.15, 'Ludothèque', tt, 'titre'))
  p.push(texte(tx, cy + tt * 1.05, [{ texte: 'de Coligny', couleur: CANARD }], tt, 'titre'))
  // rangée du numéro sous la fenêtre : pastille orange centrée, à l'horizontale
  const tn = mini ? 2.3 : forme === 'etroite' ? 2.6 : 3, rangee = 1.55 * tn + 2.2
  const etroite = forme === 'etroite'
  const fy = hh + (etroite ? 0.9 : 1.1), fh = ch - fy - rangee - (etroite ? 0.4 : 0.6)
  if (!etroite) {
    const fx = 1.7, fl = cw - 2.9, barres = Math.min(10, fh - 4)
    p.push(fenetre(fx, fy, fl, fh))
    p.push(...codeBarres(e.code, fx + (fl - longueurCode()) / 2, fy + (fh - hauteurCode(barres)) / 2, barres))
  } else {
    const barres = mini ? 8 : 9, fl = hauteurCode(barres) + 2, fx = (cw - fl) / 2
    p.push(fenetre(fx, fy, fl, fh))
    p.push(...codeBarresTourne(e.code, fx + 1, fy + (fh - longueurCode()) / 2, barres))
  }
  const pl = e.numero.length * 0.56 * tn + 0.9 * tn, ph = 1.55 * tn, px = (cw - pl) / 2, py = fy + fh + rangee / 2 + 0.2 - ph / 2
  p.push({ t: 'rect', x: px + 0.45, y: py + 0.45, l: pl, h: ph, fond: ENCRE, rayon: ph / 2 })
  p.push({ t: 'rect', x: px, y: py, l: pl, h: ph, fond: ORANGE, trait: ENCRE, ep: 0.3, rayon: ph / 2 })
  p.push(texte(cw / 2, py + ph / 2 + tn * 0.35, e.numero, tn, 'titre', 'middle'))
  return p.map(x => decaler(x, ox, oy))
}

function decaler(x, dx, dy) {
  if (x.t === 'ligne') return { ...x, x1: x.x1 + dx, y1: x.y1 + dy, x2: x.x2 + dx, y2: x.y2 + dy }
  if (x.t === 'cercle') return { ...x, cx: x.cx + dx, cy: x.cy + dy }
  return { ...x, x: x.x + dx, y: x.y + dy }
}

const REP = 3.5
export function dessinerPage(page, numero, total) {
  const p = [], reperes = []
  const repere = (x1, y1, x2, y2) => reperes.push({ t: 'ligne', x1, y1, x2, y2, trait: ENCRE, ep: 0.2 })
  page.rangees.forEach((rangee, iRangee) => {
    const y = rangee.y, fin = rangee.items.at(-1).x + rangee.items.at(-1).largeur
    // repères horizontaux dans les marges gauche et droite de la page, en haut et en bas de la rangée
    for (const yy of [y, y + HAUTEUR]) { repere(MARGE - 1 - REP, yy, MARGE - 1, yy); repere(PAGE.l - MARGE + 1, yy, PAGE.l - MARGE + 1 + REP, yy) }
    // repères verticaux à chaque bord d'étiquette, sous la rangée (et au-dessus de la première)
    for (const xx of [...rangee.items.map(e => e.x), fin]) {
      if (iRangee === 0) repere(xx, y - 0.8, xx, y - 0.8 - REP)
      repere(xx, y + HAUTEUR + 0.5, xx, y + HAUTEUR + 1.7)
    }
    for (const e of rangee.items) {
      p.push(...dessinerEtiquette(e, e.x, y))
      const n = nomSousEtiquette(e.nom, e.largeur)
      p.push({ ...texte(e.x + e.largeur / 2, y + HAUTEUR + BANDE_NOM - 1.2, [{ texte: n.texte, couleur: '#334155' }], n.taille, 'texte', 'middle') })
    }
  })
  // pied : numéro de page et réglette de 10 cm (vérifie que l'impression n'a pas été réduite)
  const yp = PAGE.h - MARGE + 2
  p.push(texte(MARGE, yp, [{ texte: `Ludothèque de Coligny — étiquettes code-barres — page ${numero} / ${total}`, couleur: '#64748b' }], 2.4, 'texte'))
  const xr = PAGE.l - MARGE - 100
  p.push({ t: 'ligne', x1: xr, y1: yp - 3, x2: xr + 100, y2: yp - 3, trait: ENCRE, ep: 0.25 })
  for (const xx of [xr, xr + 100]) p.push({ t: 'ligne', x1: xx, y1: yp - 4.2, x2: xx, y2: yp - 1.8, trait: ENCRE, ep: 0.25 })
  p.push(texte(xr + 50, yp, [{ texte: 'doit mesurer 10 cm', couleur: '#64748b' }], 2.4, 'texte', 'middle'))
  return [{ t: 'rect', x: 0, y: 0, l: PAGE.l, h: PAGE.h, fond: BLANC }, ...reperes, ...p]
}
