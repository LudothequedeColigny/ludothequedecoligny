/**
 * Rappels envoyés aux téléphones des bénévoles par la tâche planifiée check-events-notify
 * (toutes les 15 min). Fonctions pures : testées par `npm test` (Node), utilisées telles
 * quelles par la fonction serveur (Deno).
 * Conception : docs/superpowers/specs/2026-10-23-rappels-push-design.md
 * Les dates des événements sont à l'heure de Paris, sans fuseau (« 2026-11-06 19:00:00 ») ;
 * `maintenant` est écrit de la même façon (« 2026-11-06T09:05:00 »).
 */

const sansAccents = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Mêmes règles que typeEvenement (src/services/diapos/regles.js) et estPermanence
// (src/services/diapos/permanence-regles.js) : la fonction serveur ne peut pas importer le site
export function typeEvenement(titre) {
  const t = sansAccents(titre)
  if (t.includes('soiree')) return 'soiree'
  if (t.includes('famil')) return 'famille'
  return 'permanence'
}
export const estPermanence = titre => typeEvenement(titre) === 'permanence' && sansAccents(titre).includes('permanence')

// ── Calendrier des publications ──────────────────────────────────────────────
// Copie à l'identique de src/services/calendrierPublications.js (la fonction ne peut pas importer
// le site) : les changer aux deux endroits. rappels.test.js compare les deux copies.
export const ACTIONS_PUBLICATION = [
  { cle: 'mail_collectivites', libelle: 'Mail mairies & presse', court: 'Mail mairies', couleur: '#1a5f7a', jours: 21, heure: '18:00', permanence: false, faitLe: 'mail_collectivites_envoye_le' },
  { cle: 'annonce', libelle: 'Annonce réseaux', court: 'Annonce', couleur: '#3b82f6', jours: 10, heure: '18:00', permanence: true, faitLe: 'annonce_publiee_le' },
  { cle: 'mail_adherents', libelle: 'Mail adhérents', court: 'Mail adhérents', couleur: '#10b981', jours: 7, heure: '18:00', permanence: false, faitLe: 'mail_adherents_envoye_le' },
  { cle: 'story_veille', libelle: 'Story de la veille', court: 'Story veille', couleur: '#a855f7', jours: 1, heure: '17:00', permanence: true, faitLe: 'story_veille_faite_le' },
  { cle: 'story_jour', libelle: 'Story du jour J', court: 'Story J', couleur: '#e38154', jours: 0, heure: '09:00', permanence: true, faitLe: 'story_jour_faite_le' },
]
export const BILAN = { cle: 'bilan', libelle: 'Bilan', court: 'Bilan', couleur: '#0f172a', faitLe: 'bilan_publie_le' }
// Jeu de la semaine : une vidéo par semaine, sans lien avec un événement (jourSemaine : 1 = lundi … 7 = dimanche)
export const JEU_SEMAINE = { cle: 'jeu_semaine', libelle: 'Jeu de la semaine', court: 'Jeu semaine', couleur: '#db2777', jourSemaine: 4, heure: '17:00' }

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/
const vide = v => v === undefined || v === null || String(v).trim() === ''

export function reglagesPublication(settings = {}) {
  const jourBrut = settings.publication_jeu_semaine_jour
  const jourSemaine = Number(jourBrut)
  const heureJeu = String(settings.publication_jeu_semaine_heure ?? '').slice(0, 5)
  const rappelJeu = settings.publication_jeu_semaine_rappel
  const jeu_semaine = {
    jourSemaine: !vide(jourBrut) && Number.isInteger(jourSemaine) && jourSemaine >= 1 && jourSemaine <= 7 ? jourSemaine : JEU_SEMAINE.jourSemaine,
    heure: HEURE.test(heureJeu) ? heureJeu : JEU_SEMAINE.heure,
    rappel: vide(rappelJeu) ? true : String(rappelJeu) !== 'false',
  }
  return { ...reglagesActions(settings), jeu_semaine }
}

function reglagesActions(settings) {
  return Object.fromEntries(ACTIONS_PUBLICATION.map(a => {
    const brut = settings[`publication_${a.cle}_jours`]
    const j = Number(brut)
    const h = String(settings[`publication_${a.cle}_heure`] ?? '').slice(0, 5)
    const r = settings[`publication_${a.cle}_rappel`]
    return [a.cle, {
      jours: !vide(brut) && Number.isInteger(j) && j >= 0 && j <= 60 ? j : a.jours,
      heure: HEURE.test(h) ? h : a.heure,
      rappel: vide(r) ? true : String(r) !== 'false',
    }]
  }))
}

export function decalerJour(jour, n) {
  const [a, m, j] = jour.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10)
}

export function actionsEvenement(ev, reglages) {
  if (!ev?.date || ev.archived_at) return []
  const jourEv = String(ev.date).slice(0, 10)
  const type = typeEvenement(ev.title)
  const liste = ACTIONS_PUBLICATION
    .filter(a => type !== 'permanence' || a.permanence)
    .map(a => ({ cle: a.cle, evenementId: ev.id, jour: decalerJour(jourEv, -reglages[a.cle].jours), jourEvenement: jourEv, heure: reglages[a.cle].heure, faitLe: ev[a.faitLe] || null }))
  // Bilan : mêmes règles que les fenêtres Bilan (soirée / famille le lendemain, permanence le jour même)
  if (type !== 'permanence') liste.push({ cle: 'bilan', evenementId: ev.id, jour: decalerJour(jourEv, 1), jourEvenement: jourEv, heure: null, faitLe: ev.bilan_publie_le || null })
  else if (estPermanence(ev.title)) liste.push({ cle: 'bilan', evenementId: ev.id, jour: jourEv, jourEvenement: jourEv, heure: null, faitLe: ev.bilan_publie_le || null })
  return liste
}

// « passe » : plus la peine (événement passé ; bilan : une semaine après son jour), affiché en gris
/** Lundi de la semaine d'un jour « AAAA-MM-JJ ». */
export function lundiDe(jour) {
  const [a, m, j] = jour.split('-').map(Number)
  const numero = new Date(Date.UTC(a, m - 1, j)).getUTCDay() // 0 = dimanche
  return decalerJour(jour, -((numero + 6) % 7))
}

/**
 * Jeu de la semaine : une action par semaine entre `depuis` et `jusqua`, au jour réglé ; faite si une
 * vidéo a été publiée du lundi au dimanche (`publications` : dates à l'heure de Paris).
 */
export function actionsJeuSemaine({ depuis, jusqua, publications = [], reglages }) {
  const r = reglages.jeu_semaine
  const liste = []
  for (let lundi = lundiDe(depuis); lundi <= jusqua; lundi = decalerJour(lundi, 7)) {
    const dimanche = decalerJour(lundi, 6)
    const faite = publications.map(p => String(p).replace(' ', 'T')).filter(p => p.slice(0, 10) >= lundi && p.slice(0, 10) <= dimanche).sort()[0]
    liste.push({ cle: JEU_SEMAINE.cle, semaine: lundi, jour: decalerJour(lundi, r.jourSemaine - 1), heure: r.heure, faitLe: faite || null })
  }
  return liste
}

export function etatAction(action, aujourdhui) {
  if (action.faitLe) return 'fait'
  if (action.jour >= aujourdhui) return 'a_faire'
  const limite = action.cle === 'bilan' ? decalerJour(action.jour, 7)
    : action.cle === 'jeu_semaine' ? decalerJour(action.semaine, 6)
    : action.jourEvenement
  return limite && aujourdhui > limite ? 'passe' : 'en_retard'
}

const MINUTES_JOUR = 24 * 60

// « 12:00 » ou « 12:00:00 » → 720
function minutesDe(heure) {
  const [h, m] = String(heure).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
// « 2026-11-06 19:00:00 » → { jour: '2026-11-06', minutes: 1140 }
function lire(texte) {
  const [jour, heure = '00:00'] = String(texte).replace('T', ' ').split(' ')
  return { jour, minutes: minutesDe(heure) }
}
// Numéro du jour dans le calendrier (sans fuseau) et instant en minutes
const numeroJour = jour => { const [a, m, j] = jour.split('-').map(Number); return Date.UTC(a, m - 1, j) / 86400000 }
const instant = ({ jour, minutes }) => numeroJour(jour) * MINUTES_JOUR + minutes

/** Jeux distincts empruntés : un prêt rendu le jour même ne compte pas (même règle que le bilan). */
export function jeuxEmpruntes(prets) {
  const jeux = new Set()
  for (const p of prets) {
    const renduLeJourMeme = p.return_date && p.loan_date
      && String(p.return_date).slice(0, 10) === String(p.loan_date).slice(0, 10)
    // Jeu supprimé du catalogue : ignoré, comme dans la fenêtre Bilan
    if (!renduLeJourMeme && p.game_id != null) jeux.add(p.game_id)
  }
  return jeux.size
}

const dansCombien = n => (n >= 2 ? `dans ${n} jours` : n === 1 ? 'demain' : "aujourd'hui")
const moment = minutesFin => (minutesFin < 13 * 60 ? 'ce matin' : minutesFin < 18 * 60 ? 'cet après-midi' : 'ce soir')

// Rappel déjà parti, par action du calendrier des publications
const NOTIF = {
  mail_collectivites: 'notif_mail_collectivites_sent_at',
  annonce: 'notif_annonce_sent_at',
  mail_adherents: 'notif_mail_adherents_sent_at',
  story_veille: 'notif_story_veille_sent_at',
  story_jour: 'notif_jour_sent_at',
}
const TEXTES = {
  mail_collectivites: (ev, n) => [`✉️ Mail aux mairies : ${ev.title}`, `Envoyez le mail aux mairies, à la presse et aux écoles (événement ${dansCombien(n)}).`],
  annonce: (ev, n) => [`📣 ${ev.title} ${dansCombien(n)}`, "Publiez l'annonce sur Facebook et Instagram."],
  mail_adherents: (ev, n) => [`✉️ Mail aux adhérents : ${ev.title}`, `Envoyez le mail aux adhérents et aux inscrits (événement ${dansCombien(n)}).`],
  story_veille: ev => [`📸 Demain : ${ev.title}`, 'Postez une story pour rappeler le rendez-vous de demain.'],
  story_jour: ev => [`📸 C'est aujourd'hui : ${ev.title}`, 'Enregistrez la story du jour J, puis publiez-la sur Instagram ou Facebook.'],
}

/**
 * Rappels à envoyer à l'instant `maintenant` : [{ id, colonne, title, body, url }].
 * `colonne` = date d'envoi à mémoriser sur l'événement (le rappel ne repart plus).
 * `pretsParJour` : { 'AAAA-MM-JJ': [{ game_id, loan_date, return_date? }] } (permanences).
 * `reglages` : reglagesPublication(settings) — délais et heures du calendrier des publications.
 */
export function rappelsAEnvoyer({ maintenant, evenements, pretsParJour = {}, reglages = reglagesPublication({}) }) {
  const n = lire(maintenant)
  const tMaintenant = instant(n)
  const rappels = []
  for (const ev of evenements) {
    if (ev.archived_at) continue
    const d = lire(ev.date)
    const type = typeEvenement(ev.title)
    const joursAvant = numeroJour(d.jour) - numeroJour(n.jour)
    const ajouter = (colonne, title, body, fenetre) => rappels.push({ id: ev.id, colonne, title, body, url: `/admin/evenements?${fenetre}=${ev.id}` })

    // 1. Actions du calendrier des publications (délais et heures réglés dans les Paramètres)
    for (const a of actionsEvenement(ev, reglages)) {
      if (a.cle === 'bilan') continue
      const r = reglages[a.cle]
      if (!r.rappel || a.faitLe || ev[NOTIF[a.cle]]) continue
      const atteint = n.jour > a.jour || (n.jour === a.jour && n.minutes >= minutesDe(r.heure))
      if (!atteint) continue
      // Dernière chance : story de la veille avant le jour J, story du jour J le jour même,
      // le reste tant que l'événement n'a pas commencé
      const encoreUtile = a.cle === 'story_jour' ? n.jour === d.jour
        : a.cle === 'story_veille' ? n.jour < d.jour
        : instant(d) > tMaintenant
      if (!encoreUtile) continue
      const [title, body] = TEXTES[a.cle](ev, joursAvant)
      const fenetre = a.cle === 'annonce' || a.cle === 'story_jour' ? `annonce=${ev.id}` : `calendrier=${a.jour}`
      rappels.push({ id: ev.id, colonne: NOTIF[a.cle], title, body, url: `/admin/evenements?${fenetre}` })
    }
    if (ev.bilan_publie_le || ev.notif_bilan_sent_at) continue
    // 2. Bilan de permanence : 1 h après la fin, pendant 24 h, s'il y a eu des emprunts
    if (estPermanence(ev.title)) {
      const minutesFin = ev.end_time ? minutesDe(ev.end_time) : d.minutes + 120
      const fin = numeroJour(d.jour) * MINUTES_JOUR + minutesFin
      const nb = jeuxEmpruntes(pretsParJour[d.jour] || [])
      if (tMaintenant >= fin + 60 && tMaintenant < fin + MINUTES_JOUR && nb > 0) {
        ajouter('notif_bilan_sent_at', `📦 ${nb} ${nb === 1 ? 'jeu emprunté' : 'jeux empruntés'} ${moment(minutesFin)}`, 'Publiez le bilan de la permanence sur Facebook et Instagram.', 'bilan')
      }
    }
    // 3. Bilan de soirée ou d'après-midi famille : le lendemain à partir de 9h
    if (type !== 'permanence' && joursAvant === -1 && n.minutes >= 9 * 60) {
      ajouter('notif_bilan_sent_at', `📋 Bilan de ${ev.title}`, 'Renseignez les participants, les photos et les jeux joués, puis publiez le bilan.', 'bilan')
    }
  }
  return rappels
}

// ── Jeu de la semaine (vidéos du dossier Drive, rappel du jeudi 17 h) ─────────────
// Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
// Copie à l'identique de src/services/jeuSemaine.js (la fonction ne peut pas importer
// le site) : les changer aux deux endroits. rappels.test.js compare les deux copies.

const normaliserNomJeu = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export const nomDuFichier = nom => String(nom || '').replace(/\.[a-z0-9]+$/i, '').split('_')[0]

export function reconnaitreJeu(nomFichier, jeux) {
  const cle = normaliserNomJeu(nomDuFichier(nomFichier))
  if (!cle) return null
  const trouves = (jeux || []).filter(j => normaliserNomJeu(j.name) === cle)
  return trouves.length === 1 ? trouves[0] : null
}

export function fileJeuSemaine({ fichiers = [], lignes = [], jeux = [] }) {
  const parId = new Map(lignes.map(l => [l.drive_id, l]))
  const jeuDe = (ligne, nomFichier) => {
    if (ligne?.game_id != null) return jeux.find(j => String(j.id) === String(ligne.game_id)) ?? null
    return reconnaitreJeu(nomFichier, jeux)
  }
  const video = (driveId, nomFichier, creeLe, ligne) => ({
    driveId, nomFichier, creeLe, jeu: jeuDe(ligne, nomFichier), legende: ligne?.legende ?? null, publieLe: ligne?.publie_le ?? null,
  })
  const attente = fichiers
    .map(f => video(f.id, f.name, f.createdTime, parId.get(f.id)))
    .filter(v => !v.publieLe)
    .sort((a, b) => String(a.creeLe).localeCompare(String(b.creeLe)))
  const surDrive = new Map(fichiers.map(f => [f.id, f]))
  const publiees = lignes
    .filter(l => l.publie_le)
    .map(l => video(l.drive_id, l.nom_fichier, surDrive.get(l.drive_id)?.createdTime ?? null, l))
    .sort((a, b) => String(b.publieLe).localeCompare(String(a.publieLe)))
  return { attente, publiees }
}

export function prochaineVideo(attente = []) {
  if (attente.length === 0) return null
  const i = attente.findIndex(v => v.jeu && v.jeu.is_available !== false)
  if (i === -1) return { video: attente[0], sautee: null }
  const sautee = attente.slice(0, i).find(v => v.jeu && v.jeu.is_available === false) ?? null
  return { video: attente[i], sautee }
}

const URL_JEU_SEMAINE = '/admin/evenements?onglet=jeu-semaine'

/**
 * Lundi de la semaine (« AAAA-MM-JJ ») si `maintenant` est le jour réglé (jeudi par défaut) à partir de
 * l'heure réglée (17 h par défaut), sinon null — ou toujours null si le rappel est coupé (Paramètres →
 * Publications, ligne « Jeu de la semaine »).
 */
export function semaineDuRappel(maintenant, reglages = reglagesPublication({})) {
  const r = reglages.jeu_semaine
  if (!r.rappel) return null
  const n = lire(maintenant)
  const numero = numeroJour(n.jour)
  const jourSemaine = ((new Date(numero * 86400000).getUTCDay() + 6) % 7) + 1 // 1 = lundi … 7 = dimanche
  if (jourSemaine !== r.jourSemaine || n.minutes < minutesDe(r.heure)) return null
  return new Date((numero - (jourSemaine - 1)) * 86400000).toISOString().slice(0, 10)
}

/**
 * Rappel du jeu de la semaine pour la semaine `semaine` (son lundi), ou null si une vidéo a été
 * publiée depuis ce lundi 0 h. `publications` : dates à l'heure de Paris.
 * L'appelant vérifie qu'il n'est pas déjà parti (table rappels_jeu_semaine).
 */
export function rappelJeuSemaine({ semaine, attente = [], publications = [] }) {
  if (publications.some(p => String(p).slice(0, 10) >= semaine)) return null
  const proposition = prochaineVideo(attente)
  if (!proposition) {
    return { semaine, title: '🎬 Plus de vidéo en réserve', body: 'Ajoutez une nouvelle vidéo dans le dossier Drive.', url: URL_JEU_SEMAINE }
  }
  const { video } = proposition
  const nom = video.jeu?.name || nomDuFichier(video.nomFichier)
  return { semaine, title: `🎬 Jeu de la semaine : ${nom}`, body: 'Publiez la vidéo sur Facebook et Instagram.', url: URL_JEU_SEMAINE }
}
