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
  ChevronDown,
  ChevronUp,
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
import Footer from '../components/Footer'

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

// Libellés singuliers pour le badge de catégorie affiché sur chaque carte événement
const EVENT_TYPE_LABELS = {
  soiree: 'Soirée jeux',
  famille: 'Événement famille',
  permanence: 'Permanence',
}

// Réutilise les couleurs déjà définies dans CHART_CONFIG pour éviter de dupliquer les codes hexa
const TYPE_COLORS = Object.fromEntries(CHART_CONFIG.map(c => [c.key, c.color]))

export default function VieAssociation() {
  const navigate = useNavigate()
  const [pastEvents, setPastEvents] = useState([])
  const [photos, setPhotos] = useState([])
  const [gamesPlayed, setGamesPlayed] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [sectionOpen, setSectionOpen] = useState({}) // { [eventId]: { photos: boolean, games: boolean } } — accordéons indépendants par carte

  const toggleSection = (eventId, section) => setSectionOpen(prev => ({
    ...prev,
    [eventId]: { ...prev[eventId], [section]: !prev[eventId]?.[section] }
  }))

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
          id: e.id,
          date: new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          participants: Number(e.participants_count) || 0,
        })
      })
    return byType
  }, [pastEvents])

  const visibleCharts = CHART_CONFIG.filter(c => chartData[c.key].length >= 2)

  // Chiffres clés affichés sous le titre — dérivés des données déjà chargées, sans nouvel appel
  const totalEditions = enrichedEvents.length
  const uniqueGamesCount = useMemo(() => {
    const set = new Set()
    gamesPlayed.forEach(g => { if (g.name) set.add(g.name.trim().toLowerCase()) })
    return set.size
  }, [gamesPlayed])

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
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="shrink-0">
              <img src="/logo-feuille.svg" alt="Ludothèque de Coligny" className="h-10" />
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] font-bold transition-colors text-xs uppercase tracking-widest">
              <ArrowLeft size={16} /> <span>Retour à la page d'accueil</span>
            </button>
          </div>
          <div className="w-10 md:w-20"></div>
        </div>
      </header>

      <section className="relative pt-16 pb-12 md:pt-20 md:pb-16 text-center overflow-hidden bg-[#fdfaf6]">
        <div className="relative max-w-4xl mx-auto px-4 z-10">
          <h2 className="font-black text-3xl md:text-4xl text-slate-900 leading-[1.1] mb-6">
            La vie de <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1a5f7a] to-[#2d8ba1]">la ludothèque</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Retour en images et en chiffres sur nos soirées, événements famille et permanences passées.
          </p>

          {(totalEditions > 0 || uniqueGamesCount > 0) && (
            <div className="flex flex-wrap justify-center gap-5 mt-10">
              {totalEditions > 0 && (
                <div className="bg-[#1a5f7a] rounded-[2.5rem] px-9 py-5 text-center shadow-xl shadow-cyan-900/20 -rotate-1">
                  <p className="text-3xl md:text-4xl font-black text-white">{totalEditions}</p>
                  <p className="text-[9px] md:text-[10px] font-black text-cyan-100 uppercase tracking-widest mt-1">
                    Édition{totalEditions > 1 ? 's' : ''} organisée{totalEditions > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {uniqueGamesCount > 0 && (
                <div className="bg-[#e38154] rounded-[2.5rem] px-9 py-5 text-center shadow-xl shadow-orange-900/20 rotate-1">
                  <p className="text-3xl md:text-4xl font-black text-white">{uniqueGamesCount}</p>
                  <p className="text-[9px] md:text-[10px] font-black text-orange-100 uppercase tracking-widest mt-1">
                    Jeu{uniqueGamesCount > 1 ? 'x' : ''} différent{uniqueGamesCount > 1 ? 's' : ''} joué{uniqueGamesCount > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {visibleCharts.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <span className="text-[#e38154] font-black uppercase tracking-[0.3em] text-xs">Statistiques</span>
              <h3 className="text-4xl font-black text-slate-900 mt-2 mb-4">Évolution de la fréquentation</h3>
              <div className="h-1.5 w-20 bg-[#1a5f7a] mx-auto rounded-full mb-4"></div>
              <p className="text-xs font-bold text-slate-400">Cliquez un point pour retrouver l'édition correspondante ci-dessous</p>
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
                      <Line
                        type="monotone"
                        dataKey="participants"
                        name="Participants"
                        stroke={cfg.color}
                        strokeWidth={3}
                        dot={(props) => {
                          const { cx, cy, payload } = props
                          return (
                            <circle
                              key={payload.id}
                              cx={cx} cy={cy} r={6}
                              fill={cfg.color} stroke="white" strokeWidth={2}
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                document.getElementById(`event-${payload.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }}
                            />
                          )
                        }}
                        activeDot={{ r: 9, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-[#fdfaf6]">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
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
            <div>
              {enrichedEvents.map((event, eventIndex) => {
                const evPhotos = photosByEvent[event.id] || []
                const evGames = gamesByEvent[event.id] || []
                const hasPhotos = evPhotos.length > 0
                const hasGames = evGames.length > 0
                const photosExpanded = !!sectionOpen[event.id]?.photos
                const gamesExpanded = !!sectionOpen[event.id]?.games
                const firstPhotos = evPhotos.slice(0, 3)
                const restPhotos = evPhotos.slice(3)
                const firstGames = evGames.slice(0, 3)
                const restGames = evGames.slice(3)
                const eventType = getEventType(event.title)
                const typeColor = TYPE_COLORS[eventType]
                const coverPhoto = evPhotos[0]?.url
                const isFirst = eventIndex === 0
                const isLast = eventIndex === enrichedEvents.length - 1

                return (
                  <div key={event.id} id={`event-${event.id}`} className="grid grid-cols-[28px_1fr] md:grid-cols-[36px_1fr] gap-x-4 md:gap-x-5">
                    {/* Colonne timeline */}
                    <div className="flex flex-col items-center">
                      <div className={`w-0.5 flex-1 ${isFirst ? 'bg-transparent' : 'bg-slate-200'}`}></div>
                      <div
                        className="w-4 h-4 rounded-full border-[3px] border-[#fdfaf6] shrink-0"
                        style={{ backgroundColor: typeColor, boxShadow: `0 0 0 2px ${typeColor}` }}
                      ></div>
                      <div className={`w-0.5 flex-1 ${isLast ? 'bg-transparent' : 'bg-slate-200'}`}></div>
                    </div>

                    {/* Carte événement — la photo de couverture est toujours rognée en carré (self-start empêche le stretch flex de l'étirer) */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-8 md:mb-10">
                      <div className="flex flex-col sm:flex-row">
                        <div className="w-full aspect-square sm:w-56 sm:self-start shrink-0 bg-slate-50 overflow-hidden">
                          {coverPhoto ? (
                            <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={36} className="text-slate-200" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-4 md:p-5 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <span
                                className="inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-1"
                                style={{ backgroundColor: `${typeColor}1a`, color: typeColor }}
                              >
                                {EVENT_TYPE_LABELS[eventType]}
                              </span>
                              <h4 className="text-lg md:text-xl font-black text-slate-900 leading-tight">{event.title}</h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                <Calendar size={12} /> {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            {Number(event.participants_count) > 0 && (
                              <div
                                className="flex items-center gap-2 px-4 py-1.5 text-white rounded-full font-black text-xs uppercase tracking-widest shrink-0"
                                style={{ backgroundColor: typeColor }}
                              >
                                <Users size={14} /> {event.participants_count} participant{event.participants_count > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>

                          {(hasPhotos || hasGames) && (
                            <div className="pt-2.5 mt-2.5 border-t border-slate-50 flex flex-col sm:flex-row gap-6">
                              {hasPhotos && (
                                <div className="flex-1 min-w-0 flex flex-col">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Photos</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                    {firstPhotos.map((photo, index) => {
                                      const rotation = ((index * 7 + eventIndex * 13) % 9) - 4
                                      return (
                                        <button
                                          key={photo.id}
                                          onClick={() => setLightboxPhoto(photo.url)}
                                          className="w-full max-w-[120px] sm:max-w-none aspect-square shrink-0 rounded-2xl overflow-hidden bg-white shadow-md p-1 group"
                                          style={{ transform: `rotate(${rotation}deg)` }}
                                        >
                                          <div className="w-full h-full rounded-xl overflow-hidden">
                                            <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                  {restPhotos.length > 0 && (
                                    <div className={`overflow-hidden transition-all duration-300 ${photosExpanded ? 'max-h-[2000px] mt-3' : 'max-h-0'}`}>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                        {restPhotos.map((photo, index) => {
                                          const rotation = (((index + 3) * 7 + eventIndex * 13) % 9) - 4
                                          return (
                                            <button
                                              key={photo.id}
                                              onClick={() => setLightboxPhoto(photo.url)}
                                              className="w-full max-w-[120px] sm:max-w-none aspect-square shrink-0 rounded-2xl overflow-hidden bg-white shadow-md p-1 group"
                                              style={{ transform: `rotate(${rotation}deg)` }}
                                            >
                                              <div className="w-full h-full rounded-xl overflow-hidden">
                                                <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                              </div>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {evPhotos.length > 3 && (
                                    <button
                                      onClick={() => toggleSection(event.id, 'photos')}
                                      className="w-full flex flex-col items-center gap-0.5 mt-auto pt-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#1a5f7a] transition-colors"
                                    >
                                      <span>{photosExpanded ? 'Réduire' : `Voir toutes les photos (${evPhotos.length})`}</span>
                                      {photosExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  )}
                                </div>
                              )}

                              {hasGames && (
                                <div className="flex-1 min-w-0 flex flex-col">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Jeux joués</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                    {firstGames.map(game => {
                                      const Wrapper = game.external_url ? 'a' : 'div'
                                      const wrapperProps = game.external_url
                                        ? { href: game.external_url, target: '_blank', rel: 'noopener noreferrer' }
                                        : {}
                                      return (
                                        <Wrapper
                                          key={game.id}
                                          {...wrapperProps}
                                          className="w-full max-w-[120px] sm:max-w-none shrink-0 flex flex-col items-center text-center"
                                        >
                                          <div className="w-full aspect-square shrink-0 rounded-2xl overflow-hidden bg-white shadow-md p-1">
                                            <div className="w-full h-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                                              {game.image_url ? (
                                                <img src={game.image_url} alt={game.name} className="w-full h-full object-contain" />
                                              ) : (
                                                <Dice5 size={24} className="text-slate-200" />
                                              )}
                                            </div>
                                          </div>
                                          <p className="text-[10px] font-bold mt-1.5 leading-tight truncate w-full">{game.name}</p>
                                          {game.in_catalogue && (
                                            <span className="mt-1 bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">
                                              Dispo
                                            </span>
                                          )}
                                        </Wrapper>
                                      )
                                    })}
                                  </div>
                                  {restGames.length > 0 && (
                                    <div className={`overflow-hidden transition-all duration-300 ${gamesExpanded ? 'max-h-[2000px] mt-3' : 'max-h-0'}`}>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                        {restGames.map(game => {
                                          const Wrapper = game.external_url ? 'a' : 'div'
                                          const wrapperProps = game.external_url
                                            ? { href: game.external_url, target: '_blank', rel: 'noopener noreferrer' }
                                            : {}
                                          return (
                                            <Wrapper
                                              key={game.id}
                                              {...wrapperProps}
                                              className="w-20 sm:w-24 shrink-0 flex flex-col items-center text-center"
                                            >
                                              <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-white shadow-md p-1">
                                                <div className="w-full h-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                                                  {game.image_url ? (
                                                    <img src={game.image_url} alt={game.name} className="w-full h-full object-contain" />
                                                  ) : (
                                                    <Dice5 size={24} className="text-slate-200" />
                                                  )}
                                                </div>
                                              </div>
                                              <p className="text-[10px] font-bold mt-1.5 leading-tight truncate w-full">{game.name}</p>
                                              {game.in_catalogue && (
                                                <span className="mt-1 bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">
                                                  Dispo
                                                </span>
                                              )}
                                            </Wrapper>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {evGames.length > 3 && (
                                    <button
                                      onClick={() => toggleSection(event.id, 'games')}
                                      className="w-full flex flex-col items-center gap-0.5 mt-auto pt-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#1a5f7a] transition-colors"
                                    >
                                      <span>{gamesExpanded ? 'Réduire' : `Voir tous les jeux (${evGames.length})`}</span>
                                      {gamesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {!hasPhotos && !hasGames && (
                            <div className="flex items-center gap-3 text-slate-300 pt-4 mt-4 border-t border-slate-50">
                              <ImageIcon size={20} />
                              <p className="text-xs italic">Pas de photo pour cet événement.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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

      <Footer />
    </div>
  )
}
