/**
 * Gros chiffre façon bilan : chiffre crème contouré d'encre, doublé d'une ombre orange
 * décalée (le pseudo-élément recopie le chiffre via data-n).
 * taille : 'grand' (cartes d'événement) ou 'moyen' (cartes de permanence).
 */
const CLASSES = {
  grand:
    'text-[88px] sm:text-[104px] [-webkit-text-stroke:3px_#0f172a] before:left-[6px] before:top-[6px] before:[-webkit-text-stroke:3px_#0f172a]',
  moyen:
    'text-[60px] sm:text-[64px] [-webkit-text-stroke:2.5px_#0f172a] before:left-[4px] before:top-[4px] before:[-webkit-text-stroke:2.5px_#0f172a]',
}

export default function GrosChiffre({ n, taille = 'grand' }) {
  return (
    <span
      data-n={n}
      className={`relative isolate inline-block font-display font-extrabold leading-[0.9] tracking-[-0.05em] text-[#fdfaf6] [paint-order:stroke_fill] before:absolute before:-z-10 before:text-[#e38154] before:content-[attr(data-n)] ${CLASSES[taille]}`}
    >
      {n}
    </span>
  )
}
