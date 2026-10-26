/**
 * Règles de la page publique « La vie de la ludothèque » : quelles cartes afficher,
 * les chiffres clés, le graphique de fréquentation, les filtres et le regroupement
 * par mois. Fonctions pures, sans base de données : testées avec `npm test`.
 * Conception : docs/superpowers/plans/2026-10-26-vie-ludotheque.md
 * Jamais d'emprunteur : les permanences ne montrent que des jeux.
 */
import {
  typeEvenement, dateLocale, lieuCourt, sansAccents, quandRendezVous, libelleNombre,
} from './diapos/regles.js'
import { estPermanence, jourComplet } from './diapos/permanence-regles.js'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const ETIQUETTES = { soiree: 'Soirée jeux !', famille: 'Après-midi en famille !' }
const GENRES = { soiree: 'Soirée', famille: 'Famille' }

/** Nombre de participants, ou null (vide, 0, négatif, illisible = inconnu). */
function nombreParticipants(valeur) {
  if (valeur == null || valeur === '') return null
  const n = Number(valeur)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Ordre d'ajout (identifiant croissant) ; les lignes sans identifiant gardent leur place
const parId = lignes => [...lignes].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))

function regrouper(lignes, cle) {
  const groupes = new Map()
  for (const l of lignes || []) {
    if (!groupes.has(l[cle])) groupes.set(l[cle], [])
    groupes.get(l[cle]).push(l)
  }
  return groupes
}

function carteRendezVous(e, type, photosEvt, jeuxEvt) {
  const photos = parId(photosEvt).map(p => p.url).filter(Boolean)
  const ouverture = e.bilan_photo_ouverture
  const texte = typeof e.bilan_expression?.texte === 'string' ? e.bilan_expression.texte.trim() : ''
  const lieu = lieuCourt(e.location)
  return {
    id: e.id,
    type,
    date: dateLocale(e.date),
    titre: e.title,
    etiquette: ETIQUETTES[type] || e.title,
    quand: lieu ? `${quandRendezVous(e)} · ${lieu}` : quandRendezVous(e),
    photo: ouverture && photos.includes(ouverture) ? ouverture : (photos[0] || null),
    photos,
    nombre: nombreParticipants(e.participants_count),
    libelleNombre: libelleNombre(type),
    expression: texte || null,
    jeux: parId(jeuxEvt).map(j => ({ nom: j.name || '', image: j.image_url || null, dispo: !!j.in_catalogue })),
  }
}

/** Un jeu par `game_id` (un jeu prêté deux fois ne compte qu'une fois), trié par nom. */
function cartePermanence(e, lignes) {
  const vus = new Map()
  for (const l of lignes) {
    if (!vus.has(l.game_id)) vus.set(l.game_id, { nom: l.nom || '', image: l.image_url || null })
  }
  const jeux = [...vus.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  const date = dateLocale(e.date)
  return { id: e.id, type: 'permanence', date, quand: jourComplet(date), nombre: jeux.length, jeux }
}

/**
 * Cartes des événements passés (archivés compris), du plus récent au plus ancien.
 * `emprunts` = lignes de `jeux_empruntes_permanences()` ; null (fonction illisible)
 * → aucune carte de permanence.
 */
export function cartesEvenements({ evenements = [], photos = [], jeux = [], emprunts = [], maintenant }) {
  const photosPar = regrouper(photos, 'event_id')
  const jeuxPar = regrouper(jeux, 'event_id')
  const empruntsPar = regrouper(emprunts, 'event_id')
  const cartes = []
  for (const e of evenements || []) {
    if (!(dateLocale(e.date) < maintenant)) continue
    if (estPermanence(e.title)) {
      const carte = cartePermanence(e, empruntsPar.get(e.id) || [])
      if (carte.nombre > 0) cartes.push(carte)
      continue
    }
    const t = typeEvenement(e.title)
    const carte = carteRendezVous(e, t === 'permanence' ? 'autre' : t, photosPar.get(e.id) || [], jeuxPar.get(e.id) || [])
    if (carte.nombre || carte.photos.length || carte.jeux.length) cartes.push(carte)
  }
  return cartes.sort((a, b) => b.date - a.date)
}

/**
 * Les 4 chiffres de l'en-tête. `organises` : soirées et après-midi famille ;
 * `jeuxEmpruntes` : null quand aucune permanence n'a de données d'emprunt (chiffre masqué).
 */
export function chiffresCles({ cartes }) {
  const rendezVous = cartes.filter(c => c.type !== 'permanence')
  const permanences = cartes.filter(c => c.type === 'permanence')
  const noms = new Set(rendezVous.flatMap(c => c.jeux.map(j => sansAccents(j.nom).trim())).filter(Boolean))
  return {
    organises: cartes.filter(c => c.type === 'soiree' || c.type === 'famille').length,
    participants: rendezVous.reduce((s, c) => s + (c.nombre || 0), 0),
    jeuxJoues: noms.size,
    jeuxEmpruntes: permanences.length ? permanences.reduce((s, c) => s + c.nombre, 0) : null,
  }
}

/** Barres du graphique « Combien étions-nous ? », du plus ancien au plus récent. */
export function serieFrequentation(cartes) {
  return cartes
    .filter(c => (c.type === 'soiree' || c.type === 'famille') && c.nombre)
    .sort((a, b) => a.date - b.date)
    .map(c => ({
      id: c.id,
      type: c.type,
      nombre: c.nombre,
      jour: `${c.date.getDate() === 1 ? '1er' : c.date.getDate()} ${MOIS_COURTS[c.date.getMonth()]}`,
      genre: GENRES[c.type],
    }))
}

/** `filtre` : 'tout' | 'soiree' | 'famille' | 'permanence' (les « autres » ne sont que dans « Tout »). */
export const filtrer = (cartes, filtre) => (filtre === 'tout' ? cartes : cartes.filter(c => c.type === filtre))

export const compteurs = cartes => ({
  tout: cartes.length,
  soiree: cartes.filter(c => c.type === 'soiree').length,
  famille: cartes.filter(c => c.type === 'famille').length,
  permanence: cartes.filter(c => c.type === 'permanence').length,
})

/** Regroupe les cartes par mois, dans leur ordre : [{ cle: '2026-10', titre: 'Octobre 2026', cartes }]. */
export function parMois(cartes) {
  const groupes = []
  for (const c of cartes) {
    const cle = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}`
    let g = groupes[groupes.length - 1]
    if (!g || g.cle !== cle) {
      g = groupes.find(x => x.cle === cle)
      if (!g) {
        g = { cle, titre: `${MOIS[c.date.getMonth()]} ${c.date.getFullYear()}`, cartes: [] }
        groupes.push(g)
      }
    }
    g.cartes.push(c)
  }
  return groupes
}
