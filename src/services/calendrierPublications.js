import { typeEvenement } from './diapos/regles.js'
import { estPermanence } from './diapos/permanence-regles.js'

/**
 * Calendrier des publications (onglet Calendrier de Communication) : pour chaque événement,
 * les actions de communication datées. Délais et heures de rappel réglés dans les Paramètres
 * (table settings, clés publication_<clé>_jours / _heure / _rappel), défauts ci-dessous.
 * Conception : docs/superpowers/specs/2026-11-02-calendrier-publications-design.md
 * COPIÉ À L'IDENTIQUE dans supabase/functions/check-events-notify/rappels.js (la fonction ne peut
 * pas importer le site) : changer les deux ; rappels.test.js compare les deux copies.
 * Dates à l'heure de Paris, sans fuseau (« 2026-11-06 19:00:00 »).
 */
export const ACTIONS_PUBLICATION = [
  { cle: 'mail_collectivites', libelle: 'Mail mairies & presse', court: 'Mail mairies', couleur: '#1a5f7a', jours: 21, heure: '18:00', permanence: false, faitLe: 'mail_collectivites_envoye_le' },
  { cle: 'annonce', libelle: 'Annonce réseaux', court: 'Annonce', couleur: '#3b82f6', jours: 10, heure: '18:00', permanence: true, faitLe: 'annonce_publiee_le' },
  { cle: 'mail_adherents', libelle: 'Mail adhérents', court: 'Mail adhérents', couleur: '#10b981', jours: 7, heure: '18:00', permanence: false, faitLe: 'mail_adherents_envoye_le' },
  { cle: 'story_veille', libelle: 'Story de la veille', court: 'Story veille', couleur: '#a855f7', jours: 1, heure: '17:00', permanence: true, faitLe: 'story_veille_faite_le' },
  { cle: 'story_jour', libelle: 'Story du jour J', court: 'Story J', couleur: '#e38154', jours: 0, heure: '09:00', permanence: true, faitLe: 'story_jour_faite_le' },
]
export const BILAN = { cle: 'bilan', libelle: 'Bilan', court: 'Bilan', couleur: '#0f172a', faitLe: 'bilan_publie_le' }

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/
const vide = v => v === undefined || v === null || String(v).trim() === ''

export function reglagesPublication(settings = {}) {
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
export function etatAction(action, aujourdhui) {
  if (action.faitLe) return 'fait'
  if (action.jour >= aujourdhui) return 'a_faire'
  const limite = action.cle === 'bilan' ? decalerJour(action.jour, 7) : action.jourEvenement
  return limite && aujourdhui > limite ? 'passe' : 'en_retard'
}

export function actionsParJour(evenements, reglages) {
  const jours = {}
  for (const ev of evenements) {
    for (const a of actionsEvenement(ev, reglages)) (jours[a.jour] ||= []).push({ ...a, evenement: ev })
  }
  const ordre = [...ACTIONS_PUBLICATION.map(a => a.cle), 'bilan']
  for (const liste of Object.values(jours)) liste.sort((x, y) => ordre.indexOf(x.cle) - ordre.indexOf(y.cle) || String(x.evenement.date).localeCompare(String(y.evenement.date)))
  return jours
}
