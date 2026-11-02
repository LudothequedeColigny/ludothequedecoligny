import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cotisationDuMois, tableauTarifs, nomAffiche, lignesAdherent, lignesAdherentVierge, nomFichier, couperLignes, texteAffichable, dateFrancaise,
} from './fiche-adhesion-regles.js'
import * as site from '../../../src/services/tarifs.js'

const reglages = {
  prix_particulier: '24', degressivite_mensuelle: '2', prix_minimum: '10', mode_adhesion_particulier: 'degressif',
  prix_association: '50', degressivite_association: '10', prix_minimum_asso: '20', mode_adhesion_association: 'glissant',
  cotisation_pactes: '10',
}
const marie = {
  type: 'Particulier', prenom: 'Marie', nom: 'Dupont', email: 'marie@exemple.fr', telephone: '06 00 00 00 00',
  commune: 'Coligny', foyer: 'Léa, Tom', origine: 'Soirée jeux', recevoir_dates: true, created_at: '2026-11-02T22:30:00Z',
}
const club = { type: 'Association', prenom: null, nom: 'Club des aînés', email: 'club@exemple.fr', created_at: '2026-11-02T10:00:00Z' }

test('cotisation du mois : même calcul que le site', () => {
  for (const mois of [0, 5, 11]) {
    const date = new Date(2026, mois, 15)
    assert.equal(cotisationDuMois(24, 2, 10, 'degressif', date), site.cotisationDuMois(24, 2, 10, 'degressif', date))
    assert.equal(cotisationDuMois(50, 10, 20, 'glissant', date), site.cotisationDuMois(50, 10, 20, 'glissant', date))
  }
})

test('tarifs dégressifs : un montant par mois, sans passer sous le minimum', () => {
  const t = tableauTarifs(reglages, 'Particulier')
  assert.equal(t.mode, 'degressif')
  assert.equal(t.pactes, 10)
  assert.equal(t.mois.length, 12)
  assert.deepEqual(t.mois[0], { mois: 'janv.', ludotheque: 24, avecPactes: 34 })
  assert.deepEqual(t.mois[7], { mois: 'août', ludotheque: 10, avecPactes: 20 })
  assert.deepEqual(t.mois[11], { mois: 'déc.', ludotheque: 10, avecPactes: 20 })
  assert.equal(t.duree, "jusqu'au 31 décembre")
})

test('tarif fixe : un seul montant, celui du type d’adhérent', () => {
  const t = tableauTarifs(reglages, 'Association')
  assert.equal(t.mode, 'fixe')
  assert.equal(t.ludotheque, 50)
  assert.equal(t.avecPactes, 60)
  assert.equal(t.duree, 'pour un an')
})

test('adhésion PACTES : 10 € si le réglage manque, comme sur le site', () => {
  assert.equal(tableauTarifs({ ...reglages, cotisation_pactes: undefined }, 'Particulier').pactes, 10)
  assert.equal(tableauTarifs({ ...reglages, cotisation_pactes: '12' }, 'Particulier').pactes, 12)
})

test('nom affiché : prénom + nom, ou nom de la structure', () => {
  assert.equal(nomAffiche(marie), 'Marie Dupont')
  assert.equal(nomAffiche(club), 'Club des aînés')
})

test('lignes de la fiche : toutes présentes, même vides, pour compléter au stylo', () => {
  const l = Object.fromEntries(lignesAdherent(marie))
  assert.equal(l['Type'], 'Particulier')
  assert.equal(l['Prénom'], 'Marie')
  assert.equal(l['Nom'], 'Dupont')
  assert.equal(l['Recevoir les dates'], 'Oui')
  assert.equal(l['Membres du foyer'], 'Léa, Tom')

  const a = Object.fromEntries(lignesAdherent(club))
  assert.equal(a['Type'], 'Structure / association')
  assert.equal(a['Nom de la structure'], 'Club des aînés')
  assert.equal(a['Téléphone'], '')
  assert.equal(a['Recevoir les dates'], 'Non')
  assert.equal('Prénom' in a, false)
  assert.equal('Membres du foyer' in a, false)
})

test('fiche vierge : tout est à remplir, le type et les dates se cochent', () => {
  const l = Object.fromEntries(lignesAdherentVierge())
  assert.deepEqual(l['Type'], ['Particulier', 'Structure / association'])
  assert.deepEqual(l['Recevoir les dates'], ['Oui', 'Non'])
  for (const champ of ['Prénom', 'Nom ou structure', 'E-mail', 'Téléphone', 'Commune', 'Membres du foyer', 'Nous a connus par']) {
    assert.equal(l[champ], '', champ)
  }
})

test('date de la demande : à l’heure de Paris', () => {
  assert.equal(dateFrancaise('2026-11-02T23:30:00Z'), '3 novembre 2026')
})

test('nom du fichier : sans caractère gênant', () => {
  assert.equal(nomFichier(marie), 'Adhésion - Marie Dupont.pdf')
  assert.equal(nomFichier({ type: 'Association', nom: 'A/B: "C"\r\n' }), 'Adhésion - A B C.pdf')
})

test('coupure des lignes : rien ne dépasse et aucun mot n’est perdu', () => {
  const mesure = t => t.length
  const lignes = couperLignes('un deux trois quatre cinq', 9, mesure)
  assert.deepEqual(lignes, ['un deux', 'trois', 'quatre', 'cinq'])
  assert.deepEqual(couperLignes('', 9, mesure), [''])
  // Un mot trop long est coupé plutôt que de sortir du cadre
  assert.ok(couperLignes('abcdefghijklmnopqrstuvwxyz', 9, mesure).every(l => l.length <= 9))
  assert.equal(couperLignes('abcdefghijklmnopqrstuvwxyz', 9, mesure).join(''), 'abcdefghijklmnopqrstuvwxyz')
})

test('caractères absents de la police : remplacés sans faire échouer le PDF', () => {
  const connus = new Set([...'abcdeèéABC -'])
  const aGlyphe = c => connus.has(c)
  assert.equal(texteAffichable('abc é', aGlyphe), 'abc é')
  // Accent inconnu : la lettre de base ; caractère inconnu : un point d’interrogation
  assert.equal(texteAffichable('âb', aGlyphe), 'ab')
  assert.equal(texteAffichable('a😀', aGlyphe), 'a?')
  assert.equal(texteAffichable('a\r\nb\tc', aGlyphe), 'a b c')
})
