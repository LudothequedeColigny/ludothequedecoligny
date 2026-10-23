/**
 * Règles du bilan d'une permanence (carrousel 3 diapositives 4:5, pas de story).
 * Fonctions pures, testées par `npm test`. Dessin : permanence.js.
 * Conception : docs/superpowers/specs/2026-10-23-bilan-permanence-design.md
 * Jamais qui a emprunté quoi : seuls les jeux sont utilisés.
 */
import { dateLocale, jourMois, lieuCourt, sansAccents } from './regles.js'
import { heureTexte } from './annonce-regles.js'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const NUMERO_JOUR = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 }
export const MAX_CASES = 12
const CASES_MOSAIQUE = 8

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const jourComplet = d => `${JOURS[d.getDay()]} ${jourMois(d)}`
const minuscule = t => t.charAt(0).toLowerCase() + t.slice(1)
const plageHoraire = (debut, fin) => (fin ? `de ${heureTexte(debut)} à ${heureTexte(fin)}` : `à partir de ${heureTexte(debut)}`)

export const estPermanence = titre => sansAccents(titre || '').includes('permanence')

/** Un jeu par `game_id` (un jeu prêté deux fois n'apparaît qu'une fois), trié par nom. */
export function jeuxDistincts(prets) {
  const vus = new Map()
  for (const p of prets) {
    if (p.games && !vus.has(p.game_id)) vus.set(p.game_id, { id: p.game_id, nom: p.games.name || '', jaquette: p.games.image_url || null })
  }
  return [...vus.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

/** n-ième `jourSemaine` du mois (rang 5 = dernier), ou null. */
function nIemeJour(annee, mois, jourSemaine, rang) {
  const dates = []
  for (let d = new Date(annee, mois, 1); d.getMonth() === new Date(annee, mois, 1).getMonth(); d.setDate(d.getDate() + 1)) {
    if (d.getDay() === jourSemaine) dates.push(new Date(d))
  }
  return (rang === 5 ? dates[dates.length - 1] : dates[rang - 1]) || null
}

/**
 * Prochaine permanence strictement après le jour de `maintenant` : l'événement saisi
 * (non archivé) d'abord, sinon d'après les créneaux des Paramètres ; null si rien.
 */
export function prochainePermanence({ evenements = [], horaires = {}, maintenant }) {
  const aujourdhui = iso(maintenant)
  const ev = evenements
    .filter(e => estPermanence(e.title) && !e.archived_at && String(e.date).slice(0, 10) > aujourdhui)
    .sort((a, b) => dateLocale(a.date) - dateLocale(b.date))[0]
  if (ev) {
    const d = dateLocale(ev.date)
    const debut = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    return { date: iso(d), jour: jourComplet(d), heures: plageHoraire(debut, ev.end_time || null), lieu: lieuCourt(ev.location) }
  }
  const creneaux = [1, 2]
    .filter(n => n === 1 || horaires.horaire_2_actif === 'true')
    .map(n => ({ jour: horaires[`horaire_${n}_jour`], rang: Number(horaires[`horaire_${n}_rang`]), debut: horaires[`horaire_${n}_debut`], fin: horaires[`horaire_${n}_fin`] }))
    .filter(c => c.jour && c.rang && c.debut && NUMERO_JOUR[sansAccents(c.jour)] !== undefined)
  const candidats = []
  for (let m = 0; m < 3; m++) {
    for (const c of creneaux) {
      const d = nIemeJour(maintenant.getFullYear(), maintenant.getMonth() + m, NUMERO_JOUR[sansAccents(c.jour)], c.rang)
      if (d && iso(d) > aujourdhui) candidats.push({ d, c })
    }
  }
  const premier = candidats.sort((a, b) => a.d - b.d)[0]
  if (!premier) return null
  const lieu = horaires.adresse_rue ? `${horaires.adresse_rue}${horaires.adresse_ville ? ` à ${horaires.adresse_ville}` : ''}` : ''
  return { date: iso(premier.d), jour: jourComplet(premier.d), heures: plageHoraire(premier.c.debut, premier.c.fin || null), lieu }
}

export function planBilanPermanence({ event, prets, prochaine }) {
  if (!prets.length) return []
  const jeux = jeuxDistincts(prets)
  const jaquettes = jeux.map(j => j.jaquette).filter(Boolean)
  const mosaique = jaquettes.length ? Array.from({ length: CASES_MOSAIQUE }, (_, i) => jaquettes[i % jaquettes.length]) : []
  const cases = jeux.length > MAX_CASES
    ? [...jeux.slice(0, MAX_CASES - 1).map(j => ({ nom: j.nom, jaquette: j.jaquette })), { autres: jeux.length - (MAX_CASES - 1) }]
    : jeux.map(j => ({ nom: j.nom, jaquette: j.jaquette }))
  const n = prets.length
  return [
    {
      type: 'nombre', mosaique,
      intro: `${JOURS[dateLocale(event.date).getDay()]}, à la permanence…`,
      nombre: n,
      suite: n === 1 ? 'jeu est parti jouer dans les familles !' : 'jeux sont partis jouer dans les familles !',
    },
    { type: 'grille', cases },
    { type: 'prochaine', mosaique, prochaine },
  ]
}

export function texteBilanPermanence({ event, prets, prochaine }) {
  const n = prets.length
  const noms = jeuxDistincts(prets).map(j => j.nom)
  const lignes = [
    `🎲 Retour sur la permanence du ${minuscule(jourComplet(dateLocale(event.date)))} !`,
    '',
    `📦 ${n} ${n === 1 ? 'jeu est parti' : 'jeux sont partis'} jouer dans les familles${noms.length ? ` : ${noms.join(', ')}.` : ' !'}`,
  ]
  if (prochaine) {
    lignes.push('', `📅 Prochaine permanence : ${[minuscule(prochaine.jour), prochaine.heures, prochaine.lieu].filter(Boolean).join(', ')}.`)
  }
  lignes.push(
    '',
    "Pas encore adhérent ? L'adhésion se fait sur place, pour tout le foyer.",
    'Toutes les infos : www.ludothequedecoligny.fr/adherer',
    '',
    'Ludothèque de Coligny',
    'www.ludothequedecoligny.fr',
  )
  return lignes.join('\n')
}
