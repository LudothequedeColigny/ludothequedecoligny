/**
 * Règles de l'annonce d'un événement (carrousel 4:5) et de la story du jour J.
 * Fonctions pures, testées par `npm test`. Dessin : annonce.js.
 * Conception : docs/superpowers/specs/2026-10-23-annonce-evenement-design.md
 */
import { typeEvenement, dateLocale, quandRendezVous, lieuCourt, jourMois, sansAccents } from './regles.js'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const heure = d => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`
const heureTexte = t => { const [h, m] = String(t).split(':').map(Number); return `${h}h${m ? String(m).padStart(2, '0') : ''}` }

export const TEXTES_TYPES = {
  soiree: {
    titre: 'Une soirée pour jouer entre amis !',
    points: ['Des dizaines de jeux à découvrir', 'Des bénévoles pour vous expliquer les règles', 'Débutants ou joueurs aguerris, chacun trouve son jeu'],
  },
  famille: {
    titre: 'Un après-midi pour jouer en famille !',
    points: ['Des jeux pour petits et grands', 'Des bénévoles pour vous expliquer les règles', 'Venez en famille ou entre amis'],
  },
}
export const INFOS_TYPES = [
  { titre: 'Gratuit et ouvert à tous', detail: 'adhérents ou non, débutants bienvenus' },
  { titre: 'Apportez à grignoter', detail: 'ou à boire, à partager' },
]

/**
 * Phrase proposée sous l'affiche (permanence et autres événements) : le nombre de jeux,
 * arrondi à la centaine inférieure pour rester vrai (« Plus de 300 » pour 312 jeux).
 */
export function phraseParDefaut(nbJeux) {
  const n = Number(nbJeux) || 0
  if (n > 100) return `Plus de ${Math.floor((n - 1) / 100) * 100} jeux à découvrir et à emprunter`
  if (n > 0) return `${n} jeux à découvrir et à emprunter`
  return 'Des jeux à découvrir et à emprunter'
}

/**
 * Textes de l'annonce : ceux mémorisés pour l'événement, sinon les textes types.
 * Permanence et autres événements : seulement la phrase sous l'affiche.
 */
export function textesAnnonce(event, nbJeux) {
  if (typeEvenement(event.title) === 'permanence') {
    return { phrase: event.annonce?.phrase ?? phraseParDefaut(nbJeux) }
  }
  const type = typeEvenement(event.title) === 'famille' ? 'famille' : 'soiree'
  const base = TEXTES_TYPES[type]
  const a = event.annonce || {}
  return {
    titre: a.titre ?? base.titre,
    points: [0, 1, 2].map(i => (a.points?.[i] ?? base.points[i])),
    infos: [0, 1].map(i => ({ titre: a.infos?.[i]?.titre ?? INFOS_TYPES[i].titre, detail: a.infos?.[i]?.detail ?? INFOS_TYPES[i].detail })),
  }
}

export function formuleJourJ(dateTexte) {
  const h = dateLocale(dateTexte).getHours()
  if (h >= 17) return "C'est ce soir !"
  if (h >= 12) return "C'est cet après-midi !"
  return "C'est ce matin !"
}

export function lignesQuand(event) {
  const d = dateLocale(event.date)
  return {
    jour: `${JOURS[d.getDay()]} ${jourMois(d)}`,
    heure: event.end_time ? `de ${heure(d)} à ${heureTexte(event.end_time)}` : `à partir de ${heure(d)}`,
  }
}

/** Dernier événement passé du même genre, avec participants (> 0) et au moins une photo. */
export function dernierEvenementSemblable(event, passes) {
  const type = typeEvenement(event.title)
  const avant = dateLocale(event.date)
  return passes
    .filter(p => typeEvenement(p.title) === type && dateLocale(p.date) < avant
      && Number(p.participants_count) > 0 && (p.photos || []).length > 0)
    .sort((a, b) => dateLocale(b.date) - dateLocale(a.date))[0] || null
}

function photosDuPasse(passe) {
  if (!passe) return { ouverture: null, autre: null, polaroids: [] }
  const ph = passe.photos || []
  const ouverture = ph.includes(passe.bilan_photo_ouverture) ? passe.bilan_photo_ouverture : ph[0]
  const reste = ph.filter(p => p !== ouverture)
  const autre = reste[0] || ouverture
  const polaroids = [...reste.filter(p => p !== autre), autre, ouverture].filter((p, i, t) => p && t.indexOf(p) === i).slice(0, 3)
  return { ouverture, autre, polaroids }
}

const genre = type => (type === 'famille' ? 'Après-midi en famille' : 'Soirée jeux')

export function planAnnonce({ event, passe, nbJeux }) {
  const type = typeEvenement(event.title)
  // Permanence et autres événements : une seule image, l'affiche sur son fond flouté
  if (type === 'permanence') {
    if (!event.image_url) return []
    const permanence = sansAccents(event.title).includes('permanence')
    return [{
      type: 'afficheSeule',
      affiche: event.image_url,
      fond: event.image_url,
      etiquette: permanence ? 'Prochaine permanence !' : 'Prochain rendez-vous !',
      phrase: textesAnnonce(event, nbJeux).phrase.trim(),
    }]
  }
  const textes = textesAnnonce(event)
  const quand = lignesQuand(event)
  const ph = photosDuPasse(passe)
  const affiche = event.image_url || null
  const fondFlou = ph.ouverture || affiche || null
  const lieu = lieuCourt(event.location)
  const plan = [
    { type: 'affiche', affiche, fond: affiche || ph.ouverture || null, titre: event.title, quand: quandRendezVous(event) },
    { type: 'attente', photo: ph.ouverture || affiche || null, floute: !ph.ouverture, titre: textes.titre, points: textes.points.filter(p => p && p.trim()) },
    {
      type: 'infos', fond: ph.autre || fondFlou,
      cartes: [
        { icone: 'calendrier', titre: quand.jour, detail: quand.heure },
        ...(lieu ? [{ icone: 'lieu', titre: lieu, detail: '' }] : []),
        ...textes.infos.map((x, i) => ({ icone: i === 0 ? 'de' : 'biscuit', titre: x.titre, detail: x.detail })).filter(c => c.titre && c.titre.trim()),
      ],
    },
  ]
  if (passe) {
    plan.push({ type: 'souvenir', fond: ph.ouverture, nombre: Number(passe.participants_count), photos: ph.polaroids, legende: `${genre(type)} du ${jourMois(dateLocale(passe.date))}` })
  }
  plan.push({ type: 'attend', quand: quandRendezVous(event) })
  return plan
}

export function planStoryJourJ({ event, passe }) {
  const d = dateLocale(event.date)
  const lieu = lieuCourt(event.location)
  const debut = event.end_time ? `de ${heure(d)} à ${heureTexte(event.end_time)}` : heure(d)
  const ph = photosDuPasse(passe)
  return [{
    type: 'jourJ',
    fond: event.image_url || ph.ouverture || null,
    formule: formuleJourJ(event.date),
    titre: event.title,
    affiche: event.image_url || null,
    ligne: lieu ? `${debut} · ${lieu}` : debut,
  }]
}
