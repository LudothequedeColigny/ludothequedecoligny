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

export function actionsParJour(evenements, reglages) {
  const jours = {}
  for (const ev of evenements) {
    for (const a of actionsEvenement(ev, reglages)) (jours[a.jour] ||= []).push({ ...a, evenement: ev })
  }
  const ordre = [...ACTIONS_PUBLICATION.map(a => a.cle), 'bilan']
  for (const liste of Object.values(jours)) liste.sort((x, y) => ordre.indexOf(x.cle) - ordre.indexOf(y.cle) || String(x.evenement.date).localeCompare(String(y.evenement.date)))
  return jours
}
