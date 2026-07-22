import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { useToast } from '../../components/ToastContext'
import { SkeletonRow } from '../../components/Skeleton'
import {
  TrendingUp, TrendingDown, Plus, Trash2, Loader2,
  Wallet, ShoppingCart, Landmark, PiggyBank, X, AlertTriangle, Euro, Edit2
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type TransactionType = 'entree' | 'sortie'

interface Transaction {
  id: string
  label: string
  amount: number
  type: TransactionType
  category: string
  date: string
  created_at?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÉGORIES
// ─────────────────────────────────────────────────────────────────────────────
const ENTREE_CATEGORIES = ['Cotisation', 'Subvention', 'Don', 'Trésorerie initiale', 'Autre entrée']
const SORTIE_CATEGORIES = ['Achat de jeu', 'Matériel', 'Communication', 'Frais divers', 'Autre sortie']

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Cotisation':           <Euro size={14} />,
  'Subvention':           <Landmark size={14} />,
  'Don':                  <PiggyBank size={14} />,
  'Trésorerie initiale':  <Wallet size={14} />,
  'Achat de jeu':         <ShoppingCart size={14} />,
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function SuiviFinancier() {
  const { addToast } = useToast()
  // ── State ──────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null)
  const [activeTab, setActiveTab] = useState<'tout' | 'entrees' | 'sorties'>('tout')

  const [form, setForm] = useState({
    label: '',
    amount: '',
    type: 'entree' as TransactionType,
    category: ENTREE_CATEGORIES[0],
    date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [showTuto, setShowTuto] = useState(false)

  // ── Chargement ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    setLoading(true)
    const { data } = await supabase
      .from('financial_transactions')
      .select('*')
      .order('date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  // ── Calculs ────────────────────────────────────────────────────────────────
  const cotisationsTotal = transactions
    .filter(t => t.type === 'entree' && t.category === 'Cotisation')
    .reduce((s, t) => s + t.amount, 0)

  const totalEntrees = transactions
    .filter(t => t.type === 'entree')
    .reduce((s, t) => s + t.amount, 0)

  const totalSorties = transactions
    .filter(t => t.type === 'sortie')
    .reduce((s, t) => s + t.amount, 0)

  const solde = totalEntrees - totalSorties

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'entrees') return t.type === 'entree'
    if (activeTab === 'sorties') return t.type === 'sortie'
    return true
  })

  // ── Formulaire ─────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null)
    setForm({
      label: '',
      amount: '',
      type: 'entree',
      category: ENTREE_CATEGORIES[0],
      date: new Date().toISOString().split('T')[0],
    })
    setFormError('')
    setShowModal(true)
  }

  function openEdit(t: Transaction) {
    setEditingId(t.id)
    setForm({
      label: t.label,
      amount: String(t.amount),
      type: t.type,
      category: t.category,
      date: t.date,
    })
    setFormError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setFormError('')
  }

  function handleTypeChange(type: TransactionType) {
    setForm(f => ({
      ...f,
      type,
      category: type === 'entree' ? ENTREE_CATEGORIES[0] : SORTIE_CATEGORIES[0],
    }))
  }

  async function handleSubmit() {
    setFormError('')
    if (!form.label.trim()) { setFormError('Veuillez saisir un libellé.'); return }
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { setFormError('Montant invalide.'); return }

    setSaving(true)
    const payload = {
      label: form.label.trim(),
      amount,
      type: form.type,
      category: form.category,
      date: form.date,
    }

    let error
    if (editingId) {
      ;({ error } = await supabase
        .from('financial_transactions')
        .update(payload)
        .eq('id', editingId))
    } else {
      ;({ error } = await supabase.from('financial_transactions').insert(payload))
    }
    setSaving(false)

    if (error) { setFormError('Erreur lors de l\'enregistrement.'); addToast('Erreur lors de l\'enregistrement.', 'error'); return }

    const wasEditing = !!editingId
    closeModal()
    fetchTransactions()
    addToast(wasEditing ? 'Entrée modifiée avec succès.' : 'Entrée ajoutée avec succès.', 'success')
  }

  async function handleDelete(t: Transaction) {
    await supabase.from('financial_transactions').delete().eq('id', t.id)
    setDeleteConfirm(null)
    fetchTransactions()
    addToast('Entrée supprimée avec succès.', 'success')
  }


const FINANCIER_TUTORIAL_STEPS = (openForm, closeForm) => [
  {
    id: 'fin-header',
    noSpotlight: true,
    title: `Bienvenue sur le Suivi Financier`,
    description: `Cette page vous permet de suivre toute la trésorerie de l'association : cotisations, subventions, achats de jeux et autres dépenses. Le solde est recalculé en temps réel.`,
    action: () => closeForm(),
  },
  {
    id: 'fin-add-btn',
    title: `Ajouter une opération`,
    description: `Ce bouton ouvre le formulaire de saisie. Nous allons le parcourir ensemble.`,
    action: () => closeForm(),
  },
  {
    id: 'fin-modal',
    title: `Formulaire de saisie`,
    description: `Ce formulaire permet d'enregistrer une entrée (cotisation, subvention, don…) ou une sortie (achat de jeu, matériel, frais…). Choisissez le type, la catégorie, renseignez le libellé, le montant et la date.`,
    action: () => openForm(),
    actionDelay: 400,
  },
  {
    id: 'fin-form-type',
    title: `Type d'opération`,
    description: `Sélectionnez "Entrée" pour un encaissement (cotisation, subvention, don…) ou "Sortie" pour une dépense (achat de jeu, matériel, frais divers…). Le choix adapte la liste des catégories disponibles.`,
    action: () => openForm(),
    actionDelay: 400,
  },
  {
    id: 'fin-form-fields',
    title: `Catégorie, libellé, montant et date`,
    description: `Choisissez la catégorie dans la liste, saisissez un libellé descriptif (ex : "Achat Catan", "Subvention mairie"), le montant en euros et la date de l'opération.`,
    action: () => openForm(),
    actionDelay: 400,
  },
  {
    id: 'fin-form-submit',
    title: `Enregistrer l'opération`,
    description: `Ce bouton enregistre la transaction. Le solde, les compteurs et l'historique sont mis à jour immédiatement.`,
    action: () => openForm(),
    actionDelay: 400,
  },
  {
    id: 'fin-solde',
    title: `Solde disponible`,
    description: `Ce bloc affiche le solde global de la trésorerie (total des entrées moins total des sorties). Il passe au vert si positif, au rouge en cas de déficit.`,
    action: () => closeForm(),
  },
  {
    id: 'fin-compteurs',
    title: `Répartition des flux`,
    description: `Ces trois blocs décomposent la trésorerie : cotisations encaissées (toutes années confondues), autres entrées (subventions, dons, trésorerie initiale…) et total des sorties (achats, matériel, frais…).`,
    action: () => closeForm(),
    tip: `Les entrées de type "Cotisation" sont enregistrées automatiquement depuis la page Adhérents lors de chaque inscription ou renouvellement. Vous n'avez pas à les saisir manuellement ici.`,
  },
  {
    id: 'fin-tabs',
    title: `Filtrer l'historique`,
    description: `Ces onglets filtrent la liste des transactions : "Tout" affiche toutes les opérations, "Entrées" uniquement les encaissements, "Sorties" uniquement les dépenses.`,
    action: () => closeForm(),
  },
  {
    id: 'fin-list-row1',
    id2: 'fin-list-row2',
    title: `Historique des transactions`,
    description: `Chaque ligne affiche l'icône de catégorie, le libellé, la catégorie, la date et le montant (en vert pour une entrée, en rouge pour une sortie). Les cotisations sont mises en évidence en bleu.`,
    action: () => closeForm(),
  },
  {
    id: 'fin-action-edit',
    title: `Modifier une transaction`,
    description: `L'icône crayon ouvre le formulaire pré-rempli pour modifier une transaction. Elle n'apparaît que sur les opérations saisies manuellement — les cotisations générées automatiquement depuis la page Adhérents ne sont pas modifiables ici.`,
    action: () => closeForm(),
  },
  {
    id: 'fin-action-delete',
    title: `Supprimer une transaction`,
    description: `L'icône poubelle (visible au survol) supprime la transaction après confirmation. Le solde est recalculé immédiatement.`,
    action: () => closeForm(),
  },
]

  // ── Steps tutoriel ─────────────────────────────────────────────────────────
  const finSteps = useMemo(() => FINANCIER_TUTORIAL_STEPS(
    () => { setEditingId(null); setForm({ label: '', amount: '', type: 'entree', category: 'Cotisation', date: new Date().toISOString().split('T')[0] }); setShowModal(true) },
    () => setShowModal(false)
  ), []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fdfaf6] font-sans">

      {/* EN-TÊTE */}
      <header className="p-4 md:p-10 max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 data-tutorial="fin-header" className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
          <div className="p-3 bg-[#1a5f7a] rounded-[1.2rem] md:rounded-[1.5rem] shadow-lg shadow-cyan-900/20 text-white">
            <Wallet size={28} />
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
            <span className="leading-none">
              Suivi <span className="text-[#1a5f7a]">Financier</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e38154]">
              Trésorerie
            </span>
          </div>
        </h1>

        <button
          data-tutorial="fin-add-btn"
          onClick={() => openCreate()}
          className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-[#1a5f7a] text-white shadow-lg shadow-cyan-900/20 hover:bg-[#164f66] active:scale-95"
        >
          <Plus size={16} />
          Nouvelle opération
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-10 pb-16 space-y-6 md:space-y-8">

        {(
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-6 md:space-y-8">

            {/* ── SOLDE PRINCIPAL ──────────────────────────────────────────── */}
            <div data-tutorial="fin-solde" className={`rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden ${solde >= 0 ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-rose-500 shadow-rose-900/20'}`}>
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/5 rounded-full pointer-events-none" />
              <div className="relative z-10 text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 mb-2">
                  Solde disponible
                </p>
                <p className="text-4xl md:text-6xl font-black tracking-tighter tabular-nums">
                  {fmt(solde)}
                </p>
              </div>
              <div className="relative z-10 flex flex-col items-center md:items-end gap-2">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/15 rounded-[1.5rem] flex items-center justify-center backdrop-blur-sm">
                  {solde >= 0
                    ? <TrendingUp size={42} strokeWidth={2.5} />
                    : <TrendingDown size={42} strokeWidth={2.5} />
                  }
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/50">
                  {solde >= 0 ? 'Bilan positif' : 'Déficit'}
                </span>
              </div>
            </div>

            {/* ── COMPTEURS ────────────────────────────────────────────────── */}
            <div data-tutorial="fin-compteurs" className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

              {/* Cotisations */}
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Cotisations encaissées
                  </span>
                  <div className="p-2 bg-[#f0f7f9] text-[#1a5f7a] rounded-xl">
                    <Euro size={16} />
                  </div>
                </div>
                <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                  {fmt(cotisationsTotal)}
                </p>
                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">
                  Historique réel · toutes années
                </p>
              </div>

              {/* Entrées manuelles */}
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Autres entrées
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <p className="text-3xl md:text-4xl font-black text-emerald-600 tracking-tighter tabular-nums">
                  {fmt(totalEntrees - cotisationsTotal)}
                </p>
                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">
                  Subventions, dons, trésorerie…
                </p>
              </div>

              {/* Sorties */}
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Total des sorties
                  </span>
                  <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                    <TrendingDown size={16} />
                  </div>
                </div>
                <p className="text-3xl md:text-4xl font-black text-rose-500 tracking-tighter tabular-nums">
                  {fmt(totalSorties)}
                </p>
                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">
                  Achats, matériel, frais…
                </p>
              </div>
            </div>

            {/* ── HISTORIQUE ───────────────────────────────────────────────── */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">

              {/* Tabs */}
              <div data-tutorial="fin-tabs" className="flex border-b border-slate-100 px-6 pt-6 gap-2">
                {(['tout', 'entrees', 'sorties'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                      activeTab === tab
                        ? 'bg-[#1a5f7a] text-white shadow'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {tab === 'tout' ? 'Tout' : tab === 'entrees' ? 'Entrées' : 'Sorties'}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-3">
                {/* Transactions */}
                {loading && (
                  <table className="w-full">
                    <tbody>
                      {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                    </tbody>
                  </table>
                )}
                {!loading && filteredTransactions.length === 0 && (
                  <div className="py-16 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
                    Aucune opération enregistrée
                  </div>
                )}
                {!loading && (() => { let nonCotiCount = 0; return filteredTransactions.map((t, idx) => {
                  const isCotisation = t.category === 'Cotisation'
                  if (!isCotisation) nonCotiCount++
                  const tutoAttr = !isCotisation && nonCotiCount === 1 ? {"data-tutorial": "fin-list-row1"} :
                                   !isCotisation && nonCotiCount === 2 ? {"data-tutorial": "fin-list-row2"} :
                                   idx === 0 ? {"data-tutorial": "fin-list-row1"} :
                                   idx === 1 ? {"data-tutorial": "fin-list-row2"} : {}
                  return (
                  <div
                    key={t.id}
                    {...tutoAttr}
                    className={`flex items-center justify-between p-4 md:p-5 rounded-2xl border group transition-all ${
                      isCotisation
                        ? 'bg-[#f0f7f9] border-[#1a5f7a]/10'
                        : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCotisation
                          ? 'bg-[#1a5f7a]/10 text-[#1a5f7a]'
                          : t.type === 'entree'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-500'
                      }`}>
                        {CATEGORY_ICONS[t.category] || (
                          t.type === 'entree' ? <TrendingUp size={14} /> : <TrendingDown size={14} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm text-slate-800 truncate">{t.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCotisation
                              ? 'bg-[#1a5f7a]/10 text-[#1a5f7a]'
                              : t.type === 'entree'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-rose-100 text-rose-500'
                          }`}>
                            {t.category}
                          </span>
                          <span className="text-[9px] text-slate-300 font-bold">
                            {fmtDate(t.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className={`font-black text-base tabular-nums ${
                        isCotisation ? 'text-[#1a5f7a]' : t.type === 'entree' ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        {t.type === 'entree' ? '+' : '−'}{fmt(t.amount)}
                      </span>
                      {!isCotisation && (
                        <>
                          <button
                            data-tutorial="fin-action-edit"
                            onClick={() => openEdit(t)}
                            className={`p-2 bg-[#f0f7f9] text-[#1a5f7a] rounded-xl transition-all hover:bg-[#dceef4] active:scale-95 ${showTuto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            data-tutorial="fin-action-delete"
                            onClick={() => setDeleteConfirm(t)}
                            className={`p-2 bg-rose-50 text-rose-400 rounded-xl transition-all hover:bg-rose-100 active:scale-95 ${showTuto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  )
                })})()}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── MODALE AJOUT OPÉRATION ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div data-tutorial="fin-modal" className="relative bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">

            <button
              onClick={closeModal}
              className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">
              {editingId ? 'Modifier l\'opération' : 'Nouvelle opération'}
            </h3>

            {/* Type entrée / sortie */}
            <div data-tutorial="fin-form-type" className="flex gap-3 mb-6">
              <button
                onClick={() => handleTypeChange('entree')}
                className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${
                  form.type === 'entree'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <TrendingUp size={16} /> Entrée
              </button>
              <button
                onClick={() => handleTypeChange('sortie')}
                className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${
                  form.type === 'sortie'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/20'
                    : 'bg-rose-50 text-rose-500'
                }`}
              >
                <TrendingDown size={16} /> Sortie
              </button>
            </div>

            <div data-tutorial="fin-form-fields" className="space-y-4">

              {/* Catégorie */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Catégorie
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 focus:outline-none focus:border-[#1a5f7a]/40 focus:ring-2 focus:ring-[#1a5f7a]/10"
                >
                  {(form.type === 'entree' ? ENTREE_CATEGORIES : SORTIE_CATEGORIES).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Libellé */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Libellé
                </label>
                <input
                  type="text"
                  placeholder="Ex : Achat Catan, Subvention mairie…"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-[#1a5f7a]/40 focus:ring-2 focus:ring-[#1a5f7a]/10"
                />
              </div>

              {/* Montant + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Montant (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-[#1a5f7a]/40 focus:ring-2 focus:ring-[#1a5f7a]/10 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 focus:outline-none focus:border-[#1a5f7a]/40 focus:ring-2 focus:ring-[#1a5f7a]/10"
                  />
                </div>
              </div>

              {/* Erreur */}
              {formError && (
                <div className="flex items-center gap-2 p-4 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs border border-rose-100">
                  <AlertTriangle size={16} className="shrink-0" /> {formError}
                </div>
              )}

              {/* Bouton */}
              <button
                data-tutorial="fin-form-submit"
                onClick={handleSubmit}
                disabled={saving}
                className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                  form.type === 'entree'
                    ? 'bg-emerald-600 text-white shadow-emerald-900/20 hover:bg-emerald-700'
                    : 'bg-rose-500 text-white shadow-rose-900/20 hover:bg-rose-600'
                } disabled:opacity-60`}
              >
                {saving
                  ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
                  : editingId
                    ? <><Edit2 size={16} /> Mettre à jour</>
                    : <><Plus size={16} /> Enregistrer</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={finSteps}
        open={showTuto}
        onClose={() => { setShowTuto(false); setShowModal(false) }}
      />

      {/* ── MODALE SUPPRESSION ───────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-8 border-rose-500 animate-in slide-in-from-bottom-4">
            <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Supprimer ?</h3>
            <p className="text-xs text-slate-500 mb-2 italic">"{deleteConfirm.label}"</p>
            <p className="text-lg font-black text-slate-700 mb-8 tabular-nums">
              {deleteConfirm.type === 'entree' ? '+' : '−'}{fmt(deleteConfirm.amount)}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Confirmer la suppression
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}