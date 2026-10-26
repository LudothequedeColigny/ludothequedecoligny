import Reveal from '../Reveal'

/**
 * « Combien étions-nous ? » : une barre par soirée (bleu) ou après-midi en famille
 * (orange), du plus ancien au plus récent. `serie` : résultat de serieFrequentation().
 * Au-delà de quelques barres, le graphique défile de côté sur téléphone.
 */
function echelle(maxi) {
  const pas = maxi <= 40 ? 10 : maxi <= 80 ? 20 : 50
  const haut = Math.max(pas, Math.ceil(maxi / pas) * pas)
  const lignes = []
  for (let v = pas; v <= haut; v += pas) lignes.push(v)
  return { haut, lignes }
}

// La barre la plus haute occupe 86 % de la hauteur : le chiffre tient au-dessus
const REMPLI = 86

export default function GraphiqueFrequentation({ serie }) {
  const { haut, lignes } = echelle(Math.max(...serie.map(p => p.nombre), 1))
  const largeurMin = serie.length * 64

  return (
    <Reveal className="rounded-[32px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] pb-[18px] pt-[22px] shadow-[8px_8px_0_#1a5f7a] md:px-9 md:pb-6 md:pt-[30px]">
      <div className="mb-[18px] flex flex-wrap gap-x-[22px] gap-y-2.5 text-[12px] font-bold">
        <span className="flex items-center gap-[7px]">
          <i className="inline-block h-3.5 w-3.5 rounded-[4px] border-2 border-[#0f172a] bg-[#1a5f7a]" />
          Soirées jeux
        </span>
        <span className="flex items-center gap-[7px]">
          <i className="inline-block h-3.5 w-3.5 rounded-[4px] border-2 border-[#0f172a] bg-[#e38154]" />
          Après-midi en famille
        </span>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
        <div style={{ minWidth: largeurMin }}>
          <div className="relative flex h-[230px] items-end justify-around gap-2.5 border-b-2 border-[#0f172a] px-[2%]">
            {lignes.map(v => (
              <div
                key={v}
                className="absolute inset-x-0 border-t-[1.5px] border-dashed border-slate-200"
                style={{ bottom: `${(v / haut) * REMPLI}%` }}
              />
            ))}
            {serie.map(p => (
              <div
                key={p.id}
                title={`${p.nombre} participants — ${p.jour}`}
                className="relative z-[1] flex h-full max-w-[120px] flex-1 flex-col items-center justify-end"
              >
                <span className="mb-1.5 font-display text-[20px] font-extrabold">{p.nombre}</span>
                <span
                  className={`w-full rounded-t-[12px] border-2 border-b-0 border-[#0f172a] ${p.type === 'famille' ? 'bg-[#e38154]' : 'bg-[#1a5f7a]'}`}
                  style={{ height: `${(p.nombre / haut) * REMPLI}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex justify-around gap-2.5 px-[2%]">
            {serie.map(p => (
              <div key={p.id} className="max-w-[120px] flex-1 text-center text-[11px] font-extrabold leading-[1.35]">
                {p.jour}
                <small className="block text-[10px] font-semibold text-slate-500">{p.genre}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11.5px] font-medium text-slate-500">
        Les permanences n'y figurent pas : on y compte les jeux empruntés, pas les visiteurs.
      </p>
    </Reveal>
  )
}
