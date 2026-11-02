/**
 * PDF joint au mail « Nouvelle pré-inscription » : fiche d'adhésion à compléter au stylo
 * au recto, charte de prêt au verso, dans le style de la charte. pdf-lib, fontkit et les
 * fichiers (polices, images, charte) sont passés en paramètre : voir index.ts.
 * Sans `demande` : la même fiche, vierge, à remplir entièrement à la main.
 */
import { tableauTarifs, lignesAdherent, lignesAdherentVierge, dateFrancaise, couperLignes, texteAffichable } from './fiche-adhesion-regles.js'

const MM = 72 / 25.4
const LARGEUR = 210
const HAUTEUR = 297
const MARGE = 14
const COL_DROITE = MARGE + 52
const FIN = LARGEUR - MARGE
const LETTRES_PACTES = [['P', '#12653C'], ['A', '#2762A1'], ['C', '#E75A19'], ['T', '#772D87'], ['E', '#AC1B59'], ['S', '#CD1A1E']]

// Liste des fichiers que fabriquerPdfAdhesion attend dans `fichiers`, relatifs au site
export const FICHIERS_PDF = [
  'charte-de-pret-ludotheque.pdf',
  'fonts/pdf/BricolageGrotesque-ExtraBold.ttf', 'fonts/pdf/Poppins-Regular.ttf', 'fonts/pdf/Poppins-SemiBold.ttf',
  'pdf/logo-pactes.png', 'pdf/logo-feuille.png', 'pdf/icone-adherent.png', 'pdf/icone-reglement.png', 'pdf/icone-tarifs.png',
]

const arrondi = (l, h, r) => `M ${r} 0 H ${l - r} Q ${l} 0 ${l} ${r} V ${h - r} Q ${l} ${h} ${l - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`

export async function fabriquerPdfAdhesion({ PDFDocument, rgb, degrees, fontkit, fichiers, demande, reglages }) {
  const couleur = hex => rgb(...[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255))
  const ENCRE = couleur('#0f172a'); const TEXTE = couleur('#1e293b'); const DOUX = couleur('#64748b')
  const BLEU = couleur('#1a5f7a'); const ORANGE = couleur('#e38154')
  const BLANC = rgb(1, 1, 1); const PECHE = couleur('#fbd5c0')

  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle("Fiche d'adhésion et charte de prêt")
  doc.setAuthor('Ludothèque de Coligny')

  const [titre, normal, gras] = await Promise.all([
    doc.embedFont(fichiers['fonts/pdf/BricolageGrotesque-ExtraBold.ttf']),
    doc.embedFont(fichiers['fonts/pdf/Poppins-Regular.ttf']),
    doc.embedFont(fichiers['fonts/pdf/Poppins-SemiBold.ttf']),
  ])
  const glyphes = new Set(normal.getCharacterSet())
  const sur = t => texteAffichable(t, c => glyphes.has(c.codePointAt(0)))
  const [logoPactes, logoFeuille, icoAdherent, icoReglement, icoTarifs] = await Promise.all(
    ['logo-pactes', 'logo-feuille', 'icone-adherent', 'icone-reglement', 'icone-tarifs'].map(n => doc.embedPng(fichiers[`pdf/${n}.png`])),
  )

  const page = doc.addPage([LARGEUR * MM, HAUTEUR * MM])
  const X = mm => mm * MM
  const Y = mm => (HAUTEUR - mm) * MM
  const ecrire = (t, x, y, { size = 3.12, font = normal, color = TEXTE, align = 'left' } = {}) => {
    const largeur = font.widthOfTextAtSize(t, size * MM)
    const decalage = align === 'right' ? largeur : align === 'center' ? largeur / 2 : 0
    page.drawText(t, { x: X(x) - decalage, y: Y(y), size: size * MM, font, color })
    return largeur / MM
  }
  const trait = (x1, y1, x2, y2, { epaisseur = 0.55, color = ENCRE, tirets } = {}) => page.drawLine({
    start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness: epaisseur * MM, color,
    ...(tirets ? { dashArray: [tirets * MM, tirets * MM], lineCap: 'Round' } : {}),
  })
  const image = (img, x, y, l) => {
    const h = l * img.height / img.width
    page.drawImage(img, { x: X(x), y: Y(y + h), width: X(l), height: h * MM })
    return h
  }
  const cadre = (x, y, l, h, r, { fond = BLANC, bord = ENCRE, ombre, decalage = 1.1, epaisseur = 0.55 } = {}) => {
    if (ombre) page.drawSvgPath(arrondi(l * MM, h * MM, r * MM), { x: X(x + decalage), y: Y(y + decalage), color: ombre })
    page.drawSvgPath(arrondi(l * MM, h * MM, r * MM), { x: X(x), y: Y(y), color: fond, borderColor: bord, borderWidth: epaisseur * MM })
  }
  // Case à cocher suivie de son libellé ; renvoie la position après le libellé
  const caseACocher = (x, y, libelle) => {
    cadre(x, y - 3.3, 4, 4, 0.7)
    return x + 5.4 + ecrire(libelle, x + 5.4, y, { size: 3.05 })
  }
  const entete = (y, icone, nom, ...lignesNom) => {
    trait(MARGE, y, FIN, y)
    image(icone, MARGE, y + 3.2, 8)
    const lignes = [nom, ...lignesNom]
    lignes.forEach((l, i) => ecrire(l, MARGE + 10.5, y + 8.7 + i * 5.6, { font: titre, size: 5.1, color: BLEU }))
  }

  // ── En-tête ──
  image(logoFeuille, MARGE, 11, 15)
  ecrire('Ludothèque de Coligny', MARGE + 17.6, 18.2, { font: titre, size: 5.6, color: ENCRE })
  let xs = MARGE + 17.6
  for (const l of 'UN SERVICE DE L’ASSOCIATION ') xs += ecrire(l, xs, 22.4, { font: gras, size: 1.95, color: ORANGE }) + 0.31
  for (const [l, c] of LETTRES_PACTES) xs += ecrire(l, xs, 22.4, { font: gras, size: 1.95, color: couleur(c) }) + 0.31
  image(logoPactes, FIN - 40, 10, 40)

  const tailleTitre = 15.5
  const largeurFiche = ecrire('Fiche', MARGE, 46, { font: titre, size: tailleTitre, color: ENCRE })
  const motAdhesion = 'd’adhésion'
  const lPastille = titre.widthOfTextAtSize(motAdhesion, tailleTitre * MM) / MM + 8.8
  const xp = MARGE + largeurFiche + 3
  const yp = 32.2
  const angle = 1.5
  page.drawSvgPath(arrondi(lPastille * MM, 19 * MM, 3.4 * MM), { x: X(xp), y: Y(yp), color: ORANGE, rotate: degrees(angle) })
  const a = angle * Math.PI / 180
  page.drawText(motAdhesion, {
    x: X(xp) + 4.4 * MM * Math.cos(a) + 13.8 * MM * Math.sin(a),
    y: Y(yp) + 4.4 * MM * Math.sin(a) - 13.8 * MM * Math.cos(a),
    size: tailleTitre * MM, font: titre, color: BLANC, rotate: degrees(angle),
  })
  if (demande) ecrire(sur(`Demande reçue en ligne le ${dateFrancaise(demande.created_at)}`), MARGE, 57.5, { size: 3.28, font: gras, color: ENCRE })

  // ── Répartition de la hauteur : la page reste remplie, que la fiche soit courte ou longue ──
  const LARGEUR_LIBELLE = 37
  const xValeur = COL_DROITE + LARGEUR_LIBELLE
  const rangees = (demande ? lignesAdherent(demande) : lignesAdherentVierge()).map(([libelle, valeur]) => ({
    libelle,
    cases: Array.isArray(valeur) ? valeur : null,
    vide: !valeur,
    lignes: Array.isArray(valeur) ? [''] : couperLignes(sur(valeur), FIN - xValeur, l => gras.widthOfTextAtSize(l, 3.12 * MM) / MM).slice(0, 4),
  }))
  // Fiche vierge : on ne sait pas encore qui la remplira, les deux tarifs figurent
  const tarifs = demande
    ? [{ ...tableauTarifs(reglages, demande.type) }]
    : [{ ...tableauTarifs(reglages, 'Particulier'), etiquette: 'Particulier' }, { ...tableauTarifs(reglages, 'Association'), etiquette: 'Structure' }]
  const t = tarifs[0]
  const hTableau = u => (u.mode === 'degressif' ? 20.4 : 11)
  const ECART_TARIFS = 3.5
  const hTarifs = 5 + tarifs.reduce((h, u) => h + hTableau(u), 0) + ECART_TARIFS * (tarifs.length - 1)
  const hAdherent = rangees.reduce((h, r) => h + 8 + (r.lignes.length - 1) * 4.6, 0)
  const BAS_SIGNATURE = HAUTEUR - 16.8 - 9.2
  const libre = BAS_SIGNATURE - 40 - 6 - (62 + 5.4 + hAdherent + 2.6 + 33.6 + hTarifs)
  const airRangee = libre < 0
    ? Math.max(libre / rangees.length, -2.5)
    : Math.min(libre * 0.6 / rangees.length, 3)
  const reste = Math.max(libre - airRangee * rangees.length, 0)
  const airReglement = Math.min(reste / 2, 2.4)
  const hSignature = Math.min(40 + reste - airReglement * 2, 66)

  // ── Adhérent ──
  let y = 62
  entete(y, icoAdherent, 'Adhérent')
  y += 5.4
  for (const { libelle, cases, vide, lignes } of rangees) {
    ecrire(libelle, COL_DROITE, y + 3.1, { size: 2.75, color: DOUX })
    if (cases) cases.reduce((xc, nom) => caseACocher(xc, y + 3.1, nom) + 6, xValeur)
    lignes.forEach((l, i) => ecrire(l, xValeur, y + 3.1 + i * 4.6, { font: gras, color: ENCRE }))
    const bas = y + 3.1 + (lignes.length - 1) * 4.6
    if (vide) trait(xValeur, bas + 0.4, FIN, bas + 0.4, { epaisseur: 0.2, tirets: 0.4 })
    y = bas + 4.9 + airRangee
  }

  // ── Règlement : à remplir à la main ──
  y += 2.6
  entete(y, icoReglement, 'Règlement')
  const ligneReglement = (yl, libelle) => ecrire(libelle, COL_DROITE, yl, { size: 2.75, color: DOUX })
  let yr = y + 8.8
  ligneReglement(yr, 'Adhésion PACTES')
  const apres = caseACocher(xValeur, yr, 'Déjà prise')
  caseACocher(apres + 6, yr, `À prendre (+ ${t.pactes} €)`)
  yr += 9.6 + airReglement
  ligneReglement(yr, 'Adhésion ludothèque')
  const xMontant = caseACocher(xValeur, yr, 'Payée') + 6
  const lMontant = ecrire('Montant', xMontant, yr, { size: 3.05 })
  trait(xMontant + lMontant + 1.5, yr + 0.4, FIN - 5, yr + 0.4, { epaisseur: 0.3, tirets: 0.4 })
  ecrire('€', FIN, yr, { size: 3.05, align: 'right', font: gras, color: ENCRE })
  yr += 9.6 + airReglement
  ligneReglement(yr, 'Mode de paiement')
  let xm = xValeur
  for (const mode of ['Chèque', 'Liquide', 'Virement']) xm = caseACocher(xm, yr, mode) + 6

  // ── Tarifs : rappel lu dans les Paramètres ──
  y = yr + 5.6
  entete(y, icoTarifs, 'Tarifs')
  tarifs.flatMap(u => {
    const debut = u.etiquette ? `${u.etiquette} : ` : 'Valable '
    return u.mode === 'degressif' ? [`${debut}jusqu’au`, '31 décembre'] : [`${debut}un an`]
  }).forEach((l, i) => ecrire(l, MARGE + 10.5, y + 13.2 + i * 3.3, { size: 2.45, color: DOUX }))
  let yt = y + 5
  const lTableau = FIN - 1.1 - COL_DROITE
  for (const u of tarifs) {
    if (u.mode === 'degressif') {
      const lLibelle = 29
      const lCase = (lTableau - lLibelle) / 12
      const hl = 6.8
      cadre(COL_DROITE, yt, lTableau, hl * 3, 1.6, { ombre: BLEU })
      trait(COL_DROITE, yt + hl, FIN - 1.1, yt + hl, { epaisseur: 0.25 })
      trait(COL_DROITE, yt + hl * 2, FIN - 1.1, yt + hl * 2, { epaisseur: 0.25 })
      ecrire(u.etiquette || 'Mois d’adhésion', COL_DROITE + 2, yt + 4.3, { size: 2.3, color: u.etiquette ? ENCRE : DOUX, font: u.etiquette ? gras : normal })
      ecrire('Ludothèque', COL_DROITE + 2, yt + hl + 4.4, { size: 2.45, font: gras, color: ENCRE })
      ecrire(`+ PACTES (${u.pactes} €)`, COL_DROITE + 2, yt + hl * 2 + 4.4, { size: 2.45, font: gras, color: ENCRE })
      u.mois.forEach((m, i) => {
        const xc = COL_DROITE + lLibelle + lCase * (i + 0.5)
        ecrire(m.mois, xc, yt + 4.3, { size: 2.15, color: DOUX, align: 'center' })
        ecrire(`${m.ludotheque} €`, xc, yt + hl + 4.4, { size: 2.6, align: 'center', color: ENCRE })
        ecrire(`${m.avecPactes} €`, xc, yt + hl * 2 + 4.4, { size: 2.6, align: 'center', font: gras, color: ENCRE })
      })
    } else {
      cadre(COL_DROITE, yt, lTableau, 11, 1.6, { ombre: BLEU })
      ecrire(`${u.etiquette || 'Ludothèque'} : ${u.ludotheque} €`, COL_DROITE + 4, yt + 6.8, { font: gras, color: ENCRE })
      ecrire(`Avec l’adhésion PACTES (${u.pactes} €) : ${u.avecPactes} €`, COL_DROITE + 44, yt + 6.8, { font: gras, color: ENCRE })
    }
    yt += hTableau(u) + ECART_TARIFS
  }

  // ── Signature ──
  const ySignature = BAS_SIGNATURE - hSignature
  cadre(MARGE, ySignature, FIN - MARGE - 1.4, hSignature, 4, { ombre: BLEU, decalage: 1.4 })
  const xSep = FIN - 1.4 - 64
  ecrire('Fait à', MARGE + 5, ySignature + 14, { color: ENCRE })
  trait(MARGE + 15, ySignature + 14.4, xSep - 6, ySignature + 14.4, { epaisseur: 0.3, tirets: 0.4 })
  ecrire('Le', MARGE + 5, ySignature + 26, { color: ENCRE })
  trait(MARGE + 15, ySignature + 26.4, xSep - 6, ySignature + 26.4, { epaisseur: 0.3, tirets: 0.4 })
  trait(xSep, ySignature + 4, xSep, ySignature + hSignature - 4, { epaisseur: 0.3, tirets: 0.4 })
  ecrire('Signature', xSep + 5, ySignature + 7.4, { font: gras, size: 2.7, color: ENCRE })

  // ── Bas de page ──
  ecrire('Ces informations servent à gérer votre adhésion et vos prêts. Détails et droits : ludothequedecoligny.fr/confidentialite',
    LARGEUR / 2, HAUTEUR - 16.8 - 3, { size: 2.3, color: TEXTE, align: 'center' })
  page.drawRectangle({ x: 0, y: 0, width: LARGEUR * MM, height: 16.8 * MM, color: BLEU })
  const lPourTous = ecrire('Le jeu pour tous, ', MARGE, HAUTEUR - 6.9, { font: titre, size: 4.6, color: BLANC })
  ecrire('à partager', MARGE + lPourTous, HAUTEUR - 6.9, { font: titre, size: 4.6, color: PECHE })
  const rue = sur(`${reglages.adresse_rue || '419 Grande Rue'}, ${reglages.adresse_ville || 'Coligny'}`)
  ecrire(rue, FIN, HAUTEUR - 9.6, { size: 2.5, color: BLANC, align: 'right' })
  ecrire('ludothequedecoligny.fr · ludothequedecoligny@outlook.fr', FIN, HAUTEUR - 5.6, { size: 2.5, color: BLANC, align: 'right' })

  // ── Verso : la charte telle qu'elle est publiée sur le site ──
  const charte = await PDFDocument.load(fichiers['charte-de-pret-ludotheque.pdf'])
  const pages = await doc.copyPages(charte, charte.getPageIndices())
  pages.forEach(p => doc.addPage(p))

  return doc.save()
}
