/**
 * Styles de boutons de l'espace de gestion (contour encre + ombre pleine décalée
 * qui s'enfonce au survol). Reprend les 5 variantes de la maquette.
 *
 * ⚠️ Les classes sont écrites en toutes lettres, jamais assemblées avec une
 * variable : Tailwind lit le texte du fichier et ne verrait pas une classe
 * construite à l'exécution (il générerait même une règle invalide).
 */

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[18px] border-2 border-[#0f172a] ' +
  'px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] ' +
  'transition-[transform,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-50'

const PRESS_INK =
  'shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]'
const PRESS_TEAL =
  'shadow-[4px_4px_0_#1a5f7a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1a5f7a]'
const PRESS_ROSE =
  'shadow-[4px_4px_0_#f43f5e] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#f43f5e]'

/** Orange — action principale (créer, ajouter) */
export const BTN_ORANGE = `${BASE} bg-[#e38154] text-white ${PRESS_INK}`

/** Bleu canard — action secondaire de même importance */
export const BTN_TEAL = `${BASE} bg-[#1a5f7a] text-white ${PRESS_INK}`

/** Encre — action neutre (scanner, consulter) */
export const BTN_INK = `${BASE} bg-[#0f172a] text-white ${PRESS_TEAL}`

/** Contour — action discrète */
export const BTN_OUTLINE =
  `${BASE} bg-white text-[#1a5f7a] shadow-[4px_4px_0_#1a5f7a] hover:bg-[#1a5f7a] hover:text-white`

/** Contour rouge — quitter, se déconnecter */
export const BTN_DANGER = `${BASE} bg-white text-[#f43f5e] ${PRESS_ROSE}`
