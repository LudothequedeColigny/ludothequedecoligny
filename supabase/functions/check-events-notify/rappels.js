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

/**
 * Rappels à envoyer à l'instant `maintenant` : [{ id, colonne, title, body, url }].
 * `colonne` = date d'envoi à mémoriser sur l'événement (le rappel ne repart plus).
 * `pretsParJour` : { 'AAAA-MM-JJ': [{ game_id, loan_date, return_date? }] } (permanences).
 */
export function rappelsAEnvoyer({ maintenant, evenements, pretsParJour = {} }) {
  const n = lire(maintenant)
  const tMaintenant = instant(n)
  const rappels = []
  for (const ev of evenements) {
    if (ev.archived_at) continue
    const d = lire(ev.date)
    const type = typeEvenement(ev.title)
    const joursAvant = numeroJour(d.jour) - numeroJour(n.jour)
    const ajouter = (colonne, title, body, fenetre) => rappels.push({ id: ev.id, colonne, title, body, url: `/admin/evenements?${fenetre}=${ev.id}` })

    // 1. Annonce : soirée ou famille à venir dans 10 jours au plus, à partir de 18h
    if (type !== 'permanence' && !ev.annonce_publiee_le && !ev.notif_annonce_sent_at
      && n.minutes >= 18 * 60 && instant(d) > tMaintenant && joursAvant <= 10) {
      ajouter('notif_annonce_sent_at', `📣 ${ev.title} ${dansCombien(joursAvant)}`, "Publiez l'annonce sur Facebook et Instagram.", 'annonce')
    }
    // 2. Story : le jour J à partir de 9h, tout événement
    if (joursAvant === 0 && n.minutes >= 9 * 60 && !ev.notif_jour_sent_at) {
      ajouter('notif_jour_sent_at', `📸 C'est aujourd'hui : ${ev.title}`, 'Enregistrez la story du jour J, puis publiez-la sur Instagram ou Facebook.', 'annonce')
    }
    if (ev.bilan_publie_le || ev.notif_bilan_sent_at) continue
    // 3. Bilan de permanence : 1 h après la fin, pendant 24 h, s'il y a eu des emprunts
    if (estPermanence(ev.title)) {
      const minutesFin = ev.end_time ? minutesDe(ev.end_time) : d.minutes + 120
      const fin = numeroJour(d.jour) * MINUTES_JOUR + minutesFin
      const nb = jeuxEmpruntes(pretsParJour[d.jour] || [])
      if (tMaintenant >= fin + 60 && tMaintenant < fin + MINUTES_JOUR && nb > 0) {
        ajouter('notif_bilan_sent_at', `📦 ${nb} ${nb === 1 ? 'jeu emprunté' : 'jeux empruntés'} ${moment(minutesFin)}`, 'Publiez le bilan de la permanence sur Facebook et Instagram.', 'bilan')
      }
    }
    // 4. Bilan de soirée ou d'après-midi famille : le lendemain à partir de 9h
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

const JEUDI = 4
const URL_JEU_SEMAINE = '/admin/evenements?onglet=jeu-semaine'

/** Lundi de la semaine (« AAAA-MM-JJ ») si `maintenant` est un jeudi à partir de 17 h, sinon null. */
export function semaineDuRappel(maintenant) {
  const n = lire(maintenant)
  const numero = numeroJour(n.jour)
  const jourSemaine = new Date(numero * 86400000).getUTCDay()
  if (jourSemaine !== JEUDI || n.minutes < 17 * 60) return null
  return new Date((numero - 3) * 86400000).toISOString().slice(0, 10)
}

/**
 * Rappel du jeudi pour la semaine `semaine` (son lundi), ou null si une vidéo a été
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
