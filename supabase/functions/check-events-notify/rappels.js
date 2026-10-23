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
    if (!renduLeJourMeme) jeux.add(p.game_id)
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
