import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import {
  Lightbulb, Dices, Wrench, MessageSquarePlus, Send, CheckCircle2,
  Loader2, Sparkles, CalendarDays, AlertTriangle, Link2, Megaphone,
  MoreHorizontal, Plus, Trash2, Check, X, ChevronDown
} from 'lucide-react'

const CATEGORIES = [
  { id: 'jeu_acheter',    icon: <Dices size={16} />,          label: 'Jeu à acheter',               color: '#1a5f7a',  bg: 'bg-cyan-50',    text: 'text-[#1a5f7a]',   border: 'border-cyan-100' },
  { id: 'jeu_retirer',    icon: <AlertTriangle size={16} />,  label: 'Jeu à retirer',               color: '#dc2626',  bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-100' },
  { id: 'evenement',      icon: <CalendarDays size={16} />,   label: 'Événement à organiser',       color: '#d97706',  bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100' },
  { id: 'application',    icon: <Wrench size={16} />,         label: "Amélioration de l'appli",     color: '#e38154',  bg: 'bg-orange-50',  text: 'text-[#e38154]',   border: 'border-orange-100' },
  { id: 'fonctionnement', icon: <MessageSquarePlus size={16}/>,label: 'Fonctionnement',             color: '#7c5cbf',  bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100' },
  { id: 'partenariat',    icon: <Link2 size={16} />,          label: 'Partenariat',                 color: '#0891b2',  bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-100' },
  { id: 'communication',  icon: <Megaphone size={16} />,      label: 'Communication',               color: '#059669',  bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  { id: 'autre',          icon: <MoreHorizontal size={16} />, label: 'Autre',                       color: '#64748b',  bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200' },
]

const FORM_CATEGORIES = CATEGORIES.map(c => ({
  ...c,
  icon: { ...c.icon, props: { ...c.icon.props, size: 22 } },
  placeholder: {
    jeu_acheter:    'Ex : Wingspan, Pandemic, Les Colons de Catane…',
    jeu_retirer:    'Ex : Catan (boîte abîmée, pièces manquantes)…',
    evenement:      'Ex : Soirée jeux adultes, tournoi, atelier enfants…',
    application:    `Ex : Ajouter un filtre par nombre de joueurs…`,
    fonctionnement: `Ex : Changer les horaires, améliorer l'accueil…`,
    partenariat:    'Ex : École du quartier, médiathèque, association…',
    communication:  'Ex : Compte Instagram, affichage en mairie…',
    autre:          'Décrivez librement votre idée…',
  }[c.id],
  hint: {
    jeu_acheter:    'Proposez un jeu que vous aimeriez voir dans le catalogue.',
    jeu_retirer:    'Signalez un jeu abîmé, incomplet ou trop peu utilisé.',
    evenement:      'Proposez un événement que vous aimeriez voir organisé.',
    application:    `Une idée pour rendre l'application plus pratique.`,
    fonctionnement: `Partagez vos idées pour améliorer la vie de la ludothèque.`,
    partenariat:    'Proposez une structure avec qui collaborer.',
    communication:  'Idées pour faire connaître la ludothèque.',
    autre:          `Une idée qui ne rentre dans aucune autre catégorie.`,
  }[c.id],
}))

const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

export default function Suggestions() {
  const [suggestions, setSuggestions]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [showModal, setShowModal]         = useState(false)
  const [filterDone, setFilterDone]       = useState('all') // 'all' | 'pending' | 'done'
  const [deletingId, setDeletingId]       = useState(null)
  const [togglingId, setTogglingId]       = useState(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showCatDropdown, setShowCatDropdown] = useState(false)
  const [filterCats, setFilterCats]         = useState([]) // tableau de catégories sélectionnées

  // Formulaire
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [message, setMessage]   = useState('')
  const [author, setAuthor]     = useState('')
  const [sending, setSending]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { fetchSuggestions() }, [])

  async function fetchSuggestions() {
    setLoading(true)
    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false })
    setSuggestions(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!selectedCategory || !message.trim()) {
      setError('Merci de choisir une catégorie et de rédiger votre suggestion.')
      return
    }
    setError('')
    setSending(true)
    try {
      const { error: dbError } = await supabase.from('suggestions').insert([{
        category:   selectedCategory,
        message:    message.trim(),
        author:     author.trim() || 'Anonyme',
        done:       false,
        created_at: new Date().toISOString(),
      }])
      if (dbError) throw dbError
      setSuccess(true)
      setMessage('')
      setAuthor('')
      setSelectedCategory(null)
      fetchSuggestions()
      setTimeout(() => { setSuccess(false); setShowModal(false) }, 2000)
    } catch {
      setError('Une erreur est survenue. Vérifiez votre connexion.')
    } finally {
      setSending(false)
    }
  }

  async function toggleDone(s) {
    setTogglingId(s.id)
    await supabase.from('suggestions').update({ done: !s.done }).eq('id', s.id)
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, done: !x.done } : x))
    setTogglingId(null)
  }

  async function deleteSuggestion(id) {
    setDeletingId(id)
    const { error } = await supabase
      .from('suggestions')
      .delete()
      .match({ id })
    if (error) {
      console.error('Erreur suppression:', error)
    } else {
      setSuggestions(prev => prev.filter(x => x.id !== id))
    }
    setDeletingId(null)
  }

  const toggleFilterCat = (id) => setFilterCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const filtered = suggestions.filter(s => {
    if (filterCats.length > 0 && !filterCats.includes(s.category)) return false
    if (filterDone === 'pending' && s.done) return false
    if (filterDone === 'done' && !s.done) return false
    return true
  })

  const pendingCount = suggestions.filter(s => !s.done).length
  const doneCount    = suggestions.filter(s => s.done).length

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">

        {/* HEADER — aligné sur les autres pages admin */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white">
              <Lightbulb size={24} />
            </div>
            <span>Vos <span className="text-[#1a5f7a]">Suggestions</span></span>
          </h1>
          <button
            onClick={() => { setShowModal(true); setSuccess(false); setError('') }}
            className="flex items-center gap-2 px-6 py-4 bg-[#e38154] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-[#d16f43] active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={16} strokeWidth={3} /> Nouvelle suggestion
          </button>
        </div>

        {/* BARRE FILTRES */}
        <div className="flex items-center gap-3 mb-6">
          {/* Compteur */}
          <p className="text-slate-400 text-xs font-bold flex-1">
            {pendingCount} en attente · {doneCount} traitée{doneCount > 1 ? 's' : ''}
          </p>

          {/* Filtre statut */}
          <div className="flex bg-white border border-slate-100 rounded-2xl p-1 gap-1 shadow-sm">
            {[
              { val: 'all',     label: 'Toutes' },
              { val: 'pending', label: 'En attente' },
              { val: 'done',    label: 'Traitées' },
            ].map(f => (
              <button key={f.val} onClick={() => setFilterDone(f.val)}
                className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                  filterDone === f.val ? 'bg-[#1a5f7a] text-white shadow' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtre catégorie — dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-black text-[9px] uppercase tracking-widest transition-all shadow-sm ${
                filterCats.length > 0
                  ? 'bg-[#1a5f7a] border-[#1a5f7a] text-white'
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
              }`}
            >
              Catégories
              {filterCats.length > 0 && (
                <span className="bg-white text-[#1a5f7a] rounded-full w-4 h-4 flex items-center justify-center font-black text-[8px]">
                  {filterCats.length}
                </span>
              )}
              <ChevronDown size={12} strokeWidth={3} className={`transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
            </button>

            {showFilterMenu && (
              <>
                {/* Overlay pour fermer */}
                <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 p-2 min-w-[220px] animate-in zoom-in-95 duration-150">
                  {/* Tout désélectionner */}
                  {filterCats.length > 0 && (
                    <button
                      onClick={() => setFilterCats([])}
                      className="w-full text-left px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors mb-1"
                    >
                      Tout désélectionner
                    </button>
                  )}
                  {CATEGORIES.map(c => {
                    const active = filterCats.includes(c.id)
                    return (
                      <button key={c.id} onClick={() => toggleFilterCat(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                          active ? `${c.bg}` : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="shrink-0" style={{ color: active ? c.color : '#cbd5e1' }}>
                          {c.icon}
                        </div>
                        <span className="flex-1 font-black text-[10px] uppercase tracking-tight"
                          style={{ color: active ? c.color : '#94a3b8' }}>
                          {c.label}
                        </span>
                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                          active ? 'border-current' : 'border-slate-200'
                        }`} style={{ color: c.color, background: active ? c.color : 'transparent' }}>
                          {active && <Check size={10} strokeWidth={3} className="text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* LISTE */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#1a5f7a]" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
            Aucune suggestion
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const cat = getCat(s.category)
              return (
                <div key={s.id} className={`bg-white rounded-[2rem] border p-5 flex items-start gap-4 transition-all ${
                  s.done ? 'opacity-50 border-slate-100' : 'border-slate-100 hover:border-slate-200 shadow-sm'
                }`}>
                  {/* Badge catégorie */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${cat.bg}`} style={{ color: cat.color }}>
                    {cat.icon}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}
                        style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                      <span className="text-[9px] text-slate-300 font-bold">
                        {s.author || 'Anonyme'} · {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className={`text-sm font-medium leading-relaxed ${s.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {s.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Case à cocher */}
                    <button
                      onClick={() => toggleDone(s)}
                      disabled={togglingId === s.id}
                      title={s.done ? 'Marquer comme non traitée' : 'Marquer comme traitée'}
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                        s.done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-200 text-transparent hover:border-emerald-400 hover:text-emerald-400'
                      }`}
                    >
                      {togglingId === s.id
                        ? <Loader2 size={12} className="animate-spin text-slate-400" />
                        : <Check size={14} strokeWidth={3} />
                      }
                    </button>
                    {/* Poubelle */}
                    <button
                      onClick={() => deleteSuggestion(s.id)}
                      disabled={deletingId === s.id}
                      title="Supprimer"
                      className="w-8 h-8 rounded-xl border-2 border-slate-100 flex items-center justify-center text-slate-300 hover:border-rose-300 hover:text-rose-400 hover:bg-rose-50 transition-all active:scale-95"
                    >
                      {deletingId === s.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* NOTE BAS DE PAGE */}
        {suggestions.length > 0 && (
          <div className="mt-8 flex items-start gap-3 text-slate-400 px-2">
            <Sparkles size={14} className="shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium leading-relaxed">
              Cochez une suggestion pour indiquer qu'elle a été traitée. Supprimez-la une fois le sujet soldé.
            </p>
          </div>
        )}
      </div>

      {/* MODALE FORMULAIRE */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200">

            {/* Header modale */}
            <div className="sticky top-0 bg-white rounded-t-[2.5rem] p-6 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1a5f7a]/10 text-[#1a5f7a] rounded-xl"><Lightbulb size={20} /></div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Nouvelle suggestion</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">

              {/* Succès */}
              {success && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 animate-in zoom-in-95">
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                  <p className="font-black text-emerald-700 uppercase text-xs tracking-tight">Suggestion enregistrée !</p>
                </div>
              )}

              {/* Catégorie — dropdown */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  1. Catégorie
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCatDropdown(v => !v)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedCategory
                        ? `${getCat(selectedCategory).bg} ${getCat(selectedCategory).border}`
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg shrink-0"
                      style={{ color: selectedCategory ? getCat(selectedCategory).color : '#cbd5e1', background: selectedCategory ? `${getCat(selectedCategory).color}18` : '#f1f5f9' }}>
                      {selectedCategory ? getCat(selectedCategory).icon : <MoreHorizontal size={16} />}
                    </div>
                    <span className="flex-1 font-black text-xs uppercase tracking-tight"
                      style={{ color: selectedCategory ? getCat(selectedCategory).color : '#94a3b8' }}>
                      {selectedCategory ? getCat(selectedCategory).label : 'Choisir une catégorie…'}
                    </span>
                    <ChevronDown size={14} strokeWidth={3}
                      className={`shrink-0 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`}
                      style={{ color: selectedCategory ? getCat(selectedCategory).color : '#cbd5e1' }} />
                  </button>

                  {showCatDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 p-2 animate-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
                        {CATEGORIES.map(c => (
                          <button key={c.id}
                            onClick={() => { setSelectedCategory(c.id); setShowCatDropdown(false) }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                              selectedCategory === c.id ? c.bg : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="shrink-0" style={{ color: selectedCategory === c.id ? c.color : '#cbd5e1' }}>
                              {c.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-[10px] uppercase tracking-tight"
                                style={{ color: selectedCategory === c.id ? c.color : '#94a3b8' }}>
                                {c.label}
                              </p>
                              {selectedCategory === c.id && (
                                <p className="text-[9px] font-medium text-slate-400 mt-0.5">{FORM_CATEGORIES.find(x => x.id === c.id)?.hint}</p>
                              )}
                            </div>
                            {selectedCategory === c.id && (
                              <Check size={14} strokeWidth={3} style={{ color: c.color }} className="shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  2. Votre suggestion
                </label>
                <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
                  placeholder={FORM_CATEGORIES.find(c => c.id === selectedCategory)?.placeholder || 'Décrivez votre idée…'}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm text-slate-700 placeholder:text-slate-300 outline-none border-2 border-transparent focus:border-[#1a5f7a]/30 resize-none transition-all"
                />
              </div>

              {/* Auteur */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  3. Votre prénom <span className="normal-case font-medium text-slate-300">(optionnel)</span>
                </label>
                <input type="text" value={author} onChange={e => setAuthor(e.target.value)}
                  placeholder="Laissez vide pour rester anonyme"
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 placeholder:text-slate-300 outline-none border-2 border-transparent focus:border-[#1a5f7a]/30 transition-all"
                />
              </div>

              {/* Erreur */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs border border-rose-100">
                  {error}
                </div>
              )}
            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 bg-white rounded-b-[2.5rem] p-6 pt-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={sending || !selectedCategory || !message.trim()}
                className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  sending || !selectedCategory || !message.trim()
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-[#1a5f7a] text-white shadow-lg shadow-cyan-900/20 hover:bg-[#154f67]'
                }`}>
                {sending ? <><Loader2 size={14} className="animate-spin" /> Enregistrement…</> : <><Check size={14} /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}