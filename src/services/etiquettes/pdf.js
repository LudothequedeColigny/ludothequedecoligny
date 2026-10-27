/**
 * Planches d'étiquettes → PDF vectoriel (traits nets à toute résolution : le
 * code-barres en dépend), polices du site intégrées. jsPDF n'est chargé qu'ici,
 * à la demande, pour ne pas alourdir le reste du site.
 * Mêmes primitives que l'aperçu (dessin.js).
 */
import { dessinerPage } from './dessin.js'

const MM_EN_PT = 72 / 25.4

async function base64(url) {
  const octets = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let s = ''
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000))
  return btoa(s)
}

// La feuille (SVG) passe en PNG pour jsPDF, à 512 px
async function feuillePng() {
  const img = new Image()
  img.src = '/logo-feuille.svg'
  await img.decode()
  const c = document.createElement('canvas')
  c.width = c.height = 512
  c.getContext('2d').drawImage(img, 0, 0, 512, 512)
  return c.toDataURL('image/png')
}

function dessiner(doc, p, feuille) {
  if (p.t === 'rect') {
    if (p.fond) doc.setFillColor(p.fond)
    if (p.trait) { doc.setDrawColor(p.trait); doc.setLineWidth(p.ep) }
    const style = p.fond && p.trait ? 'FD' : p.fond ? 'F' : 'S'
    if (p.rayon) doc.roundedRect(p.x, p.y, p.l, p.h, p.rayon, p.rayon, style)
    else doc.rect(p.x, p.y, p.l, p.h, style)
  } else if (p.t === 'ligne') {
    doc.setDrawColor(p.trait); doc.setLineWidth(p.ep)
    doc.line(p.x1, p.y1, p.x2, p.y2)
  } else if (p.t === 'cercle') {
    if (p.fond) doc.setFillColor(p.fond)
    if (p.trait) { doc.setDrawColor(p.trait); doc.setLineWidth(p.ep) }
    doc.circle(p.cx, p.cy, p.r, p.fond && p.trait ? 'FD' : p.fond ? 'F' : 'S')
  } else if (p.t === 'image') {
    doc.addImage(feuille, 'PNG', p.x, p.y, p.l, p.h)
  } else {
    const [famille, style] = { titre: ['Bricolage', 'bold'], texte: ['Poppins', 'normal'], chiffres: ['courier', 'normal'] }[p.police]
    doc.setFont(famille, style)
    doc.setFontSize(p.taille * MM_EN_PT)
    const largeurs = p.morceaux.map(m => doc.getTextWidth(m.texte))
    const total = largeurs.reduce((a, b) => a + b, 0)
    const recul = p.ancre === 'middle' ? total / 2 : p.ancre === 'end' ? total : 0
    // direction du texte (rotation SVG, sens horaire, y vers le bas)
    const a = ((p.rotation || 0) * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a)
    let d = -recul
    p.morceaux.forEach((m, i) => {
      doc.setTextColor(m.couleur)
      doc.text(m.texte, p.x + d * dx, p.y + d * dy, { angle: -(p.rotation || 0), baseline: 'alphabetic' })
      d += largeurs[i]
    })
  }
}

export async function fabriquerPdf(pages) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  doc.addFileToVFS('BricolageGrotesque-ExtraBold.ttf', await base64('/fonts/pdf/BricolageGrotesque-ExtraBold.ttf'))
  doc.addFont('BricolageGrotesque-ExtraBold.ttf', 'Bricolage', 'bold')
  doc.addFileToVFS('Poppins-SemiBold.ttf', await base64('/fonts/pdf/Poppins-SemiBold.ttf'))
  doc.addFont('Poppins-SemiBold.ttf', 'Poppins', 'normal')
  const feuille = await feuillePng()
  pages.forEach((page, i) => {
    if (i > 0) doc.addPage('a4', 'portrait')
    for (const p of dessinerPage(page, i + 1, pages.length)) dessiner(doc, p, feuille)
  })
  return doc.output('blob')
}
