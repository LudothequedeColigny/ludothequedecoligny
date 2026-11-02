import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typeEvenement, estPermanence, jeuxEmpruntes, rappelsAEnvoyer } from './rappels.js'
import * as serveur from './rappels.js'
import * as site from '../../../src/services/jeuSemaine.js'

const halloween = { id: 42, title: 'Soirée jeux de société - Spécial Halloween', date: '2026-11-06 19:00:00', end_time: '', archived_at: null }
const perm = { id: 43, title: 'Permanence de la ludothèque', date: '2026-11-07 10:00:00', end_time: '12:00', archived_at: null }
const rappels = (maintenant, evenements, pretsParJour) => rappelsAEnvoyer({ maintenant, evenements, pretsParJour })
// Les actions du calendrier des publications partent aussi : chaque test regarde sa colonne
const seuls = (colonne, liste) => liste.filter(r => r.colonne === colonne)

test('genres : mêmes règles que le site', () => {
  assert.equal(typeEvenement('Soirée jeux'), 'soiree')
  assert.equal(typeEvenement('Après-midi jeux en famille'), 'famille')
  assert.equal(typeEvenement('Fête du jeu'), 'permanence')
  assert.equal(estPermanence('Permanence de la ludothèque'), true)
  assert.equal(estPermanence('Fête du jeu'), false)
  assert.equal(estPermanence('Soirée jeux à la place de la permanence'), false)
})

test('jeux empruntés : distincts, rendu le jour même non compté', () => {
  assert.equal(jeuxEmpruntes([
    { game_id: 1, loan_date: '2026-11-07' },
    { game_id: 1, loan_date: '2026-11-07' },
    { game_id: 2, loan_date: '2026-11-07', return_date: '2026-11-07' },
    { game_id: 3, loan_date: '2026-11-07', return_date: '2026-11-21' },
    { game_id: null, loan_date: '2026-11-07' },
  ]), 2)
  assert.equal(jeuxEmpruntes([]), 0)
})

test('annonce : à J-10 à partir de 18h, une seule fois, pas si publiée', () => {
  assert.deepEqual(seuls('notif_annonce_sent_at', rappels('2026-10-27T17:45:00', [halloween])), [])
  assert.deepEqual(seuls('notif_annonce_sent_at', rappels('2026-10-27T18:00:00', [halloween])), [{
    id: 42, colonne: 'notif_annonce_sent_at', title: '📣 Soirée jeux de société - Spécial Halloween dans 10 jours',
    body: "Publiez l'annonce sur Facebook et Instagram.", url: '/admin/evenements?annonce=42',
  }])
  assert.deepEqual(seuls('notif_annonce_sent_at', rappels('2026-10-26T18:00:00', [halloween])), [])
  assert.deepEqual(seuls('notif_annonce_sent_at', rappels('2026-10-27T18:00:00', [{ ...halloween, notif_annonce_sent_at: '2026-10-27T17:00:00Z' }])), [])
  assert.deepEqual(seuls('notif_annonce_sent_at', rappels('2026-10-27T18:00:00', [{ ...halloween, annonce_publiee_le: '2026-10-25T10:00:00Z' }])), [])
  assert.deepEqual(seuls('notif_annonce_sent_at', rappels('2026-10-27T18:00:00', [{ ...halloween, archived_at: '2026-10-01' }])), [])
})

test('annonce : événement créé tard → le soir même ; « demain », « aujourd’hui »', () => {
  assert.equal(seuls('notif_annonce_sent_at', rappels('2026-11-01T18:15:00', [halloween]))[0].title, '📣 Soirée jeux de société - Spécial Halloween dans 5 jours')
  assert.equal(seuls('notif_annonce_sent_at', rappels('2026-11-05T18:15:00', [halloween]))[0].title, '📣 Soirée jeux de société - Spécial Halloween demain')
  const storyFaite = { ...halloween, notif_jour_sent_at: 'x' }
  assert.deepEqual(seuls('notif_annonce_sent_at', rappels('2026-11-06T18:15:00', [storyFaite])).map(r => r.title), ["📣 Soirée jeux de société - Spécial Halloween aujourd'hui"])
  assert.deepEqual(seuls('notif_annonce_sent_at', rappels('2026-11-06T19:30:00', [storyFaite])), [])
})

test('annonce : aussi pour les permanences ; jamais de mail pour une permanence', () => {
  const liste = rappels('2026-10-28T18:00:00', [perm])
  assert.deepEqual(liste.map(r => r.colonne), ['notif_annonce_sent_at'])
})

test('mail aux mairies : J-21 à 18h, ouvre le calendrier, une fois, pas si envoyé', () => {
  const soiree = { id: 50, title: 'Soirée jeux', date: '2026-11-21 19:00:00', archived_at: null }
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-10-31T17:59:00', [soiree])), [])
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-10-31T18:00:00', [soiree])), [{
    id: 50, colonne: 'notif_mail_collectivites_sent_at', title: '✉️ Mail aux mairies : Soirée jeux',
    body: 'Envoyez le mail aux mairies, à la presse et aux écoles (événement dans 21 jours).', url: '/admin/evenements?calendrier=2026-10-31',
  }])
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-11-02T10:00:00', [{ ...soiree, mail_collectivites_envoye_le: 'x' }])), [])
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-11-02T10:00:00', [{ ...soiree, notif_mail_collectivites_sent_at: 'x' }])), [])
  // événement créé tard : part au passage suivant, même avant l'heure
  assert.equal(seuls('notif_mail_collectivites_sent_at', rappels('2026-11-10T10:00:00', [soiree])).length, 1)
  // événement commencé : plus de rappel
  assert.deepEqual(seuls('notif_mail_collectivites_sent_at', rappels('2026-11-21T19:30:00', [soiree])), [])
})

test('story de la veille : J-1 à 17h, jamais le jour J', () => {
  const soiree = { id: 51, title: 'Soirée jeux', date: '2026-11-21 19:00:00', archived_at: null }
  assert.deepEqual(seuls('notif_story_veille_sent_at', rappels('2026-11-20T16:59:00', [soiree])), [])
  assert.equal(seuls('notif_story_veille_sent_at', rappels('2026-11-20T17:00:00', [soiree]))[0].title, '📸 Demain : Soirée jeux')
  assert.deepEqual(seuls('notif_story_veille_sent_at', rappels('2026-11-21T10:00:00', [soiree])), [])
  assert.deepEqual(seuls('notif_story_veille_sent_at', rappels('2026-11-20T17:00:00', [{ ...soiree, story_veille_faite_le: 'x' }])), [])
})

test('réglages : délai, heure et interrupteur respectés', () => {
  const soiree = { id: 52, title: 'Soirée jeux', date: '2026-11-21 19:00:00', archived_at: null }
  const reglages = serveur.reglagesPublication({ publication_annonce_jours: '14', publication_annonce_heure: '12:00', publication_mail_adherents_rappel: 'false' })
  const r = (m) => rappelsAEnvoyer({ maintenant: m, evenements: [soiree], reglages })
  assert.deepEqual(seuls('notif_annonce_sent_at', r('2026-11-07T11:59:00')), [])
  assert.equal(seuls('notif_annonce_sent_at', r('2026-11-07T12:00:00')).length, 1)
  assert.deepEqual(seuls('notif_mail_adherents_sent_at', r('2026-11-15T18:00:00')), [])
})

test('calendrier des publications : les deux copies de la règle donnent les mêmes résultats', async () => {
  const siteCal = await import('../../../src/services/calendrierPublications.js')
  assert.deepEqual(serveur.ACTIONS_PUBLICATION, siteCal.ACTIONS_PUBLICATION)
  assert.deepEqual(serveur.BILAN, siteCal.BILAN)
  const reglages = { publication_annonce_jours: '12', publication_story_veille_heure: '16:30', publication_mail_collectivites_rappel: 'false' }
  assert.deepEqual(serveur.reglagesPublication(reglages), siteCal.reglagesPublication(reglages))
  const regl = siteCal.reglagesPublication(reglages)
  for (const ev of [halloween, perm, { id: 9, title: 'Après-midi en famille', date: '2027-01-02 14:00:00' }, { id: 10, title: 'Fête du jeu', date: '2026-12-05 14:00:00' }]) {
    assert.deepEqual(serveur.actionsEvenement(ev, regl), siteCal.actionsEvenement(ev, regl))
  }
  assert.equal(serveur.decalerJour('2026-12-31', 1), siteCal.decalerJour('2026-12-31', 1))
})

test('story : le jour J à partir de 9h, tout événement, une seule fois', () => {
  assert.deepEqual(seuls('notif_jour_sent_at', rappels('2026-11-07T08:45:00', [perm])), [])
  assert.deepEqual(seuls('notif_jour_sent_at', rappels('2026-11-07T09:00:00', [perm])), [{
    id: 43, colonne: 'notif_jour_sent_at', title: "📸 C'est aujourd'hui : Permanence de la ludothèque",
    body: 'Enregistrez la story du jour J, puis publiez-la sur Instagram ou Facebook.', url: '/admin/evenements?annonce=43',
  }])
  assert.deepEqual(seuls('notif_jour_sent_at', rappels('2026-11-07T09:00:00', [{ ...perm, notif_jour_sent_at: 'x' }])), [])
})

test('bilan de permanence : 1 h après la fin, pendant 24 h, avec des emprunts', () => {
  const prets = { '2026-11-07': [{ game_id: 1, loan_date: '2026-11-07' }, { game_id: 2, loan_date: '2026-11-07' }] }
  const p = { ...perm, notif_jour_sent_at: 'x' }
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T12:45:00', [p], prets)), [])
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T13:00:00', [p], prets)), [{
    id: 43, colonne: 'notif_bilan_sent_at', title: '📦 2 jeux empruntés ce matin',
    body: 'Publiez le bilan de la permanence sur Facebook et Instagram.', url: '/admin/evenements?bilan=43',
  }])
  assert.equal(seuls('notif_bilan_sent_at', rappels('2026-11-08T11:45:00', [p], prets)).length, 1)
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-08T12:00:00', [p], prets)), [])
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T13:00:00', [p], {})), [])
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T13:00:00', [{ ...p, bilan_publie_le: 'x' }], prets)), [])
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T13:00:00', [{ ...p, notif_bilan_sent_at: 'x' }], prets)), [])
})

test('bilan de permanence : singulier, après-midi, sans heure de fin', () => {
  const apm = { ...perm, date: '2026-11-21 14:00:00', end_time: '16:00', notif_jour_sent_at: 'x' }
  assert.equal(seuls('notif_bilan_sent_at', rappels('2026-11-21T17:00:00', [apm], { '2026-11-21': [{ game_id: 5, loan_date: '2026-11-21' }] }))[0].title, '📦 1 jeu emprunté cet après-midi')
  const sansFin = { ...perm, end_time: null, notif_jour_sent_at: 'x' }
  const prets = { '2026-11-07': [{ game_id: 1, loan_date: '2026-11-07' }] }
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T12:45:00', [sansFin], prets)), [])
  assert.equal(seuls('notif_bilan_sent_at', rappels('2026-11-07T13:00:00', [sansFin], prets)).length, 1)
})

test('bilan de soirée : le lendemain à partir de 9h, pas si publié', () => {
  const h = { ...halloween, notif_annonce_sent_at: 'x', notif_jour_sent_at: 'x' }
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T08:45:00', [h])), [])
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T09:00:00', [h])), [{
    id: 42, colonne: 'notif_bilan_sent_at', title: '📋 Bilan de Soirée jeux de société - Spécial Halloween',
    body: 'Renseignez les participants, les photos et les jeux joués, puis publiez le bilan.', url: '/admin/evenements?bilan=42',
  }])
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-08T09:00:00', [h])), [])
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-07T09:00:00', [{ ...h, bilan_publie_le: 'x' }])), [])
  assert.deepEqual(seuls('notif_bilan_sent_at', rappels('2026-11-08T09:00:00', [{ ...perm, notif_jour_sent_at: 'x' }], {})), [])
})
// ── Jeu de la semaine ──────────────────────────────────────────────────────
const { semaineDuRappel, rappelJeuSemaine } = serveur
const jeuxSemaine = [
  { id: 1, name: 'Sky Team', is_available: true },
  { id: 2, name: 'Harmonies', is_available: false },
  { id: 3, name: 'Skyjo', is_available: true },
]
const fichiersSemaine = [
  { id: 'h', name: 'Harmonies_jeu-de-la-semaine.mp4', createdTime: '2026-10-27T09:00:00.000Z' },
  { id: 's', name: 'SkyTeam_jeu-de-la-semaine.mp4', createdTime: '2026-10-28T14:30:00.000Z' },
  { id: 'x', name: 'Sky_jeu.mp4', createdTime: '2026-10-26T09:00:00.000Z' },
]

test('jeu de la semaine : les deux copies des règles donnent les mêmes résultats', () => {
  const lignes = [{ drive_id: 'x', nom_fichier: 'Sky_jeu.mp4', game_id: 3, legende: null, publie_le: null }]
  const entree = { fichiers: fichiersSemaine, lignes, jeux: jeuxSemaine }
  assert.deepEqual(serveur.fileJeuSemaine(entree), site.fileJeuSemaine(entree))
  const { attente } = site.fileJeuSemaine(entree)
  assert.deepEqual(serveur.prochaineVideo(attente), site.prochaineVideo(attente))
  for (const nom of ['Sky_jeu.mp4', 'SkyTeam_x.mp4', 'Élan_1.mov', '_.mp4']) {
    assert.deepEqual(serveur.reconnaitreJeu(nom, jeuxSemaine), site.reconnaitreJeu(nom, jeuxSemaine))
    assert.equal(serveur.nomDuFichier(nom), site.nomDuFichier(nom))
  }
})

test('jeu de la semaine : seulement le jeudi à partir de 17h', () => {
  assert.equal(semaineDuRappel('2026-11-05T16:59:00'), null)        // jeudi 16h59
  assert.equal(semaineDuRappel('2026-11-05T17:00:00'), '2026-11-02') // jeudi 17h → lundi 2
  assert.equal(semaineDuRappel('2026-11-05T23:45:00'), '2026-11-02')
  assert.equal(semaineDuRappel('2026-11-06T17:05:00'), null)        // vendredi : pas de relance
  assert.equal(semaineDuRappel('2026-11-02T17:05:00'), null)        // lundi
  assert.equal(semaineDuRappel('2026-12-31T17:05:00'), '2026-12-28') // semaine à cheval sur l'année
})

test('jeu de la semaine : texte du rappel, jeu en prêt sauté, réserve vide', () => {
  const { attente } = serveur.fileJeuSemaine({ fichiers: fichiersSemaine, lignes: [], jeux: jeuxSemaine })
  assert.deepEqual(rappelJeuSemaine({ semaine: '2026-11-02', attente, publications: [] }), {
    semaine: '2026-11-02',
    title: '🎬 Jeu de la semaine : Sky Team',
    body: 'Publiez la vidéo sur Facebook et Instagram.',
    url: '/admin/evenements?onglet=jeu-semaine',
  })
  // Aucun jeu reconnu : nom tiré du fichier
  const inconnue = serveur.fileJeuSemaine({ fichiers: [fichiersSemaine[2]], lignes: [], jeux: jeuxSemaine }).attente
  assert.equal(rappelJeuSemaine({ semaine: '2026-11-02', attente: inconnue, publications: [] }).title, '🎬 Jeu de la semaine : Sky')
  assert.deepEqual(rappelJeuSemaine({ semaine: '2026-11-02', attente: [], publications: [] }), {
    semaine: '2026-11-02',
    title: '🎬 Plus de vidéo en réserve',
    body: 'Ajoutez une nouvelle vidéo dans le dossier Drive.',
    url: '/admin/evenements?onglet=jeu-semaine',
  })
})

test('jeu de la semaine : pas de rappel si une vidéo est déjà publiée cette semaine', () => {
  const { attente } = serveur.fileJeuSemaine({ fichiers: fichiersSemaine, lignes: [], jeux: jeuxSemaine })
  assert.equal(rappelJeuSemaine({ semaine: '2026-11-02', attente, publications: ['2026-11-02T00:00:00'] }), null)
  assert.equal(rappelJeuSemaine({ semaine: '2026-11-02', attente, publications: ['2026-11-04T10:00:00'] }), null)
  assert.notEqual(rappelJeuSemaine({ semaine: '2026-11-02', attente, publications: ['2026-11-01T23:59:00'] }), null) // dimanche précédent
})
