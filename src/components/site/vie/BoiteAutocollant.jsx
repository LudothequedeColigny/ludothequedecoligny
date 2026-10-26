import { Dice5 } from 'lucide-react'
import useAutocollant from '../../../hooks/useAutocollant'

/**
 * Boîte de jeu façon autocollant (même effet que les publications des bilans).
 * Tant que l'autocollant n'est pas prêt (ou s'il ne peut pas être fabriqué), la jaquette
 * s'affiche dans un cadre blanc contouré avec ombre pleine, dans le même emplacement :
 * rien ne bouge dans la page quand l'autocollant arrive.
 *
 * taille : 'grand' (bande « Et on a joué à… ») ou 'petit' (cartes de permanence)
 * teinte : 'orange' ou 'bleu' (couleur de l'ombre)
 * penche : n° de la boîte, pour varier l'inclinaison
 */
const INCLINAISONS = ['-rotate-3', 'rotate-2', '-rotate-1']

const TAILLES = {
  grand: {
    place: 'h-[124px] w-[128px]',
    autocollant: 'max-h-[124px] max-w-[128px]',
    cadre: 'max-h-[118px] max-w-[118px] rounded-[9px] border-[2.5px] p-[5px]',
    vide: 'h-[110px] w-[96px] rounded-[9px] border-[2.5px]',
  },
  petit: {
    place: 'h-[78px] w-full',
    autocollant: 'max-h-[80px] max-w-full',
    cadre: 'max-h-[74px] max-w-full rounded-[7px] border-2 p-[3px]',
    vide: 'h-[70px] w-[60px] rounded-[7px] border-2',
  },
}

const OMBRES = {
  grand: { orange: 'shadow-[5px_5px_0_#e38154]', bleu: 'shadow-[5px_5px_0_#1a5f7a]' },
  petit: { orange: 'shadow-[3px_3px_0_#e38154]', bleu: 'shadow-[3px_3px_0_#1a5f7a]' },
}

export default function BoiteAutocollant({ image, nom, taille = 'grand', teinte = 'orange', penche = 0 }) {
  const [ref, src] = useAutocollant(image, teinte)
  const t = TAILLES[taille]
  const inclinaison = INCLINAISONS[penche % INCLINAISONS.length]

  return (
    <span ref={ref} className={`flex items-end justify-center ${t.place}`}>
      <span
        className={`flex max-h-full max-w-full items-end justify-center transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-0 ${inclinaison}`}
      >
        {src ? (
          <img src={src} alt={nom} className={`h-auto w-auto object-contain ${t.autocollant}`} draggable={false} />
        ) : image ? (
          <img
            src={image}
            alt={nom}
            loading="lazy"
            className={`h-auto w-auto border-[#0f172a] bg-white object-contain ${t.cadre} ${OMBRES[taille][teinte]}`}
          />
        ) : (
          <span className={`flex items-center justify-center border-[#0f172a] bg-white text-slate-300 ${t.vide} ${OMBRES[taille][teinte]}`}>
            <Dice5 size={taille === 'grand' ? 30 : 20} />
          </span>
        )}
      </span>
    </span>
  )
}
