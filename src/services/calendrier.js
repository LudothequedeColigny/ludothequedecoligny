/**
 * Calendrier public des rendez-vous (accueil) : quelles vignettes afficher,
 * grille des mois, couleurs par type d'événement. Testé par `npm test`.
 * Les dates d'événement sont à l'heure de Paris, sans fuseau : lues en heure locale.
 */
import { dateLocale, sansAccents, typeEvenement } from './diapos/regles.js'

/** Les vignettes de l'accueil ne montrent que les rendez-vous du mois et demi à venir (2 mois : trop chargé, Victor, 30/10/2026). */
export const MOIS_VIGNETTES = 1.5

export const NOMS_MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
export const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
export const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** Couleur et nom de chaque sorte de rendez-vous (légende, pastilles, export). */
export const CATEGORIES = {
  soiree: { couleur: '#e38154', fond: '#fdf1ea', libelle: 'Soirée jeux' },
  famille: { couleur: '#10b981', fond: '#ecfdf5', libelle: 'Jeux en famille' },
  permanence: { couleur: '#1a5f7a', fond: '#e6f0f3', libelle: 'Permanence' },
  autre: { couleur: '#7c5cbf', fond: '#f3effb', libelle: 'Autre rendez-vous' },
}

export function categorie(event) {
  const titre = event?.title || ''
  const type = typeEvenement(titre)
  if (type !== 'permanence') return type
  return sansAccents(titre).includes('permanence') ? 'permanence' : 'autre'
}

const cleJour = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Jour d'un événement, au format AAAA-MM-JJ (sans passer par l'heure universelle). */
export const jourEvenement = event => String(event.date).slice(0, 10)

/**
 * Vignettes de l'accueil : les événements à venir dans le mois et demi qui vient (les demi-mois comptent 15 jours).
 * S'il n'y en a aucun, le prochain quand même, pour que l'accueil ne soit jamais vide.
 */
export function vignettesAccueil(aVenir, maintenant, mois = MOIS_VIGNETTES) {
  const limite = new Date(maintenant)
  limite.setMonth(limite.getMonth() + Math.floor(mois))
  limite.setDate(limite.getDate() + Math.round((mois % 1) * 30))
  const proches = aVenir.filter(e => dateLocale(e.date) < limite)
  if (proches.length === 0 && aVenir.length > 0) return [aVenir[0]]
  return proches
}

/** Semaines du mois (lundi en premier), chaque case : { date, cle, jour, dansLeMois }. */
export function grilleMois(annee, mois) {
  const premier = new Date(annee, mois, 1)
  const decalage = (premier.getDay() + 6) % 7
  const debut = new Date(annee, mois, 1 - decalage)
  const semaines = []
  const curseur = new Date(debut)
  do {
    const semaine = []
    for (let i = 0; i < 7; i++) {
      semaine.push({ date: new Date(curseur), cle: cleJour(curseur), jour: curseur.getDate(), dansLeMois: curseur.getMonth() === mois })
      curseur.setDate(curseur.getDate() + 1)
    }
    semaines.push(semaine)
  } while (curseur.getMonth() === mois)
  return semaines
}

/** Événements d'un mois, dans l'ordre. */
export function evenementsDuMois(evenements, annee, mois) {
  const prefixe = `${annee}-${String(mois + 1).padStart(2, '0')}`
  return evenements
    .filter(e => jourEvenement(e).startsWith(prefixe))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

/** Événements rangés par jour : { 'AAAA-MM-JJ': [événements] }. */
export function parJour(evenements) {
  const jours = {}
  for (const e of evenements) (jours[jourEvenement(e)] ||= []).push(e)
  return jours
}

/** Mois consultables : du mois en cours jusqu'au dernier mois qui a un rendez-vous prévu. */
export function moisDisponibles(evenements, maintenant) {
  const liste = [{ annee: maintenant.getFullYear(), mois: maintenant.getMonth() }]
  const dernier = evenements.reduce((max, e) => (jourEvenement(e) > max ? jourEvenement(e) : max), '')
  if (!dernier) return liste
  const [a, m] = dernier.split('-').map(Number)
  const fin = a * 12 + (m - 1)
  for (let k = liste[0].annee * 12 + liste[0].mois + 1; k <= fin; k++) {
    liste.push({ annee: Math.floor(k / 12), mois: k % 12 })
  }
  return liste
}

export const nomMois = (annee, mois) => `${NOMS_MOIS[mois]} ${annee}`

/** « 19h », « 10h – 12h », « 14h30 – 16h ». */
export function horaire(event) {
  const d = dateLocale(event.date)
  const h = (heures, minutes) => `${heures}h${minutes ? String(minutes).padStart(2, '0') : ''}`
  const debut = h(d.getHours(), d.getMinutes())
  if (!event.end_time) return debut
  const [fh, fm] = String(event.end_time).split(':').map(Number)
  return `${debut} – ${h(fh, fm)}`
}

/** « Vendredi 6 novembre ». */
export function jourLong(event) {
  const d = dateLocale(event.date)
  const nom = JOURS_LONGS[d.getDay()]
  return `${nom[0].toUpperCase()}${nom.slice(1)} ${d.getDate() === 1 ? '1er' : d.getDate()} ${NOMS_MOIS[d.getMonth()].toLowerCase()}`
}

/** Nom de fichier d'un mois exporté : « calendrier-ludotheque-2026-11.jpg ». */
export const nomFichierMois = (annee, mois, extension) =>
  `calendrier-ludotheque-${annee}-${String(mois + 1).padStart(2, '0')}.${extension}`
