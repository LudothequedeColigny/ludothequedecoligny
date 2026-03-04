import { useNavigate } from 'react-router-dom'
import { useEffect, useState, memo } from 'react'
import { supabase } from '../services/supabaseClient'
import { 
  Dice5, 
  Calendar, 
  ArrowRight, 
  MapPin, 
  Loader2,
  User,
  Heart,
  Clock,
  ImageIcon,
  HelpCircle,
  X,
  Phone,
  Mail,
  Facebook
} from 'lucide-react'

// Composant pour tes icônes avec mouvement fluide et aléatoire
const FloatingIcons = memo(() => {
  const myIcons = ['01.svg', '02.svg', '03.svg', '04.svg', '05.svg', '06.svg', '07.svg'];
  const colors = ['#1a5f7a', '#e38154'];
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const count = isMobile ? 35 : 65;
  
  const [particles] = useState(() => 
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      fileName: myIcons[Math.floor(Math.random() * myIcons.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.floor(Math.random() * (isMobile ? 25 : 35) + 15), 
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: Math.random() * (40 - 25) + 25,
      delay: Math.random() * -40,
      rotation: Math.floor(Math.random() * 360),
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-random-float"
          style={{
            left: p.left,
            top: p.top,
            animation: `randomFloat ${p.duration}s infinite ease-in-out ${p.delay}s`,
            opacity: isMobile ? 0.25 : 0.35 
          }}
        >
          <div 
            style={{ 
              width: `${p.size}px`, 
              height: `${p.size}px`,
              backgroundColor: p.color,
              maskImage: `url(/icons/${p.fileName})`,
              WebkitMaskImage: `url(/icons/${p.fileName})`,
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              transform: `rotate(${p.rotation}deg)`
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes randomFloat {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25% { transform: translate(60px, -40px) rotate(90deg) scale(1.1); }
          50% { transform: translate(20px, -100px) rotate(180deg) scale(1); }
          75% { transform: translate(-50px, -50px) rotate(270deg) scale(0.9); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }
        .animate-random-float { will-change: transform; }
      `}</style>
    </div>
  );
});

export default function Home() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [gameCount, setGameCount] = useState(0)
  const [playerCount, setPlayerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  
  // AJOUT : État pour le contact dynamique
  const [contact, setContact] = useState({
    nom: 'Victor Guyon',
    tel: '06 71 41 56 96',
    email: 'victor.guyon@hotmail.fr'
  })

  const facebookUrl1 = "https://www.facebook.com/groups/2677832192298067"
  const facebookUrl = "https://www.facebook.com/groups/ludothequedecoligny?locale=fr_FR"
  const addressQuery = "419+Grande+Rue,+01270+Coligny"

  useEffect(() => {
    async function fetchHomeData() {
      try {
        setLoading(true)
        
        // 1. Fetch Contact Settings (Nouveau)
        const { data: settingsData } = await supabase.from('settings').select('*')
        if (settingsData) {
          const c = { ...contact }
          settingsData.forEach(s => {
            if (s.id === 'contact_nom') c.nom = s.value
            if (s.id === 'contact_tel') c.tel = s.value
            if (s.id === 'contact_email') c.email = s.value
          })
          setContact(c)
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

        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true })
          .limit(4)
        
        setEvents(eventData || [])
      } catch (error) {
        console.error("Erreur Home:", error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchHomeData()
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

  return (
    <div className={`min-h-screen bg-white text-slate-900 font-sans ${selectedEvent ? 'overflow-hidden' : ''}`}>
      
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1a5f7a] flex items-center justify-center shadow-lg shadow-cyan-100 shrink-0">
                <Dice5 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tight text-slate-900 leading-none">Ludothèque de Coligny</h1>
                <p className="text-[10px] uppercase font-bold text-[#e38154] tracking-widest mt-1">Un service de l'association PACTES</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="hidden lg:flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] transition-colors text-[10px] font-black uppercase tracking-widest">
                <Facebook size={18} />
                <span>Nous suivre</span>
              </a>
              <button onClick={() => navigate('/login')} className="px-5 py-2 rounded-xl border-2 border-slate-100 hover:border-[#1a5f7a] hover:text-[#1a5f7a] font-bold transition-all text-xs uppercase tracking-widest">
                Espace Bénévole
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative pt-16 pb-12 md:pt-24 md:pb-16 text-center overflow-hidden bg-[#fdfaf6]">
        <FloatingIcons />

        <div className="relative max-w-6xl mx-auto px-4 z-10">
          <h2 className="text-4xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8">
            Le jeu pour tous, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1a5f7a] to-[#2d8ba1]">
              à partager à Coligny ... et autour
            </span>
          </h2>
          <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium mb-10">
            Portée par l'association <span className="text-slate-900 font-bold">PACTES</span>, notre ludothèque est un espace de rencontre et de partage.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <button onClick={() => navigate('/catalogue')} className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[#e38154] text-white font-black flex items-center justify-center gap-3 hover:bg-[#d06b42] transition-all hover:scale-105 shadow-xl shadow-orange-100 uppercase tracking-widest text-sm">
              Explorer notre collection
              <ArrowRight size={20} />
            </button>
            <button onClick={() => navigate('/comment-emprunter')} className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-[#1a5f7a] border-2 border-slate-100 font-black flex items-center justify-center gap-3 hover:border-[#1a5f7a] transition-all hover:scale-105 uppercase tracking-widest text-sm shadow-sm">
              <HelpCircle size={20} />
              Comment emprunter ?
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <button 
              onClick={() => navigate('/catalogue')}
              className="p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm group hover:border-[#1a5f7a] hover:shadow-xl hover:-translate-y-1 transition-all relative z-10 w-full text-center cursor-pointer"
            >
                <Dice5 className="w-10 h-10 text-[#1a5f7a] mb-4 mx-auto group-hover:rotate-12 transition-transform" />
                <p className="text-5xl font-black text-slate-900 mb-1">{loading ? "..." : gameCount}</p>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Jeux à emprunter</p>
            </button>

            <button 
              onClick={() => navigate('/comment-emprunter')}
              className="p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm group hover:border-[#e38154] hover:shadow-xl hover:-translate-y-1 transition-all relative z-10 w-full text-center cursor-pointer"
            >
                <User className="w-10 h-10 text-[#e38154] mb-4 mx-auto group-hover:scale-110 transition-transform" />
                <p className="text-5xl font-black text-slate-900 mb-1">{loading ? "..." : playerCount}</p>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Joueurs Passionnés</p>
            </button>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-[#e38154] font-black uppercase tracking-[0.3em] text-xs">À ne pas manquer</span>
            <h3 className="text-4xl font-black text-slate-900 mt-2 mb-4">Nos prochains rendez-vous</h3>
            <div className="h-1.5 w-20 bg-[#1a5f7a] mx-auto rounded-full"></div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#1a5f7a]" size={40} /></div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {events.map((event) => (
                <div key={event.id} onClick={() => setSelectedEvent(event)} className="group bg-[#fcfcfc] rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col sm:flex-row h-full cursor-pointer">
                  <div className="sm:w-48 h-48 sm:h-auto bg-slate-100 flex-shrink-0">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={40} /></div>
                    )}
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <p className="text-[#e38154] font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Calendar size={14} /> {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                       <span className="text-slate-300 mx-1">|</span>
                       <Clock size={12} /> {formatEventDuration(event.date, event.end_time)}
                    </p>
                    <h4 className="text-2xl font-bold text-slate-900 mb-2">{event.title}</h4>
                    <p className="text-slate-500 text-sm line-clamp-2 italic">{event.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-[#1a5f7a] font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
                      Voir les détails <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 italic">Consultez régulièrement notre agenda.</p>
            </div>
          )}
        </div>
      </section>

      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1a5f7a]/90 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[95vh] rounded-[2rem] md:rounded-[3rem] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300 border-b-8 border-[#e38154]">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full text-[#1a5f7a] shadow-lg hover:bg-[#e38154] hover:text-white transition-colors">
              <X size={24} />
            </button>
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-1/2 bg-slate-50 flex items-center justify-center p-4 md:p-8 min-h-[300px] md:min-h-0 border-b md:border-b-0 md:border-r border-slate-100">
                {selectedEvent.image_url ? (
                  <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full h-auto max-h-[60vh] md:max-h-full object-contain rounded-xl" />
                ) : (
                  <ImageIcon size={64} className="text-slate-200" />
                )}
              </div>
              <div className="w-full md:w-1/2 p-6 md:p-12 bg-white">
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">{selectedEvent.title}</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#f0f7f9] flex items-center justify-center text-[#1a5f7a] flex-shrink-0"><Calendar size={20} /></div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Le jour J</p>
                        <p className="font-bold text-slate-800 text-sm">{new Date(selectedEvent.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#f0f7f9] flex items-center justify-center text-[#1a5f7a] flex-shrink-0"><Clock size={20} /></div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Horaires</p>
                        <p className="font-bold text-slate-800 text-sm">
                            {selectedEvent.end_time ? `De ${formatEventDuration(selectedEvent.date, selectedEvent.end_time)}` : `Début à ${formatEventDuration(selectedEvent.date)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#f0f7f9] flex items-center justify-center text-[#1a5f7a] flex-shrink-0"><MapPin size={20} /></div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Où ?</p>
                        <p className="font-bold text-slate-800 text-sm">{selectedEvent.location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-slate-600 leading-relaxed text-sm md:text-base whitespace-pre-line font-medium italic">{selectedEvent.description || "Aucune description disponible."}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="py-24 bg-[#1a5f7a] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/5 rounded-full -ml-48 -mb-48"></div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-black mb-8 leading-tight">Nous vous attendons au <br/><span className="text-[#e38154]">419 Grande Rue à Coligny</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-6 rounded-[2rem]">
                  <Clock size={24} className="text-[#e38154] mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200 mb-1">1ers Samedis du mois</p>
                  <p className="text-xl font-bold">10h00 — 12h00</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-6 rounded-[2rem]">
                  <Clock size={24} className="text-[#e38154] mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200 mb-1">3e Samedis du mois</p>
                  <p className="text-xl font-bold">14h00 — 16h00</p>
                </div>
              </div>
            </div>
            <div className="relative group">
               <div className="relative bg-white/10 backdrop-blur-md border border-white/20 p-8 md:p-12 rounded-[3rem] text-center max-w-sm mx-auto">
                  <MapPin size={40} className="text-[#e38154] mb-4 mx-auto" />
                  <p className="text-xs font-bold text-cyan-100/60 mb-6 uppercase tracking-widest">Plan & Navigation</p>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`} target="_blank" rel="noopener noreferrer" className="inline-block w-full px-8 py-4 bg-white text-[#1a5f7a] rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#e38154] hover:text-white hover:scale-105 transition-all shadow-xl">Ouvrir l'itinéraire</a>
               </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-8 text-center">Une question spécifique ?</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#1a5f7a] transition-colors"><User size={16} /></div>
                <span className="text-sm font-bold text-slate-600">{contact.nom}</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#e38154] transition-colors"><Phone size={16} /></div>
                <span className="text-sm font-medium text-slate-400">{contact.tel}</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#1a5f7a] transition-colors"><Mail size={16} /></div>
                <span className="text-sm font-medium text-slate-400">{contact.email}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-slate-50 text-center">
        <div className="mb-6">
          <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] transition-all text-[9px] font-black uppercase tracking-[0.2em] border border-slate-200 px-4 py-2 rounded-full hover:bg-white">
            <Facebook size={14} /> Rejoignez-nous sur Facebook
          </a>
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Facebook size={20} fill="#e38154" className="text-[#e38154]" />
          <a href={facebookUrl1} target="_blank" rel="noopener noreferrer" className="font-black uppercase tracking-widest text-xs text-slate-600 hover:text-[#1a5f7a] transition-colors">Association PACTES</a>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Ludothèque de Coligny — Le plaisir du jeu ensemble</p>
      </footer>
    </div>
  )
}