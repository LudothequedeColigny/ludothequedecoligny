import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import {
  Lightbulb, Dices, Wrench, MessageSquarePlus, Send, CheckCircle2,
  Loader2, Sparkles, CalendarDays, AlertTriangle, Link2, Megaphone,
  MoreHorizontal, Plus, Trash2, Check, X, ChevronDown, Search, Pencil,
  Euro, PiggyBank, HelpCircle, Edit2, FileDown
} from 'lucide-react'

// ─── Helpers MyLudo (via Edge Function Supabase bgg-proxy) ──
const BGG_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`

async function bggCall(endpoint, params) {
  const qs = new URLSearchParams({ endpoint, ...params }).toString()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function bggSearchGames(query) {
  const data = await bggCall('search', { query })
  if (!Array.isArray(data)) return []
  return data
    .map(item => ({ id: String(item.id), name: item.name, year: item.year || '' }))
    .filter(i => i.name && i.id)
}

async function bggGameDetails(id) {
  const item = await bggCall('thing', { id })
  if (!item) return null
  return { image: item.image || '', price: item.price ?? null }
}

const formatPrice = (p) => `${Number(p).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

const escapeHtml = (str) => (str || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

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

const SUGGESTIONS_TUTORIAL_STEPS = (openForm, closeForm) => [
  {
    id: 'sugg-header',
    noSpotlight: true,
    title: `Bienvenue sur la page Suggestions`,
    description: `Cette page centralise les idées et suggestions des adhérents et bénévoles : jeux à acheter, événements à organiser, améliorations diverses… Vous pouvez les classer, les chiffrer et suivre leur traitement.`,
    action: () => closeForm(),
  },
  {
    id: 'sugg-budget',
    title: `Récapitulatif budget`,
    description: `Ce bandeau résume le budget lié aux suggestions de jeux à acheter : le total à prévoir (suggestions en attente avec un prix renseigné), le montant déjà économisé (suggestions traitées) et le nombre de suggestions sans prix renseigné.`,
    action: () => closeForm(),
  },
  {
    id: 'sugg-add-btn',
    title: `Ajouter une nouvelle suggestion`,
    description: `Ce bouton ouvre le formulaire de saisie d'une suggestion. Nous allons le parcourir ensemble.`,
    action: () => closeForm(),
  },
  {
    id: 'sugg-form',
    title: `Formulaire de suggestion`,
    description: `Choisissez une catégorie (jeu à acheter, événement, amélioration de l'application…), rédigez votre suggestion et indiquez votre prénom si vous le souhaitez — le formulaire reste utilisable de façon anonyme.`,
    action: () => openForm(),
    actionDelay: 400,
  },
  {
    id: 'sugg-card1',
    id2: 'sugg-card2',
    title: `Une suggestion de la liste`,
    description: `Chaque carte affiche la catégorie, l'auteur, la date et le message. Pour les jeux à acheter, un badge de prix apparaît (ou un bouton "Ajouter un prix" si non renseigné) — cliquez dessus pour le modifier manuellement à tout moment. L'icône crayon modifie toute la suggestion, et la case à cocher la marque comme traitée.`,
    action: () => closeForm(),
  },
  {
    id: 'sugg-price-search',
    title: `Rechercher le prix sur MyLudo`,
    description: `Sur les suggestions de jeu à acheter, cette loupe recherche le jeu sur MyLudo et propose son prix pour le renseigner en un clic. Si le prix n'est pas disponible, vous pouvez toujours le saisir manuellement.`,
    action: () => closeForm(),
    tip: `Cette icône n'apparaît que sur les suggestions de catégorie "Jeu à acheter".`,
  },
  {
    id: 'sugg-export-pdf',
    title: `Exporter la liste en PDF`,
    description: `Ce bouton génère un document récapitulant tous les jeux suggérés à acheter, avec leur prix et le total estimé — pratique pour une réunion ou une demande de subvention.`,
    action: () => closeForm(),
    tip: `Ce bouton n'apparaît que s'il existe au moins une suggestion de catégorie "Jeu à acheter".`,
  },
]

export default function Suggestions() {
  const [suggestions, setSuggestions]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [showModal, setShowModal]         = useState(false)
  const [showTuto, setShowTuto]           = useState(false)
  const [filterDone, setFilterDone]       = useState('all') // 'all' | 'pending' | 'done'
  const [deletingId, setDeletingId]       = useState(null)
  const [togglingId, setTogglingId]       = useState(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showCatDropdown, setShowCatDropdown] = useState(false)
  const [filterCats, setFilterCats]         = useState([]) // tableau de catégories sélectionnées

  // Prix des suggestions
  const [priceSearchFor, setPriceSearchFor]         = useState(null) // id de la suggestion dont le popover est ouvert
  const [priceSearchResults, setPriceSearchResults] = useState([])
  const [priceSearchLoading, setPriceSearchLoading] = useState(false)
  const [savingPriceId, setSavingPriceId]           = useState(null)
  const [editingPriceId, setEditingPriceId]         = useState(null) // saisie manuelle inline
  const [editingPriceValue, setEditingPriceValue]   = useState('')

  // Formulaire
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [message, setMessage]   = useState('')
  const [author, setAuthor]     = useState('')
  const [sending, setSending]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  // Modale d'édition
  const [editModal, setEditModal]       = useState({ show: false, id: null })
  const [editCategory, setEditCategory] = useState(null)
  const [editMessage, setEditMessage]   = useState('')
  const [editAuthor, setEditAuthor]     = useState('')
  const [editPrice, setEditPrice]       = useState('')
  const [showEditCatDropdown, setShowEditCatDropdown] = useState(false)
  const [editSaving, setEditSaving]     = useState(false)
  const [editError, setEditError]       = useState('')

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
    try {
      const newDone = !s.done
      const { data, error } = await supabase.from('suggestions').update({ done: newDone }).eq('id', s.id).select()
      if (error) {
        console.error('Erreur mise à jour statut:', error)
      } else if (!data || data.length === 0) {
        console.error('Erreur mise à jour statut : aucune ligne mise à jour (vérifiez les policies RLS UPDATE sur la table suggestions)')
      } else {
        setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, done: newDone } : x))
      }
    } catch (err) {
      console.error('Erreur mise à jour statut:', err)
    } finally {
      setTogglingId(null)
    }
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

  // ── Prix ─────────────────────────────────────────────────────────────────
  // NB : .select() est indispensable ici — sans lui, une UPDATE bloquée par une
  // policy RLS renvoie { error: null } avec 0 ligne modifiée, ce qui donnerait
  // l'illusion d'un succès alors que rien n'a été persisté en base.
  async function savePrice(suggestionId, price) {
    setSavingPriceId(suggestionId)
    try {
      const { data, error } = await supabase.from('suggestions').update({ price }).eq('id', suggestionId).select()
      if (error) {
        console.error('Erreur sauvegarde prix:', error)
      } else if (!data || data.length === 0) {
        console.error('Erreur sauvegarde prix : aucune ligne mise à jour (vérifiez les policies RLS UPDATE sur la table suggestions)')
      } else {
        setSuggestions(prev => prev.map(x => x.id === suggestionId ? { ...x, price } : x))
      }
    } catch (err) {
      console.error('Erreur sauvegarde prix:', err)
    } finally {
      setSavingPriceId(null)
    }
  }

  async function searchGamePrice(suggestion) {
    setPriceSearchFor(suggestion.id)
    setPriceSearchResults([])
    setPriceSearchLoading(true)
    try {
      const results = await bggSearchGames(suggestion.message.trim())
      const enriched = await Promise.all(results.map(async r => {
        try {
          const details = await bggGameDetails(r.id)
          return { ...r, image: details?.image || '', price: details?.price ?? null }
        } catch {
          return { ...r, image: '', price: null }
        }
      }))
      setPriceSearchResults(enriched)
    } catch (e) {
      console.warn('Erreur recherche prix MyLudo:', e)
    } finally {
      setPriceSearchLoading(false)
    }
  }

  async function selectPriceResult(suggestion, result) {
    setPriceSearchFor(null)
    setPriceSearchResults([])
    if (result.price != null) {
      await savePrice(suggestion.id, result.price)
    } else {
      startEditPrice(suggestion)
    }
  }

  function startEditPrice(s) {
    setEditingPriceId(s.id)
    setEditingPriceValue(s.price != null ? String(s.price) : '')
  }

  async function commitManualPrice(s) {
    const raw = editingPriceValue.trim().replace(',', '.')
    setEditingPriceId(null)
    if (raw === '') {
      if (s.price !== null) await savePrice(s.id, null)
      return
    }
    const value = parseFloat(raw)
    const finalValue = (!isNaN(value) && value >= 0) ? value : null
    if (finalValue !== s.price) await savePrice(s.id, finalValue)
  }

  // ── Édition ──────────────────────────────────────────────────────────────
  function openEditModal(s) {
    setEditModal({ show: true, id: s.id })
    setEditCategory(s.category)
    setEditMessage(s.message)
    setEditAuthor(s.author || '')
    setEditPrice(s.price != null ? String(s.price) : '')
    setShowEditCatDropdown(false)
    setEditError('')
  }

  function closeEditModal() {
    setEditModal({ show: false, id: null })
  }

  async function saveEdit() {
    if (!editCategory || !editMessage.trim()) {
      setEditError('Merci de choisir une catégorie et de rédiger la suggestion.')
      return
    }
    setEditError('')
    setEditSaving(true)
    try {
      const rawPrice = editPrice.trim().replace(',', '.')
      const parsed = rawPrice === '' ? null : parseFloat(rawPrice)
      const priceValue = (parsed != null && !isNaN(parsed) && parsed >= 0) ? parsed : null
      const updated = {
        category: editCategory,
        message:  editMessage.trim(),
        author:   editAuthor.trim() || 'Anonyme',
        price:    priceValue,
      }
      const { data, error: dbError } = await supabase.from('suggestions').update(updated).eq('id', editModal.id).select()
      if (dbError) throw dbError
      if (!data || data.length === 0) throw new Error('Aucune ligne mise à jour (vérifiez les policies RLS UPDATE sur la table suggestions)')
      setSuggestions(prev => prev.map(x => x.id === editModal.id ? { ...x, ...updated } : x))
      closeEditModal()
    } catch (err) {
      console.error('Erreur sauvegarde édition:', err)
      setEditError('Une erreur est survenue. Vérifiez votre connexion.')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Export PDF (window.print() via iframe masqué, sans dépendance externe) ─
  function exportPdf() {
    const jeuxSuggestions = suggestions.filter(s => s.category === 'jeu_acheter')
    if (jeuxSuggestions.length === 0) return

    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const withPrice = jeuxSuggestions.filter(s => s.price != null)
    const withoutPriceCount = jeuxSuggestions.length - withPrice.length
    const total = withPrice.reduce((sum, s) => sum + Number(s.price), 0)

    const rowsHtml = jeuxSuggestions.map(s => `
      <div class="row">
        <span class="checkbox">☐</span>
        <span class="name">${escapeHtml(s.message)}</span>
        <span class="price">${s.price != null ? formatPrice(s.price) : ''}</span>
        <div class="suggested-by">Suggéré par ${escapeHtml(s.author || 'Anonyme')}</div>
      </div>
    `).join('')

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Liste des jeux à commander</title>
<style>
  @page { margin: 20mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 0; }
  .header { text-align: center; margin-bottom: 24px; }
  .logo { font-size: 28px; font-weight: 900; color: #1a5f7a; letter-spacing: -0.5px; }
  .subtitle { font-size: 13px; color: #555; margin-top: 6px; }
  .hr { border: none; border-top: 2px solid #1a5f7a; margin: 16px 0 24px 0; }
  .row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; padding: 10px 0; border-bottom: 1px solid #ddd; page-break-inside: avoid; }
  .checkbox { font-size: 16px; }
  .name { font-weight: 700; font-size: 14px; flex: 1; }
  .price { font-weight: 700; font-size: 13px; text-align: right; white-space: nowrap; }
  .suggested-by { width: 100%; font-size: 10px; color: #777; padding-left: 24px; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 2px solid #1a5f7a; font-size: 12px; }
  .footer .totals { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px; }
  .footer .assoc { text-align: center; color: #888; margin-top: 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Ludothèque de Coligny</div>
    <div class="subtitle">Liste des jeux à commander — ${todayStr}</div>
  </div>
  <hr class="hr" />
  <div class="list">
    ${rowsHtml}
  </div>
  <div class="footer">
    <div class="totals">
      <span>Total estimé</span>
      <span>${formatPrice(total)}</span>
    </div>
    ${withoutPriceCount > 0 ? `<div>${withoutPriceCount} jeu${withoutPriceCount > 1 ? 'x' : ''} sans prix renseigné</div>` : ''}
    <div class="assoc">Association PACTES — Ludothèque de Coligny</div>
  </div>
</body>
</html>`

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()

    const cleanup = () => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }
    iframe.contentWindow.onafterprint = cleanup
    setTimeout(cleanup, 60000) // filet de sécurité si l'évènement afterprint ne se déclenche pas

    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    }, 200)
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

  const totalToProvide = suggestions.filter(s => !s.done && s.price != null).reduce((sum, s) => sum + Number(s.price), 0)
  const totalSaved     = suggestions.filter(s => s.done && s.price != null).reduce((sum, s) => sum + Number(s.price), 0)
  const uncostedCount  = suggestions.filter(s => s.price == null).length
  const jeuxACheterCount = suggestions.filter(s => s.category === 'jeu_acheter').length

  const suggSteps = useMemo(() => SUGGESTIONS_TUTORIAL_STEPS(
    () => setShowModal(true),
    () => setShowModal(false)
  ), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">

        {/* HEADER — aligné sur les autres pages admin */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 data-tutorial="sugg-header" className="text-xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-[#1a5f7a] rounded-xl shadow-lg text-white">
              <Lightbulb size={24} />
            </div>
            <span>Vos <span className="text-[#1a5f7a]">Suggestions</span></span>
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            {jeuxACheterCount > 0 && (
              <button
                data-tutorial="sugg-export-pdf"
                onClick={exportPdf}
                className="flex items-center gap-2 px-5 py-4 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-[#1a5f7a] hover:text-[#1a5f7a] transition-all whitespace-nowrap"
              >
                <FileDown size={16} /> Exporter en PDF
              </button>
            )}
            <button
              data-tutorial="sugg-add-btn"
              onClick={() => { setShowModal(true); setSuccess(false); setError('') }}
              className="flex items-center gap-2 px-6 py-4 bg-[#e38154] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-[#d16f43] active:scale-95 transition-all whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={3} /> Nouvelle suggestion
            </button>
          </div>
        </div>

        {/* RÉCAPITULATIF DES ACHATS À PRÉVOIR */}
        {suggestions.length > 0 && (
          <div data-tutorial="sugg-budget" className="mb-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl text-[#e38154] shrink-0"><Euro size={18} /></div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total à prévoir</p>
                <p className="text-lg font-black text-[#e38154] truncate">{formatPrice(totalToProvide)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0"><PiggyBank size={18} /></div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Économisé</p>
                <p className="text-lg font-black text-emerald-600 truncate">{formatPrice(totalSaved)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0"><HelpCircle size={18} /></div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Non chiffré</p>
                <p className="text-lg font-black text-slate-500 truncate">{uncostedCount} suggestion{uncostedCount > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        )}

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
            {filtered.map((s, idx) => {
              const cat = getCat(s.category)
              const cardTutoAttr = idx === 0 ? { 'data-tutorial': 'sugg-card1' } : idx === 1 ? { 'data-tutorial': 'sugg-card2' } : {}
              return (
                <div key={s.id} {...cardTutoAttr} className={`bg-white rounded-[2rem] border p-5 flex items-start gap-4 transition-all ${
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

                    {/* Prix */}
                    <div className="flex items-center gap-2 mt-2">
                      {editingPriceId === s.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number" step="0.01" min="0" autoFocus
                            value={editingPriceValue}
                            onChange={e => setEditingPriceValue(e.target.value)}
                            onBlur={() => commitManualPrice(s)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                              if (e.key === 'Escape') setEditingPriceId(null)
                            }}
                            placeholder="0.00"
                            className="w-20 px-2 py-1 rounded-lg border-2 border-[#1a5f7a] text-xs font-black text-[#1a5f7a] outline-none"
                          />
                          <span className="text-[10px] font-black text-slate-400">€</span>
                        </div>
                      ) : savingPriceId === s.id ? (
                        <Loader2 size={12} className="animate-spin text-slate-300" />
                      ) : s.price != null ? (
                        <button onClick={() => startEditPrice(s)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black hover:bg-emerald-100 transition-colors">
                          {formatPrice(s.price)} <Pencil size={9} className="opacity-50" />
                        </button>
                      ) : (
                        <button onClick={() => startEditPrice(s)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold hover:bg-slate-100 transition-colors">
                          <Pencil size={9} /> Ajouter un prix
                        </button>
                      )}

                      {s.category === 'jeu_acheter' && (
                        <div className="relative">
                          <button data-tutorial="sugg-price-search" onClick={() => searchGamePrice(s)}
                            title="Chercher le prix sur MyLudo"
                            className="p-1.5 text-slate-300 hover:text-[#1a5f7a] hover:bg-slate-50 rounded-lg transition-colors">
                            <Search size={12} />
                          </button>

                          {priceSearchFor === s.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setPriceSearchFor(null)} />
                              <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-2xl shadow-2xl border border-slate-100 w-64 max-h-64 overflow-y-auto">
                                {priceSearchLoading ? (
                                  <div className="flex items-center justify-center gap-2 p-4 text-slate-400 text-xs">
                                    <Loader2 size={14} className="animate-spin" /> Recherche...
                                  </div>
                                ) : priceSearchResults.length === 0 ? (
                                  <p className="text-center text-[10px] text-slate-400 py-4">Aucun résultat</p>
                                ) : (
                                  priceSearchResults.map(r => (
                                    <button key={r.id} onClick={() => selectPriceResult(s, r)}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0">
                                      <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                        {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : <Dices size={14} className="text-slate-300" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 truncate">{r.name}</p>
                                        {r.year && <p className="text-[9px] text-slate-400">{r.year}</p>}
                                      </div>
                                      {r.price != null ? (
                                        <span className="text-[10px] font-black text-emerald-600 shrink-0">{formatPrice(r.price)}</span>
                                      ) : (
                                        <span className="text-[9px] text-slate-300 shrink-0 italic">n/a</span>
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
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
                    {/* Modifier */}
                    <button
                      onClick={() => openEditModal(s)}
                      title="Modifier"
                      className="w-8 h-8 rounded-xl border-2 border-slate-100 flex items-center justify-center text-slate-300 hover:border-[#1a5f7a]/40 hover:text-[#1a5f7a] hover:bg-[#1a5f7a]/5 transition-all active:scale-95"
                    >
                      <Edit2 size={13} />
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
          <div data-tutorial="sugg-form" className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200">

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

      {/* MODALE ÉDITION */}
      {editModal.show && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200">

            {/* Header modale */}
            <div className="sticky top-0 bg-white rounded-t-[2.5rem] p-6 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1a5f7a]/10 text-[#1a5f7a] rounded-xl"><Edit2 size={18} /></div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Modifier la suggestion</h3>
              </div>
              <button onClick={closeEditModal} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">

              {/* Catégorie — dropdown */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Catégorie
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowEditCatDropdown(v => !v)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      editCategory
                        ? `${getCat(editCategory).bg} ${getCat(editCategory).border}`
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg shrink-0"
                      style={{ color: editCategory ? getCat(editCategory).color : '#cbd5e1', background: editCategory ? `${getCat(editCategory).color}18` : '#f1f5f9' }}>
                      {editCategory ? getCat(editCategory).icon : <MoreHorizontal size={16} />}
                    </div>
                    <span className="flex-1 font-black text-xs uppercase tracking-tight"
                      style={{ color: editCategory ? getCat(editCategory).color : '#94a3b8' }}>
                      {editCategory ? getCat(editCategory).label : 'Choisir une catégorie…'}
                    </span>
                    <ChevronDown size={14} strokeWidth={3}
                      className={`shrink-0 transition-transform ${showEditCatDropdown ? 'rotate-180' : ''}`}
                      style={{ color: editCategory ? getCat(editCategory).color : '#cbd5e1' }} />
                  </button>

                  {showEditCatDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowEditCatDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 p-2 animate-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
                        {CATEGORIES.map(c => (
                          <button key={c.id}
                            onClick={() => { setEditCategory(c.id); setShowEditCatDropdown(false) }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                              editCategory === c.id ? c.bg : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="shrink-0" style={{ color: editCategory === c.id ? c.color : '#cbd5e1' }}>
                              {c.icon}
                            </div>
                            <p className="flex-1 font-black text-[10px] uppercase tracking-tight"
                              style={{ color: editCategory === c.id ? c.color : '#94a3b8' }}>
                              {c.label}
                            </p>
                            {editCategory === c.id && (
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
                  Suggestion
                </label>
                <textarea rows={4} value={editMessage} onChange={e => setEditMessage(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm text-slate-700 placeholder:text-slate-300 outline-none border-2 border-transparent focus:border-[#1a5f7a]/30 resize-none transition-all"
                />
              </div>

              {/* Auteur */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Suggéré par
                </label>
                <input type="text" value={editAuthor} onChange={e => setEditAuthor(e.target.value)}
                  placeholder="Laissez vide pour rester anonyme"
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 placeholder:text-slate-300 outline-none border-2 border-transparent focus:border-[#1a5f7a]/30 transition-all"
                />
              </div>

              {/* Prix */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Prix <span className="normal-case font-medium text-slate-300">(optionnel)</span>
                </label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-4 pr-12 bg-slate-50 rounded-2xl font-bold text-sm text-slate-700 placeholder:text-slate-300 outline-none border-2 border-transparent focus:border-[#1a5f7a]/30 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">€</span>
                </div>
              </div>

              {/* Erreur */}
              {editError && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs border border-rose-100">
                  {editError}
                </div>
              )}
            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 bg-white rounded-b-[2.5rem] p-6 pt-4 border-t border-slate-100 flex gap-3">
              <button onClick={closeEditModal}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button onClick={saveEdit} disabled={editSaving || !editCategory || !editMessage.trim()}
                className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  editSaving || !editCategory || !editMessage.trim()
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-[#1a5f7a] text-white shadow-lg shadow-cyan-900/20 hover:bg-[#154f67]'
                }`}>
                {editSaving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement…</> : <><Check size={14} /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={suggSteps}
        open={showTuto}
        onClose={() => { setShowTuto(false); setShowModal(false) }}
      />
    </div>
  )
}