import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import MaskIcon from './MaskIcon'
import { supabase } from '../../services/supabaseClient'
import Reveal from './Reveal'
import SuccessModal from './SuccessModal'
import { BTN_PRIMARY, INPUT } from './styles'

/**
 * Encart « Recevoir les prochaines dates par e-mail », pour les joueurs non
 * adhérents (stratégie de communication, levier n°4). L'adresse passe par la
 * fonction inscrire_dates (table abonnes_dates, illisible pour un visiteur),
 * puis le serveur envoie un mail de bienvenue avec le lien de désinscription.
 * Les abonnés reçoivent ensuite les mails d'actualités de l'écran Communication.
 */
// sansCadre : posé directement sur le fond de la page (accueil), sans bulle contourée
export default function RecevoirDates({ sansCadre = false }) {
  const [email, setEmail] = useState('')
  const [etat, setEtat] = useState('saisie') // saisie | envoi | fait | erreur

  const envoyer = async (e) => {
    e.preventDefault()
    setEtat('envoi')
    const adresse = email.trim().toLowerCase()
    const { data: nouvelle, error } = await supabase.rpc('inscrire_dates', { adresse })
    if (error) { setEtat('erreur'); return }
    // Mail de bienvenue : seulement pour une adresse nouvelle ; un échec n'empêche pas l'inscription
    if (nouvelle) supabase.functions.invoke('send-email', { body: { abonnement: adresse } }).catch(() => {})
    setEtat('fait')
  }

  return (
    <section className="px-4 pt-14 md:px-10 md:pt-20">
      <Reveal
        className={sansCadre
          ? 'mx-auto flex max-w-[1180px] flex-col gap-6 border-t-2 border-[#0f172a]/10 pt-12 md:flex-row md:items-center md:gap-10 md:pt-16'
          : 'mx-auto flex max-w-[1180px] flex-col gap-6 rounded-[32px] border-2 border-[#0f172a] bg-[#fdf1ea] p-7 shadow-[8px_8px_0_#e38154] md:flex-row md:items-center md:gap-10 md:rounded-[44px] md:p-11'}
      >
        <div className="min-w-0 md:flex-1">
          {sansCadre ? (
            <div className="mb-3 flex items-center gap-3.5">
              <MaskIcon file="ludo-dates-mail.svg" size={44} color="#e38154" className="shrink-0" />
              <h2 className="text-balance font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.04em] md:text-[34px]">
                Ne ratez plus <span className="text-[#e38154]">une soirée jeux</span>
              </h2>
            </div>
          ) : (
            <>
              <div className="mb-4 flex h-[58px] w-[58px] items-center justify-center rounded-[20px] border-2 border-[#0f172a] bg-white text-[#e38154]">
                <MaskIcon file="ludo-dates-mail.svg" size={34} color="currentColor" />
              </div>
              <h2 className="mb-2 font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.04em] md:text-[34px]">
                Ne ratez plus <span className="text-[#e38154]">une soirée jeux</span>
              </h2>
            </>
          )}
          <p className="text-[14.5px] font-medium leading-[1.6] text-slate-600">
            Recevez les prochaines dates par e-mail, une fois par mois au plus. Pas besoin d'être adhérent.
          </p>
        </div>

        <form className="flex min-w-0 flex-col gap-3 md:w-[420px]" onSubmit={envoyer}>
          <label htmlFor="recevoir-dates-email" className="sr-only">Votre adresse e-mail</label>
          <input
            id="recevoir-dates-email" type="email" required autoComplete="email"
            placeholder="Votre adresse e-mail"
            className={INPUT} value={email} onChange={e => setEmail(e.target.value)}
          />
          {etat === 'erreur' && (
            <p className="flex items-center gap-2 text-[12.5px] font-bold text-rose-600">
              <MaskIcon file="ludo-alerte.svg" size={20} color="currentColor" className="shrink-0" /> L'inscription n'a pas fonctionné. Vérifiez l'adresse et réessayez.
            </p>
          )}
          <button type="submit" disabled={etat === 'envoi'} className={BTN_PRIMARY}>
            {etat === 'envoi' ? <Loader2 className="animate-spin" size={18} /> : 'Recevoir les dates'}
          </button>
          <p className="text-[11.5px] leading-[1.5] text-slate-500">
            Votre adresse sert uniquement à vous annoncer nos événements. Un lien dans chaque e-mail
            permet de se désinscrire. <Link to="/confidentialite" className="underline">En savoir plus</Link>
          </p>
        </form>
      </Reveal>

      <SuccessModal
        open={etat === 'fait'}
        onClose={() => { setEtat('saisie'); setEmail('') }}
        title="C'est noté !"
        message="Vous recevrez nos prochaines dates par e-mail. À bientôt autour d'une table !"
      />
    </section>
  )
}
