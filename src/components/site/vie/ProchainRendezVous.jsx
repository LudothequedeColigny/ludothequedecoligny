import { Link } from 'react-router-dom'
import Reveal from '../Reveal'
import { BTN_PRIMARY } from '../styles'
import { quandRendezVous, lieuCourt } from '../../../services/diapos/regles'

/**
 * « Prochain rendez-vous » en fin de page : affiche penchée, titre, date et lieu,
 * début de la description, bouton vers l'agenda de l'accueil.
 * `evenement` : ligne de la table events (à venir, non archivé).
 */
export default function ProchainRendezVous({ evenement }) {
  const lieu = lieuCourt(evenement.location)
  // Premier paragraphe de la description seulement
  const texte = (evenement.description || '').split(/\n\s*\n|\n/)[0].trim()

  return (
    <section className="px-4 pt-16 md:px-10">
      <Reveal
        className={`relative mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-[26px] overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-[#1a5f7a] px-[22px] py-7 text-white shadow-[8px_8px_0_#0f172a] min-[860px]:gap-12 min-[860px]:px-12 min-[860px]:py-10 ${evenement.image_url ? 'min-[860px]:grid-cols-[300px_1fr]' : ''}`}
      >
        {evenement.image_url && (
          <div className="w-[230px] -rotate-3 justify-self-center min-[860px]:w-[280px]">
            <img
              src={evenement.image_url}
              alt={`Affiche : ${evenement.title}`}
              loading="lazy"
              className="w-full rounded-[12px] border-[2.5px] border-[#0f172a] bg-white p-[7px] shadow-[8px_8px_0_#e38154]"
            />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#fdba98]">Prochain rendez-vous</div>
          <h2 className="mb-3.5 mt-3 font-display text-[32px] font-extrabold leading-[1.02] tracking-[-0.045em] min-[860px]:text-[46px]">
            {evenement.title}
          </h2>
          <div className="inline-block -rotate-1 rounded-[16px] border-[2.5px] border-[#0f172a] bg-[#fdfaf6] px-4 py-2.5 text-[#0f172a] shadow-[5px_5px_0_#e38154]">
            <b className="block font-display text-[20px] font-extrabold tracking-[-0.04em] sm:text-[22px]">
              {quandRendezVous(evenement)}
            </b>
            {lieu && <span className="text-[12.5px] font-semibold text-[#1a5f7a]">{lieu}</span>}
          </div>
          {texte && (
            <p className="mt-5 line-clamp-4 max-w-[34em] text-[14px] leading-[1.6] text-[#e0f2fe]">{texte}</p>
          )}
          <div className="mt-[22px] flex flex-wrap gap-3.5">
            <Link to="/#agenda" className={BTN_PRIMARY}>Toutes nos dates</Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
