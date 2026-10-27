import { test } from 'node:test'
import assert from 'node:assert/strict'
import { versSvg } from './rendu-svg.js'

test('rectangle, texte en deux couleurs, rotation, image, échappement', () => {
  const s = versSvg([
    { t: 'rect', x: 0, y: 0, l: 10, h: 5, fond: '#fff', trait: '#000', ep: 0.3, rayon: 1 },
    { t: 'texte', x: 5, y: 4, morceaux: [{ texte: 'A & B', couleur: '#000' }, { texte: '<C>', couleur: '#1a5f7a' }], taille: 2, police: 'titre', ancre: 'middle', rotation: -90 },
    { t: 'image', x: 1, y: 1, l: 3, h: 3, src: 'feuille' },
  ], 210, 297)
  assert.ok(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297"'))
  assert.ok(s.includes('rx="1"'))
  assert.ok(s.includes('A &amp; B'))
  assert.ok(s.includes('&lt;C&gt;'))
  assert.ok(s.includes('transform="rotate(-90 5 4)"'))
  assert.ok(s.includes('href="/logo-feuille.svg"'))
  assert.ok(s.includes('text-anchor="middle"'))
})
