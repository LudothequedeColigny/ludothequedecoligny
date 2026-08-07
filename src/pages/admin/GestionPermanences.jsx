import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { 
  Calendar, Clock, Plus, Trash2, Users, Link as LinkIcon, 
  CheckCircle, CalendarDays, UserCheck, Loader2, AlertTriangle,
  Search, X, Edit2, Info, Share2, Send, ExternalLink, WifiOff
} from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminBanner from '../../components/admin/AdminBanner'
import SearchField from '../../components/admin/SearchField'
import IconButton from '../../components/admin/IconButton'
import ConfirmModal from '../../components/admin/ConfirmModal'
import FormModal, { FieldLabel, FIELD } from '../../components/admin/FormModal'
import { DataCard, DataHeader, DataRow, DataEmpty } from '../../components/admin/DataCard'
import { BTN_ORANGE, BTN_OUTLINE, BTN_TEAL } from '../../components/admin/buttons'

// Colonnes du planning : date, créneau, bénévoles, actions
const PERM_COLS = 'minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.6fr) 104px'

export default function GestionPermanences() {
  // --- ÉTATS ---
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [issubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteVolunteer, setConfirmDeleteVolunteer] = useState(null) // { shiftId, volunteerIndex, volunteerName }
  const [editingShift, setEditingShift] = useState(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [showTuto, setShowTuto] = useState(false)

  // --- ÉTAT FORMULAIRE ---
  const [formData, setFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    start_time: '14:00', 
    end_time: '18:00' 
  })

  useEffect(() => { fetchShifts() }, [])

  async function fetchShifts() {
    setLoading(true)
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .order('date', { ascending: true })
        
        if (error) throw error
        
        const shiftsData = data || []
        setShifts(shiftsData)
        // Mise en cache locale du planning
        localStorage.setItem('cache_shifts_list', JSON.stringify(shiftsData))
      } else {
        // Chargement du cache si réseau absent
        const cachedShifts = JSON.parse(localStorage.getItem('cache_shifts_list') || '[]')
        setShifts(cachedShifts)
      }
    } catch (error) {
      setErrorMsg("Impossible de charger les permanences")
    } finally {
      setLoading(false)
    }
  }

  const openForm = (shift = null) => {
    if (!navigator.onLine) {
      alert("⚠️ La modification du planning nécessite une connexion internet.")
      return
    }
    if (shift) {
      setEditingShift(shift)
      setFormData({ 
        date: shift.date, 
        start_time: shift.start_time, 
        end_time: shift.end_time 
      })
    } else {
      setEditingShift(null)
      setFormData({ 
        date: new Date().toISOString().split('T')[0], 
        start_time: '14:00', 
        end_time: '18:00' 
      })
    }
    setShowFormModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!navigator.onLine) return;
    
    setIsSubmitting(true)

    if (editingShift) {
      const { error } = await supabase
        .from('shifts')
        .update({ 
          date: formData.date, 
          start_time: formData.start_time, 
          end_time: formData.end_time 
        })
        .eq('id', editingShift.id)
      
      if (!error) {
        setShowFormModal(false)
        fetchShifts()
      }
    } else {
      const { error } = await supabase
        .from('shifts')
        .insert([{ ...formData, volunteers: [] }])
      
      if (!error) {
        setShowFormModal(false)
        fetchShifts()
      }
    }
    setIsSubmitting(false)
  }

  const processDelete = async () => {
    if (!navigator.onLine) return;
    await supabase.from('shifts').delete().eq('id', confirmDelete)
    setConfirmDelete(null)
    fetchShifts()
  }

  const copyPublicLink = () => {
    const url = `${window.location.origin}/inscription-permanence`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => {
        setCopied(false)
        setShowLinkModal(false)
    }, 2000)
  }

  // Formate "HH:MM:SS" ou "HH:MM" → "HH:MM"
  const fmt = (time) => time ? time.slice(0, 5) : ''

  const removeVolunteer = async () => {
    if (!confirmDeleteVolunteer || !navigator.onLine) return
    const { shiftId, volunteerIndex } = confirmDeleteVolunteer
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift) return
    const updatedVolunteers = shift.volunteers.filter((_, i) => i !== volunteerIndex)
    const { error } = await supabase
      .from('shifts')
      .update({ volunteers: updatedVolunteers })
      .eq('id', shiftId)
    if (!error) {
      setConfirmDeleteVolunteer(null)
      fetchShifts()
    }
  }

  const filteredShifts = shifts.filter(s => 
    new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    .toLowerCase().includes(searchTerm.toLowerCase())
  )


const PERMANENCES_TUTORIAL_STEPS = (openFormFn, closeFormFn, openLinkFn) => [
  {
    id: 'perm-header',
    noSpotlight: true,
    title: `Bienvenue sur la page Permanences`,
    description: `Cette page vous permet de planifier et gérer les créneaux de bénévolat de la ludothèque. Les bénévoles peuvent s'inscrire eux-mêmes via un lien public partageable.`,
    action: () => { closeFormFn(); openLinkFn(false) },
  },
  {
    id: 'perm-link-btn',
    title: `Lien public d'inscription`,
    description: `Ce bouton ouvre la fenêtre de partage du lien public — nous allons l'explorer ensemble à l'étape suivante.`,
    action: () => { closeFormFn(); openLinkFn(false) },
  },
  {
    id: 'perm-link-modal',
    title: `Partager le lien d'inscription`,
    description: `Ce lien permet aux bénévoles de s'inscrire en autonomie sur les créneaux disponibles, sans accès à l'administration. Copiez-le et envoyez-le par WhatsApp, email ou tout autre moyen. Les inscriptions apparaissent automatiquement dans le tableau.`,
    action: () => { closeFormFn(); openLinkFn(true) },
    actionDelay: 400,
  },
  {
    id: 'perm-add-btn',
    title: `Planifier une nouvelle date`,
    description: `Ce bouton ouvre le formulaire de création d'un créneau. Nous allons le parcourir ensemble.`,
    action: () => { closeFormFn(); openLinkFn(false) },
  },
  {
    id: 'perm-form-modal',
    title: `Formulaire de créneau`,
    description: `Renseignez la date de la permanence, l'heure de début et l'heure de fin. Une fois validé, le créneau apparaît dans le tableau et devient accessible via le lien public pour les inscriptions.`,
    action: () => { openFormFn(); openLinkFn(false) },
    actionDelay: 400,
  },
  {
    id: 'perm-search',
    title: `Rechercher une date`,
    description: `Filtrez la liste en tapant une date ou un jour de la semaine. La recherche est instantanée.`,
    action: () => { closeFormFn(); openLinkFn(false) },
  },
  {
    id: 'perm-list-row1',
    id2: 'perm-list-row2',
    title: `Liste des permanences`,
    description: `Chaque ligne affiche la date, le créneau horaire et les bénévoles déjà inscrits. Un badge vert indique chaque bénévole inscrit. La croix à côté d'un nom permet de le désinscrire.`,
    action: () => { closeFormFn(); openLinkFn(false) },
  },
  {
    id: 'perm-action-edit',
    title: `Modifier un créneau`,
    description: `L'icône crayon ouvre le formulaire en mode édition pour modifier la date ou les horaires d'un créneau existant. Les bénévoles déjà inscrits ne sont pas affectés.`,
    action: () => { closeFormFn(); openLinkFn(false) },
  },
  {
    id: 'perm-action-delete',
    title: `Supprimer un créneau`,
    description: `L'icône poubelle supprime définitivement le créneau et tous les bénévoles inscrits après confirmation. Cette action est irréversible.`,
    action: () => { closeFormFn(); openLinkFn(false) },
  },
]

  // ── Steps tutoriel ─────────────────────────────────────────────────────────
  const permSteps = useMemo(() => PERMANENCES_TUTORIAL_STEPS(
    () => openForm(null),
    () => setShowFormModal(false),
    (open) => setShowLinkModal(open)
  ), []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-[#1a5f7a] uppercase text-[10px] tracking-[0.3em]">Synchronisation du planning...</div>

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-5 font-body text-[#0f172a] md:p-11">
      <div className="mx-auto max-w-[1240px]">

      <div data-tutorial="perm-header">
        <AdminPageHeader icon="05.svg" title="Gestion des" accent="permanences">
          <div className="flex w-full flex-wrap gap-2.5 md:w-auto">
            <button data-tutorial="perm-link-btn" onClick={() => setShowLinkModal(true)} className={`${BTN_OUTLINE} flex-1 md:flex-none`}>
              <LinkIcon size={15} /> Lien public
            </button>
            <button
              data-tutorial="perm-add-btn"
              onClick={() => openForm()}
              disabled={!navigator.onLine}
              className={`${BTN_ORANGE} flex-1 md:flex-none`}
            >
              <Plus size={15} strokeWidth={3} /> Planifier une date
            </button>
          </div>
        </AdminPageHeader>
      </div>

      <main>
        {!navigator.onLine && (
          <AdminBanner tone="warn" icon={<WifiOff size={18} />}>
            Planning en mode lecture seule (hors-ligne)
          </AdminBanner>
        )}

        <SearchField
          data-tutorial="perm-search"
          className="mb-6"
          placeholder="Rechercher une date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* --- LISTE VERSION PC --- */}
        <DataCard className="hidden md:block">
          <DataHeader columns={PERM_COLS}>
            <div>Date de permanence</div><div>Créneaux horaires</div><div>Bénévoles inscrits</div>
            <div className="text-right">Gestion</div>
          </DataHeader>

          {filteredShifts.length === 0 ? (
            <DataEmpty icon={<CalendarDays size={36} className="text-slate-200" />}>
              Aucune permanence ne correspond à cette recherche.
            </DataEmpty>
          ) : filteredShifts.map((shift, idx) => (
            <DataRow
              key={shift.id}
              columns={PERM_COLS}
              className="gap-3"
              {...(idx === 0 ? { 'data-tutorial': 'perm-list-row1' } : idx === 1 ? { 'data-tutorial': 'perm-list-row2' } : {})}
            >
              <div className="text-[13px] font-extrabold uppercase tracking-[-0.01em]">
                {new Date(shift.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>

              <div className="inline-flex items-center gap-2 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                <Clock size={14} className="shrink-0 text-[#1a5f7a]" /> {fmt(shift.start_time)} — {fmt(shift.end_time)}
              </div>

              <div className="flex flex-wrap gap-[7px]">
                {shift.volunteers?.length > 0 ? (
                  shift.volunteers.map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-2 rounded-full border-2 border-[#bae6fd] bg-[#f0f7f9] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#1a5f7a]">
                      <UserCheck size={11} /> {v.name}
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteVolunteer({ shiftId: shift.id, volunteerIndex: i, volunteerName: v.name }) }}
                        className="text-[#7dd3fc] transition-colors hover:text-rose-500"
                        title="Retirer ce bénévole"
                      >
                        <X size={11} strokeWidth={3} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] font-extrabold uppercase italic text-slate-300">Libre</span>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <IconButton data-tutorial="perm-action-edit" title="Modifier" onClick={() => openForm(shift)}>
                  <Edit2 size={17} />
                </IconButton>
                <IconButton
                  data-tutorial="perm-action-delete" tone="danger" title="Supprimer"
                  onClick={() => navigator.onLine ? setConfirmDelete(shift.id) : alert('Action impossible hors-ligne')}
                >
                  <Trash2 size={17} />
                </IconButton>
              </div>
            </DataRow>
          ))}
        </DataCard>

        {/* --- LISTE VERSION MOBILE --- */}
        <div className="space-y-4 md:hidden">
          {filteredShifts.length === 0 && (
            <DataCard>
              <DataEmpty icon={<CalendarDays size={36} className="text-slate-200" />}>
                Aucune permanence ne correspond à cette recherche.
              </DataEmpty>
            </DataCard>
          )}
          {filteredShifts.map((shift) => (
            <div key={shift.id} className="rounded-[26px] border-2 border-[#0f172a] bg-white p-4 shadow-[4px_4px_0_#1a5f7a]">
              <div className="mb-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-[16px] font-extrabold uppercase leading-tight tracking-[-0.02em]">
                    {new Date(shift.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                    <Clock size={13} className="text-[#1a5f7a]" /> {fmt(shift.start_time)} — {fmt(shift.end_time)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <IconButton title="Modifier" onClick={() => openForm(shift)}><Edit2 size={17} /></IconButton>
                  <IconButton
                    tone="danger" title="Supprimer"
                    onClick={() => navigator.onLine ? setConfirmDelete(shift.id) : alert('Action impossible hors-ligne')}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t-2 border-slate-100 pt-3.5">
                {shift.volunteers?.length > 0 ? (
                  shift.volunteers.map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-2 rounded-full border-2 border-[#bae6fd] bg-[#f0f7f9] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#1a5f7a]">
                      <UserCheck size={11} /> {v.name}
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteVolunteer({ shiftId: shift.id, volunteerIndex: i, volunteerName: v.name }) }}
                        className="text-[#7dd3fc] transition-colors hover:text-rose-500"
                        title="Retirer ce bénévole"
                      >
                        <X size={11} strokeWidth={3} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] font-extrabold uppercase italic text-slate-300">Aucun inscrit</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      </div>


      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={permSteps}
        open={showTuto}
        onClose={() => { setShowTuto(false); setShowFormModal(false); setShowLinkModal(false) }}
      />

      {/* --- MODALE FORMULAIRE --- */}
      <FormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingShift ? 'Modifier une' : 'Ajouter une'}
        titleAccent="date"
        subtitle="Remplissez les horaires de permanence"
        maxWidth={520}
        footer={
          <button
            type="submit" form="perm-form" disabled={issubmitting}
            className={`${BTN_TEAL} w-full`}
          >
            {issubmitting ? <Loader2 className="animate-spin" size={18} /> : editingShift ? "Mettre à jour" : "Valider la date"}
          </button>
        }
      >
        <form id="perm-form" data-tutorial="perm-form-modal" onSubmit={handleSave}>
          <FieldLabel>1. Date de la permanence</FieldLabel>
          <input
            type="date" required className={`${FIELD} mb-5`}
            value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>2. Heure de début</FieldLabel>
              <input type="time" className={FIELD} value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
            </div>
            <div>
              <FieldLabel>3. Heure de fin</FieldLabel>
              <input type="time" className={FIELD} value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
            </div>
          </div>
        </form>
      </FormModal>

      {/* --- MODALE LIEN PUBLIC --- */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={() => setShowLinkModal(false)} />
          <div data-tutorial="perm-link-modal" className="anim-modal-in relative w-full max-w-[440px] rounded-[34px] border-2 border-[#0f172a] bg-white p-8 text-center shadow-[12px_12px_0_#1a5f7a] md:p-9">
            <div className="mx-auto mb-5 flex h-[70px] w-[70px] -rotate-3 items-center justify-center rounded-[24px] border-2 border-[#0f172a] bg-[#f0f7f9] text-[#1a5f7a] shadow-[4px_4px_0_#1a5f7a]">
              <Share2 size={30} />
            </div>
            <h3 className="mb-2.5 font-display text-[26px] font-extrabold uppercase tracking-[-0.04em]">
              Partager le <span className="text-[#1a5f7a]">lien</span>
            </h3>
            <p className="mb-6 text-sm font-medium leading-[1.6] text-slate-500">
              Ce lien permet aux bénévoles de s'inscrire en autonomie. Envoyez-le par message ou par mail.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={copyPublicLink}
                className={`flex items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] px-4 py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] ${copied ? 'bg-[#10b981]' : 'bg-[#1a5f7a]'}`}
              >
                {copied ? <CheckCircle size={17} /> : <LinkIcon size={17} />}
                {copied ? "Lien copié !" : "Copier maintenant"}
              </button>
              <button
                onClick={() => setShowLinkModal(false)}
                className="rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-4 py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE SUPPRESSION BÉNÉVOLE --- */}
      <ConfirmModal
        open={!!confirmDeleteVolunteer}
        onClose={() => setConfirmDeleteVolunteer(null)}
        onConfirm={removeVolunteer}
        title="Retirer ce bénévole ?"
        message={confirmDeleteVolunteer ? `${confirmDeleteVolunteer.volunteerName} sera retiré de cette permanence. Cette action est irréversible.` : ''}
        confirmLabel="Confirmer le retrait"
        cancelLabel="Annuler"
        tone="danger"
        icon={<AlertTriangle size={26} />}
      />

      {/* --- MODALE SUPPRESSION --- */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={processDelete}
        title="Supprimer ?"
        message="Cette action supprimera la date de permanence et tous les bénévoles inscrits."
        confirmLabel="Oui, supprimer"
        cancelLabel="Conserver"
        tone="danger"
        icon={<Trash2 size={26} />}
      />
    </div>
  )
}