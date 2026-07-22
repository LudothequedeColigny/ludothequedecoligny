import { useNavigate } from 'react-router-dom'
import { Home as HomeIcon, Dice5 } from 'lucide-react'
import Footer from '../components/Footer'

const DIGIT_COLORS = ['#1a5f7a', '#e38154', '#1a5f7a']

function TiltedDiceIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
      <g transform="rotate(-14 55 45)">
        <rect x="25" y="18" width="60" height="60" rx="12" fill="#fdfaf6" stroke="#1a5f7a" strokeWidth="3" />
        <circle cx="42" cy="35" r="4.5" fill="#1a5f7a" />
        <circle cx="68" cy="35" r="4.5" fill="#1a5f7a" />
        <circle cx="42" cy="61" r="4.5" fill="#1a5f7a" />
        <circle cx="68" cy="61" r="4.5" fill="#1a5f7a" />
        <circle cx="55" cy="48" r="4.5" fill="#1a5f7a" />
      </g>
      <circle cx="14" cy="82" r="5" fill="#e38154" opacity="0.55" />
      <circle cx="104" cy="20" r="4" fill="#e38154" opacity="0.45" />
      <circle cx="108" cy="78" r="3.5" fill="#1a5f7a" opacity="0.35" />
    </svg>
  )
}

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col items-center justify-center px-4 py-16 text-center font-sans">
      <img src="/logo-feuille.svg" alt="Ludothèque de Coligny" className="h-20 mb-8" />

      <div className="flex items-center justify-center gap-1 text-8xl md:text-9xl font-black tracking-tight leading-none mb-6">
        {'404'.split('').map((digit, i) => (
          <span key={i} style={{ color: DIGIT_COLORS[i] }}>{digit}</span>
        ))}
      </div>

      <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-4 max-w-xl">
        Oups, cette page s'est perdue dans la ludothèque !
      </h1>
      <p className="text-slate-500 max-w-md leading-relaxed font-medium mb-10">
        On a cherché dans toutes les boîtes de jeux, mais cette page est introuvable. Peut-être qu'elle est rangée au mauvais endroit ?
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-14">
        <button
          onClick={() => navigate('/')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1a5f7a] text-white rounded-2xl px-8 py-4 font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-cyan-100"
        >
          <HomeIcon size={16} />
          Retour à l'accueil
        </button>
        <button
          onClick={() => navigate('/catalogue')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#e38154] text-white rounded-2xl px-8 py-4 font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-orange-100"
        >
          <Dice5 size={16} />
          Voir notre catalogue
        </button>
      </div>

      <TiltedDiceIllustration />

      <div className="w-full mt-14">
        <Footer />
      </div>
    </div>
  )
}
