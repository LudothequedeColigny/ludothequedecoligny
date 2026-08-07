import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { useToast } from '../../components/ToastContext'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import IconButton from '../../components/admin/IconButton'
import ConfirmModal from '../../components/admin/ConfirmModal'
import FormModal, { FieldLabel, FIELD } from '../../components/admin/FormModal'
import { DataCard } from '../../components/admin/DataCard'
import { BTN_TEAL } from '../../components/admin/buttons'
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
    <div className="min-h-screen bg-[#fdfaf6] p-5 font-body text-[#0f172a] md:p-11">
      <div className="mx-auto max-w-[1080px]">

      <div data-tutorial="fin-header">
        <AdminPageHeader icon="04.svg" title="Suivi" accent="Financier" eyebrow="Trésorerie">
          <button data-tutorial="fin-add-btn" onClick={() => openCreate()} className={`${BTN_TEAL} w-full md:w-auto`}>
            <Plus size={16} /> Nouvelle opération
          </button>
        </AdminPageHeader>
      </div>

      <main className="space-y-5">

        {/* ── SOLDE PRINCIPAL ──────────────────────────────────────────── */}
        <div
          data-tutorial="fin-solde"
          className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[34px] border-2 border-[#0f172a] p-7 text-white shadow-[8px_8px_0_#0f172a] md:rounded-[44px] md:p-12"
          style={{ background: solde >= 0 ? '#10b981' : '#f43f5e' }}
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative">
            <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/65">
              Solde disponible
            </p>
            <p className="font-display text-[40px] font-extrabold leading-[0.95] tracking-[-0.055em] tabular-nums md:text-[60px]">
              {fmt(solde)}
            </p>
          </div>
          <div className="relative flex flex-col items-center gap-2.5">
            <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[26px] border-2 border-white/40 bg-white/20">
              {solde >= 0 ? <TrendingUp size={42} strokeWidth={2.5} /> : <TrendingDown size={42} strokeWidth={2.5} />}
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/70">
              {solde >= 0 ? 'Bilan positif' : 'Déficit'}
            </span>
          </div>
        </div>

        {/* ── COMPTEURS ────────────────────────────────────────────────── */}
        <div data-tutorial="fin-compteurs" className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: 'Cotisations encaissées', value: fmt(cotisationsTotal), color: '#0f172a', shadow: '#1a5f7a', tint: '#f0f7f9', icon: <Euro size={15} />, iconColor: '#1a5f7a', hint: 'Historique réel · toutes années' },
            { label: 'Autres entrées', value: fmt(totalEntrees - cotisationsTotal), color: '#10b981', shadow: '#10b981', tint: '#ecfdf5', icon: <TrendingUp size={15} />, iconColor: '#10b981', hint: 'Subventions, dons, trésorerie…' },
            { label: 'Total des sorties', value: fmt(totalSorties), color: '#f43f5e', shadow: '#f43f5e', tint: '#fff1f2', icon: <TrendingDown size={15} />, iconColor: '#f43f5e', hint: 'Achats, matériel, frais…' },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-[34px] border-2 border-[#0f172a] bg-white p-6 md:p-7"
              style={{ boxShadow: `5px 5px 0 ${card.shadow}` }}
            >
              <div className="mb-3.5 flex items-start justify-between gap-3">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{card.label}</span>
                <span
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[12px] border-2 border-[#0f172a]"
                  style={{ background: card.tint, color: card.iconColor }}
                >
                  {card.icon}
                </span>
              </div>
              <p className="font-display text-[32px] font-extrabold leading-none tracking-[-0.05em] tabular-nums md:text-[36px]" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-300">{card.hint}</p>
            </div>
          ))}
        </div>

        {/* ── HISTORIQUE ───────────────────────────────────────────────── */}
        <DataCard>
          <div data-tutorial="fin-tabs" className="flex flex-wrap gap-2 border-b-2 border-[#0f172a] bg-[#fdfaf6] px-6 py-5">
            {(['tout', 'entrees', 'sorties'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-[14px] border-2 px-5 py-3 text-[9px] font-extrabold uppercase tracking-[0.16em] transition-colors ${
                  activeTab === tab
                    ? 'border-[#0f172a] bg-[#1a5f7a] text-white'
                    : 'border-transparent text-slate-400 hover:bg-white'
                }`}
              >
                {tab === 'tout' ? 'Tout' : tab === 'entrees' ? 'Entrées' : 'Sorties'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 p-6">
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-[24px] border-2 border-slate-100 bg-slate-50" />
            ))}

            {!loading && filteredTransactions.length === 0 && (
              <div className="py-16 text-center text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-300">
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
              const accent = isCotisation ? '#1a5f7a' : t.type === 'entree' ? '#10b981' : '#f43f5e'
              const tint   = isCotisation ? '#f0f7f9' : t.type === 'entree' ? '#ecfdf5' : '#fff1f2'
              return (
                <div
                  key={t.id}
                  {...tutoAttr}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border-2 p-4 md:p-5"
                  style={{ background: isCotisation ? '#f0f7f9' : '#fdfaf6', borderColor: isCotisation ? '#bae6fd' : '#e2e8f0' }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a]"
                      style={{ background: tint, color: accent }}
                    >
                      {CATEGORY_ICONS[t.category] || (t.type === 'entree' ? <TrendingUp size={15} /> : <TrendingDown size={15} />)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-extrabold text-slate-800">{t.label}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                        <span
                          className="rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em]"
                          style={{ background: tint, color: accent }}
                        >
                          {t.category}
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-400">{fmtDate(t.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-display text-[18px] font-extrabold tracking-[-0.03em] tabular-nums" style={{ color: accent }}>
                      {t.type === 'entree' ? '+' : '−'}{fmt(t.amount)}
                    </span>
                    {!isCotisation && (
                      <span className="flex gap-2">
                        <IconButton data-tutorial="fin-action-edit" title="Modifier" className="h-[38px] w-[38px] bg-[#f0f7f9]" onClick={() => openEdit(t)}>
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton data-tutorial="fin-action-delete" tone="danger" title="Supprimer" className="h-[38px] w-[38px]" onClick={() => setDeleteConfirm(t)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </span>
                    )}
                  </div>
                </div>
              )
            })})()}
          </div>
        </DataCard>
      </main>
      </div>


      {/* ── MODALE AJOUT OPÉRATION ────────────────────────────────────────────── */}
      <FormModal
        open={showModal}
        onClose={closeModal}
        title={editingId ? "Modifier l'" : 'Nouvelle '}
        titleAccent="opération"
        subtitle={form.type === 'entree' ? 'Une entrée dans la trésorerie' : 'Une sortie de la trésorerie'}
        accent={form.type === 'entree' ? '#10b981' : '#f43f5e'}
        maxWidth={560}
        footer={
          <button
            data-tutorial="fin-form-submit"
            onClick={handleSubmit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] disabled:pointer-events-none disabled:opacity-50"
            style={{ background: form.type === 'entree' ? '#10b981' : '#f43f5e' }}
          >
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
              : editingId
                ? <><Edit2 size={16} /> Mettre à jour</>
                : <><Plus size={16} /> Enregistrer</>}
          </button>
        }
      >
        <div data-tutorial="fin-modal">
          {/* Type entrée / sortie */}
          <div data-tutorial="fin-form-type" className="mb-5 flex gap-3">
            <button
              onClick={() => handleTypeChange('entree')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[16px] border-2 border-[#0f172a] py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors ${
                form.type === 'entree' ? 'bg-[#10b981] text-white' : 'bg-[#ecfdf5] text-[#047857]'
              }`}
            >
              <TrendingUp size={16} /> Entrée
            </button>
            <button
              onClick={() => handleTypeChange('sortie')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[16px] border-2 border-[#0f172a] py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors ${
                form.type === 'sortie' ? 'bg-[#f43f5e] text-white' : 'bg-[#fff1f2] text-[#be123c]'
              }`}
            >
              <TrendingDown size={16} /> Sortie
            </button>
          </div>

          <div data-tutorial="fin-form-fields">
            <FieldLabel>Catégorie</FieldLabel>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className={`${FIELD} mb-4`}
            >
              {(form.type === 'entree' ? ENTREE_CATEGORIES : SORTIE_CATEGORIES).map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <FieldLabel>Libellé</FieldLabel>
            <input
              type="text"
              placeholder="Ex : Achat Catan, Subvention mairie…"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className={`${FIELD} mb-4`}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Montant (€)</FieldLabel>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={`${FIELD} tabular-nums`}
                />
              </div>
              <div>
                <FieldLabel>Date</FieldLabel>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className={FIELD}
                />
              </div>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-[18px] border-2 border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-600">
                <AlertTriangle size={16} className="shrink-0" /> {formError}
              </div>
            )}
          </div>
        </div>
      </FormModal>


      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={finSteps}
        open={showTuto}
        onClose={() => { setShowTuto(false); setShowModal(false) }}
      />

      {/* ── MODALE SUPPRESSION ───────────────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDelete(deleteConfirm)}
        title="Supprimer ?"
        message={deleteConfirm ? `« ${deleteConfirm.label} » sera définitivement retiré du suivi financier.` : ''}
        confirmLabel="Oui, supprimer"
        cancelLabel="Conserver"
        tone="danger"
        icon={<Trash2 size={26} />}
      >
        {deleteConfirm && (
          <p className="mb-6 font-display text-[26px] font-extrabold tracking-[-0.04em] tabular-nums" style={{ color: deleteConfirm.type === 'entree' ? '#10b981' : '#f43f5e' }}>
            {deleteConfirm.type === 'entree' ? '+' : '−'}{fmt(deleteConfirm.amount)}
          </p>
        )}
      </ConfirmModal>
    </div>
  )
}