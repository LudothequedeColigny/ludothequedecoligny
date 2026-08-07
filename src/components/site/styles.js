/**
 * Classes partagées du site public (style « papier découpé » :
 * contour noir 2px + ombre portée pleine, qui s'enfonce au survol).
 */

const BTN_BASE =
  'inline-flex items-center justify-center gap-2.5 rounded-[20px] border-2 border-[#0f172a] ' +
  'px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.14em] ' +
  'transition-[transform,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-50'

/** Orange, ombre encre — action principale */
export const BTN_PRIMARY =
  `${BTN_BASE} bg-[#e38154] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]`

/** Blanc, ombre bleu canard — action secondaire */
export const BTN_SECONDARY =
  `${BTN_BASE} bg-white text-[#1a5f7a] shadow-[5px_5px_0_#1a5f7a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#1a5f7a]`

/** Bleu canard, ombre encre — action principale sur fond clair */
export const BTN_TEAL =
  `${BTN_BASE} bg-[#1a5f7a] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]`

/** Blanc, ombre encre — action posée sur un aplat de couleur */
export const BTN_ON_COLOR =
  `${BTN_BASE} bg-white text-[#0f172a] shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]`

/** Carte de base : fond blanc, contour encre */
export const CARD = 'border-2 border-[#0f172a] bg-white'

/** Petite étiquette de section (« À ne pas manquer », « Souvenirs »…) */
export const EYEBROW = 'text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#e38154]'

/** Champ de saisie contouré */
export const INPUT =
  'w-full rounded-[20px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[15px] font-bold text-[#0f172a] outline-none placeholder:text-slate-400 focus:bg-white'
