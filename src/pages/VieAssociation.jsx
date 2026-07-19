import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../services/supabaseClient'
import {
  ArrowLeft,
  Calendar,
  Users,
  Dice5,
  ImageIcon,
  X,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

// Détecte le type d'un événement à partir de son titre (insensible aux accents/casse)
// Plage Unicode des signes diacritiques combinants (0x0300-0x036f), construite
// via les codes numériques pour éviter tout souci d'encodage dans le fichier source
const DIACRITICS_REGEX = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')
const normalize = (s) => (s || '').normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase()
const getEventType = (title) => {
  const t = normalize(title)
  if (t.includes('soiree')) return 'soiree'
  if (t.includes('famil')) return 'famille'
  return 'permanence'
}

const CHART_CONFIG = [
  { key: 'soiree', label: 'Soirées jeux', color: '#1a5f7a' },
  { key: 'famille', label: 'Événements famille', color: '#e38154' },
  { key: 'permanence', label: 'Permanences', color: '#2d8ba1' },
]

export default function VieAssociation() {
  const navigate = useNavigate()
  const [pastEvents, setPastEvents] = useState([])
  const [photos, setPhotos] = useState([])
  const [gamesPlayed, setGamesPlayed] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true })

        const now = new Date()
        const past = (eventsData || []).filter(e => new Date(e.date) < now)

        const [{ data: photosData }, { data: gamesData }] = await Promise.all([
          supabase.from('event_photos').select('id, event_id, url'),
          supabase.from('event_games_played').select('id, event_id, name, image_url, external_url, in_catalogue'),
        ])

        setPastEvents(past)
        setPhotos(photosData || [])
        setGamesPlayed(gamesData || [])
      } catch (error) {
        console.error("Erreur VieAssociation:", error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Tracking des visites de la page
  useEffect(() => {
    supabase.from('page_views').insert({
      page: 'vie-association',
      user_agent: navigator.userAgent,
      referrer: document.referrer || null
    }).then(({ error }) => {
      if (error) console.error("Erreur tracking page_views:", error.message)
    })
  }, [])

  const photosByEvent = useMemo(() => {
    const map = {}
    photos.forEach(p => {
      if (!map[p.event_id]) map[p.event_id] = []
      map[p.event_id].push(p)
    })
    return map
  }, [photos])

  const gamesByEvent = useMemo(() => {
    const map = {}
    gamesPlayed.forEach(g => {
      if (!map[g.event_id]) map[g.event_id] = []
      map[g.event_id].push(g)
    })
    return map
  }, [gamesPlayed])

  // Un événement passé n'est affiché que s'il a au moins un participant renseigné OU au moins une photo
  const enrichedEvents = useMemo(() => {
    return pastEvents
      .filter(e => Number(e.participants_count) > 0 || (photosByEvent[e.id]?.length > 0))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [pastEvents, photosByEvent])

  // Données de fréquentation par type d'événement, sur toutes les éditions ayant un nombre de participants renseigné
  const chartData = useMemo(() => {
    const byType = { soiree: [], famille: [], permanence: [] }
    pastEvents
      .filter(e => e.participants_count !== null && e.participants_count !== undefined)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(e => {
        const type = getEventType(e.title)
        byType[type].push({
          date: new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          participants: Number(e.participants_count) || 0,
        })
      })
    return byType
  }, [pastEvents])

  const visibleCharts = CHART_CONFIG.filter(c => chartData[c.key].length >= 2)

  if (loading) return (
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col items-center justify-center gap-4 text-[#1a5f7a] font-black uppercase tracking-widest animate-pulse">
      <Dice5 size={48} className="animate-bounce" />
      <p>Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] font-bold transition-colors text-xs uppercase tracking-widest">
            <ArrowLeft size={16} /> <span>Retour à la page d'accueil</span>
          </button>
          <div className="w-10 md:w-20"></div>
        </div>
      </header>

      <section className="relative pt-16 pb-12 md:pt-24 md:pb-16 text-center overflow-hidden bg-[#fdfaf6]">
        <div className="relative max-w-4xl mx-auto px-4 z-10">
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6">
            La vie de <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1a5f7a] to-[#2d8ba1]">la ludothèque</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Retour en images et en chiffres sur nos soirées, événements famille et permanences passées.
          </p>
        </div>
      </section>

      {visibleCharts.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-[#e38154] font-black uppercase tracking-[0.3em] text-xs">Statistiques</span>
              <h3 className="text-4xl font-black text-slate-900 mt-2 mb-4">Évolution de la fréquentation</h3>
              <div className="h-1.5 w-20 bg-[#1a5f7a] mx-auto rounded-full"></div>
            </div>
            <div className={`grid grid-cols-1 gap-8 ${visibleCharts.length === 2 ? 'lg:grid-cols-2' : ''} ${visibleCharts.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
              {visibleCharts.map(cfg => (
                <div key={cfg.key} className="bg-[#fcfcfc] rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                  <h4 className="text-sm font-black uppercase tracking-widest mb-6" style={{ color: cfg.color }}>{cfg.label}</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData[cfg.key]} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip
                        contentStyle={{ borderRadius: 16, border: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                        labelStyle={{ color: '#1a5f7a', fontWeight: 900 }}
                      />
                      <Line type="monotone" dataKey="participants" name="Participants" stroke={cfg.color} strokeWidth={3} dot={{ r: 4, fill: cfg.color }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-[#fdfaf6]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-[#e38154] font-black uppercase tracking-[0.3em] text-xs">Souvenirs</span>
            <h3 className="text-4xl font-black text-slate-900 mt-2 mb-4">Nos événements passés</h3>
            <div className="h-1.5 w-20 bg-[#1a5f7a] mx-auto rounded-full"></div>
          </div>

          {enrichedEvents.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 italic">Aucun souvenir enregistré pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {enrichedEvents.map(event => {
                const evPhotos = photosByEvent[event.id] || []
                const evGames = gamesByEvent[event.id] || []
                return (
                  <div key={event.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                      <div>
                        <p className="text-[#e38154] font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Calendar size={14} /> {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <h4 className="text-2xl font-black text-slate-900">{event.title}</h4>
                      </div>
                      {Number(event.participants_count) > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#1a5f7a] text-white rounded-full font-black text-xs uppercase tracking-widest shrink-0">
                          <Users size={14} /> {event.participants_count} participant{event.participants_count > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {evPhotos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
                        {evPhotos.map(photo => (
                          <button
                            key={photo.id}
                            onClick={() => setLightboxPhoto(photo.url)}
                            className="aspect-square rounded-2xl overflow-hidden bg-slate-100 group"
                          >
                            <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </button>
                        ))}
                      </div>
                    )}

                    {evGames.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Dice5 size={12} /> Jeux joués
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {evGames.map(game => {
                            const Wrapper = game.external_url ? 'a' : 'div'
                            const wrapperProps = game.external_url
                              ? { href: game.external_url, target: '_blank', rel: 'noopener noreferrer' }
                              : {}
                            return (
                              <Wrapper
                                key={game.id}
                                {...wrapperProps}
                                className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 p-3 flex flex-col items-center text-center"
                              >
                                <div className="w-full aspect-square rounded-xl overflow-hidden bg-white flex items-center justify-center mb-2">
                                  {game.image_url ? (
                                    <img src={game.image_url} alt={game.name} className="w-full h-full object-contain" />
                                  ) : (
                                    <Dice5 size={32} className="text-slate-200" />
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-slate-700 line-clamp-2">{game.name}</p>
                                {game.in_catalogue && (
                                  <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-sm">
                                    Dispo à la ludothèque
                                  </span>
                                )}
                              </Wrapper>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {evPhotos.length === 0 && evGames.length === 0 && (
                      <div className="flex items-center gap-3 text-slate-300 py-4">
                        <ImageIcon size={20} />
                        <p className="text-xs italic">Pas de photo pour cet événement.</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1a5f7a]/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full text-[#1a5f7a] shadow-lg hover:bg-[#e38154] hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxPhoto}
            alt=""
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
