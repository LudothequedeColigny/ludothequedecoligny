import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dessinerEtiquette, dessinerPage } from './dessin.js'
import { repartir, HAUTEUR, MARGE, PAGE } from './regles.js'

const etiquette = (largeur, o = {}) => ({ id: 1, nom: 'Catane', numero: 'n° 0126', code: '0688623905027', couleur: '#92CDDC', largeur, epaisseur: largeur + 4, ...o })
const textes = p => p.filter(x => x.t === 'texte').map(x => x.morceaux.map(m => m.texte).join(''))
const dansLeCadre = (p, l, h) => p.filter(x => x.t === 'rect').every(r => r.x >= -0.01 && r.y >= -0.01 && r.x + r.l <= l + 0.01 && r.y + r.h <= h + 0.01)

const LARGEURS = [22, 26, 30, 36, 50]
const ENCRE = '#0f172a'
// fenêtre blanche du code-barres (rectangle blanc contouré à coins arrondis)
const fenetre = p => p.find(x => x.t === 'rect' && x.fond === '#ffffff' && x.rayon === 1.1)

test('toutes largeurs : tout dans le cadre, hauteur 42 mm', () => {
  assert.equal(HAUTEUR, 42)
  for (const l of LARGEURS) assert.ok(dansLeCadre(dessinerEtiquette(etiquette(l)), l, HAUTEUR), `${l} mm`)
})

test('toutes largeurs : 30 barres, médaillon, couleur de la catégorie, numéro une seule fois', () => {
  for (const l of LARGEURS) {
    const p = dessinerEtiquette(etiquette(l))
    const barres = p.filter(x => x.t === 'rect' && x.fond === ENCRE && (l >= 30 ? x.l < 1 && x.h >= 8 : x.h < 1 && x.l >= 8))
    assert.equal(barres.length, 30, `${l} mm`)
    assert.equal(p.filter(x => x.t === 'image').length, 1)
    assert.ok(p.some(x => x.t === 'rect' && x.fond === '#92CDDC'))
    assert.equal(textes(p).filter(t => t === 'n° 0126').length, 1)
  }
})

test('toutes largeurs : titre en deux lignes dans le bandeau, sans dépasser le bord', () => {
  for (const l of LARGEURS) {
    const p = dessinerEtiquette(etiquette(l))
    assert.ok(textes(p).includes('Ludothèque'))
    assert.ok(textes(p).includes('de Coligny'))
    // plus de nom sur une ligne ni de nom tourné
    assert.ok(!textes(p).some(t => t.includes('Ludothèque ')))
    for (const t of p.filter(x => x.t === 'texte' && ['Ludothèque', 'de Coligny'].includes(x.morceaux.map(m => m.texte).join('')))) {
      assert.equal(t.rotation, 0)
      assert.ok(t.x + 10 * 0.64 * t.taille <= l - 0.9 - 1 + 0.01, `${l} mm : titre trop long`)
    }
  }
})

test('toutes largeurs : numéro horizontal, centré, sous la fenêtre du code-barres', () => {
  for (const l of LARGEURS) {
    const p = dessinerEtiquette(etiquette(l))
    const f = fenetre(p), num = p.find(x => x.t === 'texte' && x.morceaux[0].texte === 'n° 0126')
    assert.equal(num.rotation, 0)
    assert.ok(num.y > f.y + f.h, `${l} mm : numéro pas sous la fenêtre`)
    assert.ok(Math.abs(num.x - (l - 0.9) / 2) < 0.01, `${l} mm : numéro pas centré`)
    assert.ok(Math.abs(f.x + f.l / 2 - (l - 0.9) / 2) < 0.9, `${l} mm : fenêtre pas centrée`)
  }
})

test('à plat dès 30 mm, tourné d’un quart de tour en dessous', () => {
  for (const l of [30, 36, 50]) assert.equal(dessinerEtiquette(etiquette(l)).filter(x => x.t === 'texte' && x.rotation).length, 0)
  for (const l of [22, 26]) assert.equal(dessinerEtiquette(etiquette(l)).filter(x => x.t === 'texte' && x.rotation === 90).length, 3)
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
