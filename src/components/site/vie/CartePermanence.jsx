import { Link } from 'react-router-dom'
import GrosChiffre from './GrosChiffre'
import BoiteAutocollant from './BoiteAutocollant'
import { lienCatalogue } from './liens'

/**
 * Carte compacte d'une permanence : nombre de jeux empruntés et leurs boîtes en
 * autocollant (12 au plus). Jamais d'emprunteur : seulement des jeux.
 * `adresse` : rue du local, lue dans les Paramètres (adresse_rue).
 */
const MAX_BOITES = 12

export default function CartePermanence({ carte, adresse }) {
  const montres = carte.jeux.slice(0, MAX_BOITES)
  const reste = carte.jeux.length - montres.length

  return (
    <article className="rounded-[28px] border-2 border-[#0f172a] bg-white px-[22px] pb-6 pt-[22px] shadow-[6px_6px_0_#1a5f7a]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="inline-block -rotate-2 rounded-[10px] border-2 border-[#0f172a] bg-[#1a5f7a] px-[11px] pb-1 pt-0.5 font-display text-[17px] font-extrabold tracking-[-0.03em] text-white shadow-[3px_3px_0_#0f172a]">
          Permanence
        </span>
        <span className="text-[11.5px] font-bold text-slate-500">{carte.quand}</span>
      </div>

      <div className="mb-4 mt-[18px] flex items-end gap-3.5">
        <GrosChiffre n={carte.nombre} taille="moyen" />
        <span className="pb-1 font-display text-[21px] font-extrabold leading-[1.05] tracking-[-0.035em]">
          {carte.nombre > 1 ? 'jeux ont été' : 'jeu a été'}
          <br />
          {carte.nombre > 1 ? 'empruntés !' : 'emprunté !'}
        </span>
      </div>

      <div className="grid grid-cols-4 items-end gap-x-3 gap-y-3.5">
        {montres.map((j, i) => (
          <Link key={`${j.nom}-${i}`} to={lienCatalogue(j.nom)} title={j.nom} className="group flex justify-center">
            <BoiteAutocollant image={j.image} nom={j.nom} taille="petit" teinte={i % 2 ? 'bleu' : 'orange'} penche={i % 2 ? 1 : 0} />
          </Link>
        ))}
      </div>
      {reste > 0 && (
        <p className="mt-3.5 font-display text-[15px] font-extrabold tracking-[-0.03em] text-[#1a5f7a]">
          … et {reste} {reste > 1 ? 'autres' : 'autre'}
        </p>
      )}

      <p className="mt-4 text-[11.5px] font-medium text-slate-500">
        {adresse ? `Au local, ${adresse}.` : 'Au local de la ludothèque.'}
      </p>
    </article>
  )
}
