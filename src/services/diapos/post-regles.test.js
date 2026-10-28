import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODELES, LIMITES, BOUTONS, champsVides, avecPhoto, postPret, planPost } from './post-regles.js'

test('modèles, limites et boutons validés', () => {
  assert.deepEqual(MODELES.map(m => m.id), ['photo-carte', 'photo-encadree', 'message'])
  assert.deepEqual(LIMITES, { surTitre: 30, titre: 50, texte: 160, intro: 40, titreBlanc: 30, titreOrange: 20, legende: 40, titreMessage: 40, phrases: 140 })
  assert.deepEqual(BOUTONS, ['Enregistrez ce post', 'Partagez-le', 'Identifiez un ami', "Plus d'infos sur le site"])
  const v = champsVides()
  assert.equal(v.modele, 'photo-carte')
  assert.equal(v.surTitre, 'À la ludothèque')
  assert.deepEqual(v.boutons, ['Enregistrez ce post', 'Partagez-le'])
  assert.notEqual(champsVides().boutons, v.boutons) // copie neuve à chaque appel
})

test('photo demandée pour A et B seulement', () => {
  assert.equal(avecPhoto('photo-carte'), true)
  assert.equal(avecPhoto('photo-encadree'), true)
  assert.equal(avecPhoto('message'), false)
})

test('ce qui manque avant de publier', () => {
  const v = champsVides()
  assert.equal(postPret(v, false), 'Ajoutez une photo.')
  assert.equal(postPret(v, true), 'Écrivez un titre.')
  assert.equal(postPret({ ...v, titre: '  Merci !  ' }, true), null)
  const b = { ...v, modele: 'photo-encadree' }
  assert.equal(postPret(b, true), 'Écrivez un titre.')
  assert.equal(postPret({ ...b, titreOrange: 'pleine !' }, true), null)
  const c = { ...v, modele: 'message' }
  assert.equal(postPret(c, false), 'Écrivez un titre.')
  assert.equal(postPret({ ...c, titreMessage: 'Fermé pour Noël !' }, false), null)
})

test('plan : textes nettoyés, coupés, boutons filtrés', () => {
  const v = champsVides()
  assert.deepEqual(planPost({ ...v, titre: '  Merci   à  tous ! ', texte: 'x'.repeat(200) }), {
    modele: 'photo-carte', surTitre: 'À la ludothèque', titre: 'Merci à tous !', texte: 'x'.repeat(160),
  })
  assert.deepEqual(planPost({ ...v, modele: 'photo-encadree', intro: 'Samedi dernier,', titreBlanc: 'la ludo était', titreOrange: 'pleine !', legende: '32 prêts' }), {
    modele: 'photo-encadree', intro: 'Samedi dernier,', titreBlanc: 'la ludo était', titreOrange: 'pleine !', legende: '32 prêts',
  })
  assert.deepEqual(planPost({ ...v, modele: 'message', titreMessage: 'Fermé', phrases: 'Ligne 1\nLigne 2', boutons: ['Partagez-le', 'Inconnu', 'Partagez-le', 'Identifiez un ami', 'Enregistrez ce post'] }), {
    modele: 'message', titre: 'Fermé', phrases: 'Ligne 1\nLigne 2', boutons: ['Partagez-le', 'Identifiez un ami'],
  })
})
