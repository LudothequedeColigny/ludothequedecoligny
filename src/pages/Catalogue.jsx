import { Fragment, useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import PublicLayout from '../components/site/PublicLayout'
import Reveal from '../components/site/Reveal'
import Modal from '../components/site/Modal'
import { BTN_TEAL } from '../components/site/styles'
import {
  X,
  Users,
  Clock,
  Dice5,
  Search,
  ChevronDown,
  ChevronUp,
  Baby,
  PlayCircle,
  Tag,
  SlidersHorizontal
} from 'lucide-react'

// Composant curseur — défini HORS de Catalogue pour éviter les re-montages au render
function SliderFilter({ icon, filterKey, value, setter, max, unit, accentColor, editingFilter, editingValue, setEditingValue, onStartEditing, onCommit, onCancelEditing }) {
  const pct = max ? (value / max) * 100 : 0
  const isEditing = editingFilter === filterKey
  const track = `linear-gradient(to right, ${accentColor} ${pct}%, #f1f5f9 ${pct}%)`
  return (
    <div className="flex flex-col gap-2.5 text-left">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
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
            className="w-16 rounded-lg border-2 border-[#0f172a] px-1 py-0.5 text-center text-[11px] font-extrabold outline-none"
            style={{ color: accentColor }}
          />
        ) : (
          <button
            onClick={() => onStartEditing(filterKey, value)}
            title="Cliquer pour saisir une valeur"
            className={`cursor-text rounded-full px-3 py-1 text-[10px] font-extrabold transition-opacity hover:opacity-70 ${
              value > 0 ? 'bg-slate-100 text-[#1a5f7a]' : 'italic text-slate-300'
            }`}
            style={value > 0 ? { color: accentColor } : undefined}
          >
            {value > 0 ? `${value} ${unit}` : 'Tous'}
          </button>
        )}
      </div>

      <input
        type="range"
        aria-label={typeof unit === 'string' ? `Filtre ${filterKey}` : undefined}
        min={0} max={max || 10} step={1}
        value={value}
        onChange={e => setter(Number(e.target.value))}
        className="range-brut w-full"
        style={{ background: track }}
      />
      <div className="flex justify-between text-[9px] font-bold text-slate-300">
        <span>Tous</span><span>{max || 10} {unit}</span>
      </div>

      {value > 0 && (
        <button
          onClick={() => setter(0)}
          className="flex items-center gap-1 text-[9px] font-extrabold uppercase text-slate-300 transition-colors hover:text-rose-400"
        >
          <X size={10} /> Réinitialiser
        </button>
      )}
    </div>
  )
}

function Catalogue() {
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
  const drawerSuggestionRef = useRef(null)
  const [showFilters, setShowFilters] = useState(false)

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

  // Tracking des visites de la page catalogue
  useEffect(() => {
    supabase.from('page_views').insert({
      page: 'catalogue',
      user_agent: navigator.userAgent,
      referrer: document.referrer || null
    }).then(({ error }) => {
      if (error) console.error("Erreur tracking page_views:", error.message)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      const insideDesktop = suggestionRef.current && suggestionRef.current.contains(event.target)
      const insideDrawer = drawerSuggestionRef.current && drawerSuggestionRef.current.contains(event.target)
      if (!insideDesktop && !insideDrawer) {
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

  const activeFiltersCount = selectedCategories.length +
    (selectedAge > 0 ? 1 : 0) +
    (selectedMinPlayers > 0 ? 1 : 0) +
    (selectedMaxPlayers > 0 ? 1 : 0)

  const resetFilters = () => {
    setSelectedCategories([])
    setSelectedAge(0)
    setSelectedMinPlayers(0)
    setSelectedMaxPlayers(0)
    setCategoryInput('')
    setEditingFilter(null)
    setEditingValue('')
  }

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

  // Bloc de filtres réutilisé à l'identique en desktop et dans le tiroir mobile
  const categoryField = (ref) => (
    <div className="relative text-left" ref={ref}>
      <label className="mb-2.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e38154]">
        <Tag size={14} /> Catégories
      </label>
      <input
        type="text"
        placeholder="Ex : Stratégie..."
        value={categoryInput}
        onFocus={() => setShowSuggestions(true)}
        onChange={(e) => setCategoryInput(e.target.value)}
        className="w-full rounded-[16px] border-2 border-slate-200 bg-[#fdfaf6] px-4 py-3.5 text-[13px] font-bold outline-none focus:border-[#0f172a]"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[60] mt-2 max-h-48 w-full overflow-y-auto rounded-[18px] border-2 border-[#0f172a] bg-white p-2 shadow-[4px_4px_0_#1a5f7a]">
          {suggestions.map(cat => (
            <button
              key={cat}
              onClick={() => addCategory(cat)}
              className="w-full rounded-xl px-4 py-2.5 text-left text-xs font-bold hover:bg-[#fdf1ea] hover:text-[#e38154]"
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {selectedCategories.map(cat => (
          <span
            key={cat}
            className="flex items-center gap-2 rounded-full bg-[#1a5f7a] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white"
          >
            {cat}
            <X size={12} className="cursor-pointer" onClick={() => removeCategory(cat)} />
          </span>
        ))}
      </div>
    </div>
  )

  const sliderProps = {
    editingFilter,
    editingValue,
    setEditingValue,
    onStartEditing: startEditing,
    onCommit: commitEditingValue,
    onCancelEditing: () => { setEditingFilter(null); setEditingValue('') },
  }

  const sliders = (
    <>
      <SliderFilter
        filterKey="age"
        icon={<><Baby size={14} /><span>Âge minimum</span></>}
        value={selectedAge} setter={setSelectedAge}
        max={maxAge || 18} unit="ans" accentColor="#e38154"
        {...sliderProps}
      />
      <SliderFilter
        filterKey="minPlayers"
        icon={<><Users size={14} /><span>Joueurs min</span></>}
        value={selectedMinPlayers} setter={setSelectedMinPlayers}
        max={maxMinPlayers || 8} unit="j." accentColor="#e38154"
        {...sliderProps}
      />
      <SliderFilter
        filterKey="maxPlayers"
        icon={<><Users size={14} /><span>Joueurs max</span></>}
        value={selectedMaxPlayers} setter={setSelectedMaxPlayers}
        max={maxMaxPlayers || 10} unit="j." accentColor="#e38154"
        {...sliderProps}
      />
    </>
  )

  return (
    <PublicLayout>
      <main className="px-4 pb-16 pt-8 md:px-10 md:pb-24 md:pt-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-8 text-center md:mb-11">
            <h1 className="anim-soft-in mb-6 font-display text-[25px] font-extrabold uppercase leading-none tracking-[-0.045em] sm:text-[34px] md:text-[58px]">
              <span className="inline-block -rotate-1 rounded-[16px] bg-[#1a5f7a] px-[0.16em] text-white">
                Notre collection
              </span>
            </h1>

            <div className="anim-soft-in relative mx-auto max-w-[640px]" style={{ animationDelay: '0.12s' }}>
              <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-[22px] border-2 border-[#0f172a] bg-white py-5 pl-16 pr-6 text-[16px] font-bold text-[#0f172a] shadow-[5px_5px_0_#1a5f7a] outline-none placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* PANNEAU DE FILTRES — DESKTOP */}
          <Reveal className="mb-9 hidden rounded-[34px] border-2 border-[#0f172a] bg-white p-6 shadow-[6px_6px_0_#e38154] md:grid md:grid-cols-2 md:gap-7 xl:grid-cols-4 md:p-8">
            {categoryField(suggestionRef)}
            {sliders}
          </Reveal>

          {/* BOUTON FILTRES — MOBILE UNIQUEMENT */}
          <button
            onClick={() => setShowFilters(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border-2 border-[#0f172a] bg-[#1a5f7a] px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#0f172a] md:hidden"
          >
            <SlidersHorizontal size={16} />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0f172a] bg-[#e38154] text-[9px] font-extrabold text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* TIROIR FILTRES — MOBILE UNIQUEMENT */}
          <div className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${showFilters ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
            <div className="absolute inset-0 bg-[#0f172a]/40" onClick={() => setShowFilters(false)} />
            <div className={`absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[2.5rem] border-t-2 border-[#0f172a] bg-white transition-transform duration-300 ${showFilters ? 'translate-y-0' : 'translate-y-full'}`}>
              <div className="flex justify-center pb-2 pt-3">
                <div className="h-1 w-10 rounded-full bg-slate-200" />
              </div>
              <div className="flex items-center justify-between px-6 pb-4">
                <h2 className="font-display text-lg font-extrabold tracking-[-0.03em]">Filtres</h2>
                <button onClick={() => setShowFilters(false)} aria-label="Fermer les filtres"><X size={20} /></button>
              </div>

              <div className="space-y-6 px-6 pb-6">
                {categoryField(drawerSuggestionRef)}
                {sliders}
              </div>

              <div className="sticky bottom-0 flex gap-3 border-t-2 border-slate-100 bg-white p-6">
                <button
                  onClick={resetFilters}
                  className="flex-1 rounded-2xl border-2 border-[#0f172a] bg-slate-100 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 rounded-2xl border-2 border-[#0f172a] bg-[#1a5f7a] py-3.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white"
                >
                  Voir les résultats ({filteredJeux.length})
                </button>
              </div>
            </div>
          </div>

          {/* SÉPARATEUR NOUVEAUTÉS */}
          {filteredJeux.some(isNouveau) && (
            <Reveal className="mb-5 flex items-center gap-3">
              <span className="rounded-full border-2 border-[#0f172a] bg-[#e38154] px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white">
                ✦ Nouveautés
              </span>
              <div className="h-0.5 flex-1 bg-slate-100" />
              <span className="hidden text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-300 sm:inline">
                Ajoutés ce dernier mois
              </span>
            </Reveal>
          )}

          {/* GRILLE */}
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-[30px] border-2 border-slate-200 bg-white p-5">
                  <div className="mb-4 h-44 rounded-[20px] bg-slate-100" />
                  <div className="mb-2 h-4 w-3/4 rounded-full bg-slate-100" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredJeux.length === 0 ? (
            <div className="rounded-[30px] border-2 border-dashed border-[#0f172a]/30 bg-white py-14 text-center">
              <Dice5 size={40} className="mx-auto mb-4 text-slate-200" />
              <p className="italic text-slate-400">Aucun jeu ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredJeux.map((jeu, index) => {
                // Détecter la transition nouveaux → anciens pour insérer un séparateur
                const prevJeu = filteredJeux[index - 1]
                const showOldSeparator = index > 0 && !isNouveau(jeu) && isNouveau(prevJeu)
                return (
                  <Fragment key={jeu.id}>
                    {showOldSeparator && (
                      <div className="col-span-full my-2 flex items-center gap-3">
                        <div className="h-0.5 flex-1 bg-slate-100" />
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-300">
                          Collection complète
                        </span>
                        <div className="h-0.5 flex-1 bg-slate-100" />
                      </div>
                    )}
                    <Reveal
                      as="button"
                      delay={(index % 3) * 90}
                      onClick={() => openModale(jeu)}
                      className="group flex flex-col overflow-hidden rounded-[30px] border-2 border-[#0f172a] bg-white text-left shadow-[5px_5px_0_#1a5f7a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#1a5f7a]"
                    >
                      <div className="relative flex h-[190px] items-center justify-center border-b-2 border-[#0f172a] bg-[#fdfaf6] p-6">
                        {jeu.image_url ? (
                          <img
                            src={jeu.image_url}
                            alt={jeu.name}
                            loading="lazy"
                            decoding="async"
                            className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <Dice5 size={56} className="text-slate-200" />
                        )}

                        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                          <span className="rounded-full border-2 border-[#0f172a] bg-[#1a5f7a] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white">
                            {jeu.min_age || '3'}+ ans
                          </span>
                          {isNouveau(jeu) && (
                            <span className="rounded-full border-2 border-[#0f172a] bg-[#e38154] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white">
                              ✦ Nouveau
                            </span>
                          )}
                        </div>

                        <span
                          className="absolute right-3 top-3 rounded-full border-2 border-[#0f172a] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white"
                          style={{ background: jeu.is_available ? '#10b981' : '#f43f5e' }}
                        >
                          {jeu.is_available ? 'Dispo' : 'En prêt'}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col gap-2.5 p-5">
                        <div className="flex flex-wrap gap-1.5">
                          {jeu.category?.split(',').map((cat, i) => (
                            <span key={i} className="rounded-lg bg-[#fdf1ea] px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#e38154]">
                              {cat.trim()}
                            </span>
                          ))}
                        </div>
                        <div className="font-display text-[19px] font-extrabold uppercase leading-[1.15] tracking-[-0.03em]">
                          {jeu.name}
                        </div>
                        <div className="mt-auto flex gap-4 pt-1 text-[11px] font-bold text-slate-400">
                          <span className="flex items-center gap-1.5"><Users size={13} /> {jeu.min_players}-{jeu.max_players} joueurs</span>
                          <span className="flex items-center gap-1.5"><Clock size={13} /> {jeu.duration || '--'} min</span>
                        </div>
                      </div>
                    </Reveal>
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODALE */}
      <Modal
        open={!!selectedJeu}
        onClose={() => setSelectedJeu(null)}
        title={selectedJeu?.name}
        maxWidth={860}
        scroll
        strip
      >
        {selectedJeu && (
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex min-h-[220px] items-center justify-center border-b-2 border-[#0f172a] bg-[#fdfaf6] p-8 md:min-h-[280px] md:border-b-0 md:border-r-2">
              {selectedJeu.image_url ? (
                <img
                  src={selectedJeu.image_url}
                  alt={selectedJeu.name}
                  decoding="async"
                  className="max-h-64 w-auto object-contain"
                />
              ) : (
                <Dice5 size={72} className="text-slate-200" />
              )}
            </div>

            <div className="p-6 md:p-9">
              <div className="mb-3.5 flex flex-wrap gap-[7px]">
                {isNouveau(selectedJeu) && (
                  <span className="rounded-full border-2 border-[#0f172a] bg-[#e38154] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white">
                    ✦ Nouveau
                  </span>
                )}
                {selectedJeu.category?.split(',').map((cat, i) => (
                  <span key={i} className="rounded-full bg-[#fdf1ea] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#e38154]">
                    {cat.trim()}
                  </span>
                ))}
              </div>

              <h2 className="mb-5 font-display text-[24px] font-extrabold uppercase leading-[1.05] tracking-[-0.04em] md:text-[32px]">
                {selectedJeu.name}
              </h2>

              <div className="mb-6 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Joueurs', value: `${selectedJeu.min_players}-${selectedJeu.max_players}`, tint: '#fdfaf6' },
                  { label: 'Âge', value: `${selectedJeu.min_age || '3'}+`, tint: '#f0f7f9' },
                  { label: 'Temps', value: `${selectedJeu.duration || '--'}'`, tint: '#fdfaf6' },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-[18px] border-2 border-[#0f172a] px-2.5 py-3.5 text-center"
                    style={{ background: stat.tint }}
                  >
                    <div className="text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      {stat.label}
                    </div>
                    <div className="mt-[5px] font-display text-[17px] font-extrabold text-[#1a5f7a]">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#e38154]">
                Description
              </div>
              <p className={`whitespace-pre-wrap text-sm font-medium italic leading-[1.65] text-slate-500 ${!isExpanded ? 'line-clamp-6' : ''}`}>
                {selectedJeu.description || "Aucune description disponible."}
              </p>
              {selectedJeu.description && selectedJeu.description.length > 120 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#e38154] hover:underline"
                >
                  {isExpanded ? <>Voir moins <ChevronUp size={14} /></> : <>Lire la suite <ChevronDown size={14} /></>}
                </button>
              )}

              <div
                className="mb-3.5 mt-5 rounded-[16px] border-2 border-[#0f172a] p-3.5 text-center text-[10px] font-extrabold uppercase tracking-[0.16em]"
                style={
                  selectedJeu.is_available
                    ? { background: '#ecfdf5', color: '#047857' }
                    : { background: '#fff1f2', color: '#be123c' }
                }
              >
                {selectedJeu.is_available ? 'Disponible' : 'En prêt'}
              </div>

              {selectedJeu.youtube_url && (
                <a
                  href={selectedJeu.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${BTN_TEAL} w-full`}
                >
                  <PlayCircle size={18} /> Vidéo des règles
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PublicLayout>
  )
}

export default Catalogue;
