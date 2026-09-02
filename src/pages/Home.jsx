import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import TitrePactes from '../components/TitrePactes'
import PublicLayout from '../components/site/PublicLayout'
import FloatingIcons from '../components/site/FloatingIcons'
import MaskIcon from '../components/site/MaskIcon'
import Reveal from '../components/site/Reveal'
import CountUp from '../components/site/CountUp'
import Modal from '../components/site/Modal'
import { BTN_PRIMARY, BTN_SECONDARY, BTN_ON_COLOR, EYEBROW } from '../components/site/styles'
import { MapPin, Loader2, ImageIcon } from 'lucide-react'

// Les trois dés qui tombent en ouverture de la page
const HERO_DICE = [
  { icon: '01.svg', pip: '#1a5f7a', shadow: '#e38154', drop: 0, pipDelay: 0.8, idle: 1.6 },
  { icon: '03.svg', pip: '#e38154', shadow: '#1a5f7a', drop: 0.15, pipDelay: 0.95, idle: 1.8 },
  { icon: '06.svg', pip: '#1a5f7a', shadow: '#e38154', drop: 0.3, pipDelay: 1.1, idle: 2 },
]

export default function Home() {
  const navigate = useNavigate()
  const [events, setEvents] = useState({ upcoming: [], past: [] })
  const [gameCount, setGameCount] = useState(0)
  const [playerCount, setPlayerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Chiffres et visuels résumant la page « Vie de la ludothèque »
  const [vie, setVie] = useState({ photos: [], photoCount: 0, editions: 0, jeuxJoues: 0 })

  // État pour les horaires dynamiques
  const [horaires, setHoraires] = useState({
    horaire_1_jour: 'Samedi',
    horaire_1_rang: '1',
    horaire_1_debut: '10:00',
    horaire_1_fin: '12:00',
    horaire_2_actif: 'true',
    horaire_2_jour: 'Samedi',
    horaire_2_rang: '3',
    horaire_2_debut: '14:00',
    horaire_2_fin: '16:00',
  })

  // État pour l'adresse dynamique
  const [adresse, setAdresse] = useState({
    rue: '419 Grande Rue',
    ville: 'Coligny',
    code_postal: '01270'
  })

  // Adresse dynamique pour Google Maps
  const addressQuery = `${adresse.rue}, ${adresse.code_postal} ${adresse.ville}`.replace(/ /g, '+')
  const adresseComplete = `${adresse.rue}, ${adresse.code_postal} ${adresse.ville}`

  // Libellé du rang + jour
  const rangLabel = (rang, jour) => {
    const labels = { '1': '1ers', '2': '2es', '3': '3es', '4': '4es', '5': 'Derniers' }
    return `${labels[rang] || `${rang}es`} ${jour || 'Samedis'} du mois`
  }

  // Formatage heure "10:00" → "10h00"
  const formatHeure = (h) => h ? h.replace(':', 'h') : ''

  useEffect(() => {
    async function fetchHomeData() {
      try {
        setLoading(true)

        // 1. Fetch Contact Settings
        const { data: settingsData } = await supabase.from('settings').select('*')
        if (settingsData) {
          const h = { ...horaires }
          const a = { ...adresse }
          settingsData.forEach(s => {
            if (s.id === 'horaire_1_jour') h.horaire_1_jour = s.value
            if (s.id === 'horaire_1_rang') h.horaire_1_rang = s.value
            if (s.id === 'horaire_1_debut') h.horaire_1_debut = s.value
            if (s.id === 'horaire_1_fin') h.horaire_1_fin = s.value
            if (s.id === 'horaire_2_actif') h.horaire_2_actif = s.value
            if (s.id === 'horaire_2_jour') h.horaire_2_jour = s.value
            if (s.id === 'horaire_2_rang') h.horaire_2_rang = s.value
            if (s.id === 'horaire_2_debut') h.horaire_2_debut = s.value
            if (s.id === 'horaire_2_fin') h.horaire_2_fin = s.value
            if (s.id === 'adresse_rue') a.rue = s.value
            if (s.id === 'adresse_ville') a.ville = s.value
            if (s.id === 'adresse_code_postal') a.code_postal = s.value
          })
          setHoraires(h)
          setAdresse(a)
        }

        const { count: gCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
        if (gCount) setGameCount(gCount)

        const { data: membersData } = await supabase
          .from('members')
          .select('family_members')

        if (membersData) {
          const total = membersData.reduce((acc, current) => {
            const familyCount = Array.isArray(current.family_members) ? current.family_members.length : 0
            return acc + 1 + familyCount
          }, 0)
          setPlayerCount(total)
        }

        // Un seul appel : l'agenda n'affiche que les événements non archivés,
        // tandis que les compteurs « vie de la ludothèque » portent sur tout l'historique.
        const [{ data: eventData }, { data: photosData }, { data: gamesPlayedData }] = await Promise.all([
          supabase.from('events').select('*').order('date', { ascending: true }),
          supabase.from('event_photos').select('id, event_id, url'),
          supabase.from('event_games_played').select('name'),
        ])

        const allEvents = eventData || []
        const photos = photosData || []
        const now = new Date()

        const agenda = allEvents.filter(e => !e.archived_at)
        setEvents({
          upcoming: agenda.filter(e => new Date(e.date) >= now),
          past: agenda.filter(e => new Date(e.date) < now),
        })

        // Une « édition » = un événement passé documenté (participants renseignés ou photos)
        const eventIdsWithPhotos = new Set(photos.map(p => p.event_id))
        const editions = allEvents.filter(e =>
          new Date(e.date) < now &&
          (Number(e.participants_count) > 0 || eventIdsWithPhotos.has(e.id))
        ).length

        const uniqueGames = new Set()
        ;(gamesPlayedData || []).forEach(g => { if (g.name) uniqueGames.add(g.name.trim().toLowerCase()) })

        setVie({
          photos: photos.slice(0, 3),
          photoCount: photos.length,
          editions,
          jeuxJoues: uniqueGames.size,
        })
      } catch (error) {
        console.error("Erreur Home:", error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchHomeData()
  }, [])

  // Tracking des visites de la page d'accueil
  useEffect(() => {
    supabase.from('page_views').insert({
      page: 'home',
      user_agent: navigator.userAgent,
      referrer: document.referrer || null
    }).then(({ error }) => {
      if (error) console.error("Erreur tracking page_views:", error.message)
    })
  }, [])

  const formatEventDuration = (dateIso, endTime) => {
    if (!dateIso) return "H-NC";
    const d = new Date(dateIso);
    const start = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');

    if (endTime) {
      const formattedEnd = endTime.replace(':', 'h');
      return `${start} — ${formattedEnd}`;
    }
    return start;
  }

  const formatEventDay = (dateIso) =>
    new Date(dateIso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  const vieChips = [
    { value: vie.photoCount, label: 'Photos' },
    { value: vie.editions, label: 'Événements' },
    { value: vie.jeuxJoues, label: 'Jeux joués' },
  ].filter(c => c.value > 0)

  return (
    <PublicLayout>
      <main>
        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden px-4 pb-8 pt-10 text-center md:px-10 md:pb-14 md:pt-20">
          <FloatingIcons />

          <div className="relative z-10 mx-auto max-w-[900px]">
            <div className="mb-6 flex justify-center gap-3.5">
              {HERO_DICE.map((die) => (
                <div key={die.icon} className="anim-die-drop" style={{ animationDelay: `${die.drop}s` }}>
                  <div
                    className="anim-die-idle flex h-[54px] w-[54px] items-center justify-center rounded-[18px] border-2 border-[#0f172a] bg-white"
                    style={{ boxShadow: `3px 3px 0 ${die.shadow}`, animationDelay: `${die.idle}s` }}
                  >
                    <MaskIcon
                      file={die.icon}
                      size={26}
                      color={die.pip}
                      className="anim-pip-in"
                      style={{ animationDelay: `${die.pipDelay}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <h1 className="mb-5 font-display text-[27px] font-extrabold leading-none tracking-[-0.045em] sm:text-[38px] md:text-[62px] lg:text-[76px]">
              <span className="block overflow-hidden pb-[0.06em]">
                <span className="anim-word-up inline-block" style={{ animationDelay: '0.45s' }}>
                  Le jeu pour tous,
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.06em]">
                <span className="anim-word-up inline-block" style={{ animationDelay: '0.6s' }}>
                  <span className="inline-block -rotate-[1.5deg] rounded-[14px] bg-[#e38154] px-[0.18em] text-white">
                    à partager à Coligny
                  </span>
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.06em]">
                <span
                  className="anim-word-up inline-block text-[0.6em] italic text-[#1a5f7a]"
                  style={{ animationDelay: '0.75s' }}
                >
                  ... et autour
                </span>
              </span>
            </h1>

            <p
              className="anim-soft-in mx-auto mb-7 max-w-[32em] text-[15px] font-medium leading-[1.65] text-slate-500 md:text-[19px]"
              style={{ animationDelay: '0.9s' }}
            >
              Portée par l'association <TitrePactes />, notre ludothèque est un espace de rencontre et de partage.
            </p>

            <div
              className="anim-soft-in flex flex-wrap justify-center gap-3.5"
              style={{ animationDelay: '1.05s' }}
            >
              <button onClick={() => navigate('/catalogue')} className={BTN_PRIMARY}>
                Explorer notre collection →
              </button>
              <button onClick={() => navigate('/comment-emprunter')} className={BTN_SECONDARY}>
                Comment emprunter ?
              </button>
            </div>
          </div>
        </section>

        {/* ---------- CHIFFRES CLÉS ---------- */}
        <section className="px-4 pb-8 md:px-10 md:pb-14">
          <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-4 sm:grid-cols-2">
            <Reveal
              as="button"
              variant="scale"
              onClick={() => navigate('/catalogue')}
              className="rounded-[30px] border-2 border-[#0f172a] bg-white px-6 py-7 text-center shadow-[5px_5px_0_#1a5f7a] transition-transform duration-300 hover:-translate-y-1 hover:-rotate-[1.5deg] md:px-8 md:py-8"
            >
              <div className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em] text-[#1a5f7a] md:text-[58px]">
                {loading ? '···' : <CountUp value={gameCount} />}
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                Jeux à emprunter
              </div>
            </Reveal>

            <Reveal
              as="button"
              variant="scale"
              delay={90}
              onClick={() => navigate('/comment-emprunter')}
              className="rounded-[30px] border-2 border-[#0f172a] bg-white px-6 py-7 text-center shadow-[5px_5px_0_#e38154] transition-transform duration-300 hover:-translate-y-1 hover:rotate-[1.5deg] md:px-8 md:py-8"
            >
              <div className="font-display text-[40px] font-extrabold leading-none tracking-[-0.05em] text-[#e38154] md:text-[58px]">
                {loading ? '···' : <CountUp value={playerCount} />}
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                Joueurs passionnés
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- LA VIE DE LA LUDOTHÈQUE ---------- */}
        <section className="px-4 py-8 md:px-10 md:py-14">
          <Reveal className="mx-auto max-w-[1180px] overflow-hidden rounded-[32px] border-2 border-[#0f172a] bg-[#e38154] text-white shadow-[10px_10px_0_#0f172a] md:rounded-[52px]">
            <div className={`grid grid-cols-1 items-center ${vie.photos.length > 0 ? 'lg:grid-cols-2' : ''}`}>
              <div className="p-7 md:p-12">
                <div className="mb-5 inline-flex items-center gap-2.5 rounded-full bg-[#0f172a] px-4 py-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="anim-pulse-ring absolute inset-0 rounded-full bg-[#e38154]" />
                    <span className="relative h-2 w-2 rounded-full bg-white" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Notre quotidien</span>
                </div>

                <h2 className="mb-4 font-display text-[26px] font-extrabold leading-[0.98] tracking-[-0.045em] sm:text-[32px] md:text-[50px]">
                  La vie de la ludothèque
                </h2>
                <p className="mb-7 max-w-[30em] text-[14px] font-medium leading-[1.62] text-white/85 md:text-[17px]">
                  Les photos, les jeux joués et les moments partagés à chaque permanence.
                  C'est ici que la ludothèque raconte sa vie.
                </p>

                {vieChips.length > 0 && (
                  <div className="mb-7 flex flex-wrap gap-2.5">
                    {vieChips.map(chip => (
                      <div
                        key={chip.label}
                        className="flex items-baseline gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-3"
                      >
                        <CountUp value={chip.value} className="font-display text-[22px] font-extrabold" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">{chip.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => navigate('/vie-association')} className={BTN_ON_COLOR}>
                  Voir la vie de la ludothèque →
                </button>
              </div>

              {/* Aperçu photo — masqué tant qu'aucune photo n'a été publiée */}
              {vie.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-3.5 p-5 md:p-8">
                  {vie.photos.map((photo, i) => (
                    <div
                      key={photo.id}
                      className={`overflow-hidden border-2 border-[#0f172a] ${
                        i === 0
                          ? 'col-span-2 h-[156px] rounded-[26px] -rotate-1'
                          : `h-[118px] rounded-[22px] ${i === 1 ? 'rotate-[1.5deg]' : '-rotate-1'}`
                      }`}
                    >
                      <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </section>

        {/* ---------- AGENDA ---------- */}
        <section className="border-y-2 border-[#0f172a] bg-white px-4 py-14 md:px-10 md:py-20">
          <div className="mx-auto max-w-[1180px]">
            <Reveal className="mb-8 text-center md:mb-12">
              <div className={EYEBROW}>À ne pas manquer</div>
              <h2 className="mt-2.5 font-display text-[28px] font-extrabold tracking-[-0.04em] md:text-[44px]">
                Nos prochains rendez-vous
              </h2>
            </Reveal>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-[#1a5f7a]" size={40} />
              </div>
            ) : events.upcoming.length === 0 && events.past.length === 0 ? (
              <div className="rounded-[30px] border-2 border-dashed border-[#0f172a]/30 bg-[#fdfaf6] py-12 text-center">
                <p className="italic text-slate-400">Consultez régulièrement notre agenda.</p>
              </div>
            ) : (
              <>
                {events.upcoming.length > 0 && (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {events.upcoming.map((event, i) => (
                      <Reveal
                        key={event.id}
                        as="button"
                        delay={(i % 3) * 90}
                        onClick={() => setSelectedEvent(event)}
                        className="overflow-hidden rounded-[32px] border-2 border-[#0f172a] bg-[#fdfaf6] text-left shadow-[6px_6px_0_#1a5f7a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_#1a5f7a]"
                      >
                        <div className="flex h-[156px] items-center justify-center border-b-2 border-[#0f172a] bg-slate-100">
                          {event.image_url ? (
                            <img src={event.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon size={40} className="text-slate-300" />
                          )}
                        </div>
                        <div className="p-5 md:p-6">
                          <div className="mb-3 inline-block rounded-full bg-[#0f172a] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
                            {formatEventDay(event.date)} · {formatEventDuration(event.date, event.end_time)}
                          </div>
                          <div className="mb-2 font-display text-[19px] font-extrabold leading-tight tracking-[-0.03em] md:text-[24px]">
                            {event.title}
                          </div>
                          <p className="line-clamp-3 text-[13.5px] italic leading-[1.55] text-slate-500">
                            {event.description}
                          </p>
                          <div className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1a5f7a]">
                            Voir les détails →
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}

                {events.past.length > 0 && (
                  <>
                    <Reveal className="my-9 flex items-center gap-3.5">
                      <div className="h-0.5 flex-1 bg-slate-100" />
                      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-slate-300">
                        Événements passés
                      </span>
                      <div className="h-0.5 flex-1 bg-slate-100" />
                    </Reveal>

                    <div className="grid grid-cols-1 gap-4 opacity-50 grayscale sm:grid-cols-2 lg:grid-cols-3">
                      {events.past.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-4 rounded-[26px] border-2 border-slate-300 bg-[#fdfaf6] p-3.5"
                        >
                          <div className="hatch h-[74px] w-[74px] shrink-0 overflow-hidden rounded-[18px]">
                            {event.image_url && (
                              <img src={event.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                              {formatEventDay(event.date)}
                            </div>
                            <div className="truncate font-display text-[17px] font-extrabold tracking-[-0.03em] text-slate-400">
                              {event.title}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </section>

        {/* ---------- ADRESSE & HORAIRES ---------- */}
        <section className="px-4 py-14 md:px-10 md:py-20">
          <Reveal className="mx-auto max-w-[1180px] rounded-[32px] border-2 border-[#0f172a] bg-[#1a5f7a] p-7 text-white shadow-[10px_10px_0_#0f172a] md:rounded-[52px] md:p-12">
            <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-2 lg:gap-12">
              <div>
                <h2 className="mb-6 font-display text-[26px] font-extrabold leading-[1.08] tracking-[-0.04em] md:text-[42px]">
                  Nous vous attendons au<br />
                  <span className="text-[#e38154]">{adresseComplete}</span>
                </h2>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/20 bg-white/10 p-5">
                    <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ffd7c2]">
                      {rangLabel(horaires.horaire_1_rang, horaires.horaire_1_jour)}
                    </div>
                    <div className="font-display text-[22px] font-extrabold tracking-[-0.03em]">
                      {formatHeure(horaires.horaire_1_debut)} — {formatHeure(horaires.horaire_1_fin)}
                    </div>
                  </div>
                  {horaires.horaire_2_actif === 'true' && (
                    <div className="rounded-[24px] border border-white/20 bg-white/10 p-5">
                      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ffd7c2]">
                        {rangLabel(horaires.horaire_2_rang, horaires.horaire_2_jour)}
                      </div>
                      <div className="font-display text-[22px] font-extrabold tracking-[-0.03em]">
                        {formatHeure(horaires.horaire_2_debut)} — {formatHeure(horaires.horaire_2_fin)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <div className="mb-5 flex h-[150px] flex-col items-center justify-center gap-3 rounded-[26px] border-2 border-white/30 bg-white/10 px-4">
                  <MapPin size={34} className="text-[#e38154]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                    {adresseComplete}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${BTN_PRIMARY} w-full`}
                >
                  Ouvrir l'itinéraire
                </a>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------- MODALE ÉVÉNEMENT ---------- */}
      <Modal
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title}
        maxWidth={880}
        scroll
        strip
      >
        {selectedEvent && (
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex min-h-[220px] items-center justify-center border-b-2 border-[#0f172a] bg-[#fdfaf6] p-4 md:min-h-[300px] md:border-b-0 md:border-r-2">
              {selectedEvent.image_url ? (
                <img
                  src={selectedEvent.image_url}
                  alt={selectedEvent.title}
                  className="max-h-[46vh] w-full rounded-[16px] object-contain"
                />
              ) : (
                <ImageIcon size={56} className="text-slate-200" />
              )}
            </div>

            <div className="p-6 md:p-10">
              <h2 className="mb-6 font-display text-[24px] font-extrabold leading-[1.08] tracking-[-0.04em] md:text-[32px]">
                {selectedEvent.title}
              </h2>

              <div className="mb-6 flex flex-col gap-3.5">
                {[
                  {
                    icon: '06.svg',
                    label: 'Le jour J',
                    value: new Date(selectedEvent.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
                  },
                  {
                    icon: '03.svg',
                    label: 'Horaires',
                    value: selectedEvent.end_time
                      ? `De ${formatEventDuration(selectedEvent.date, selectedEvent.end_time)}`
                      : `Début à ${formatEventDuration(selectedEvent.date)}`,
                  },
                  { icon: '07.svg', label: 'Où ?', value: selectedEvent.location },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border-2 border-[#0f172a] bg-[#f0f7f9]">
                      <MaskIcon file={row.icon} size={18} color="#1a5f7a" />
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                        {row.label}
                      </div>
                      <div className="mt-[3px] text-sm font-bold">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="whitespace-pre-line border-t-2 border-slate-100 pt-5 text-[14.5px] font-medium italic leading-[1.65] text-slate-600">
                {selectedEvent.description || "Aucune description disponible."}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </PublicLayout>
  )
}
