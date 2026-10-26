/**
 * Dessin d'un mois du calendrier public, pour l'export : image 4:5 (1080 × 1350,
 * comme les publications) ou page A4 du PDF. Même mise en page, plus haute en A4.
 */
import { COULEURS, chargerImage, chargerPolices, liberer, nouveauCanvas, pastille, police, rectArrondi, versBlob } from './dessin.js'
import { CATEGORIES, JOURS_COURTS, NOMS_MOIS, categorie, evenementsDuMois, grilleMois, horaire, jourLong, parJour } from '../calendrier.js'
import { A4, pdfDepuisJpegs } from '../pdfImages.js'

const LOGO = '/social/logo-feuille.png'
const LARGEUR = 1080
const MARGE = 56
export const FORMATS = {
  image: { largeur: 1080, hauteur: 1350 },
  // A4 à environ 150 points par pouce
  pdf: { largeur: 1240, hauteur: Math.round(1240 * A4.hauteur / A4.largeur) },
}

const espacement = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v }

/** Texte coupé avec « … » s'il dépasse la largeur (police déjà réglée). */
function tronquer(ctx, texte, largeurMax) {
  if (ctx.measureText(texte).width <= largeurMax) return texte
  let t = texte
  while (t.length > 1 && ctx.measureText(`${t}…`).width > largeurMax) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Dessine le mois sur un canvas de largeur quelconque (mise en page calculée sur 1080 de large). */
export function dessinerMois(ctx, { annee, mois, evenements, logo, largeur, hauteur }) {
  const echelle = largeur / LARGEUR
  const H = hauteur / echelle
  ctx.save()
  ctx.scale(echelle, echelle)
  ctx.fillStyle = COULEURS.creme
  ctx.fillRect(0, 0, LARGEUR, H)

  pastille(ctx, logo, MARGE, 56)

  // Titre : « Novembre » en encre, l'année en orange
  police(ctx, 800, 104, 'Bricolage Grotesque')
  espacement(ctx, '-4px')
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COULEURS.encre
  const nom = NOMS_MOIS[mois]
  ctx.fillText(nom, MARGE - 4, 248)
  const largeurNom = ctx.measureText(nom).width
  ctx.fillStyle = COULEURS.orange
  ctx.fillText(String(annee), MARGE + largeurNom + 22, 248)
  espacement(ctx, '0px')
  police(ctx, 600, 28)
  ctx.fillStyle = '#64748b'
  ctx.fillText('Les rendez-vous de la ludothèque', MARGE, 296)

  const duMois = evenementsDuMois(evenements, annee, mois)
  const jours = parJour(duMois)
  const semaines = grilleMois(annee, mois)

  // Place réservée à la liste et au pied de page, le reste pour la grille
  const hautLigne = 50
  const piedHaut = 70
  const enTeteGrille = 46
  const hautGrille = 330
  let lignesMax = duMois.length
  let hautLigneJour = 0
  for (;;) {
    const hautListe = 72 + Math.max(1, lignesMax) * hautLigne
    hautLigneJour = (H - hautGrille - enTeteGrille - hautListe - piedHaut - 36) / semaines.length
    if (hautLigneJour >= 84 || lignesMax <= 3) break
    lignesMax -= 1
  }
  hautLigneJour = Math.min(150, Math.max(70, hautLigneJour))

  // Noms des jours
  const largeurCol = (LARGEUR - 2 * MARGE) / 7
  police(ctx, 800, 21)
  espacement(ctx, '3px')
  ctx.fillStyle = '#64748b'
  ctx.textAlign = 'center'
  JOURS_COURTS.forEach((j, i) => ctx.fillText(j.toUpperCase(), MARGE + largeurCol * (i + 0.5), hautGrille + 30))
  ctx.textAlign = 'left'
  espacement(ctx, '0px')

  // Cases
  const ecart = 8
  semaines.forEach((semaine, s) => {
    semaine.forEach((caseJour, j) => {
      const x = MARGE + j * largeurCol + ecart / 2
      const y = hautGrille + enTeteGrille + s * hautLigneJour + ecart / 2
      const w = largeurCol - ecart
      const h = hautLigneJour - ecart
      const liste = caseJour.dansLeMois ? (jours[caseJour.cle] || []) : []
      if (!caseJour.dansLeMois) {
        police(ctx, 700, 24)
        ctx.fillStyle = '#cbd5e1'
        ctx.fillText(String(caseJour.jour), x + 14, y + 34)
        return
      }
      const cat = liste.length ? CATEGORIES[categorie(liste[0])] : null
      if (cat) {
        ctx.fillStyle = COULEURS.encre
        rectArrondi(ctx, x + 5, y + 5, w, h, 18); ctx.fill()
      }
      ctx.fillStyle = cat ? cat.fond : '#ffffff'
      rectArrondi(ctx, x, y, w, h, 18); ctx.fill()
      ctx.lineWidth = cat ? 3.5 : 2
      ctx.strokeStyle = cat ? COULEURS.encre : '#cbd5e1'
      rectArrondi(ctx, x, y, w, h, 18); ctx.stroke()
      police(ctx, 800, cat ? 30 : 26, 'Bricolage Grotesque')
      ctx.fillStyle = cat ? COULEURS.encre : '#94a3b8'
      ctx.fillText(String(caseJour.jour), x + 13, y + 36)
      // Une pastille par rendez-vous (heure de début), deux au plus
      liste.slice(0, 2).forEach((e, k) => {
        const c = CATEGORIES[categorie(e)]
        const texte = liste.length > 2 && k === 1 ? `+${liste.length - 1}` : horaire(e).split(' ')[0]
        police(ctx, 700, 19)
        const pw = Math.min(w - 16, ctx.measureText(texte).width + 22)
        const py = y + h - 14 - (Math.min(liste.length, 2) - k) * 34 + 6
        if (py < y + 42) return
        ctx.fillStyle = c.couleur
        rectArrondi(ctx, x + 8, py, pw, 28, 14); ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(texte, x + 19, py + 21)
      })
    })
  })

  // Liste « Au programme »
  let y = hautGrille + enTeteGrille + semaines.length * hautLigneJour + 64
  police(ctx, 800, 36, 'Bricolage Grotesque')
  ctx.fillStyle = COULEURS.encre
  ctx.fillText('Au programme', MARGE, y)
  y += 20
  if (!duMois.length) {
    police(ctx, 500, 24)
    ctx.fillStyle = '#64748b'
    ctx.fillText('Pas encore de rendez-vous prévu ce mois-ci.', MARGE, y + 36)
  }
  duMois.slice(0, lignesMax).forEach((e, i) => {
    const c = CATEGORIES[categorie(e)]
    const ly = y + i * hautLigne
    ctx.fillStyle = c.couleur
    ctx.beginPath(); ctx.arc(MARGE + 12, ly + 28, 11, 0, Math.PI * 2); ctx.fill()
    const debut = `${jourLong(e)} · ${horaire(e)}`
    police(ctx, 700, 25)
    ctx.fillStyle = COULEURS.encre
    ctx.fillText(debut, MARGE + 38, ly + 37)
    const largeurDebut = ctx.measureText(debut).width
    police(ctx, 500, 25)
    ctx.fillStyle = '#475569'
    ctx.fillText(tronquer(ctx, `  ${e.title}`, LARGEUR - 2 * MARGE - 38 - largeurDebut), MARGE + 38 + largeurDebut, ly + 37)
  })
  if (duMois.length > lignesMax) {
    police(ctx, 600, 22)
    ctx.fillStyle = '#64748b'
    ctx.fillText(`+ ${duMois.length - lignesMax} autre${duMois.length - lignesMax > 1 ? 's' : ''} rendez-vous : voir le site`, MARGE + 38, y + lignesMax * hautLigne + 34)
  }

  // Pied : légende des couleurs présentes, adresse du site
  const presentes = [...new Set(duMois.map(categorie))]
  let lx = MARGE
  const piedY = H - 48
  police(ctx, 600, 20)
  presentes.forEach(k => {
    const c = CATEGORIES[k]
    ctx.fillStyle = c.couleur
    ctx.beginPath(); ctx.arc(lx + 9, piedY - 7, 9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#475569'
    ctx.fillText(c.libelle, lx + 26, piedY)
    lx += 26 + ctx.measureText(c.libelle).width + 28
  })
  police(ctx, 800, 21)
  espacement(ctx, '1px')
  ctx.fillStyle = COULEURS.bleu
  ctx.textAlign = 'right'
  ctx.fillText('ludothequedecoligny.fr', LARGEUR - MARGE, piedY)
  ctx.textAlign = 'left'
  espacement(ctx, '0px')
  ctx.restore()
}

/** Un mois dessiné et mis en JPEG (canvas libéré aussitôt : un seul à la fois). */
async function moisEnJpeg(mois, evenements, format, logo) {
  const { largeur, hauteur } = FORMATS[format]
  const { canvas, ctx } = nouveauCanvas(largeur, hauteur)
  dessinerMois(ctx, { ...mois, evenements, logo, largeur, hauteur })
  const blob = await versBlob(canvas)
  liberer(canvas)
  return blob
}

/**
 * Export des mois choisis. Image : un fichier JPEG par mois. PDF : un seul fichier,
 * une page A4 par mois. Renvoie des File prêts à télécharger.
 */
export async function exporterMois(listeMois, evenements, format, nomFichier) {
  await chargerPolices()
  const logo = await chargerImage(LOGO)
  if (format === 'image') {
    const fichiers = []
    for (const m of listeMois) {
      const blob = await moisEnJpeg(m, evenements, 'image', logo)
      if (blob) fichiers.push(new File([blob], nomFichier(m.annee, m.mois, 'jpg'), { type: 'image/jpeg' }))
    }
    return fichiers
  }
  const pages = []
  for (const m of listeMois) {
    const blob = await moisEnJpeg(m, evenements, 'pdf', logo)
    if (blob) pages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), largeurPx: FORMATS.pdf.largeur, hauteurPx: FORMATS.pdf.hauteur })
  }
  if (!pages.length) return []
  const premier = listeMois[0]
  const nom = listeMois.length === 1
    ? nomFichier(premier.annee, premier.mois, 'pdf')
    : nomFichier(premier.annee, premier.mois, 'pdf').replace('.pdf', `-${listeMois.length}-mois.pdf`)
  return [new File([pdfDepuisJpegs(pages)], nom, { type: 'application/pdf' })]
}
