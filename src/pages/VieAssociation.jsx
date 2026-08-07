import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../services/supabaseClient'
import { Calendar, Users, Dice5, ImageIcon, X, ChevronDown, ChevronUp } from 'lucide-react'
import PublicLayout from '../components/site/PublicLayout'
import FloatingIcons from '../components/site/FloatingIcons'
import Reveal from '../components/site/Reveal'
import CountUp from '../components/site/CountUp'
import { EYEBROW } from '../components/site/styles'

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

/** Histogramme de fréquentation : une barre par édition, cliquable pour rejoindre la carte. */
function FrequentationChart({ config, points }) {
  const max = Math.max(...points.map(p => p.participants), 1)

  return (
    <Reveal
      className="rounded-[32px] border-2 border-[#0f172a] bg-[#fdfaf6] p-6 md:p-8"
      style={{ boxShadow: `6px 6px 0 ${config.color}` }}
    >
      <div
        className="mb-6 text-xs font-extrabold uppercase tracking-[0.16em]"
        style={{ color: config.color }}
      >
        {config.label}
      </div>

      {/* Au-delà de quelques éditions, les barres deviendraient illisibles sur mobile :
          on leur garantit une largeur minimale et le graphique défile horizontalement. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="min-w-full" style={{ minWidth: points.length * 44 }}>
          <div className="flex h-[180px] items-end gap-2.5 border-b-2 border-slate-200">
            {points.map((point, i) => (
              <button
                key={point.id}
                onClick={() => document.getElementById(`event-${point.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                title={`${point.participants} participants — ${point.date}`}
                className="flex h-full flex-1 flex-col items-center justify-end"
              >
                <span className="mb-2 text-[11px] font-extrabold text-[#0f172a]">{point.participants}</span>
                <span
                  className="anim-grow-bar w-full rounded-t-[10px] border-2 border-b-0 border-[#0f172a] transition-opacity hover:opacity-80"
                  style={{
                    height: `${(point.participants / max) * 100}%`,
                    // Réserve la place du nombre au-dessus : la barre la plus haute ne déborde pas
                    maxHeight: 'calc(100% - 26px)',
                    background: config.color,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              </button>
            ))}
          </div>

          <div className="mt-2.5 flex gap-2.5">
            {points.map(point => (
              <div key={point.id} className="flex-1 text-center text-[9px] font-bold text-slate-400">
                {point.date}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  )
}

/** Vignette carrée d'un jeu joué, cliquable si une fiche externe est renseignée. */
function GameThumb({ game }) {
  const Wrapper = game.external_url ? 'a' : 'div'
  const wrapperProps = game.external_url
    ? { href: game.external_url, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Wrapper {...wrapperProps} className="flex w-full max-w-[76px] shrink-0 flex-col items-center text-center">
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[16px] border-2 border-[#0f172a] bg-white">
        {game.image_url ? (
          <img src={game.image_url} alt={game.name} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <Dice5 size={22} className="text-slate-200" />
        )}
      </div>
      <p className="mt-1.5 w-full truncate text-[10px] font-bold leading-tight">{game.name}</p>
      {game.in_catalogue && (
        <span className="mt-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-white">
          Dispo
        </span>
      )}
    </Wrapper>
  )
}

export default function VieAssociation() {
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
    <div className="flex min-h-screen animate-pulse flex-col items-center justify-center gap-4 bg-[#fdfaf6] font-body text-sm font-extrabold uppercase tracking-[0.2em] text-[#1a5f7a]">
      <Dice5 size={48} className="animate-bounce" />
      <p>Chargement...</p>
    </div>
  )

  return (
    <PublicLayout>
      <main>
        {/* ---------- EN-TÊTE ---------- */}
        <section className="relative overflow-hidden px-4 pb-8 pt-9 text-center md:px-10 md:pb-11 md:pt-16">
          <FloatingIcons />

          <div className="relative z-10 mx-auto max-w-[820px]">
            <h1 className="anim-soft-in mb-5 font-display text-[27px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[34px] md:text-[58px]">
              La vie de<br />
              <span className="inline-block -rotate-[1.5deg] rounded-[16px] bg-[#e38154] px-[0.16em] text-white">
                la ludothèque
              </span>
            </h1>
            <p
              className="anim-soft-in mx-auto mb-8 max-w-[34em] text-[15px] font-medium leading-[1.65] text-slate-500 md:text-[18px]"
              style={{ animationDelay: '0.15s' }}
            >
              Retour en images et en chiffres sur nos soirées, événements famille et permanences passées.
            </p>

            {(totalEditions > 0 || uniqueGamesCount > 0) && (
              <div className="flex flex-wrap justify-center gap-4">
                {totalEditions > 0 && (
                  <Reveal
                    variant="scale"
                    className="-rotate-[1.5deg] rounded-[32px] border-2 border-[#0f172a] bg-[#1a5f7a] px-8 py-5 text-white shadow-[6px_6px_0_#0f172a]"
                  >
                    <CountUp
                      value={totalEditions}
                      className="block font-display text-[30px] font-extrabold leading-none tracking-[-0.045em] md:text-[42px]"
                    />
                    <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#bae6fd]">
                      Édition{totalEditions > 1 ? 's' : ''} organisée{totalEditions > 1 ? 's' : ''}
                    </div>
                  </Reveal>
                )}
                {uniqueGamesCount > 0 && (
                  <Reveal
                    variant="scale"
                    delay={90}
                    className="rotate-[1.5deg] rounded-[32px] border-2 border-[#0f172a] bg-[#e38154] px-8 py-5 text-white shadow-[6px_6px_0_#0f172a]"
                  >
                    <CountUp
                      value={uniqueGamesCount}
                      className="block font-display text-[30px] font-extrabold leading-none tracking-[-0.045em] md:text-[42px]"
                    />
                    <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ffe8dc]">
                      Jeu{uniqueGamesCount > 1 ? 'x' : ''} différent{uniqueGamesCount > 1 ? 's' : ''} joué{uniqueGamesCount > 1 ? 's' : ''}
                    </div>
                  </Reveal>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- STATISTIQUES ---------- */}
        {visibleCharts.length > 0 && (
          <section className="border-y-2 border-[#0f172a] bg-white px-4 py-14 md:px-10 md:py-20">
            <div className="mx-auto max-w-[1180px]">
              <Reveal className="mb-8 text-center md:mb-11">
                <div className={EYEBROW}>Statistiques</div>
                <h2 className="mb-3 mt-2.5 font-display text-[26px] font-extrabold tracking-[-0.04em] md:text-[42px]">
                  Évolution de la fréquentation
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  Cliquez une barre pour retrouver l'édition correspondante ci-dessous
                </p>
              </Reveal>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {visibleCharts.map(cfg => (
                  <FrequentationChart key={cfg.key} config={cfg} points={chartData[cfg.key]} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- SOUVENIRS ---------- */}
        <section className="px-4 py-14 md:px-10 md:py-20">
          <div className="mx-auto max-w-[900px]">
            <Reveal className="mb-9 text-center md:mb-12">
              <div className={EYEBROW}>Souvenirs</div>
              <h2 className="mt-2.5 font-display text-[26px] font-extrabold tracking-[-0.04em] md:text-[42px]">
                Nos événements passés
              </h2>
            </Reveal>

            {enrichedEvents.length === 0 ? (
              <div className="rounded-[30px] border-2 border-dashed border-[#0f172a]/30 bg-white py-12 text-center">
                <p className="italic text-slate-400">Aucun souvenir enregistré pour le moment.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {enrichedEvents.map((event, eventIndex) => {
                  const evPhotos = photosByEvent[event.id] || []
                  const evGames = gamesByEvent[event.id] || []
                  const hasPhotos = evPhotos.length > 0
                  const hasGames = evGames.length > 0
                  const photosExpanded = !!sectionOpen[event.id]?.photos
                  const gamesExpanded = !!sectionOpen[event.id]?.games
                  const visiblePhotos = photosExpanded ? evPhotos : evPhotos.slice(0, 3)
                  const visibleGames = gamesExpanded ? evGames : evGames.slice(0, 3)
                  const eventType = getEventType(event.title)
                  const typeColor = TYPE_COLORS[eventType]
                  const coverPhoto = evPhotos[0]?.url
                  const isLast = eventIndex === enrichedEvents.length - 1

                  return (
                    <div key={event.id} id={`event-${event.id}`} className="flex gap-4">
                      {/* Colonne timeline */}
                      <div className="flex shrink-0 flex-col items-center pt-11">
                        <div
                          className="h-[18px] w-[18px] rounded-full border-2 border-[#0f172a]"
                          style={{ backgroundColor: typeColor }}
                        />
                        {!isLast && <div className="w-[3px] flex-1 bg-slate-200" />}
                      </div>

                      <Reveal
                        variant="left"
                        className="flex-1 overflow-hidden rounded-[32px] border-2 border-[#0f172a] bg-white"
                        style={{ boxShadow: `6px 6px 0 ${typeColor}` }}
                      >
                        <div className="flex flex-col sm:flex-row">
                          <div className="h-40 w-full shrink-0 overflow-hidden border-b-2 border-[#0f172a] bg-slate-50 sm:h-auto sm:w-[190px] sm:border-b-0 sm:border-r-2">
                            {coverPhoto ? (
                              <img src={coverPhoto} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon size={36} className="text-slate-200" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 p-5 md:p-6">
                            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <span
                                  className="mb-2 inline-block rounded-full bg-slate-100 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em]"
                                  style={{ color: typeColor }}
                                >
                                  {EVENT_TYPE_LABELS[eventType]}
                                </span>
                                <h3 className="font-display text-[21px] font-extrabold leading-[1.15] tracking-[-0.03em]">
                                  {event.title}
                                </h3>
                                <p className="mt-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                  <Calendar size={12} />
                                  {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>

                              {Number(event.participants_count) > 0 && (
                                <div
                                  className="flex shrink-0 items-center gap-2 rounded-full border-2 border-[#0f172a] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white"
                                  style={{ backgroundColor: typeColor }}
                                >
                                  <Users size={13} /> {event.participants_count} participant{event.participants_count > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>

                            {(hasPhotos || hasGames) ? (
                              <div className="flex flex-col gap-5 border-t-2 border-slate-100 pt-3.5 sm:flex-row sm:gap-6">
                                {hasPhotos && (
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                                      Photos
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {visiblePhotos.map((photo, index) => (
                                        <button
                                          key={photo.id}
                                          onClick={() => setLightboxPhoto(photo.url)}
                                          className="h-[62px] w-[62px] shrink-0 overflow-hidden rounded-[16px] border-2 border-[#0f172a]"
                                          style={{ transform: `rotate(${((index * 7 + eventIndex * 13) % 9) - 4}deg)` }}
                                        >
                                          <img
                                            src={photo.url}
                                            alt=""
                                            loading="lazy"
                                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                                          />
                                        </button>
                                      ))}
                                    </div>
                                    {evPhotos.length > 3 && (
                                      <button
                                        onClick={() => toggleSection(event.id, 'photos')}
                                        className="mt-auto flex items-center gap-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-[#1a5f7a]"
                                      >
                                        {photosExpanded
                                          ? <>Réduire <ChevronUp size={14} /></>
                                          : <>Voir toutes les photos ({evPhotos.length}) <ChevronDown size={14} /></>}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {hasGames && (
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                                      Jeux joués
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {visibleGames.map(game => <GameThumb key={game.id} game={game} />)}
                                    </div>
                                    {evGames.length > 3 && (
                                      <button
                                        onClick={() => toggleSection(event.id, 'games')}
                                        className="mt-auto flex items-center gap-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-[#1a5f7a]"
                                      >
                                        {gamesExpanded
                                          ? <>Réduire <ChevronUp size={14} /></>
                                          : <>Voir tous les jeux ({evGames.length}) <ChevronDown size={14} /></>}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 border-t-2 border-slate-100 pt-4 text-slate-300">
                                <ImageIcon size={20} />
                                <p className="text-xs italic">Pas de photo pour cet événement.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Reveal>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a5f7a]/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute right-4 top-4 z-20 rounded-full border-2 border-[#0f172a] bg-white p-2 text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxPhoto}
            alt=""
            className="max-h-[90vh] max-w-full rounded-[22px] border-2 border-[#0f172a]"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </PublicLayout>
  )
}
