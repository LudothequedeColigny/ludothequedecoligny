import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Dice5, Lock, Mail, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      alert("Erreur de connexion : " + error.message)
    } else {
      navigate('/admin') 
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      
      {/* Éléments de décor discrets en arrière-plan */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-[#1a5f7a]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#e38154]/5 rounded-full blur-3xl"></div>

      {/* Bouton retour accueil */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] transition-colors text-[10px] font-black uppercase tracking-widest"
      >
        <ArrowLeft size={16} />
        Retour au site
      </button>

      <div className="max-w-md w-full">
        {/* Logo et Titre */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1a5f7a] rounded-[2rem] shadow-xl shadow-cyan-100 text-white mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <Dice5 size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">Espace <span className="text-[#1a5f7a]">Bénévole</span></h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-3 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-[#e38154]" /> Accès sécurisé
          </p>
        </div>

        {/* Carte du Formulaire */}
        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-50 relative z-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Champ Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email professionnel</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-[#1a5f7a] transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required 
                  placeholder="votre@email.com"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1a5f7a]/10 focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mot de passe</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-[#1a5f7a] transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1a5f7a]/10 focus:bg-white p-4 pl-12 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Bouton Submit */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1a5f7a] text-white p-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-[#144a5f] active:scale-95 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:transform-none shadow-xl shadow-cyan-100 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Vérification...
                </>
              ) : (
                "Accéder au tableau de bord"
              )}
            </button>
          </form>
        </div>

        {/* Footer de la page login */}
        <p className="text-center mt-10 text-slate-400 text-[9px] font-bold uppercase tracking-[0.3em]">
          Association PACTES — Coligny
        </p>
      </div>
    </div>
  )
}