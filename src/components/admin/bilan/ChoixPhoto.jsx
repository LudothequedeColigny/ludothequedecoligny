/**
 * Choix d'une photo du bilan parmi ses vignettes (fenêtres Bilan) ; avec `avecSans`,
 * une première case « sans photo » (valeur null), nommée par `libelleSans`.
 */
export default function ChoixPhoto({ photos, valeur, onChoix, avecSans, libelleSans = 'Sans' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {avecSans && (
        <button type="button" onClick={() => onChoix(null)} aria-pressed={valeur == null}
          className={'flex h-14 w-14 items-center justify-center rounded-xl border-2 px-1 text-center text-[8px] font-black uppercase leading-tight text-slate-400 ' +
            (valeur == null ? 'border-[#1a5f7a] ring-2 ring-[#1a5f7a]/30' : 'border-slate-200')}>
          {libelleSans}
        </button>
      )}
      {photos.map(p => (
        <button key={p.id} type="button" onClick={() => onChoix(p.url)} aria-pressed={valeur === p.url}
          className={'h-14 w-14 overflow-hidden rounded-xl border-2 ' +
            (valeur === p.url ? 'border-[#1a5f7a] ring-2 ring-[#1a5f7a]/30' : 'border-transparent opacity-60 hover:opacity-100')}>
          <img src={p.url} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  )
}
