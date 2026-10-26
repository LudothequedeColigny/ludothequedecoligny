/**
 * Règles des visuels de bilan (carrousel et story) : quels textes, quelles photos,
 * quels jeux, dans quel ordre. Fonctions pures, sans canvas ni base de données :
 * testées avec `npm test`. Le dessin est fait par carrousel.js et story.js.
 * Conception : docs/superpowers/specs/2026-10-23-bilan-automatique-design.md
 */

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const MAX_JEUX = 6
// Carrousel des soirées : 10 images au plus (avec l'expression libre, un jeu de moins)
export const MAX_IMAGES = 10

export const sansAccents = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

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

export const jourMois = d => `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`
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
export const lieuCourt = l => {
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

/**
 * Image « expression libre » (phrase saisie dans la fenêtre Bilan), ou null si le texte
 * est vide. Photo choisie qui n'est plus dans le bilan → fond flouté (`photo: null`).
 * `fond` = photo d'ouverture, floutée quand il n'y a pas de photo (ou qu'elle ne se charge pas).
 */
function diapoLibre(expression, photos, fond) {
  const texte = typeof expression?.texte === 'string' ? expression.texte.trim() : ''
  if (!texte) return null
  const photo = expression.photo && photos.includes(expression.photo) ? expression.photo : null
  return { type: 'libre', texte, photo, fond }
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
  const libre = diapoLibre(donnees.expression, photos, base.ouverture)
  // Images autres que les jeux : celles déjà posées, l'expression libre et « Merci »
  const autres = plan.length + (libre ? 1 : 0) + 1
  const { retenus } = choisirJeux(jeux, Math.min(MAX_JEUX, MAX_IMAGES - autres))
  retenus.forEach((j, i) => plan.push({
    type: 'jeu', nom: j.name, jaquette: j.image, dispo: !!j.in_catalogue,
    photo: j.photo_url && photos.includes(j.photo_url) ? j.photo_url : null,
    fond: photos[i % photos.length],
  }))
  if (libre) plan.push(libre)
  plan.push({ type: 'merci', rdv: rendezVous(prochain) })
  return plan
}

/** Les 4 images de la story (3 sans participants), plus l'expression libre s'il y en a une. */
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
  const libre = diapoLibre(donnees.expression, photos, base.ouverture)
  if (libre) plan.push(libre)
  plan.push({ type: 'merci', rdv: rendezVous(prochain) })
  return plan
}
