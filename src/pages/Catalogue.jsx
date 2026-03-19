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

// Composant curseur — défini HORS de Catalogue pour éviter les re-montages au render
function SliderFilter({ icon, filterKey, value, setter, max, unit, accentColor, editingFilter, editingValue, setEditingValue, onStartEditing, onCommit, onCancelEditing }) {
  const pct = max ? (value / max) * 100 : 0
  const isEditing = editingFilter === filterKey
  const track = `linear-gradient(to right, ${accentColor} ${pct}%, #e2e8f0 ${pct}%)`
  return (
    <div className="text-left flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          {icon}
        </label>
        {isEditing ? (
          <input
            autoFocus
            type="number"
            min={0} max={max}
            value={editingValue}
            onChange={e => setEditingValue(e.target.value)}
            onBlur={() => onCommit(setter, max)}
            onKeyDown={e => {
              if (e.key === 'Enter') onCommit(setter, max)
              if (e.key === 'Escape') onCancelEditing()
            }}
            className="w-16 text-center text-[11px] font-black rounded-lg border-2 border-[#1a5f7a]/30 outline-none py-0.5 px-1"
            style={{ color: accentColor }}
          />
        ) : (
          value > 0
            ? <button
                onClick={() => onStartEditing(filterKey, value)}
                title="Cliquer pour saisir une valeur"
                className="text-[11px] font-black px-3 py-1 rounded-full transition-all hover:scale-105 hover:opacity-80 cursor-text"
                style={{ color: accentColor, background: accentColor + '18' }}
              >{value} {unit}</button>
            : <button
                onClick={() => onStartEditing(filterKey, value)}
                title="Cliquer pour saisir une valeur"
                className="text-[10px] font-bold text-slate-300 italic hover:text-slate-400 transition-colors cursor-text"
              >Tous</button>
        )}
      </div>
      <div className="px-1">
        <input
          type="range"
          min={0} max={max || 10} step={1}
          value={value}
          onChange={e => setter(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ background: track }}
        />
        <div className="flex justify-between text-[9px] font-bold text-slate-300 mt-1.5">
          <span>Tous</span><span>{max || 10} {unit}</span>
        </div>
      </div>
      {value > 0 && (
        <button onClick={() => setter(0)} className="text-[9px] font-black uppercase text-slate-300 hover:text-rose-400 transition-colors flex items-center gap-1 ml-1">
          <X size={10} /> Réinitialiser
        </button>
      )}
    </div>
  )
}

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
  const [selectedAge, setSelectedAge] = useState(0)
  const [selectedMinPlayers, setSelectedMinPlayers] = useState(0)
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState(0)
  const [editingFilter, setEditingFilter] = useState(null) // 'age' | 'minPlayers' | 'maxPlayers'
  const [editingValue, setEditingValue] = useState('')
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
        else {
          // Trier : nouveaux (< 1 mois) en premier, puis alphabétique
          const unMoisAvant = new Date()
          unMoisAvant.setMonth(unMoisAvant.getMonth() - 1)
          const sorted = [...(data || [])].sort((a, b) => {
            const aNew = new Date(a.created_at) > unMoisAvant
            const bNew = new Date(b.created_at) > unMoisAvant
            if (aNew && !bNew) return -1
            if (!aNew && bNew) return 1
            if (aNew && bNew) return new Date(b.created_at) - new Date(a.created_at)
            return 0 // déjà triés alphabétiquement par Supabase
          })
          setJeux(sorted)
        }
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

  // Déduplique les catégories sans tenir compte de la casse,
  // et conserve la version avec majuscule la plus courante (la première rencontrée)
  const allCategories = (() => {
    const seen = new Map()
    jeux.flatMap(j => j.category ? j.category.split(',').map(cat => cat.trim()) : [])
      .forEach(cat => {
        const key = cat.toLowerCase()
        if (!seen.has(key)) seen.set(key, cat)
      })
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  })()

  const suggestions = allCategories.filter(cat =>
    cat.toLowerCase().includes(categoryInput.toLowerCase()) &&
    !selectedCategories.some(s => s.toLowerCase() === cat.toLowerCase())
  )

  const maxAge        = Math.max(0, ...jeux.map(j => parseInt(j.min_age)     || 0))
  const maxMinPlayers = Math.max(0, ...jeux.map(j => parseInt(j.min_players) || 0))
  const maxMaxPlayers = Math.max(0, ...jeux.map(j => parseInt(j.max_players) || 0))

  const filteredJeux = jeux.filter((jeu) => {
    const matchesSearch = !searchTerm || jeu.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const gameCats = jeu.category ? jeu.category.split(',').map(c => c.trim().toLowerCase()) : []
    const matchesCategories = selectedCategories.length === 0 ||
      selectedCategories.every(cat => gameCats.includes(cat.toLowerCase()))
    const matchesAge        = selectedAge        === 0 || parseInt(jeu.min_age,     10) <= selectedAge
    const matchesMinPlayers = selectedMinPlayers === 0 || parseInt(jeu.min_players, 10) >= selectedMinPlayers
    const matchesMaxPlayers = selectedMaxPlayers === 0 || parseInt(jeu.max_players, 10) <= selectedMaxPlayers
    return matchesSearch && matchesCategories && matchesAge && matchesMinPlayers && matchesMaxPlayers
  })

  // Valide et applique la valeur saisie au clavier
  const commitEditingValue = (setter, max) => {
    const n = parseInt(editingValue, 10)
    if (!isNaN(n)) setter(Math.min(Math.max(0, n), max))
    setEditingFilter(null)
    setEditingValue('')
  }

  const startEditing = (key, currentValue) => {
    setEditingFilter(key)
    setEditingValue(currentValue === 0 ? '' : String(currentValue))
  }

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

  // Vérifie si un jeu a été ajouté il y a moins d'1 mois
  const unMoisAvant = new Date()
  unMoisAvant.setMonth(unMoisAvant.getMonth() - 1)
  const isNouveau = (jeu) => jeu.created_at && new Date(jeu.created_at) > unMoisAvant

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
            <ArrowLeft size={16} /> <span>Retour à la page d'accueil</span>
          </button>
          {/* Texte central supprimé pour plus de clarté */}
          <div className="w-10 md:w-20"></div>
        </div>
      </header>

      <main className="p-4 md:p-12 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          {/* Titre modifié en "Notre Collection" */}
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-8 tracking-tight uppercase">Notre Collection</h2>
          
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-50">

            {/* Catégories — inchangé */}
            <div className="relative text-left md:col-span-2 xl:col-span-1" ref={suggestionRef}>
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

            <SliderFilter
              filterKey="age"
              icon={<><Baby size={14} /><span>Âge minimum</span></>}
              value={selectedAge} setter={setSelectedAge}
              max={maxAge || 18} unit="ans" accentColor="#1a5f7a"
              editingFilter={editingFilter} editingValue={editingValue}
              setEditingValue={setEditingValue}
              onStartEditing={startEditing} onCommit={commitEditingValue} onCancelEditing={() => { setEditingFilter(null); setEditingValue('') }}
            />
            <SliderFilter
              filterKey="minPlayers"
              icon={<><Users size={14} className="text-[#1a5f7a]/60" /><span>Joueurs min</span></>}
              value={selectedMinPlayers} setter={setSelectedMinPlayers}
              max={maxMinPlayers || 8} unit="j." accentColor="#1a5f7a"
              editingFilter={editingFilter} editingValue={editingValue}
              setEditingValue={setEditingValue}
              onStartEditing={startEditing} onCommit={commitEditingValue} onCancelEditing={() => { setEditingFilter(null); setEditingValue('') }}
            />
            <SliderFilter
              filterKey="maxPlayers"
              icon={<><Users size={14} className="text-[#e38154]/60" /><span>Joueurs max</span></>}
              value={selectedMaxPlayers} setter={setSelectedMaxPlayers}
              max={maxMaxPlayers || 10} unit="j." accentColor="#e38154"
              editingFilter={editingFilter} editingValue={editingValue}
              setEditingValue={setEditingValue}
              onStartEditing={startEditing} onCommit={commitEditingValue} onCancelEditing={() => { setEditingFilter(null); setEditingValue('') }}
            />
          </div>

          <style>{`
            input[type='range'] { -webkit-appearance: none; appearance: none; }
            input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 20px; height: 20px;
              border-radius: 50%;
              background: white;
              border: 3px solid #1a5f7a;
              box-shadow: 0 2px 6px rgba(26,95,122,0.2);
              cursor: pointer;
              transition: transform 0.15s;
            }
            input[type='range']::-webkit-slider-thumb:hover { transform: scale(1.2); }
            input[type='range']::-moz-range-thumb {
              width: 20px; height: 20px; border-radius: 50%;
              background: white; border: 3px solid #1a5f7a;
              box-shadow: 0 2px 6px rgba(26,95,122,0.2); cursor: pointer;
            }
          `}</style>
        </div>

        {/* SÉPARATEUR NOUVEAUTÉS */}
        {filteredJeux.some(isNouveau) && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-4 py-1.5 bg-[#e38154] text-white text-[9px] font-black uppercase tracking-widest rounded-full">✦ Nouveautés</span>
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Ajoutés ce dernier mois</span>
            </div>
          </div>
        )}

        {/* GRILLE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredJeux.map((jeu, index) => {
            // Détecter la transition nouveaux → anciens pour insérer un séparateur
            const prevJeu = filteredJeux[index - 1]
            const showOldSeparator = index > 0 && !isNouveau(jeu) && isNouveau(prevJeu)
            return (
              <>
                {showOldSeparator && (
                  <div key={`sep-${jeu.id}`} className="col-span-full flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-slate-100"></div>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Collection complète</span>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                )}
                <div 
                  key={jeu.id} 
                  onClick={() => openModale(jeu)}
                  className="group bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-50 transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer flex flex-col"
                >
                  <div className="h-56 w-full bg-white relative flex items-center justify-center p-6">
                    {jeu.image_url ? (
                      <img src={jeu.image_url} alt={jeu.name} className="relative z-10 max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110" />
                    ) : ( <Dice5 size={64} className="text-slate-100" /> )}
                    <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
                      <span className="bg-[#1a5f7a] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">{jeu.min_age || '3'}+ ans</span>
                      {isNouveau(jeu) && (
                        <span className="bg-[#e38154] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">✦ Nouveau</span>
                      )}
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
              </>
            )
          })}
        </div>
      </main>

      {/* MODALE */}
      {selectedJeu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-[#1a5f7a]/90 backdrop-blur-sm" onClick={() => setSelectedJeu(null)}></div>
          
          <div className="relative bg-white w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl flex flex-col md:flex-row border-b-8 border-[#e38154]">
            <button onClick={() => setSelectedJeu(null)} className="absolute top-6 right-6 p-2 bg-slate-50 text-[#1a5f7a] hover:bg-[#e38154] hover:text-white rounded-full z-30 transition-all"><X size={20} /></button>

            <div className="md:w-1/2 bg-white flex items-center justify-center p-8 md:p-12 min-h-[300px]">
              {selectedJeu.image_url ? (
                <img src={selectedJeu.image_url} alt={selectedJeu.name} className="max-w-full max-h-[40vh] object-contain drop-shadow-xl" />
              ) : ( <Dice5 size={80} className="text-slate-100" /> )}
            </div>

            <div className="p-8 md:p-12 md:w-1/2 flex flex-col">
              <div className="mb-4 flex flex-wrap gap-2">
                {isNouveau(selectedJeu) && (
                  <span className="px-3 py-1 bg-[#e38154] text-white text-[9px] font-black uppercase rounded-full tracking-widest">✦ Nouveau</span>
                )}
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

              {/* DESCRIPTION AVEC "VOIR PLUS" ET RESPECT DES SAUTS DE LIGNE */}
              <div className="mb-8 flex-grow">
                <h4 className="text-[10px] font-black text-[#e38154] uppercase tracking-[0.2em] mb-3">Description</h4>
                <div className="relative">
                  {/* Ajout de whitespace-pre-wrap pour les retours à la ligne */}
                  <p className={`text-slate-500 leading-relaxed font-medium italic text-sm whitespace-pre-wrap ${!isExpanded ? 'line-clamp-6' : ''}`}>
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