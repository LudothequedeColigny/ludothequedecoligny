import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { LayoutDashboard, Users, LogOut, Loader2, ClipboardList, Calendar, Dice5, Download, Smartphone, Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

interface WeekBucket {
  label: string
  count: number
}

interface PageViewStats {
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
  weeks: WeekBucket[] // 4 dernières semaines, de la plus ancienne à la plus récente
}

const emptyPageViewStats: PageViewStats = {
  thisWeek: 0,
  lastWeek: 0,
  thisMonth: 0,
  lastMonth: 0,
  weeks: [],
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function StatComparisonBlock({ label, current, previous, previousLabel }: {
  label: string
  current: number
  previous: number
  previousLabel: string
}) {
  const diff = pctChange(current, previous)
  const isFlat = diff === 0
  const isUp = diff > 0
  return (
    <div className="bg-slate-50 rounded-[1.75rem] p-6">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-4xl font-black text-slate-900 tracking-tighter">{current}</span>
        <span className={`inline-flex items-center gap-1 text-xs font-black ${isFlat ? 'text-slate-400' : isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isFlat ? <Minus size={14} /> : isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(diff)}%
        </span>
      </div>
      <p className="text-[10px] text-slate-400 font-medium">
        {previousLabel} : <span className="font-black text-slate-600">{previous}</span>
      </p>
    </div>
  )
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return (
    <span className="text-[10px] font-black text-slate-400 flex items-center gap-0.5">
      → stable
    </span>
  )
  if (value > 0) return (
    <span className="text-[10px] font-black text-emerald-500 flex items-center gap-0.5">
      <TrendingUp size={11} /> +{value} ce mois
    </span>
  )
  return (
    <span className="text-[10px] font-black text-rose-400 flex items-center gap-0.5">
      <TrendingDown size={11} /> {value} ce mois
    </span>
  )
}

function MiniBarChart({ data }: { data: WeekBucket[] }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const barWidth = 44
  const gap = 20
  const chartHeight = 90
  const width = data.length * barWidth + (data.length - 1) * gap

  return (
    <div className="bg-slate-50 rounded-[1.75rem] p-6 flex justify-center">
      <svg width="100%" viewBox={`0 0 ${width} ${chartHeight + 26}`} className="max-w-sm">
        {data.map((d, i) => {
          const h = (d.count / max) * chartHeight
          const x = i * (barWidth + gap)
          const isLast = i === data.length - 1
          const labelY = Math.max(10, chartHeight - h - 6)
          return (
            <g key={i}>
              <rect
                x={x} y={chartHeight - h}
                width={barWidth} height={Math.max(h, 2)}
                rx={10}
                fill={isLast ? '#e38154' : '#1a5f7a'}
                opacity={isLast ? 1 : 0.55}
              />
              <text x={x + barWidth / 2} y={labelY} textAnchor="middle" fontSize="11" fontWeight="900" fill={isLast ? '#e38154' : '#1a5f7a'}>
                {d.count}
              </text>
              <text x={x + barWidth / 2} y={chartHeight + 18} textAnchor="middle" fontSize="9" fontWeight="900" fill="#94a3b8">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalGames: 0,
    totalMembers: 0, // Sera le nombre d'adhérents à jour
    activeLoans: 0,
    totalEvents: 0,
    newGamesThisMonth: 0,
    newMembersThisMonth: 0,
    newLoansThisMonth: 0,
    newEventsThisMonth: 0,
  })
  const [loading, setLoading] = useState(true)
  const [pageViewStats, setPageViewStats] = useState<PageViewStats>(emptyPageViewStats)
  const [loadingViews, setLoadingViews] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfMonthDateStr = startOfMonth.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoDateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const [games, available, membersData, events, newGames, newMembers, newLoans, newEvents] = await Promise.all([
          supabase.from('games').select('*', { count: 'exact', head: true }),
          supabase.from('games').select('*', { count: 'exact', head: true }).eq('is_available', true),
          supabase.from('members').select('type, membership_date, has_paid'), // On récupère les infos pour calculer le statut
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('games').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
          supabase.from('members').select('*', { count: 'exact', head: true }).gte('membership_date', startOfMonthDateStr),
          supabase.from('loans').select('*', { count: 'exact', head: true }).gte('loan_date', thirtyDaysAgoDateStr),
          supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
        ])

        // --- LOGIQUE DE CALCUL IDENTIQUE À LA PAGE ADHÉRENTS ---
        const currentYear = now.getFullYear();

        const activeMembersCount = (membersData.data || []).filter(member => {
          if (!member.has_paid) return false;

          const dateAdhesion = new Date(member.membership_date);

          if (member.type === 'Particulier') {
            // Un particulier est à jour si son adhésion est de l'année civile en cours
            return dateAdhesion.getFullYear() >= currentYear;
          } else {
            // Une association est à jour pendant 1 an (365 jours)
            const expiryDate = new Date(dateAdhesion);
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            return now <= expiryDate;
          }
        }).length;
        // -------------------------------------------------------

        setStats({
          totalGames: games.count || 0,
          totalMembers: activeMembersCount,
          activeLoans: (games.count || 0) - (available.count || 0),
          totalEvents: events.count || 0,
          newGamesThisMonth: newGames.count || 0,
          newMembersThisMonth: newMembers.count || 0,
          newLoansThisMonth: newLoans.count || 0,
          newEventsThisMonth: newEvents.count || 0,
        })
      } catch (error) {
        console.error("Erreur stats:", error);
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  useEffect(() => {
    async function fetchPageViewStats() {
      setLoadingViews(true)
      try {
        const startOfWeek = (d: Date) => {
          const date = new Date(d)
          date.setHours(0, 0, 0, 0)
          const day = date.getDay()
          const diff = day === 0 ? -6 : 1 - day // ramène au lundi
          date.setDate(date.getDate() + diff)
          return date
        }

        const countBetween = async (start: Date, end: Date) => {
          const { count } = await supabase
            .from('page_views')
            .select('*', { count: 'exact', head: true })
            .gte('visited_at', start.toISOString())
            .lt('visited_at', end.toISOString())
          return count || 0
        }

        const now = new Date()
        const thisWeekStart = startOfWeek(now)

        // 4 dernières semaines (de la plus ancienne à l'actuelle)
        const weekStarts = [3, 2, 1, 0].map(i => {
          const d = new Date(thisWeekStart)
          d.setDate(d.getDate() - i * 7)
          return d
        })
        const weekEnds = weekStarts.map(start => {
          const e = new Date(start)
          e.setDate(e.getDate() + 7)
          return e
        })

        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

        const [weekCounts, thisMonth, lastMonth] = await Promise.all([
          Promise.all(weekStarts.map((start, i) => countBetween(start, weekEnds[i]))),
          countBetween(thisMonthStart, nextMonthStart),
          countBetween(lastMonthStart, thisMonthStart),
        ])

        const weeks: WeekBucket[] = weekStarts.map((start, i) => ({
          label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          count: weekCounts[i],
        }))

        setPageViewStats({
          thisWeek: weekCounts[3],
          lastWeek: weekCounts[2],
          thisMonth,
          lastMonth,
          weeks,
        })
      } catch (error) {
        console.error("Erreur stats visites:", error)
      } finally {
        setLoadingViews(false)
      }
    }
    fetchPageViewStats()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const cards = [
    { title: 'Jeux', value: stats.totalGames, trend: stats.newGamesThisMonth, icon: <Dice5 size={22} />, link: '/admin/jeux', lightColor: 'bg-[#f0f7f9]', textColor: 'text-[#1a5f7a]' },
    { title: 'Adhérents à jour', value: stats.totalMembers, trend: stats.newMembersThisMonth, icon: <Users size={22} />, link: '/admin/adherents', lightColor: 'bg-[#fdf2ee]', textColor: 'text-[#e38154]' },
    { title: 'Prêts', value: stats.activeLoans, trend: stats.newLoansThisMonth, icon: <ClipboardList size={22} />, link: '/admin/prets', lightColor: 'bg-slate-100', textColor: 'text-slate-600' },
    { title: 'Événements', value: stats.totalEvents, trend: stats.newEventsThisMonth, icon: <Calendar size={22} />, link: '/admin/evenements', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
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
                  <div className="mb-2">
                    <TrendBadge value={card.trend} />
                  </div>
                  <div className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                    {card.title}
                  </div>
                </Link>
              ))}
            </div>

            {/* CARTE VISITES DU SITE */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-[#f0f7f9] text-[#1a5f7a]">
                  <Eye size={22} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">Visites du site</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Suivi de la fréquentation publique</p>
                </div>
              </div>

              {loadingViews ? (
                <div className="flex items-center justify-center py-16 text-[#1a5f7a]">
                  <Loader2 className="animate-spin" size={28} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <StatComparisonBlock
                      label="Cette semaine"
                      current={pageViewStats.thisWeek}
                      previous={pageViewStats.lastWeek}
                      previousLabel="Semaine dernière"
                    />
                    <StatComparisonBlock
                      label="Ce mois-ci"
                      current={pageViewStats.thisMonth}
                      previous={pageViewStats.lastMonth}
                      previousLabel="Mois dernier"
                    />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">4 dernières semaines</p>
                    <MiniBarChart data={pageViewStats.weeks} />
                  </div>
                </>
              )}
            </div>

            {/* BLOC INSTALLATION APPLICATION */}
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