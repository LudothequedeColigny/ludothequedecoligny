import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import MaskIcon from '../components/site/MaskIcon'
import { supabase } from '../services/supabaseClient'
import PublicLayout from '../components/site/PublicLayout'
import FloatingIcons from '../components/site/FloatingIcons'
import { BTN_PRIMARY, BTN_TEAL } from '../components/site/styles'
import { usePageMeta } from '../services/seo'

/**
 * Page ouverte par le lien « Ne plus recevoir nos actualités » en bas des mails
 * envoyés aux adhérents et aux inscrits aux dates (l'adresse de ces derniers est effacée). Le lien porte un jeton personnel (?jeton=…).
 *
 * Le désabonnement attend un clic sur le bouton : certaines messageries ouvrent
 * d'elles-mêmes les liens des mails pour les vérifier, et désabonneraient
 * l'adhérent à son insu si la simple ouverture de la page suffisait.
 */
export default function Desabonnement() {
  usePageMeta({
    title: 'Ne plus recevoir nos actualités',
    path: '/desabonnement',
    noindex: true,
  })

  const navigate = useNavigate()
  const [params] = useSearchParams()
  const jeton = params.get('jeton') || ''
  const lienValide = /^[0-9a-f-]{36}$/i.test(jeton)
  const [etat, setEtat] = useState(lienValide ? 'attente' : 'invalide') // attente | envoi | fait | invalide | erreur

  const confirmer = async () => {
    setEtat('envoi')
    const { data, error } = await supabase.rpc('desabonner_actualites', { jeton })
    if (error) setEtat('erreur')
    else setEtat(data ? 'fait' : 'invalide')
  }

  const TEXTES = {
    attente: {
      titre: 'Ne plus recevoir nos actualités ?',
      texte: "Vous ne recevrez plus les mails d'actualités de la ludothèque (animations, soirées jeux…). Si vous êtes adhérent, les messages liés à votre adhésion, comme son renouvellement, continueront d'arriver.",
    },
    envoi: { titre: 'Un instant…', texte: '' },
    fait: {
      titre: "C'est noté !",
      texte: "Vous ne recevrez plus nos actualités par mail. Si vous changez d'avis, il suffit de nous le dire lors d'une permanence ou en répondant à l'un de nos mails.",
    },
    invalide: {
      titre: 'Ce lien ne fonctionne pas',
      texte: "Le lien de désabonnement est incomplet ou n'est plus valable. Répondez simplement au mail reçu en demandant à ne plus recevoir nos actualités : nous nous en occupons.",
    },
    erreur: {
      titre: 'Un problème est survenu',
      texte: 'Votre demande n’a pas pu être enregistrée. Vérifiez votre connexion internet, puis réessayez.',
    },
  }
  const { titre, texte } = TEXTES[etat]

  return (
    <PublicLayout>
      <main className="relative overflow-hidden px-4 py-14 md:px-10 md:py-24">
        <FloatingIcons />

        <div className="anim-modal-in relative z-10 mx-auto max-w-[560px] rounded-[32px] border-2 border-[#0f172a] bg-white p-7 text-center shadow-[8px_8px_0_#1a5f7a] md:p-10">
          <div
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] border-2 border-[#0f172a] ${etat === 'fait' ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fdfaf6] text-[#e38154]'}`}
          >
            {etat === 'envoi' ? <Loader2 size={28} className="animate-spin" />
              : etat === 'fait' ? <MaskIcon file="ludo-mail-ok.svg" size={38} color="currentColor" />
              : <MaskIcon file="ludo-mail-barre.svg" size={38} color="currentColor" />}
          </div>

          <h1 className="mb-4 font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[30px]">
            {titre}
          </h1>
          {texte && (
            <p className="mx-auto mb-8 max-w-[30em] text-[15px] font-medium leading-[1.65] text-slate-500">
              {texte}
            </p>
          )}

          {(etat === 'attente' || etat === 'erreur') && (
            <button onClick={confirmer} className={BTN_PRIMARY}>
              Confirmer le désabonnement
            </button>
          )}
          {(etat === 'fait' || etat === 'invalide') && (
            <button onClick={() => navigate('/')} className={BTN_TEAL}>
              Retour à l'accueil
            </button>
          )}
        </div>
      </main>
    </PublicLayout>
  )
}
