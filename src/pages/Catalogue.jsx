import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { 
  X, 
  Users, 
  Clock, 
  Dice5, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Baby, 
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Tag
} from 'lucide-react'

function Catalogue() {
  const navigate = useNavigate()
  const [jeux, setJeux] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJeu, setSelectedJeu] = useState(null)
  
  // État pour la description extensible
  const [isExpanded, setIsExpanded] = useState(false)
  
  // États des Filtres
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState([]) 
  const [categoryInput, setCategoryInput] = useState("")
  const [selectedAge, setSelectedAge] = useState("Tous")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionRef = useRef(null)

  useEffect(() => {
    async function fetchJeux() {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .order('name', { ascending: true })
        if (error) console.error("Erreur Supabase :", error.message)
        else setJeux(data || [])
      } catch (err) {
        console.error("Erreur critique :", err)
      } finally {
        setLoading(false)
      }
    }
    fetchJeux()
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const allCategories = [...new Set(
    jeux.flatMap(j => j.category ? j.category.split(',').map(cat => cat.trim()) : [])
  )].sort()

  const suggestions = allCategories.filter(cat => 
    cat.toLowerCase().includes(categoryInput.toLowerCase()) && 
    !selectedCategories.includes(cat)
  )

  const ageOptions = ["Tous", ...new Set(jeux.map(j => j.min_age).filter(Boolean))].sort((a, b) => a - b)

  const filteredJeux = jeux.filter((jeu) => {
    const matchesSearch = !searchTerm || jeu.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const gameCats = jeu.category ? jeu.category.split(',').map(c => c.trim()) : []
    const matchesCategories = selectedCategories.length === 0 || 
      selectedCategories.every(cat => gameCats.includes(cat))
    const matchesAge = selectedAge === "Tous" || (parseInt(jeu.min_age, 10) <= parseInt(selectedAge, 10))
    return matchesSearch && matchesCategories && matchesAge
  })

  const addCategory = (cat) => {
    if (!selectedCategories.includes(cat)) setSelectedCategories([...selectedCategories, cat])
    setCategoryInput(""); setShowSuggestions(false)
  }

  const removeCategory = (catToRemove) => {
    setSelectedCategories(selectedCategories.filter(cat => cat !== catToRemove))
  }

  // Fonction pour ouvrir la modale et reset l'extension du texte
  const openModale = (jeu) => {
    setSelectedJeu(jeu)
    setIsExpanded(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col items-center justify-center gap-4 text-[#1a5f7a] font-black uppercase tracking-widest animate-pulse">
      <Dice5 size={48} className="animate-bounce" />
      <p>Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900 font-sans">
      
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] font-bold transition-colors text-xs uppercase tracking-widest">
            <ArrowLeft size={16} /> <span>Accueil</span>
          </button>
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-[#1a5f7a]">Catalogue LudoColigny</h1>
          <div className="w-10 md:w-20"></div>
        </div>
      </header>

      <main className="p-4 md:p-12 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-8 tracking-tight uppercase">La Collection</h2>
          
          <div className="max-w-2xl mx-auto mb-8 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-sm focus:ring-4 focus:ring-[#1a5f7a]/5 outline-none font-bold text-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-50">
            <div className="relative text-left" ref={suggestionRef}>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#e38154] mb-2 ml-2"><Tag size={14} /> Catégories</label>
              <input
                type="text"
                placeholder="Ex: Stratégie..."
                value={categoryInput}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => setCategoryInput(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[60] top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-48 overflow-y-auto p-2">
                  {suggestions.map(cat => (
                    <button key={cat} onClick={() => addCategory(cat)} className="w-full text-left px-4 py-3 hover:bg-[#fdf2ee] hover:text-[#e38154] rounded-xl font-bold text-xs">{cat}</button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedCategories.map(cat => (
                  <span key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-[#1a5f7a] text-white rounded-full text-[9px] font-black uppercase">
                    {cat} <X size={12} className="cursor-pointer" onClick={() => removeCategory(cat)} />
                  </span>
                ))}
              </div>
            </div>

            <div className="text-left">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2"><Baby size={14} /> Âge minimum</label>
              <div className="relative">
                <select
                  value={selectedAge}
                  onChange={(e) => setSelectedAge(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none appearance-none font-bold uppercase text-[10px] cursor-pointer"
                >
                  <option value="Tous">Tous les âges</option>
                  {ageOptions.filter(a => a !== "Tous").map((age) => (
                    <option key={age} value={age}>{age} ans et +</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* GRILLE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredJeux.map((jeu) => (
            <div 
              key={jeu.id} 
              onClick={() => openModale(jeu)}
              className="group bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-50 transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer flex flex-col"
            >
              {/* Fond Forcé Blanc ici */}
              <div className="h-56 w-full bg-white relative flex items-center justify-center p-6">
                {jeu.image_url ? (
                  <img src={jeu.image_url} alt={jeu.name} className="relative z-10 max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110" />
                ) : ( <Dice5 size={64} className="text-slate-100" /> )}
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-[#1a5f7a] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">{jeu.min_age || '3'}+ ans</span>
                </div>
                <div className="absolute top-4 right-4 z-20">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${jeu.is_available ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {jeu.is_available ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </div>
                </div>
              </div>

              <div className="p-8 flex-grow border-t border-slate-50">
                <div className="flex flex-wrap gap-1 mb-3">
                  {jeu.category?.split(',').map((cat, i) => (
                    <span key={i} className="text-[7px] font-black text-[#e38154] uppercase bg-[#fdf2ee] px-2 py-1 rounded-md">{cat.trim()}</span>
                  ))}
                </div>
                <h2 className="text-lg font-black text-slate-900 mb-4 group-hover:text-[#1a5f7a] transition-colors line-clamp-2 uppercase">{jeu.name}</h2>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><Users size={14} className="text-[#1a5f7a]/30"/> {jeu.min_players}-{jeu.max_players}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-[#1a5f7a]/30"/> {jeu.duration || '--'}'</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODALE */}
      {selectedJeu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-[#1a5f7a]/90 backdrop-blur-sm" onClick={() => setSelectedJeu(null)}></div>
          
          <div className="relative bg-white w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl flex flex-col md:flex-row border-b-8 border-[#e38154]">
            <button onClick={() => setSelectedJeu(null)} className="absolute top-6 right-6 p-2 bg-slate-50 text-[#1a5f7a] hover:bg-[#e38154] hover:text-white rounded-full z-30 transition-all"><X size={20} /></button>

            {/* Image Modale : Fond Blanc */}
            <div className="md:w-1/2 bg-white flex items-center justify-center p-8 md:p-12 min-h-[300px]">
              {selectedJeu.image_url ? (
                <img src={selectedJeu.image_url} alt={selectedJeu.name} className="max-w-full max-h-[40vh] object-contain drop-shadow-xl" />
              ) : ( <Dice5 size={80} className="text-slate-100" /> )}
            </div>

            <div className="p-8 md:p-12 md:w-1/2 flex flex-col">
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedJeu.category?.split(',').map((cat, i) => (
                  <span key={i} className="px-3 py-1 bg-[#fdf2ee] text-[#e38154] text-[9px] font-black uppercase rounded-full">{cat.trim()}</span>
                ))}
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-6 uppercase leading-tight">{selectedJeu.name}</h2>
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="p-4 bg-slate-50 rounded-2xl text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Joueurs</span>
                  <span className="text-sm font-black text-[#1a5f7a]">{selectedJeu.min_players}-{selectedJeu.max_players}</span>
                </div>
                <div className="p-4 bg-[#f0f7f9] rounded-2xl text-center">
                  <span className="text-[9px] font-black text-[#1a5f7a]/60 uppercase block mb-1">Âge</span>
                  <span className="text-sm font-black text-[#1a5f7a]">{selectedJeu.min_age || '3'}+</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Temps</span>
                  <span className="text-sm font-black text-[#1a5f7a]">{selectedJeu.duration || '--'}'</span>
                </div>
              </div>

              {/* DESCRIPTION AVEC "VOIR PLUS" */}
              <div className="mb-8 flex-grow">
                <h4 className="text-[10px] font-black text-[#e38154] uppercase tracking-[0.2em] mb-3">Description</h4>
                <div className="relative">
                  <p className={`text-slate-500 leading-relaxed font-medium italic text-sm ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {selectedJeu.description || "Aucune description disponible."}
                  </p>
                  {selectedJeu.description && selectedJeu.description.length > 120 && (
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-2 flex items-center gap-1 text-[#e38154] text-[10px] font-black uppercase hover:underline"
                    >
                      {isExpanded ? (
                        <>Voir moins <ChevronUp size={14} /></>
                      ) : (
                        <>Lire la suite <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className={`mb-6 py-3 text-center rounded-xl font-black uppercase text-[10px] border ${selectedJeu.is_available ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                 {selectedJeu.is_available ? "Disponible" : "En prêt"}
              </div>
              {selectedJeu.youtube_url && (
                <a href={selectedJeu.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-5 bg-[#1a5f7a] hover:bg-[#e38154] text-white rounded-2xl font-black uppercase text-[11px] transition-all shadow-xl">
                  <PlayCircle size={20} /> Vidéo des règles
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalogue;