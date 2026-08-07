import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PublicLayout from '../components/site/PublicLayout'
import FloatingIcons from '../components/site/FloatingIcons'
import MaskIcon from '../components/site/MaskIcon'
import Reveal from '../components/site/Reveal'
import { BTN_TEAL, INPUT } from '../components/site/styles'

const FIELD_LABEL = 'mb-2.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setErrorMsg("Email ou mot de passe incorrect. Veuillez réessayer.")
    } else {
      navigate('/admin')
    }
    setLoading(false)
  }

  return (
    <PublicLayout>
      <main className="relative overflow-hidden px-4 pb-16 pt-10 md:px-10 md:pb-24 md:pt-16">
        <FloatingIcons />

        <div className="relative z-10 mx-auto max-w-[480px]">
          <div className="mb-8 text-center">
            <div
              className="anim-die-drop mx-auto mb-5 flex h-20 w-20 -rotate-3 items-center justify-center rounded-[26px] border-2 border-[#0f172a] bg-[#1a5f7a] shadow-[5px_5px_0_#e38154]"
              style={{ animationDelay: '0.1s' }}
            >
              <MaskIcon file="01.svg" size={36} color="#ffffff" />
            </div>
            <h1
              className="anim-soft-in font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-[30px] md:text-[44px]"
              style={{ animationDelay: '0.5s' }}
            >
              Espace <span className="text-[#1a5f7a]">Bénévole</span>
            </h1>
            <div
              className="anim-soft-in mt-4 inline-flex items-center gap-2 rounded-full bg-[#fdf1ea] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#d06b42]"
              style={{ animationDelay: '0.65s' }}
            >
              <span className="h-[7px] w-[7px] rounded-full bg-[#e38154]" /> Accès sécurisé
            </div>
          </div>

          <Reveal
            variant="scale"
            className="rounded-[34px] border-2 border-[#0f172a] bg-white p-7 shadow-[8px_8px_0_#1a5f7a] md:p-9"
          >
            <form onSubmit={handleLogin}>
              <label className={FIELD_LABEL} htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="votre@email.com"
                className={`${INPUT} mb-5`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <label className={FIELD_LABEL} htmlFor="login-password">Mot de passe</label>
              <input
                id="login-password"
                type="password"
                required
                placeholder="••••••••"
                className={`${INPUT} mb-6`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {errorMsg && (
                <div className="mb-5 flex items-center gap-3 rounded-[18px] border-2 border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-600">
                  <AlertTriangle size={18} className="shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button type="submit" disabled={loading} className={`${BTN_TEAL} w-full`}>
                {loading ? (
                  <><Loader2 className="animate-spin" size={18} /> Vérification...</>
                ) : (
                  "Accéder au tableau de bord"
                )}
              </button>
            </form>
          </Reveal>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/inscription-permanence')}
              className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-[#e38154]"
            >
              Je viens seulement m'inscrire à une permanence →
            </button>
            <div className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.3em] text-slate-300">
              Association PACTES — Coligny
            </div>
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
