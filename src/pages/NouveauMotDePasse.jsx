import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import PublicLayout from '../components/site/PublicLayout'
import FloatingIcons from '../components/site/FloatingIcons'
import MaskIcon from '../components/site/MaskIcon'
import Reveal from '../components/site/Reveal'
import { BTN_TEAL, INPUT } from '../components/site/styles'

const FIELD_LABEL = 'mb-2.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400'
const MIN_LENGTH = 8

/**
 * Page ouverte depuis l'email « Choisir mon mot de passe ».
 * Le lien connecte la personne le temps de choisir son nouveau mot de passe.
 */
export default function NouveauMotDePasse() {
  const navigate = useNavigate()
  // 'checking' → lien en cours de lecture ; 'ready' → formulaire ; 'invalid' → lien expiré ou déjà utilisé ; 'done'
  const [step, setStep] = useState('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Lien expiré ou déjà utilisé : Supabase renvoie ici avec une erreur dans l'adresse
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1))
    if (params.get('error') || params.get('error_code')) {
      setStep('invalid')
      return
    }

    let settled = false
    const markReady = () => { if (!settled) { settled = true; setStep('ready') } }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) markReady()
    })
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) markReady() })

    // Sans connexion au bout de quelques secondes, le lien n'est pas valable
    const timer = setTimeout(() => { if (!settled) { settled = true; setStep('invalid') } }, 6000)
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (password.length < MIN_LENGTH) {
      setErrorMsg(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`)
      return
    }
    if (password !== confirm) {
      setErrorMsg('Les deux mots de passe ne sont pas identiques.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setErrorMsg(error.message.includes('different')
        ? "Choisissez un mot de passe différent de l'ancien."
        : "Le mot de passe n'a pas pu être enregistré. Réessayez, ou demandez un nouveau lien.")
      return
    }
    setStep('done')
  }

  return (
    <PublicLayout>
      <main className="relative overflow-hidden px-4 pb-16 pt-10 md:px-10 md:pb-24 md:pt-16">
        <FloatingIcons />

        <div className="relative z-10 mx-auto max-w-[480px]">
          <div className="mb-8 text-center">
            <div className="anim-die-drop mx-auto mb-5 flex h-20 w-20 -rotate-3 items-center justify-center rounded-[26px] border-2 border-[#0f172a] bg-[#1a5f7a] shadow-[5px_5px_0_#e38154]">
              <MaskIcon file="01.svg" size={36} color="#ffffff" />
            </div>
            <h1 className="anim-soft-in font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-[30px] md:text-[44px]">
              Nouveau <span className="text-[#1a5f7a]">mot de passe</span>
            </h1>
          </div>

          <Reveal variant="scale" className="rounded-[34px] border-2 border-[#0f172a] bg-white p-7 shadow-[8px_8px_0_#1a5f7a] md:p-9">
            {step === 'checking' && (
              <div className="flex flex-col items-center gap-4 py-6 text-center text-sm font-bold text-slate-500">
                <Loader2 className="animate-spin text-[#1a5f7a]" size={28} />
                Vérification du lien…
              </div>
            )}

            {step === 'invalid' && (
              <div className="space-y-5 text-center">
                <div className="flex items-start gap-3 rounded-[18px] border-2 border-rose-200 bg-rose-50 p-4 text-left text-xs font-bold text-rose-600">
                  <AlertTriangle size={18} className="shrink-0" />
                  Ce lien a expiré ou a déjà servi. Les liens sont valables une heure et ne servent qu'une fois.
                </div>
                <p className="text-sm text-slate-600">
                  Demandez à un membre de l'équipe de vous en renvoyer un depuis <strong>Paramètres → Équipe &amp; accès</strong>.
                </p>
              </div>
            )}

            {step === 'ready' && (
              <form onSubmit={handleSubmit}>
                <label className={FIELD_LABEL} htmlFor="new-password">Nouveau mot de passe</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder={`${MIN_LENGTH} caractères minimum`}
                  className={`${INPUT} mb-5`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <label className={FIELD_LABEL} htmlFor="confirm-password">Confirmer le mot de passe</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  className={`${INPUT} mb-6`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />

                {errorMsg && (
                  <div className="mb-5 flex items-center gap-3 rounded-[18px] border-2 border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-600">
                    <AlertTriangle size={18} className="shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button type="submit" disabled={saving} className={`${BTN_TEAL} w-full`}>
                  {saving ? <><Loader2 className="animate-spin" size={18} /> Enregistrement...</> : 'Enregistrer mon mot de passe'}
                </button>
              </form>
            )}

            {step === 'done' && (
              <div className="space-y-6 text-center">
                <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-slate-700">
                  Votre mot de passe est enregistré. Vous pouvez maintenant accéder à l'espace bénévoles.
                </p>
                <button onClick={() => navigate('/admin')} className={`${BTN_TEAL} w-full`}>
                  Accéder au tableau de bord
                </button>
              </div>
            )}
          </Reveal>
        </div>
      </main>
    </PublicLayout>
  )
}
