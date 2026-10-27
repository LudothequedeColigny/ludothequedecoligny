import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dessinerEtiquette, dessinerPage } from './dessin.js'
import { repartir, HAUTEUR, MARGE, PAGE } from './regles.js'

const etiquette = (largeur, o = {}) => ({ id: 1, nom: 'Catane', numero: 'n° 0126', code: '0688623905027', couleur: '#92CDDC', largeur, epaisseur: largeur + 4, ...o })
const textes = p => p.filter(x => x.t === 'texte').map(x => x.morceaux.map(m => m.texte).join(''))
const dansLeCadre = (p, l, h) => p.filter(x => x.t === 'rect').every(r => r.x >= -0.01 && r.y >= -0.01 && r.x + r.l <= l + 0.01 && r.y + r.h <= h + 0.01)

test('large : nom en deux lignes dans le bandeau, numéro, 30 barres, tout dans le cadre', () => {
  const p = dessinerEtiquette(etiquette(50))
  assert.ok(textes(p).includes('Ludothèque'))
  assert.ok(textes(p).includes('de Coligny'))
  assert.ok(textes(p).includes('n° 0126'))
  // 0688623905027 : 30 barres noires (gardes comprises)
  assert.equal(p.filter(x => x.t === 'rect' && x.fond === '#0f172a' && x.h === 10).length, 30)
  assert.ok(dansLeCadre(p, 50, HAUTEUR))
  assert.ok(p.some(x => x.t === 'rect' && x.fond === '#92CDDC'))
  assert.equal(p.filter(x => x.t === 'image').length, 1)
})

test('moyenne : nom sur une ligne, en deux couleurs, sous le code-barres', () => {
  const p = dessinerEtiquette(etiquette(36))
  const nom = p.find(x => x.t === 'texte' && x.morceaux.length === 2)
  assert.deepEqual(nom.morceaux.map(m => m.texte), ['Ludothèque ', 'de Coligny'])
  assert.ok(dansLeCadre(p, 36, HAUTEUR))
})

test('étroite : barres couchées (plus larges que hautes), chiffres et nom tournés', () => {
  const p = dessinerEtiquette(etiquette(26))
  const barres = p.filter(x => x.t === 'rect' && x.fond === '#0f172a' && x.l > x.h && x.h < 1)
  assert.equal(barres.length, 30)
  assert.ok(p.filter(x => x.t === 'texte' && x.rotation).length >= 3)
  assert.ok(dansLeCadre(p, 26, HAUTEUR))
})

test('mini (22 mm) : tout tient dans le cadre', () => {
  assert.ok(dansLeCadre(dessinerEtiquette(etiquette(22)), 22, HAUTEUR))
})

test('page : étiquettes placées, noms dessous, repères, pied et réglette', () => {
  const pages = repartir([etiquette(50), etiquette(26, { id: 2, nom: 'Skull King' })])
  const p = dessinerPage(pages[0], 1, 3)
  assert.ok(textes(p).includes('Catane'))
  assert.ok(textes(p).includes('Skull King'))
  assert.ok(textes(p).some(t => t.includes('page 1 / 3')))
  assert.ok(textes(p).includes('doit mesurer 10 cm'))
  const reglette = p.find(x => x.t === 'ligne' && Math.abs(x.x2 - x.x1 - 100) < 0.001)
  assert.ok(reglette)
  assert.ok(p.filter(x => x.t === 'ligne' && x.ep === 0.2).length >= 7)
  // repères horizontaux : uniquement dans les marges gauche ou droite de la page
  const horiz = p.filter(x => x.t === 'ligne' && x.ep === 0.2 && x.y1 === x.y2)
  assert.ok(horiz.length >= 4)
  for (const h of horiz) assert.ok(Math.max(h.x1, h.x2) <= MARGE || Math.min(h.x1, h.x2) >= PAGE.l - MARGE, `repère en x=${h.x1}`)
})
