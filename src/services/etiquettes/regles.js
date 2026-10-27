/**
 * Règles des étiquettes code-barres (largeur selon l'épaisseur de la boîte, mise en
 * page, numéro sur 4 chiffres, jeux qui ne peuvent pas encore en avoir) et des
 * planches A4 (rangées accolées, bande des noms, pages). Testé par `npm test`.
 * Mesures en millimètres.
 */
import { codeEan13 } from './ean13.js'

export const HAUTEUR = 36
export const BANDE_NOM = 5
export const MARGE = 10
export const PAGE = { l: 210, h: 297 }
export const MODULE = 0.21
export const CALME = 8
// Place gardée en pied de page (numéro de page, réglette de 10 cm)
const PIED = 6

export const largeurEtiquette = epaisseur => Math.min(50, Math.max(22, Math.round(epaisseur) - 4))
export const miseEnPage = l => (l >= 48 ? 'large' : l >= 30 ? 'moyenne' : 'etroite')
export const estMini = l => l < 26
export const depasse = epaisseur => epaisseur < 26
export const numeroEtiquette = num => 'n° ' + String(num).trim().padStart(4, '0')

export function raisons(jeu, categoriesParId) {
  const r = []
  if (!String(jeu.barcode ?? '').trim()) r.push('pas de code-barres')
  else if (!codeEan13(jeu.barcode)) r.push('code-barres invalide')
  if (!categoriesParId.has(jeu.categorie_id)) r.push('pas de catégorie')
  if (!(jeu.epaisseur_mm > 0)) r.push('épaisseur inconnue')
  return r
}

// Largeur moyenne d'un caractère (Poppins) : 0,52 × la taille
const LARGEUR_CAR = 0.52
export function nomSousEtiquette(nom, largeur) {
  const place = largeur - 1.5
  const taille = Math.max(1.8, Math.min(2.5, place / (nom.length * LARGEUR_CAR)))
  let texte = nom
  while (texte.length * LARGEUR_CAR * taille > place && texte.length > 2) texte = texte.slice(0, -2).trimEnd() + '…'
  return { texte, taille: Math.round(taille * 100) / 100 }
}

const numeroTri = j => parseInt(String(j.registration_number).replace(/\D/g, ''), 10) || 0

export function preparer(jeux, categoriesParId) {
  return jeux
    .filter(j => raisons(j, categoriesParId).length === 0)
    .sort((a, b) => numeroTri(a) - numeroTri(b))
    .map(j => ({
      id: j.id,
      nom: j.name,
      numero: numeroEtiquette(j.registration_number),
      code: codeEan13(j.barcode),
      couleur: categoriesParId.get(j.categorie_id).couleur,
      largeur: largeurEtiquette(j.epaisseur_mm),
      epaisseur: j.epaisseur_mm,
    }))
}

export function repartir(etiquettes) {
  const pas = HAUTEUR + BANDE_NOM
  const basUtile = PAGE.h - MARGE - PIED
  const pages = []
  let page = null, rangee = null, x = 0
  for (const e of etiquettes) {
    if (!rangee || x + e.largeur > PAGE.l - MARGE) {
      const y = rangee ? rangee.y + pas : MARGE
      if (!page || y + pas > basUtile) {
        page = { rangees: [] }
        pages.push(page)
        rangee = { y: MARGE, items: [] }
      } else rangee = { y, items: [] }
      page.rangees.push(rangee)
      x = MARGE
    }
    rangee.items.push({ ...e, x })
    x += e.largeur
  }
  return pages
}
