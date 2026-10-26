import test from 'node:test'
import assert from 'node:assert/strict'
import { pdfDepuisJpegs } from './pdfImages.js'

const texte = octets => new TextDecoder('latin1').decode(octets)

test('PDF : une page par image, table des positions juste', () => {
  const faux = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])
  const pdf = texte(pdfDepuisJpegs([
    { jpeg: faux, largeurPx: 10, hauteurPx: 14 },
    { jpeg: faux, largeurPx: 10, hauteurPx: 14 },
  ]))
  assert.ok(pdf.startsWith('%PDF-1.4\n'))
  assert.ok(pdf.endsWith('%%EOF\n'))
  assert.match(pdf, /\/Count 2/)
  assert.equal((pdf.match(/\/Type \/Page /g) || []).length, 2)

  // Chaque entrée de la table pointe bien sur « k 0 obj »
  const debutXref = Number(pdf.match(/startxref\n(\d+)/)[1])
  assert.ok(pdf.slice(debutXref).startsWith('xref\n0 9\n'))
  const lignes = pdf.slice(debutXref).split('\n').slice(3, 11)
  lignes.forEach((ligne, i) => {
    const position = Number(ligne.slice(0, 10))
    assert.ok(pdf.slice(position).startsWith(`${i + 1} 0 obj`), `objet ${i + 1}`)
  })
  // La longueur annoncée de l'image correspond au flux
  assert.match(pdf, /\/Length 7 >>\nstream\n\xff\xd8/)
})
