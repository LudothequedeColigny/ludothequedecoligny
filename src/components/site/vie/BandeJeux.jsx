import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import BoiteAutocollant from './BoiteAutocollant'
import { lienCatalogue } from './liens'

/**
 * Bande « Et on a joué à… N jeux » d'une carte de soirée ou d'après-midi en famille :
 * boîtes en autocollant, « À emprunter » pour celles de la collection, chacune menant
 * au catalogue filtré sur son nom (les autres ne mènent nulle part : le catalogue
 * n'aurait rien à montrer). Défile de côté quand elles ne tiennent pas.
 */
export default function BandeJeux({ jeux }) {
  const aEmprunter = jeux.filter(j => j.dispo).length

  return (
    <div className="border-t-2 border-[#0f172a] bg-[#fdfaf6] pb-[18px] pt-[22px]">
      <div className="mb-1.5 flex flex-col gap-0.5 px-[22px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 min-[900px]:px-[34px]">
        <h4 className="font-display text-[21px] font-extrabold tracking-[-0.04em] sm:text-[24px]">
          Et on a joué à…{' '}
          <em className="whitespace-nowrap not-italic text-[#e38154]">
            {jeux.length} {jeux.length > 1 ? 'jeux' : 'jeu'}
          </em>
        </h4>
        {aEmprunter > 0 && (
          <span className="whitespace-nowrap text-[11px] font-bold text-slate-500">
            {aEmprunter} à emprunter
          </span>
        )}
      </div>

      <div className="flex snap-x snap-mandatory gap-[22px] overflow-x-auto px-[22px] pb-3.5 pt-4 [mask-image:linear-gradient(90deg,#000_calc(100%-40px),transparent)] [scrollbar-width:none] after:w-3 after:flex-none after:content-[''] min-[900px]:px-[34px]">
        {jeux.map((j, i) => {
          const contenu = (
            <>
              <BoiteAutocollant image={j.image} nom={j.nom} teinte={i % 2 ? 'bleu' : 'orange'} penche={i} />
              <span className="mt-3 font-display text-[14.5px] font-extrabold leading-[1.15] tracking-[-0.03em]">
                {j.nom}
              </span>
              {j.dispo && (
                <span className="mt-[7px] inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border-[1.5px] border-[#0f172a] bg-[#1a5f7a] py-[3px] pl-[7px] pr-[9px] text-[8.5px] font-extrabold uppercase tracking-[0.1em] text-white">
                  <Check size={11} strokeWidth={4} />
                  À emprunter
                </span>
              )}
            </>
          )
          const classes = 'group flex w-[128px] flex-none snap-start flex-col items-center text-center'
          return j.dispo ? (
            <Link key={`${j.nom}-${i}`} to={lienCatalogue(j.nom)} title={`${j.nom} — voir au catalogue`} className={classes}>
              {contenu}
            </Link>
          ) : (
            <div key={`${j.nom}-${i}`} className={classes}>{contenu}</div>
          )
        })}
      </div>
    </div>
  )
}
