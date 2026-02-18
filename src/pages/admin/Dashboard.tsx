import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { LayoutDashboard, Users, LogOut, Loader2, ClipboardList, Calendar, Dice5, Download, Smartphone } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalGames: 0,
    totalMembers: 0,
    activeLoans: 0,
    totalEvents: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      
      const [games, available, members, events] = await Promise.all([
        supabase.from('games').select('*', { count: 'exact', head: true }),
        supabase.from('games').select('*', { count: 'exact', head: true }).eq('is_available', true),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true })
      ])

      setStats({
        totalGames: games.count || 0,
        totalMembers: members.count || 0,
        activeLoans: (games.count || 0) - (available.count || 0),
        totalEvents: events.count || 0
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const cards = [
    { title: 'Jeux', value: stats.totalGames, icon: <Dice5 size={22} />, link: '/admin/jeux', lightColor: 'bg-[#f0f7f9]', textColor: 'text-[#1a5f7a]' },
    { title: 'Adhérents', value: stats.totalMembers, icon: <Users size={22} />, link: '/admin/adherents', lightColor: 'bg-[#fdf2ee]', textColor: 'text-[#e38154]' },
    { title: 'Prêts', value: stats.activeLoans, icon: <ClipboardList size={22} />, link: '/admin/prets', lightColor: 'bg-slate-100', textColor: 'text-slate-600' },
    { title: 'Événements', value: stats.totalEvents, icon: <Calendar size={22} />, link: '/admin/evenements', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
  ]

  return (
    <div className="min-h-screen bg-[#fdfaf6] font-sans">
      
      {/* EN-TÊTE */}
      <header className="p-4 md:p-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
          <div className="p-3 bg-[#1a5f7a] rounded-[1.2rem] md:rounded-[1.5rem] shadow-lg shadow-cyan-900/20 text-white">
            <LayoutDashboard size={28} />
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
            <span className="leading-none">Tableau de <span className="text-[#1a5f7a]">Bord</span></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e38154]">Administration</span>
          </div>
        </h1>
        
        <button 
          onClick={handleLogout}
          className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-white text-rose-500 shadow-sm border border-slate-100 hover:bg-rose-50 active:scale-95"
        >
          <LogOut size={16} />
          <span>Quitter l'admin</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-10 pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-[#1a5f7a] font-black uppercase text-[10px] tracking-[0.3em] gap-4">
            <Loader2 className="animate-spin" size={32} /> 
            Mise à jour des compteurs...
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            
            {/* ACTION PRIORITAIRE : GESTION DES PRÊTS */}
            <div className="bg-[#1a5f7a] rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-cyan-900/20 relative overflow-hidden group">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              
              <div className="relative z-10 text-center md:text-left">
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-3">
                  Gestion des prêts
                </h2>
                <p className="text-xs md:text-base text-cyan-100/70 font-medium max-w-md">
                  Enregistrez les nouvelles sorties et validez les retours en quelques clics.
                </p>
              </div>

              <Link 
                to="/admin/prets" 
                className="w-full md:w-auto relative z-10 bg-[#e38154] text-white px-10 py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-[#d16f43] transition-all shadow-xl shadow-orange-900/20 active:scale-95 flex items-center justify-center gap-4"
              >
                Module de prêt
                <ClipboardList size={20} />
              </Link>
            </div>

            {/* GRILLE DE COMPTEURS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {cards.map((card, index) => (
                <Link 
                  to={card.link} 
                  key={index} 
                  className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-[#1a5f7a]/40 hover:shadow-xl hover:shadow-[#1a5f7a]/5 transition-all flex flex-col items-center text-center group active:scale-95"
                >
                  <div className={`p-4 rounded-2xl mb-4 md:mb-6 ${card.lightColor} ${card.textColor} group-hover:scale-110 transition-transform`}>
                    {card.icon}
                  </div>
                  <div className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-1">
                    {card.value}
                  </div>
                  <div className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                    {card.title}
                  </div>
                </Link>
              ))}
            </div>

            {/* BLOC INSTALLATION APPLICATION (NOUVEAU) */}
            <div className="pt-4">
              <Link 
                to="/admin/installation" 
                className="bg-emerald-500 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white flex items-center justify-between shadow-lg shadow-emerald-900/10 hover:bg-emerald-600 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:rotate-6 transition-transform">
                    <Smartphone size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tight leading-none">
                      Installer l'application
                    </h3>
                    <p className="text-[10px] md:text-xs font-bold text-emerald-100 mt-2 opacity-90">
                      Pour accéder à la ludothèque directement depuis votre écran d'accueil
                    </p>
                  </div>
                </div>
                <div className="bg-white text-emerald-600 p-3 md:p-4 rounded-full shadow-inner hidden md:block">
                  <Download size={20} />
                </div>
              </Link>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}