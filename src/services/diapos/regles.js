/**
 * Règles des visuels de bilan (carrousel et story) : quels textes, quelles photos,
 * quels jeux, dans quel ordre. Fonctions pures, sans canvas ni base de données :
 * testées avec `npm test`. Le dessin est fait par carrousel.js et story.js.
 * Conception : docs/superpowers/specs/2026-10-23-bilan-automatique-design.md
 */

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const MAX_JEUX = 6

const sansAccents = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Même détection que l'écran Communication et la page Vie de l'association. */
export function typeEvenement(titre) {
  const t = sansAccents(titre)
  if (t.includes('soiree')) return 'soiree'
  if (t.includes('famil')) return 'famille'
  return 'permanence'
}

/** Les dates d'événement sont à l'heure de Paris, sans fuseau : lues en heure locale. */
export function dateLocale(texte) {
  const [j, h = '00:00'] = String(texte).replace('T', ' ').split(' ')
  const [a, m, d] = j.split('-').map(Number)
  const [hh, mm] = h.split(':').map(Number)
  return new Date(a, m - 1, d, hh || 0, mm || 0)
}

export const jourMois = d =>`${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`
const heure = d => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`

export function formuleOuverture(dateEvenement, maintenant) {
  const d = dateLocale(dateEvenement)
  const jours = (maintenant - d) / 86400000
  return jours >= 0 && jours < 7 ? `${JOURS[d.getDay()]} dernier,` : `Le ${jourMois(d)},`
}

export function libelleEtiquette(type) {
  return type === 'famille' ? 'Après-midi jeux en famille !' : 'Soirée jeux !'
}

export function libelleNombre(type) {
  return type === 'famille' ? 'petits et grands !' : 'joueuses et joueurs !'
}

// « À la salle des fêtes de Coligny » → « Salle des fêtes de Coligny »
export const lieuCourt = l =>{
  const t = (l || '').trim().replace(/^(à|a)\s+(la|l')\s*/i, '')
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

export function dateEtLieu(event) {
  const lieu = lieuCourt(event.location)
  return lieu ? `${jourMois(dateLocale(event.date))} · ${lieu}` : jourMois(dateLocale(event.date))
}

export function quandRendezVous(event) {
  const d = dateLocale(event.date)
  return `${JOURS[d.getDay()]} ${jourMois(d)} · ${heure(d)}`
}

/** Six jeux au plus : ceux qui ont une photo d'abord, puis l'ordre de saisie. */
export function choisirJeux(jeux, max = MAX_JEUX) {
  const tries = [...jeux.filter(j => j.photo_url), ...jeux.filter(j => !j.photo_url)]
  return { retenus: tries.slice(0, max), ecartes: tries.slice(max) }
}

/** Premier événement à venir qui n'est pas une permanence, ou null. */
export function prochainRendezVous(evenements, maintenant) {
  return evenements
    .filter(e => typeEvenement(e.title) !== 'permanence' && dateLocale(e.date) > maintenant)
    .sort((a, b) => dateLocale(a.date) - dateLocale(b.date))[0] || null
}

function rendezVous(prochain) {
  if (!prochain) return null
  return {
    titre: prochain.title,
    quand: quandRendezVous(prochain),
    lieu: lieuCourt(prochain.location),
    affiche: prochain.image_url || null,
  }
}

/** Nombre de participants à afficher, ou null (vide, 0, négatif, illisible = inconnu). */
function nombreParticipants(participants) {
  if (participants == null || participants === '') return null
  const n = Number(participants)
  return Number.isFinite(n) && n > 0 ? n : null
}

function photosDeBase({ photos, photoOuverture, photoJeux }) {
  const ouverture = photoOuverture && photos.includes(photoOuverture) ? photoOuverture : photos[0]
  const autre = photos.find(p => p !== ouverture)
  const jeux = photoJeux && photos.includes(photoJeux) ? photoJeux : (autre || ouverture)
  return { ouverture, jeux }
}

/** Liste ordonnée des diapositives du carrousel (vide s'il n'y a aucune photo). */
export function planCarrousel(donnees) {
  const { event, participants, photos, jeux, prochain, maintenant } = donnees
  if (!photos.length) return []
  const type = typeEvenement(event.title)
  const base = photosDeBase(donnees)
  const plan = [{
    type: 'ouverture', photo: base.ouverture,
    formule: formuleOuverture(event.date, maintenant),
    etiquette: libelleEtiquette(type), lieu: dateEtLieu(event),
  }]
  const nombre = nombreParticipants(participants)
  if (nombre) {
    plan.push({ type: 'nombre', photo: base.ouverture, nombre, apres: libelleNombre(type) })
  }
  plan.push({ type: 'transition', photo: base.jeux })
  const { retenus } = choisirJeux(jeux)
  retenus.forEach((j, i) => plan.push({
    type: 'jeu', nom: j.name, jaquette: j.image, dispo: !!j.in_catalogue,
    photo: j.photo_url && photos.includes(j.photo_url) ? j.photo_url : null,
    fond: photos[i % photos.length],
  }))
  plan.push({ type: 'merci', rdv: rendezVous(prochain) })
  return plan
}

/** Les 4 images de la story (3 sans participants). */
export function planStory(donnees) {
  const { event, participants, photos, jeux, prochain, maintenant } = donnees
  if (!photos.length) return []
  const type = typeEvenement(event.title)
  const base = photosDeBase(donnees)
  const plan = [{
    type: 'ouverture', photo: base.ouverture,
    formule: formuleOuverture(event.date, maintenant),
    etiquette: libelleEtiquette(type), lieu: dateEtLieu(event),
  }]
  const nombre = nombreParticipants(participants)
  if (nombre) {
    plan.push({ type: 'nombre', photo: base.ouverture, nombre, apres: libelleNombre(type) })
  }
  plan.push({
    type: 'grille', photo: base.jeux,
    jeux: choisirJeux(jeux).retenus.map(j => ({ nom: j.name, jaquette: j.image, dispo: !!j.in_catalogue })),
  })
  plan.push({ type: 'merci', rdv: rendezVous(prochain) })
  return plan
}
