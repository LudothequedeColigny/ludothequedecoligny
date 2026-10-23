/**
 * Règles du carrousel « Nouveaux jeux » (images 1080 × 1350, 10 au plus), d'après la
 * maquette validée par Victor le 23/10/2026 (« Maquette bilan soirée jeux/nouveaux-jeux-maquette »).
 * Fonctions pures, testées par `npm test`. Dessin : nouveaux-jeux.js.
 *
 * Ordre : couverture, une image par jeu (8 au plus), puis la diapositive « Prochaine
 * permanence » du bilan de permanence (même dessin).
 */

/** Images de jeux au plus : avec la couverture et la prochaine permanence, 10 images. */
export const MAX_IMAGES_JEUX = 8
const MAX_JAQUETTES_COUVERTURE = 5
const CASES_MOSAIQUE = 8

/**
 * Pastilles d'un jeu : « 2 à 4 joueurs », « Dès 8 ans ». Seulement les valeurs cohérentes :
 * minimum et maximum connus avec maximum ≥ minimum ; âge supérieur à 0. Pas de durée.
 */
export function detailsJeu(jeu) {
  const res = []
  const min = Number(jeu?.min_players) || 0
  const max = Number(jeu?.max_players) || 0
  if (min > 0 && max > 0 && max >= min) {
    res.push(min === max ? `${min} joueur${min > 1 ? 's' : ''}` : `${min} à ${max} joueurs`)
  }
  const age = Number(jeu?.min_age) || 0
  if (age > 0) res.push(`Dès ${age} ans`)
  return res
}

/**
 * Plan des images. `jeux` = jeux cochés, dans l'ordre affiché (champs de la table games) ;
 * `prochaine` = résultat de prochainePermanence (permanence-regles.js), ou null.
 * Formes : { type: 'couverture', jaquettes, mosaique, nombre, phrase },
 * { type: 'jeu', nom, jaquette, infos, index }, { type: 'prochaine', mosaique, prochaine }.
 */
export function planNouveauxJeux({ jeux, prochaine }) {
  const liste = jeux || []
  if (!liste.length) return []
  const jaquettes = liste.map(j => j.image_url).filter(Boolean)
  // Fond des images 1 et dernière : 8 cases, jaquettes répétées s'il y en a moins
  const mosaique = jaquettes.length
    ? Array.from({ length: CASES_MOSAIQUE }, (_, i) => jaquettes[i % jaquettes.length])
    : []
  const n = liste.length
  return [
    {
      type: 'couverture',
      jaquettes: jaquettes.slice(0, MAX_JAQUETTES_COUVERTURE),
      mosaique,
      // Le nombre compte tous les jeux cochés, même au-delà des 8 images
      nombre: n,
      phrase: n === 1 ? 'nouveau jeu à emprunter !' : 'nouveaux jeux à emprunter !',
    },
    ...liste.slice(0, MAX_IMAGES_JEUX).map((j, index) => ({
      type: 'jeu',
      nom: String(j.name || '').trim(),
      jaquette: j.image_url || null,
      infos: detailsJeu(j),
      index,
    })),
    { type: 'prochaine', mosaique, prochaine: prochaine || null },
  ]
}
