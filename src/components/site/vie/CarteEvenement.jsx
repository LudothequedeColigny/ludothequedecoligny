import { Maximize2, ArrowRight } from 'lucide-react'
import { jourMois } from '../../../services/diapos/regles'
import GrosChiffre from './GrosChiffre'
import BandeJeux from './BandeJeux'

/**
 * Carte d'une soirée jeux ou d'un après-midi en famille, façon bilan publié :
 * grande photo d'ouverture, « Le 2 octobre, c'était Soirée jeux ! », nombre de
 * participants, mot des bénévoles, polaroïds des photos, puis les jeux joués.
 * Sans photo : mosaïque floutée des jaquettes et trois boîtes en éventail.
 * `onPhotos(index)` ouvre la galerie sur la photo n° index.
 */
const POLAS = ['-rotate-[4deg]', 'translate-y-1 rotate-[3deg]', '-rotate-2', 'translate-y-0.5 rotate-[4deg]']
const EVENTAIL = ['translate-y-2.5 -rotate-[9deg]', 'z-[1] -rotate-2', 'translate-y-2 rotate-[7deg]']

/** « petits et grands ! » → ['petits', 'et grands !'] */
function deuxLignes(texte) {
  const i = texte.indexOf(' et ')
  return i > 0 ? [texte.slice(0, i), texte.slice(i + 1)] : [texte, '']
}

function Fond({ carte, onPhotos }) {
  if (carte.photo) {
    return (
      <>
        <img
          src={carte.photo}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
        />
        <button
          type="button"
          onClick={() => onPhotos(Math.max(0, carte.photos.indexOf(carte.photo)))}
          className="absolute right-4 top-4 z-[2] inline-flex items-center gap-1.5 rounded-full border-2 border-[#0f172a] bg-white px-[11px] py-[5px] text-[9.5px] font-extrabold uppercase tracking-[0.14em] transition-colors hover:bg-[#e38154] hover:text-white"
        >
          <Maximize2 size={13} strokeWidth={3} />
          Agrandir
        </button>
      </>
    )
  }
  const images = carte.jeux.map(j => j.image).filter(Boolean)
  if (!images.length) return null
  return (
    <>
      {/* Flou CSS (pas celui des canvas, qui ne marche pas sur Safari) */}
      <div aria-hidden="true" className="absolute -inset-5 grid scale-105 grid-cols-4 [grid-auto-rows:1fr] blur-[7px] saturate-[1.15]">
        {Array.from({ length: 8 }, (_, i) => (
          <img key={i} src={images[i % images.length]} alt="" loading="lazy" className="h-full w-full object-cover" />
        ))}
      </div>
      <div className="absolute inset-0 bg-[#1a5f7a]/45" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[9%] z-[1] flex items-end justify-center sm:top-[12%]">
        {images.slice(0, 3).map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt=""
            className={`-mx-3.5 h-[112px] w-auto rounded-[9px] border-[2.5px] border-[#0f172a] bg-white p-[5px] shadow-[6px_6px_0_#e38154] sm:h-[150px] ${EVENTAIL[i]}`}
          />
        ))}
      </div>
    </>
  )
}

function Polaroids({ carte, onPhotos }) {
  const n = carte.photos.length
  const montrees = carte.photos.slice(0, n > 4 ? 3 : 4)
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Les photos</div>
      <div className="grid max-w-[470px] grid-cols-4 gap-3 pb-4 pl-0.5 pr-1.5 pt-2">
        {montrees.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => onPhotos(i)}
            aria-label={`Photo ${i + 1}`}
            className={`rounded-[6px] border-2 border-[#0f172a] bg-white px-[5px] pb-[18px] pt-[5px] shadow-[4px_4px_0_#0f172a] transition-transform duration-200 hover:rotate-0 hover:scale-[1.06] ${POLAS[i]}`}
          >
            <img src={src} alt="" loading="lazy" className="aspect-square w-full rounded-[2px] object-cover" />
          </button>
        ))}
        {n > 4 && (
          <button
            type="button"
            onClick={() => onPhotos(3)}
            className={`flex flex-col items-center justify-center rounded-[6px] border-2 border-[#0f172a] bg-[#1a5f7a] p-1.5 font-display text-[26px] font-extrabold tracking-[-0.04em] text-white shadow-[4px_4px_0_#0f172a] transition-transform duration-200 hover:rotate-0 hover:scale-[1.06] ${POLAS[3]}`}
          >
            +{n - 3}
            <small className="mt-0.5 font-body text-[9px] font-bold uppercase tracking-[0.1em]">photos</small>
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onPhotos(0)}
        className="inline-flex items-center gap-2 border-b-2 border-[#e38154] pb-[3px] text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] transition-colors hover:text-[#e38154]"
      >
        Voir les {n} photos <ArrowRight size={14} strokeWidth={3} />
      </button>
    </div>
  )
}

export default function CarteEvenement({ carte, onPhotos }) {
  const [ligne1, ligne2] = deuxLignes(carte.libelleNombre)
  const sansPhoto = carte.photos.length === 0 && carte.jeux.length > 0
  const avecInfos = carte.nombre || carte.expression || carte.photos.length > 1 || sansPhoto
  const nbJeux = carte.jeux.length

  return (
    <article
      className={`overflow-hidden rounded-[32px] border-2 border-[#0f172a] bg-white ${carte.type === 'famille' ? 'shadow-[8px_8px_0_#e38154]' : 'shadow-[8px_8px_0_#1a5f7a]'}`}
    >
      <div className={`grid grid-cols-1 ${avecInfos ? 'min-[900px]:grid-cols-[1.25fr_1fr]' : ''}`}>
        <div
          className={`relative min-h-[360px] overflow-hidden bg-[#1a5f7a] sm:min-h-[330px] min-[900px]:min-h-[440px] ${avecInfos ? 'border-b-2 border-[#0f172a] min-[900px]:border-b-0 min-[900px]:border-r-2' : ''}`}
        >
          <Fond carte={carte} onPhotos={onPhotos} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0f172a]/0 from-40% to-[#0f172a]/80" />
          <div className="absolute inset-x-[22px] bottom-[22px] z-[2] text-white">
            <div className="font-display text-[19px] font-extrabold leading-[1.05] tracking-[-0.03em] [text-shadow:0_2px_8px_rgba(0,0,0,.35)] sm:text-[22px] min-[900px]:text-[24px]">
              Le {jourMois(carte.date)},
              <b className="block text-[26px] sm:text-[30px] min-[900px]:text-[34px]">c'était</b>
            </div>
            <div className="-ml-0.5 mb-3.5 mt-1.5 inline-block -rotate-3 rounded-[12px] border-[2.5px] border-[#0f172a] bg-[#e38154] px-3.5 pb-[5px] pt-0.5 font-display text-[25px] font-extrabold leading-[1.15] tracking-[-0.04em] text-[#0f172a] shadow-[5px_5px_0_#0f172a] sm:text-[30px] min-[900px]:text-[38px]">
              {carte.etiquette}
            </div>
            <div className="text-[12px] font-semibold opacity-95">{carte.quand}</div>
          </div>
        </div>

        {avecInfos && (
          <div className="flex flex-col justify-center gap-[18px] px-[22px] pb-6 pt-[26px] min-[900px]:px-[34px] min-[900px]:pb-[30px] min-[900px]:pt-[34px]">
            {carte.nombre && (
              <>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Nous étions</div>
                <div className="flex flex-wrap items-end gap-4">
                  <GrosChiffre n={carte.nombre} />
                  <span className="pb-1.5 font-display text-[24px] font-extrabold leading-[1.05] tracking-[-0.035em]">
                    {ligne1}
                    <br />
                    {ligne2}
                  </span>
                </div>
              </>
            )}
            {carte.expression && (
              <figure className="mb-1 mr-1.5 mt-1.5 -rotate-[1.6deg] rounded-[20px] border-[2.5px] border-[#0f172a] bg-[#fdfaf6] px-5 pb-5 pt-[18px] shadow-[7px_7px_0_#e38154]">
                <blockquote className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-0.035em] sm:text-[23px]">
                  « {carte.expression} »
                </blockquote>
                <figcaption className="mt-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1a5f7a]">
                  Le mot des bénévoles
                </figcaption>
              </figure>
            )}
            {sansPhoto && (
              <p className="text-[14px] font-medium leading-[1.6] text-slate-700">
                Pas de photo cette fois-ci… mais{' '}
                <b className="text-[#0f172a]">{nbJeux} {nbJeux > 1 ? 'jeux' : 'jeu'}</b>{' '}
                {nbJeux > 1 ? 'sont sortis' : 'est sorti'} des étagères{' '}
                {carte.type === 'famille' ? 'cet après-midi-là' : carte.type === 'soiree' ? 'ce soir-là' : 'ce jour-là'} !
              </p>
            )}
            {carte.photos.length > 1 && <Polaroids carte={carte} onPhotos={onPhotos} />}
          </div>
        )}
      </div>

      {nbJeux > 0 && <BandeJeux jeux={carte.jeux} />}
    </article>
  )
}
