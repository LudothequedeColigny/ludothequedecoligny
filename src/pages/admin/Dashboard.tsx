import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { LayoutDashboard, Box, Users, ArrowRight, LogOut, Loader2, ClipboardList, Calendar, Dice5 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalGames: 0,
    totalMembers: 0,
    activeLoans: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      const { count: gamesCount } = await supabase.from('games').select('*', { count: 'exact', head: true })
      const { count: availableCount } = await supabase.from('games').select('*', { count: 'exact', head: true }).eq('is_available', true)
      const { count: membersCount } = await supabase.from('members').select('*', { count: 'exact', head: true })

      setStats({
        totalGames: gamesCount || 0,
        totalMembers: membersCount || 0,
        activeLoans: (gamesCount || 0) - (availableCount || 0)
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
    { title: 'Jeux', value: stats.totalGames, icon: <Dice5 size={20} />, link: '/admin/jeux', lightColor: 'bg-[#f0f7f9]', textColor: 'text-[#1a5f7a]' },
    { title: 'Adhérents', value: stats.totalMembers, icon: <Users size={20} />, link: '/admin/adherents', lightColor: 'bg-[#fdf2ee]', textColor: 'text-[#e38154]' },
    { title: 'Prêts', value: stats.activeLoans, icon: <ClipboardList size={20} />, link: '/admin/prets', lightColor: 'bg-slate-100', textColor: 'text-slate-600' },
  ]

  return (
    <div className="min-h-screen bg-[#fdfaf6] font-sans">
      
      {/* EN-TÊTE ADAPTATIF */}
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
            Chargement des données...
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            
            {/* ACTION PRIORITAIRE : BANDEAU TEAL */}
            <div className="bg-[#1a5f7a] rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-cyan-900/20 relative overflow-hidden group">
              {/* Cercle déco */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              
              <div className="relative z-10 text-center md:text-left">
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-3">
                  Gestion des prêts
                </h2>
                <p className="text-xs md:text-base text-cyan-100/70 font-medium max-w-md">
                  Enregistrez les nouvelles sorties, validez les retours et gardez un œil sur les cautions des adhérents.
                </p>
              </div>

              <Link 
                to="/admin/prets" 
                className="w-full md:w-auto relative z-10 bg-[#e38154] text-white px-10 py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-[#d16f43] transition-all shadow-xl shadow-orange-900/20 active:scale-95 flex items-center justify-center gap-4 group"
              >
                Module de prêt
                <ClipboardList size={20} className="group-hover:rotate-12 transition-transform" />
              </Link>
            </div>

            {/* GRILLE DE STATISTIQUES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {cards.map((card, index) => (
                <Link 
                  to={card.link} 
                  key={index} 
                  className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-[#1a5f7a]/20 transition-all flex md:flex-col items-center md:items-start justify-between md:justify-start"
                >
                  <div className={`p-4 rounded-2xl mb-6 ${card.lightColor} ${card.textColor}`}>
                    {card.icon}
                  </div>
                  <div className="flex flex-col items-end md:items-start">
                    <div className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-1">
                      {card.value}
                    </div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                      {card.title}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* RACCOURCIS RAPIDES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <Link to="/admin/jeux" className="p-6 md:p-8 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 group-hover:bg-[#1a5f7a] group-hover:text-white transition-all">
                            <Box size={20}/>
                        </div>
                        <span className="font-black uppercase text-[11px] tracking-widest text-slate-700">Inventaire Jeux</span>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:translate-x-2 group-hover:text-[#1a5f7a] transition-all" />
                </Link>
                
                <Link to="/admin/adherents" className="p-6 md:p-8 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 group-hover:bg-[#e38154] group-hover:text-white transition-all">
                            <Users size={20}/>
                        </div>
                        <span className="font-black uppercase text-[11px] tracking-widest text-slate-700">Base Adhérents</span>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:translate-x-2 group-hover:text-[#e38154] transition-all" />
                </Link>

                <Link to="/admin/evenements" className="p-6 md:p-8 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 group-hover:bg-[#1a5f7a] group-hover:text-white transition-all">
                            <Calendar size={20}/>
                        </div>
                        <span className="font-black uppercase text-[11px] tracking-widest text-slate-700">Agenda PACTES</span>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:translate-x-2 group-hover:text-[#1a5f7a] transition-all" />
                </Link>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}