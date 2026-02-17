import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { 
  X, 
  Users, 
  Clock, 
  Dice5, 
  Search, 
  Filter, 
  ChevronDown, 
  Baby, 
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Calendar
} from 'lucide-react'

function Catalogue() {
  const navigate = useNavigate()
  const [jeux, setJeux] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJeu, setSelectedJeu] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Tous")
  const [playerCount, setPlayerCount] = useState("")
  const [selectedAge, setSelectedAge] = useState("Tous") // Nouvel état pour l'âge

  useEffect(() => {
    async function fetchJeux() {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .order('name', { ascending: true })
        if (error) {
          console.error("Erreur Supabase :", error.message)
        } else {
          setJeux(data)
        }
      } catch (err) {
        console.error("Erreur critique :", err)
      } finally {
        setLoading(false)
      }
    }
    fetchJeux()
  }, [])

  // Liste des catégories atomiques
  const categories = ["Tous", ...new Set(
    jeux.flatMap(j => j.category ? j.category.split(',').map(cat => cat.trim()) : [])
  )].sort()

  // Liste des âges disponibles pour le filtre
  const ageOptions = ["Tous", ...new Set(jeux.map(j => j.min_age).filter(Boolean))].sort((a, b) => a - b)

  const filteredJeux = jeux.filter((jeu) => {
    // 1. Recherche textuelle
    const matchesSearch = jeu.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 2. Filtre Catégorie
    const gameCats = jeu.category ? jeu.category.split(',').map(c => c.trim()) : []
    const matchesCategory = selectedCategory === "Tous" || gameCats.includes(selectedCategory)
    
    // 3. Filtre Joueurs
    const pCount = parseInt(playerCount)
    const matchesPlayers = !playerCount || (pCount >= (jeu.min_players || 0) && pCount <= (jeu.max_players || 99))

    // 4. Filtre Âge (Affiche les jeux dont l'âge requis est inférieur ou égal à l'âge choisi)
    const matchesAge = selectedAge === "Tous" || (jeu.min_age <= parseInt(selectedAge))

    return matchesSearch && matchesCategory && matchesPlayers && matchesAge
  })

  if (loading) return (
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col items-center justify-center gap-4 text-[#1a5f7a] font-black uppercase tracking-widest animate-pulse">
      <Dice5 size={48} className="animate-bounce" />
      <p>Chargement de la collection...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900 font-sans">
      
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex-1">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] font-bold transition-colors text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest"
            >
              <ArrowLeft size={16} />
              <span>Retour à l'accueil</span>
            </button>
          </div>
          <div className="hidden md:flex flex-1 justify-center text-center">
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-[#1a5f7a]">Catalogue</h1>
          </div>
          <div className="hidden md:block flex-1"></div> 
        </div>
      </header>

      <main className="p-4 md:p-12 max-w-7xl mx-auto">
        
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
            Notre <span className="text-[#1a5f7a]">Collection</span>
          </h2>
          
          {/* GRILLE DE FILTRES RÉPONSIVE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-6xl mx-auto">
            
            {/* Recherche Nom */}
            <div className="relative w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
              <input
                type="text"
                placeholder="Nom du jeu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-4 py-4 bg-white border border-slate-100 rounded-[1.2rem] shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/20 outline-none font-medium text-sm"
              />
            </div>

            {/* Filtre Catégorie */}
            <div className="relative w-full">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#e38154]" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-14 pr-10 py-4 bg-white border border-slate-100 rounded-[1.2rem] shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/20 outline-none appearance-none font-bold uppercase text-[9px] tracking-wider cursor-pointer"
              >
                <option value="Tous">Toutes Catégories</option>
                {categories.filter(cat => cat !== "Tous").map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
            </div>

            {/* Filtre Joueurs */}
            <div className="relative w-full">
              <UserPlus className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#1a5f7a]" />
              <input
                type="number"
                placeholder="Nb joueurs"
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="w-full pl-14 pr-4 py-4 bg-white border border-slate-100 rounded-[1.2rem] shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/20 outline-none font-bold text-sm"
              />
            </div>

            {/* Filtre Âge */}
            <div className="relative w-full">
              <Baby className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#e38154]" />
              <select
                value={selectedAge}
                onChange={(e) => setSelectedAge(e.target.value)}
                className="w-full pl-14 pr-10 py-4 bg-white border border-slate-100 rounded-[1.2rem] shadow-sm focus:ring-2 focus:ring-[#1a5f7a]/20 outline-none appearance-none font-bold uppercase text-[9px] tracking-wider cursor-pointer"
              >
                <option value="Tous">Âge maximum</option>
                {ageOptions.filter(a => a !== "Tous").map((age) => (
                  <option key={age} value={age}>{age} ans et +</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
            </div>

          </div>
          
          <p className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            {filteredJeux.length} {filteredJeux.length > 1 ? 'jeux trouvés' : 'jeu trouvé'}
          </p>
        </div>

        {/* GRILLE DE JEUX */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {filteredJeux.map((jeu) => (
            <div 
              key={jeu.id} 
              onClick={() => setSelectedJeu(jeu)}
              className="group bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-50 transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer flex flex-col"
            >
              <div className="h-56 md:h-64 w-full bg-white relative overflow-hidden flex items-center justify-center p-6 md:p-8">
                <div className="absolute inset-0 bg-[#f0f7f9]/30"></div>
                {jeu.image_url ? (
                  <img src={jeu.image_url} alt={jeu.name} className="relative z-10 max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <Dice5 size={64} className="text-slate-100" />
                )}
                
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-[#1a5f7a] text-white px-2.5 py-1 rounded-lg text-[9px] font-black shadow-lg uppercase">
                    {jeu.min_age || '3'}+ ans
                  </span>
                </div>

                <div className="absolute top-4 right-4 z-20">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${jeu.is_available ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {jeu.is_available ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 flex-grow border-t border-slate-50">
                <div className="flex flex-wrap gap-1 mb-2">
                  {jeu.category ? jeu.category.split(',').map((cat, i) => (
                    <span key={i} className="text-[8px] font-black text-[#e38154] uppercase bg-orange-50 px-2 py-0.5 rounded-md">
                      {cat.trim()}
                    </span>
                  )) : (
                    <span className="text-[8px] font-black text-[#e38154] uppercase bg-orange-50 px-2 py-0.5 rounded-md">Standard</span>
                  )}
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 mb-4 group-hover:text-[#1a5f7a] transition-colors line-clamp-1 leading-tight">{jeu.name}</h2>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                  <span className="flex items-center gap-2"><Users size={14} className="text-[#1a5f7a]/40"/> {jeu.min_players}-{jeu.max_players}</span>
                  <span className="flex items-center gap-2"><Clock size={14} className="text-[#1a5f7a]/40"/> {jeu.duration || '--'} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODALE (Identique à la précédente avec support multi-catégories) */}
      {selectedJeu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1a5f7a]/90 backdrop-blur-sm" onClick={() => setSelectedJeu(null)}></div>
          
          <div className="relative bg-white w-[98%] sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] md:rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 border-b-8 border-[#e38154] flex flex-col">
            <button onClick={() => setSelectedJeu(null)} className="absolute top-4 right-4 p-2 bg-slate-50 text-[#1a5f7a] hover:bg-[#e38154] hover:text-white rounded-full transition-all z-30 shadow-sm"><X size={20} /></button>

            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-1/2 bg-slate-50 flex items-center justify-center p-6 md:p-12 min-h-[250px] md:min-h-[400px]">
                {selectedJeu.image_url ? (
                  <img src={selectedJeu.image_url} alt={selectedJeu.name} className="max-w-full max-h-[30vh] md:max-h-[50vh] object-contain drop-shadow-2xl rounded-2xl" />
                ) : ( <Dice5 size={80} className="text-slate-200" /> )}
              </div>

              <div className="p-6 md:p-12 md:w-1/2 flex flex-col">
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedJeu.category?.split(',').map((cat, i) => (
                    <span key={i} className="px-3 py-1 bg-[#fdf2ee] text-[#e38154] text-[9px] md:text-[10px] font-black uppercase rounded-full">
                      {cat.trim()}
                    </span>
                  ))}
                </div>
                
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 mb-6 leading-tight">{selectedJeu.name}</h2>
                
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
                  <div className="p-3 md:p-4 bg-slate-50 rounded-[1.2rem] md:rounded-[1.5rem] text-center">
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase block mb-1">Joueurs</span>
                    <span className="text-[11px] md:text-sm font-black text-[#1a5f7a] flex items-center justify-center gap-1"><Users size={14}/> {selectedJeu.min_players}-{selectedJeu.max_players}</span>
                  </div>
                  <div className="p-3 md:p-4 bg-[#f0f7f9] rounded-[1.2rem] md:rounded-[1.5rem] text-center border border-[#1a5f7a]/5">
                    <span className="text-[8px] md:text-[9px] font-black text-[#1a5f7a]/60 uppercase block mb-1">Âge</span>
                    <span className="text-[11px] md:text-sm font-black text-[#1a5f7a] flex items-center justify-center gap-1"><Baby size={14}/> {selectedJeu.min_age || '3'}+</span>
                  </div>
                  <div className="p-3 md:p-4 bg-slate-50 rounded-[1.2rem] md:rounded-[1.5rem] text-center">
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase block mb-1">Temps</span>
                    <span className="text-[11px] md:text-sm font-black text-[#1a5f7a] flex items-center justify-center gap-1"><Clock size={14}/> {selectedJeu.duration || '--'}'</span>
                  </div>
                </div>

                <div className="mb-8 flex-grow">
                  <h4 className="text-[10px] font-black text-[#e38154] uppercase tracking-[0.2em] mb-3">Description</h4>
                  <p className="text-slate-500 leading-relaxed font-medium italic text-xs md:text-sm">
                    {selectedJeu.description || "Aucune description disponible."}
                  </p>
                </div>

                <div className={`mb-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black uppercase text-[9px] md:text-[10px] border ${selectedJeu.is_available ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                   {selectedJeu.is_available ? <><CheckCircle2 size={16}/> Disponible</> : <><AlertCircle size={16}/> En prêt</>}
                </div>

                {selectedJeu.youtube_url && (
                  <a href={selectedJeu.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-4 md:py-5 bg-[#1a5f7a] hover:bg-[#e38154] text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[11px] transition-all shadow-xl shadow-cyan-900/10">
                    <PlayCircle size={20} /> Vidéo des règles
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalogue;