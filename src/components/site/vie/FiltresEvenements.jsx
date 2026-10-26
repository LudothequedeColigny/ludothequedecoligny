/**
 * Filtres de « Nos derniers rendez-vous », avec le nombre de cartes de chacun.
 * Un filtre sans carte n'est pas proposé (sauf « Tout »).
 */
const FILTRES = [
  ['tout', 'Tout'],
  ['soiree', 'Soirées'],
  ['famille', 'Après-midi famille'],
  ['permanence', 'Permanences'],
]

export default function FiltresEvenements({ filtre, compteurs, onChange }) {
  return (
    <div
      role="group"
      aria-label="Filtrer les rendez-vous"
      className="-mx-4 mb-2 flex gap-2.5 overflow-x-auto px-4 pb-2.5 pt-1 [scrollbar-width:none] md:justify-center"
    >
      {FILTRES.filter(([cle]) => cle === 'tout' || compteurs[cle] > 0).map(([cle, libelle]) => {
        const actif = cle === filtre
        return (
          <button
            key={cle}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(cle)}
            className={`flex flex-none items-center rounded-full border-2 border-[#0f172a] px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] ${actif ? 'bg-[#0f172a] text-white shadow-[3px_3px_0_#e38154] hover:shadow-[1px_1px_0_#e38154]' : 'bg-white shadow-[3px_3px_0_#0f172a] hover:shadow-[1px_1px_0_#0f172a]'}`}
          >
            {libelle}
            <span
              className={`ml-1.5 inline-block rounded-full border-[1.5px] px-[7px] text-[10px] tracking-normal ${actif ? 'border-[#e38154] bg-[#e38154] text-white' : 'border-[#0f172a] bg-[#fdfaf6]'}`}
            >
              {compteurs[cle]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
