/**
 * Fabrique un PDF d'une page par image JPEG (pleine page), sans bibliothèque :
 * le fichier se télécharge directement, sans passer par la fenêtre d'impression.
 * Testé par `npm test`.
 */

/** Taille d'une page A4 en points PDF (1/72 de pouce). */
export const A4 = { largeur: 595.28, hauteur: 841.89 }

const encodeur = new TextEncoder()

/**
 * pages : [{ jpeg: Uint8Array, largeurPx, hauteurPx }] ; renvoie le PDF (Uint8Array).
 * Chaque image remplit la page (mêmes proportions que l'A4 attendues).
 */
export function pdfDepuisJpegs(pages, { largeur = A4.largeur, hauteur = A4.hauteur } = {}) {
  const morceaux = []
  const positions = []
  let taille = 0
  const ecrire = donnees => {
    const octets = typeof donnees === 'string' ? encodeur.encode(donnees) : donnees
    morceaux.push(octets)
    taille += octets.length
  }
  const objet = (numero, corps, flux) => {
    positions[numero] = taille
    ecrire(`${numero} 0 obj\n${corps}\n`)
    if (flux) {
      ecrire('stream\n')
      ecrire(flux)
      ecrire('\nendstream\n')
    }
    ecrire('endobj\n')
  }

  const n = pages.length
  // 1 : catalogue, 2 : liste des pages, puis 3 objets par page (page, contenu, image)
  const numPage = i => 3 + i * 3
  const L = largeur.toFixed(2)
  const H = hauteur.toFixed(2)

  ecrire('%PDF-1.4\n')
  // Ligne de commentaire en octets hauts : signale aux logiciels un fichier binaire
  ecrire(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))
  objet(1, '<< /Type /Catalog /Pages 2 0 R >>')
  objet(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${numPage(i)} 0 R`).join(' ')}] /Count ${n} >>`)
  pages.forEach((p, i) => {
    const page = numPage(i)
    const contenu = encodeur.encode(`q ${L} 0 0 ${H} 0 0 cm /Im0 Do Q`)
    objet(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${L} ${H}] /Resources << /XObject << /Im0 ${page + 2} 0 R >> >> /Contents ${page + 1} 0 R >>`)
    objet(page + 1, `<< /Length ${contenu.length} >>`, contenu)
    objet(page + 2, `<< /Type /XObject /Subtype /Image /Width ${p.largeurPx} /Height ${p.hauteurPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`, p.jpeg)
  })

  const total = 2 + n * 3
  const debutXref = taille
  ecrire(`xref\n0 ${total + 1}\n0000000000 65535 f \n`)
  for (let k = 1; k <= total; k++) ecrire(`${String(positions[k]).padStart(10, '0')} 00000 n \n`)
  ecrire(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`)

  const sortie = new Uint8Array(taille)
  let curseur = 0
  for (const m of morceaux) { sortie.set(m, curseur); curseur += m.length }
  return sortie
}
