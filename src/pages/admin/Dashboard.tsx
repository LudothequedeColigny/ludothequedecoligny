import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { LogOut, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import MaskIcon from '../../components/site/MaskIcon'
import Reveal from '../../components/site/Reveal'
import CountUp from '../../components/site/CountUp'
import { ORIGINES } from '../../services/origines'

// Objectifs d'adhérents à jour fixés par la stratégie de communication (oct. 2026).
// La barre de progression vise la première échéance pas encore passée.
const OBJECTIFS = [
  { echeance: '2026-12-31', cible: 13 },
  { echeance: '2027-06-30', cible: 18 },
  { echeance: '2027-10-31', cible: 22 },
]

interface MemberRow {
  type: string
  membership_date: string
  has_paid: boolean
  created_at: string
  origine: string | null
  email: string | null
  refuse_actualites: boolean | null
}

// Même règle que l'écran Adhérents : un particulier est à jour pour l'année
// civile de son adhésion, une association pendant un an.
function isMemberActive(member: MemberRow, now: Date): boolean {
  if (!member.has_paid) return false
  const dateAdhesion = new Date(member.membership_date)
  if (member.type === 'Particulier') return dateAdhesion.getFullYear() >= now.getFullYear()
  const expiryDate = new Date(dateAdhesion)
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)
  return now <= expiryDate
}

interface StrategyStats {
  loansThisYear: number
  subscribers: number
  membersReceivingNews: number
  preinscriptionsReceived: number
  preinscriptionsValidated: number
  preinscriptionsPending: number
  renewalEligible: number // adhérents inscrits avant le 1er janvier
  renewed: number
  origins: { label: string; count: number }[]
}

const emptyStrategyStats: StrategyStats = {
  loansThisYear: 0,
  subscribers: 0,
  membersReceivingNews: 0,
  preinscriptionsReceived: 0,
  preinscriptionsValidated: 0,
  preinscriptionsPending: 0,
  renewalEligible: 0,
  renewed: 0,
  origins: [],
}

/** Petite case chiffrée du bloc « Objectifs ». */
function StrategyTile({ label, value, suffix, total, detail }: {
  label: string
  value: number | null
  suffix?: string
  total?: number // affiché en gris après le chiffre : « 3 / 5 »
  detail: string
}) {
  return (
    <div className="rounded-[26px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5">
      <p className="mb-2.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      {value === null ? (
        <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em] text-slate-300">—</span>
      ) : (
        <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em]">
          <CountUp value={value} />{suffix}
          {total !== undefined && <span className="text-slate-300"> / {total}</span>}
        </span>
      )}
      <p className="mt-2.5 text-[10.5px] leading-[1.5] text-slate-500">{detail}</p>
    </div>
  )
}

interface WeekBucket {
  label: string
  count: number
}

// « Visiteurs » = navigateurs différents ; « pages » = pages affichées.
interface PageViewStats {
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
  pagesThisWeek: number
  pagesThisMonth: number
  weeks: WeekBucket[] // 4 dernières semaines, de la plus ancienne à la plus récente
}

const emptyPageViewStats: PageViewStats = {
  thisWeek: 0,
  lastWeek: 0,
  thisMonth: 0,
  lastMonth: 0,
  pagesThisWeek: 0,
  pagesThisMonth: 0,
  weeks: [],
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

/** Encadré « cette semaine / ce mois » avec sa comparaison à la période précédente. */
function StatComparisonBlock({ label, current, previous, previousLabel, detail }: {
  label: string
  current: number
  previous: number
  previousLabel: string
  detail?: string
}) {
  const diff = pctChange(current, previous)
  const isFlat = diff === 0
  const isUp = diff > 0
  return (
    <div className="rounded-[26px] border-2 border-[#0f172a] bg-[#fdfaf6] p-6">
      <p className="mb-2.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="flex items-baseline gap-3">
        <CountUp
          value={current}
          className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em]"
        />
        <span className={`text-xs font-extrabold ${isFlat ? 'text-slate-400' : isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isFlat ? '→' : isUp ? '↑' : '↓'} {Math.abs(diff)}%
        </span>
      </div>
      <p className="mt-2.5 text-[10.5px] text-slate-400">
        {previousLabel} : <strong className="text-slate-600">{previous}</strong>
      </p>
      {detail && <p className="mt-1 text-[10.5px] text-slate-400">{detail}</p>}
    </div>
  )
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-[10px] font-extrabold text-slate-400">→ stable</span>
  if (value > 0) return (
    <span className="flex items-center justify-center gap-1 text-[10px] font-extrabold text-emerald-500">
      <TrendingUp size={11} /> +{value} ce mois
    </span>
  )
  return (
    <span className="flex items-center justify-center gap-1 text-[10px] font-extrabold text-rose-400">
      <TrendingDown size={11} /> {value} ce mois
    </span>
  )
}

/** Histogramme des 4 dernières semaines de visites. */
function WeeksChart({ data }: { data: WeekBucket[] }) {
  const max = Math.max(1, ...data.map(d => d.count))
  return (
    <div className="rounded-[26px] border-2 border-[#0f172a] bg-[#fdfaf6] p-6">
      <div className="mx-auto flex h-[140px] max-w-[460px] items-end gap-4">
        {data.map((d, i) => {
          const isLast = i === data.length - 1
          return (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-2 text-[11px] font-extrabold text-[#0f172a]">{d.count}</span>
              <span
                className="anim-grow-bar w-full rounded-t-[12px] border-2 border-b-0 border-[#0f172a]"
                style={{
                  height: `${(d.count / max) * 100}%`,
                  // Réserve la place du nombre au-dessus et du libellé en dessous
                  maxHeight: 'calc(100% - 44px)',
                  background: isLast ? '#e38154' : '#1a5f7a',
                  animationDelay: `${i * 90}ms`,
                }}
              />
              <span className="mt-2 text-[9px] font-extrabold text-slate-400">{d.label}</span>
            </div>
          )
        })}
      </div>
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
  const [strategyStats, setStrategyStats] = useState<StrategyStats>(emptyStrategyStats)
  const [pageViewStats, setPageViewStats] = useState<PageViewStats>(emptyPageViewStats)
  const [loadingViews, setLoadingViews] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)

      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfMonthDateStr = startOfMonth.toISOString().split('T')[0];
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfYearDateStr = `${now.getFullYear()}-01-01`;

        // Un prêt en cours est dans `loans` ; une fois le jeu rendu, il passe dans
        // `loan_history`. Pour compter les prêts d'une période, il faut les deux.
        const countLoansSince = (table: 'loans' | 'loan_history', dateStr: string) =>
          supabase.from(table).select('*', { count: 'exact', head: true }).gte('loan_date', dateStr)

        const [
          games, available, membersData, events, newGames, newMembers,
          loansMonth, historyMonth, newEvents,
          loansYear, historyYear, subscribers, journal, pending,
        ] = await Promise.all([
          supabase.from('games').select('*', { count: 'exact', head: true }),
          supabase.from('games').select('*', { count: 'exact', head: true }).eq('is_available', true),
          supabase.from('members').select('type, membership_date, has_paid, created_at, origine, email, refuse_actualites'),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('games').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
          supabase.from('members').select('*', { count: 'exact', head: true }).gte('membership_date', startOfMonthDateStr),
          countLoansSince('loans', startOfMonthDateStr),
          countLoansSince('loan_history', startOfMonthDateStr),
          // La table `events` n'a pas de date de création : on compte les événements
          // qui ont lieu dans le mois en cours (l'ancienne requête sur `created_at`
          // renvoyait une erreur et le compteur restait donc bloqué à 0).
          supabase.from('events').select('*', { count: 'exact', head: true })
            .gte('date', startOfMonth.toISOString())
            .lt('date', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()),
          countLoansSince('loans', startOfYearDateStr),
          countLoansSince('loan_history', startOfYearDateStr),
          supabase.from('abonnes_dates').select('*', { count: 'exact', head: true }),
          supabase.from('preinscriptions_journal').select('validee_le'),
          supabase.from('preinscriptions').select('*', { count: 'exact', head: true }),
        ])

        const members = (membersData.data || []) as MemberRow[]
        const activeMembersCount = members.filter(m => isMemberActive(m, now)).length

        setStats({
          totalGames: games.count || 0,
          totalMembers: activeMembersCount,
          activeLoans: (games.count || 0) - (available.count || 0),
          totalEvents: events.count || 0,
          newGamesThisMonth: newGames.count || 0,
          newMembersThisMonth: newMembers.count || 0,
          newLoansThisMonth: (loansMonth.count || 0) + (historyMonth.count || 0),
          newEventsThisMonth: newEvents.count || 0,
        })

        // Renouvellement : parmi les adhérents inscrits avant le 1er janvier,
        // ceux qui sont de nouveau à jour cette année.
        const eligible = members.filter(m => new Date(m.created_at) < startOfYear)
        const journalRows = journal.data || []
        setStrategyStats({
          loansThisYear: (loansYear.count || 0) + (historyYear.count || 0),
          subscribers: subscribers.count || 0,
          membersReceivingNews: members.filter(m => m.email?.includes('@') && !m.refuse_actualites).length,
          preinscriptionsReceived: journalRows.length,
          preinscriptionsValidated: journalRows.filter(r => r.validee_le).length,
          preinscriptionsPending: pending.count || 0,
          renewalEligible: eligible.length,
          renewed: eligible.filter(m => isMemberActive(m, now)).length,
          origins: ORIGINES
            .map(label => ({ label, count: members.filter(m => m.origine === label).length }))
            .filter(o => o.count > 0)
            .sort((a, b) => b.count - a.count),
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

        // Toutes les pages vues de la période, par paquets de 1000 (limite de la base)
        const fetchViews = async (start: Date, end: Date) => {
          const rows: { visited_at: string; visitor_id: string | null }[] = []
          for (let from = 0; ; from += 1000) {
            const { data, error } = await supabase
              .from('page_views')
              .select('visited_at, visitor_id')
              .gte('visited_at', start.toISOString())
              .lt('visited_at', end.toISOString())
              .order('visited_at')
              .range(from, from + 999)
            if (error) throw error
            rows.push(...(data || []))
            if (!data || data.length < 1000) break
          }
          return rows
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

        const firstStart = weekStarts[0] < lastMonthStart ? weekStarts[0] : lastMonthStart
        const views = await fetchViews(firstStart, nextMonthStart)

        const inPeriod = (start: Date, end: Date) => views.filter(v => {
          const t = new Date(v.visited_at)
          return t >= start && t < end
        })
        // Visiteurs différents. Les visites d'avant octobre 2026 n'ont pas de numéro
        // de visiteur : chacune compte alors pour un visiteur, comme auparavant.
        const visitorsIn = (rows: typeof views) =>
          new Set(rows.filter(v => v.visitor_id).map(v => v.visitor_id)).size +
          rows.filter(v => !v.visitor_id).length
        const countBetween = (start: Date, end: Date) => visitorsIn(inPeriod(start, end))

        const weekCounts = weekStarts.map((start, i) => countBetween(start, weekEnds[i]))
        const thisMonth = countBetween(thisMonthStart, nextMonthStart)
        const lastMonth = countBetween(lastMonthStart, thisMonthStart)

        const weeks: WeekBucket[] = weekStarts.map((start, i) => ({
          label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          count: weekCounts[i],
        }))

        setPageViewStats({
          thisWeek: weekCounts[3],
          lastWeek: weekCounts[2],
          thisMonth,
          lastMonth,
          pagesThisWeek: inPeriod(weekStarts[3], weekEnds[3]).length,
          pagesThisMonth: inPeriod(thisMonthStart, nextMonthStart).length,
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

  // Première échéance pas encore passée (la dernière une fois toutes passées)
  const today = new Date()
  const objectif = OBJECTIFS.find(o => new Date(`${o.echeance}T23:59:59`) >= today) ?? OBJECTIFS[OBJECTIFS.length - 1]
  const objectifDateLabel = new Date(`${objectif.echeance}T12:00:00`)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const resteObjectif = Math.max(0, objectif.cible - stats.totalMembers)
  const progressionObjectif = Math.min(100, Math.round((stats.totalMembers / objectif.cible) * 100))

  const cards = [
    { title: 'Jeux', value: stats.totalGames, trend: stats.newGamesThisMonth, icon: 'ludo-boite-jeu.svg', link: '/admin/jeux', accent: '#1a5f7a', tint: '#f0f7f9' },
    { title: 'Adhérents à jour', value: stats.totalMembers, trend: stats.newMembersThisMonth, icon: 'ludo-carte-adherent.svg', link: '/admin/adherents', accent: '#e38154', tint: '#fdf1ea' },
    { title: 'Prêts', value: stats.activeLoans, trend: stats.newLoansThisMonth, icon: 'ludo-pret.svg', link: '/admin/prets', accent: '#1a5f7a', tint: '#f1f5f9' },
    { title: 'Événements', value: stats.totalEvents, trend: stats.newEventsThisMonth, icon: 'ludo-calendrier-evenement.svg', link: '/admin/evenements', accent: '#10b981', tint: '#ecfdf5' },
  ]

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-5 font-body md:p-11">
      <div className="mx-auto max-w-[1240px]">

        <AdminPageHeader icon="ludo-dashboard.svg" iconSize={38} title="Tableau de" accent="Bord" eyebrow="Administration">
          <button
            onClick={handleLogout}
            className="rounded-[18px] border-2 border-[#0f172a] bg-white px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#f43f5e] shadow-[4px_4px_0_#f43f5e] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#f43f5e]"
          >
            <span className="flex items-center gap-2"><LogOut size={15} /> Quitter l'admin</span>
          </button>
        </AdminPageHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#1a5f7a]">
            <Loader2 className="animate-spin" size={32} />
            Mise à jour des compteurs...
          </div>
        ) : (
          <div className="space-y-5">

            {/* ACTION PRIORITAIRE : GESTION DES PRÊTS */}
            <Reveal className="flex flex-wrap items-center justify-between gap-6 rounded-[30px] border-2 border-[#0f172a] bg-[#1a5f7a] p-7 text-white shadow-[9px_9px_0_#0f172a] md:rounded-[46px] md:p-12">
              <div>
                <h2 className="mb-3 font-display text-[24px] font-extrabold uppercase tracking-[-0.04em] md:text-[38px]">
                  Gestion des prêts
                </h2>
                <p className="max-w-[30em] text-[15px] font-medium leading-[1.6] text-white/75">
                  Enregistrez les nouvelles sorties et validez les retours en quelques clics.
                </p>
              </div>
              <Link
                to="/admin/prets"
                className="rounded-[20px] border-2 border-[#0f172a] bg-[#e38154] px-8 py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]"
              >
                Module de prêt →
              </Link>
            </Reveal>

            {/* GRILLE DE COMPTEURS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {cards.map((card, i) => (
                <Reveal
                  key={card.title}
                  as={Link}
                  variant="scale"
                  delay={(i % 4) * 70}
                  to={card.link}
                  className="rounded-[30px] border-2 border-[#0f172a] bg-white p-5 text-center transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#1a5f7a] md:p-8"
                  style={{ boxShadow: `5px 5px 0 ${card.accent}` }}
                >
                  <div
                    className="mx-auto mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[16px] border-2 border-[#0f172a]"
                    style={{ background: card.tint }}
                  >
                    <MaskIcon file={card.icon} size={30} color={card.accent} />
                  </div>
                  <CountUp
                    value={card.value}
                    className="block font-display text-[32px] font-extrabold leading-none tracking-[-0.05em] md:text-[44px]"
                  />
                  <div className="mt-2"><TrendBadge value={card.trend} /></div>
                  <div className="mt-2 text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                    {card.title}
                  </div>
                </Reveal>
              ))}
            </div>

            {/* OBJECTIFS DE LA STRATÉGIE DE COMMUNICATION */}
            <Reveal className="rounded-[34px] border-2 border-[#0f172a] bg-white p-6 shadow-[6px_6px_0_#e38154] md:p-9">
              <div className="mb-6 flex items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#fdf1ea]">
                  <MaskIcon file="ludo-objectif.svg" size={30} color="#e38154" />
                </div>
                <div>
                  <h3 className="font-display text-[20px] font-extrabold uppercase tracking-[-0.03em]">Objectifs</h3>
                  <p className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                    Adhésions et communication
                  </p>
                </div>
              </div>

              {/* Progression vers la prochaine échéance */}
              <div className="mb-4 rounded-[26px] border-2 border-[#0f172a] bg-[#fdfaf6] p-6">
                <p className="mb-2.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Adhérents à jour — objectif du {objectifDateLabel}
                </p>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em]">
                    <CountUp value={stats.totalMembers} />
                    <span className="text-slate-300"> / {objectif.cible}</span>
                  </span>
                  <span className={`text-xs font-extrabold ${resteObjectif === 0 ? 'text-emerald-500' : 'text-[#e38154]'}`}>
                    {resteObjectif === 0
                      ? 'Objectif atteint'
                      : `Encore ${resteObjectif} adhérent${resteObjectif > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="mt-4 h-4 overflow-hidden rounded-full border-2 border-[#0f172a] bg-white">
                  <div
                    className="anim-grow-bar-x h-full rounded-full bg-[#e38154]"
                    style={{ width: `${progressionObjectif}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {OBJECTIFS.map(o => (
                    <span
                      key={o.echeance}
                      className={`text-[10.5px] ${o === objectif ? 'font-extrabold text-[#0f172a]' : 'text-slate-400'}`}
                    >
                      {o.cible} au {new Date(`${o.echeance}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StrategyTile
                  label={`Prêts depuis le 1er janvier`}
                  value={strategyStats.loansThisYear}
                  detail="Jeux encore sortis et jeux déjà rendus"
                />
                <StrategyTile
                  label="Inscrits aux actualités"
                  value={strategyStats.subscribers}
                  detail={`Non adhérents. S'y ajoutent ${strategyStats.membersReceivingNews} adhérent${strategyStats.membersReceivingNews > 1 ? 's' : ''} qui reçoivent les mails.`}
                />
                <StrategyTile
                  label="Pré-inscriptions validées"
                  value={strategyStats.preinscriptionsValidated}
                  total={strategyStats.preinscriptionsReceived}
                  detail={`Validées sur reçues depuis le 22 oct. 2026${strategyStats.preinscriptionsPending > 0 ? ` · ${strategyStats.preinscriptionsPending} en attente` : ''}`}
                />
                <StrategyTile
                  label="Renouvellement"
                  value={strategyStats.renewalEligible > 0
                    ? Math.round((strategyStats.renewed / strategyStats.renewalEligible) * 100)
                    : null}
                  suffix="%"
                  detail={strategyStats.renewalEligible > 0
                    ? `${strategyStats.renewed} sur ${strategyStats.renewalEligible} adhérents inscrits avant le 1er janvier`
                    : 'Mesuré à partir de janvier 2027, quand les premiers adhérents renouvelleront'}
                />
              </div>

              <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                Comment nous ont-ils connus ?
              </p>
              {strategyStats.origins.length === 0 ? (
                <p className="rounded-[26px] border-2 border-dashed border-slate-300 p-6 text-center text-[12px] text-slate-500">
                  Pas encore de réponse : la question est posée sur chaque fiche adhérent depuis le 22 octobre 2026.
                </p>
              ) : (
                <div className="space-y-3 rounded-[26px] border-2 border-[#0f172a] bg-[#fdfaf6] p-6">
                  {strategyStats.origins.map((o, i) => (
                    <div key={o.label} className="flex items-center gap-3">
                      <span className="w-[42%] shrink-0 text-[11.5px] font-semibold leading-tight text-slate-600 md:w-[220px]">{o.label}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white">
                        <div
                          className="anim-grow-bar-x h-full rounded-full"
                          style={{
                            width: `${(o.count / strategyStats.origins[0].count) * 100}%`,
                            background: i === 0 ? '#e38154' : '#1a5f7a',
                          }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-[12px] font-extrabold">{o.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            {/* VISITES DU SITE */}
            <Reveal className="rounded-[34px] border-2 border-[#0f172a] bg-white p-6 shadow-[6px_6px_0_#1a5f7a] md:p-9">
              <div className="mb-6 flex items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#f0f7f9]">
                  <MaskIcon file="ludo-visites.svg" size={30} color="#1a5f7a" />
                </div>
                <div>
                  <h3 className="font-display text-[20px] font-extrabold uppercase tracking-[-0.03em]">Visites du site</h3>
                  <p className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                    Visiteurs différents du site public
                  </p>
                </div>
              </div>

              {loadingViews ? (
                <div className="flex items-center justify-center py-16 text-[#1a5f7a]">
                  <Loader2 className="animate-spin" size={28} />
                </div>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatComparisonBlock
                      label="Cette semaine"
                      current={pageViewStats.thisWeek}
                      previous={pageViewStats.lastWeek}
                      previousLabel="Semaine dernière"
                      detail={`${pageViewStats.pagesThisWeek} pages vues`}
                    />
                    <StatComparisonBlock
                      label="Ce mois-ci"
                      current={pageViewStats.thisMonth}
                      previous={pageViewStats.lastMonth}
                      previousLabel="Mois dernier"
                      detail={`${pageViewStats.pagesThisMonth} pages vues`}
                    />
                  </div>
                  <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                    Visiteurs des 4 dernières semaines
                  </p>
                  <WeeksChart data={pageViewStats.weeks} />
                </>
              )}
            </Reveal>

            {/* INSTALLATION DE L'APPLICATION */}
            <Reveal
              as={Link}
              to="/admin/installation"
              className="flex flex-wrap items-center gap-5 rounded-[34px] border-2 border-[#0f172a] bg-[#10b981] p-6 text-white shadow-[6px_6px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_#0f172a] md:p-8"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border-2 border-[#0f172a] bg-white/25">
                <MaskIcon file="ludo-appli.svg" size={36} color="#ffffff" />
              </div>
              <div className="flex-1 basis-[260px]">
                <h3 className="font-display text-[21px] font-extrabold uppercase leading-none tracking-[-0.03em]">
                  Installer l'application
                </h3>
                <p className="mt-2 text-xs font-semibold text-white/85">
                  Pour accéder à la ludothèque directement depuis votre écran d'accueil
                </p>
              </div>
            </Reveal>

          </div>
        )}
      </div>
    </div>
  )
}
