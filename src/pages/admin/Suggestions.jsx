import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { useToast } from '../../components/ToastContext'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import IconButton from '../../components/admin/IconButton'
import { BTN_ORANGE, BTN_OUTLINE } from '../../components/admin/buttons'
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

// ─── Helpers export PDF : logos & images en base64 (nécessaire pour l'iframe de print) ──
async function svgToBase64(path) {
  try {
    const res = await fetch(window.location.origin + path)
    const text = await res.text()
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text)))
  } catch { return null }
}

// Carré coloré + initiale, utilisé quand un jeu n'a pas d'image renseignée
const AVATAR_COLORS = ['#1a5f7a', '#e38154', '#7c5cbf', '#0891b2', '#059669', '#dc2626', '#d97706']
function initialAvatar(name) {
  const clean = (name || '?').trim()
  const initial = (clean.charAt(0) || '?').toUpperCase()
  let hash = 0
  for (let i = 0; i < clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash)
  return { initial, color: AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] }
}

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
  const { addToast } = useToast()
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
  const [exportingPdf, setExportingPdf]     = useState(false)

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
      addToast('Suggestion ajoutée avec succès.', 'success')
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
      addToast('Erreur lors de la suppression.', 'error')
    } else {
      setSuggestions(prev => prev.filter(x => x.id !== id))
      addToast('Suggestion supprimée avec succès.', 'success')
    }
    setDeletingId(null)
  }

  // ── Prix ─────────────────────────────────────────────────────────────────
  // NB : .select() est indispensable ici — sans lui, une UPDATE bloquée par une
  // policy RLS renvoie { error: null } avec 0 ligne modifiée, ce qui donnerait
  // l'illusion d'un succès alors que rien n'a été persisté en base.
  async function savePrice(suggestionId, price, imageUrl) {
    setSavingPriceId(suggestionId)
    try {
      const payload = imageUrl !== undefined ? { price, image_url: imageUrl } : { price }
      const { data, error } = await supabase.from('suggestions').update(payload).eq('id', suggestionId).select()
      if (error) {
        console.error('Erreur sauvegarde prix:', error)
        addToast('Erreur lors de la sauvegarde du prix.', 'error')
      } else if (!data || data.length === 0) {
        console.error('Erreur sauvegarde prix : aucune ligne mise à jour (vérifiez les policies RLS UPDATE sur la table suggestions)')
        addToast('Erreur lors de la sauvegarde du prix.', 'error')
      } else {
        setSuggestions(prev => prev.map(x => x.id === suggestionId ? { ...x, ...payload } : x))
        addToast('Prix enregistré avec succès.', 'success')
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
      await savePrice(suggestion.id, result.price, result.image || null)
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
      addToast('Suggestion modifiée avec succès.', 'success')
    } catch (err) {
      console.error('Erreur sauvegarde édition:', err)
      setEditError('Une erreur est survenue. Vérifiez votre connexion.')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Export PDF (window.print() via iframe masqué, sans dépendance externe) ─
  async function exportPdf() {
    const jeuxSuggestions = suggestions.filter(s => s.category === 'jeu_acheter')
    if (jeuxSuggestions.length === 0) return

    setExportingPdf(true)
    try {
      const [logoFeuille, logoPactes] = await Promise.all([
        svgToBase64('/logo-feuille.svg'),
        svgToBase64('/logo-pactes.svg'),
      ])

      const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const withPrice = jeuxSuggestions.filter(s => s.price != null)
      const total = withPrice.reduce((sum, s) => sum + Number(s.price), 0)

      const rowsHtml = jeuxSuggestions.map(s => {
        let imageHtml
        if (s.image_url) {
          imageHtml = `<img src="${escapeHtml(s.image_url)}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;flex-shrink:0;" onerror="this.style.display='none'" alt="" />`
        } else {
          const { initial, color } = initialAvatar(s.message)
          imageHtml = `<span class="game-avatar" style="background:${color};">${escapeHtml(initial)}</span>`
        }
        return `
      <div class="game-row${s.done ? ' done' : ''}">
        <span class="checkbox">${s.done ? '☑' : '☐'}</span>
        ${imageHtml}
        <span class="name">${escapeHtml(s.message)}</span>
        <span class="suggested-by">Suggéré par ${escapeHtml(s.author || 'Anonyme')}</span>
        <span class="price">${s.price != null ? formatPrice(s.price) : ''}</span>
      </div>
    `
      }).join('')

      const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Liste des jeux à commander</title>
<style>
  @page { size: A4 portrait; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11px; }

  .header { background: #fff; padding: 4px 4px 14px; border-bottom: 3px solid #1a5f7a; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .header-logo { height: 55px; }
  .header-fallback-logo { font-size: 32px; line-height: 1; }
  .header-pactes-logo { height: 50px; }
  .header-title { color: #1a5f7a; font-size: 18px; font-weight: 900; }
  .header-subtitle { color: #e38154; font-size: 11px; font-weight: 700; margin-top: 2px; }

  .total-line { font-size: 13px; font-weight: 900; color: #1a5f7a; margin: 0 2px 14px; }

  .game-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin-bottom: 6px; border-bottom: 1px solid #f0f0f0; page-break-inside: avoid; }
  .game-row.done { opacity: 0.55; }
  .checkbox { font-size: 14px; flex-shrink: 0; }
  .game-image, .game-avatar { width: 40px; height: 40px; border-radius: 6px; flex-shrink: 0; }
  .game-image { object-fit: contain; background: #fff; border: 1px solid #eee; }
  .game-avatar { display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 15px; }
  .name { font-weight: 700; flex: 1; }
  .game-row.done .name { text-decoration: line-through; }
  .suggested-by { font-size: 10px; color: #888; white-space: nowrap; }
  .price { font-weight: 900; font-size: 13px; color: #1a5f7a; white-space: nowrap; min-width: 60px; text-align: right; }

  .doc-footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; }
  .doc-footer-assoc { color: #1a5f7a; font-weight: 700; }
  .doc-footer-date { color: #aaa; font-size: 10px; margin-top: 4px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoFeuille ? `<img class="header-logo" src="${logoFeuille}" alt="" />` : '<span class="header-fallback-logo">🎲</span>'}
      <div>
        <div class="header-title">Ludothèque de Coligny</div>
        <div class="header-subtitle">Liste des jeux à commander — ${todayStr}</div>
      </div>
    </div>
    ${logoPactes ? `<img class="header-pactes-logo" src="${logoPactes}" alt="" />` : ''}
  </div>

  <div class="total-line">Total estimé : ${formatPrice(total)}</div>

  <div class="list">
    ${rowsHtml}
  </div>

  <div class="doc-footer">
    <div class="doc-footer-assoc">Association PACTES — Ludothèque de Coligny</div>
    <div class="doc-footer-date">Document généré le ${todayStr}</div>
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
    } finally {
      setExportingPdf(false)
    }
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
    <div className="min-h-screen bg-[#fdfaf6] p-5 font-body text-[#0f172a] md:p-11">
      <div className="mx-auto max-w-[860px]">

        <div data-tutorial="sugg-header">
          <AdminPageHeader icon="ludo-suggestions.svg" title="Vos" accent="Suggestions">
            <div className="flex w-full flex-wrap gap-2.5 md:w-auto">
              {jeuxACheterCount > 0 && (
                <button
                  data-tutorial="sugg-export-pdf"
                  onClick={exportPdf}
                  disabled={exportingPdf}
                  className={`${BTN_OUTLINE} flex-1 md:flex-none`}
                >
                  {exportingPdf
                    ? <><Loader2 size={15} className="animate-spin" /> Génération...</>
                    : <><FileDown size={15} /> Exporter en PDF</>}
                </button>
              )}
              <button
                data-tutorial="sugg-add-btn"
                onClick={() => { setShowModal(true); setSuccess(false); setError('') }}
                className={`${BTN_ORANGE} flex-1 md:flex-none`}
              >
                <Plus size={15} strokeWidth={3} /> Nouvelle suggestion
              </button>
            </div>
          </AdminPageHeader>
        </div>

        {/* RÉCAPITULATIF DES ACHATS À PRÉVOIR */}
        {suggestions.length > 0 && (
          <div data-tutorial="sugg-budget" className="mb-5 grid grid-cols-1 gap-5 rounded-[32px] border-2 border-[#0f172a] bg-white p-6 shadow-[6px_6px_0_#e38154] sm:grid-cols-3">
            {[
              { label: 'Total à prévoir', value: formatPrice(totalToProvide), color: '#e38154', tint: '#fdf1ea', icon: <Euro size={18} /> },
              { label: 'Économisé',       value: formatPrice(totalSaved),     color: '#10b981', tint: '#ecfdf5', icon: <PiggyBank size={18} /> },
              { label: 'Non chiffré',     value: `${uncostedCount} suggestion${uncostedCount > 1 ? 's' : ''}`, color: '#64748b', tint: '#f1f5f9', icon: <HelpCircle size={18} /> },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-3.5">
                <span
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a]"
                  style={{ background: stat.tint, color: stat.color }}
                >
                  {stat.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{stat.label}</span>
                  <span className="mt-1 block truncate font-display text-[21px] font-extrabold tracking-[-0.04em]" style={{ color: stat.color }}>
                    {stat.value}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* BARRE FILTRES */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Compteur */}
          <p className="flex-1 basis-[160px] text-[11.5px] font-bold text-slate-400">
            {pendingCount} en attente · {doneCount} traitée{doneCount > 1 ? 's' : ''}
          </p>

          {/* Filtre statut */}
          <div className="flex gap-1 rounded-[16px] border-2 border-[#0f172a] bg-white p-1">
            {[
              { val: 'all',     label: 'Toutes' },
              { val: 'pending', label: 'En attente' },
              { val: 'done',    label: 'Traitées' },
            ].map(f => (
              <button key={f.val} onClick={() => setFilterDone(f.val)}
                className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                  filterDone === f.val ? 'bg-[#1a5f7a] text-white' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtre catégorie — dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(v => !v)}
              className={`flex items-center gap-2 rounded-[16px] border-2 border-[#0f172a] px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-widest transition-colors ${
                filterCats.length > 0
                  ? 'bg-[#1a5f7a] text-white'
                  : 'bg-white text-slate-500 hover:bg-[#fdfaf6]'
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
                <div className="absolute right-0 top-full mt-2 z-20 rounded-[18px] border-2 border-[#0f172a] bg-white shadow-[4px_4px_0_#1a5f7a] p-2 min-w-[220px] animate-in zoom-in-95 duration-150">
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
                <div key={s.id} {...cardTutoAttr} className={`flex items-start gap-4 rounded-[32px] border-2 border-[#0f172a] bg-white p-5 ${
                  s.done ? 'opacity-50 shadow-[3px_3px_0_#94a3b8]' : 'shadow-[5px_5px_0_#1a5f7a]'
                }`}>
                  {/* Badge catégorie */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] ${cat.bg}`} style={{ color: cat.color }}>
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
                          className="flex items-center gap-1.5 rounded-full border-2 border-[#10b981] bg-[#ecfdf5] px-3 py-1 text-[10px] font-extrabold text-[#047857] transition-colors hover:bg-[#10b981] hover:text-white">
                          {formatPrice(s.price)} <Pencil size={9} className="opacity-50" />
                        </button>
                      ) : (
                        <button onClick={() => startEditPrice(s)}
                          className="flex items-center gap-1.5 rounded-full border-2 border-slate-300 bg-[#fdfaf6] px-3 py-1 text-[10px] font-extrabold text-slate-500 transition-colors hover:border-[#0f172a]">
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
                              <div className="absolute left-0 top-full mt-1 z-20 rounded-[18px] border-2 border-[#0f172a] bg-white shadow-[4px_4px_0_#1a5f7a] w-64 max-h-64 overflow-y-auto">
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: "rgba(15,23,42,.7)" }}>
          <div data-tutorial="sugg-form" className="anim-modal-in flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#e38154]">

            {/* Header modale */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#1a5f7a] text-white"><Lightbulb size={18} /></div>
                <h3 className="font-display text-lg font-extrabold tracking-[-0.03em] text-[#0f172a]">Nouvelle suggestion</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-white text-[#0f172a] transition-colors hover:bg-[#fdfaf6]">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">

              {/* Succès */}
              {success && (
                <div className="anim-modal-in flex items-center gap-3 rounded-[18px] border-2 border-[#10b981] bg-[#ecfdf5] p-4">
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                  <p className="font-black text-emerald-700 uppercase text-xs tracking-tight">Suggestion enregistrée !</p>
                </div>
              )}

              {/* Catégorie — dropdown */}
              <div>
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">
                  1. Catégorie
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCatDropdown(v => !v)}
                    className={`flex w-full items-center gap-3 rounded-[18px] border-2 border-[#0f172a] p-4 text-left transition-colors ${
                      selectedCategory ? getCat(selectedCategory).bg : 'bg-[#fdfaf6] hover:bg-white'
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
                      <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-[18px] border-2 border-[#0f172a] bg-white shadow-[4px_4px_0_#1a5f7a] p-2 animate-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
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
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">
                  2. Votre suggestion
                </label>
                <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
                  placeholder={FORM_CATEGORIES.find(c => c.id === selectedCategory)?.placeholder || 'Décrivez votre idée…'}
                  className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white resize-none"
                />
              </div>

              {/* Auteur */}
              <div>
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">
                  3. Votre prénom <span className="font-semibold normal-case text-slate-400">(optionnel)</span>
                </label>
                <input type="text" value={author} onChange={e => setAuthor(e.target.value)}
                  placeholder="Laissez vide pour rester anonyme"
                  className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white"
                />
              </div>

              {/* Erreur */}
              {error && (
                <div className="flex items-center gap-3 rounded-[18px] border-2 border-[#f43f5e] bg-[#fff1f2] p-4 text-xs font-bold text-[#be123c]">
                  {error}
                </div>
              )}
            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 flex shrink-0 gap-3 border-t-2 border-[#0f172a] bg-white p-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-[16px] border-2 border-[#0f172a] bg-white py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0f172a] transition-colors hover:bg-[#fdfaf6]">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={sending || !selectedCategory || !message.trim()}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[16px] border-2 border-[#0f172a] py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all ${
                  sending || !selectedCategory || !message.trim()
                    ? 'cursor-not-allowed bg-[#fdfaf6] text-slate-300'
                    : 'bg-[#1a5f7a] text-white shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]'
                }`}>
                {sending ? <><Loader2 size={14} className="animate-spin" /> Enregistrement…</> : <><Check size={14} /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ÉDITION */}
      {editModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: "rgba(15,23,42,.7)" }}>
          <div className="anim-modal-in flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#e38154]">

            {/* Header modale */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#1a5f7a] text-white"><Edit2 size={18} /></div>
                <h3 className="font-display text-lg font-extrabold tracking-[-0.03em] text-[#0f172a]">Modifier la suggestion</h3>
              </div>
              <button onClick={closeEditModal} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-white text-[#0f172a] transition-colors hover:bg-[#fdfaf6]">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">

              {/* Catégorie — dropdown */}
              <div>
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">
                  Catégorie
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowEditCatDropdown(v => !v)}
                    className={`flex w-full items-center gap-3 rounded-[18px] border-2 border-[#0f172a] p-4 text-left transition-colors ${
                      editCategory ? getCat(editCategory).bg : 'bg-[#fdfaf6] hover:bg-white'
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
                      <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-[18px] border-2 border-[#0f172a] bg-white shadow-[4px_4px_0_#1a5f7a] p-2 animate-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
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
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">
                  Suggestion
                </label>
                <textarea rows={4} value={editMessage} onChange={e => setEditMessage(e.target.value)}
                  className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white resize-none"
                />
              </div>

              {/* Auteur */}
              <div>
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">
                  Suggéré par
                </label>
                <input type="text" value={editAuthor} onChange={e => setEditAuthor(e.target.value)}
                  placeholder="Laissez vide pour rester anonyme"
                  className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white"
                />
              </div>

              {/* Prix */}
              <div>
                <label className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a]">
                  Prix <span className="font-semibold normal-case text-slate-400">(optionnel)</span>
                </label>
                <div className="relative">
                  <input type="number" step="0.01" min="0" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">€</span>
                </div>
              </div>

              {/* Erreur */}
              {editError && (
                <div className="flex items-center gap-3 rounded-[18px] border-2 border-[#f43f5e] bg-[#fff1f2] p-4 text-xs font-bold text-[#be123c]">
                  {editError}
                </div>
              )}
            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 flex shrink-0 gap-3 border-t-2 border-[#0f172a] bg-white p-6">
              <button onClick={closeEditModal}
                className="flex-1 rounded-[16px] border-2 border-[#0f172a] bg-white py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0f172a] transition-colors hover:bg-[#fdfaf6]">
                Annuler
              </button>
              <button onClick={saveEdit} disabled={editSaving || !editCategory || !editMessage.trim()}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[16px] border-2 border-[#0f172a] py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all ${
                  editSaving || !editCategory || !editMessage.trim()
                    ? 'cursor-not-allowed bg-[#fdfaf6] text-slate-300'
                    : 'bg-[#1a5f7a] text-white shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]'
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