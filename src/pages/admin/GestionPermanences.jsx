import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { 
  Calendar, Clock, Plus, Trash2, Users, Link as LinkIcon, 
  CheckCircle, CalendarDays, UserCheck, Loader2, AlertTriangle,
  Search, X, Edit2, Info, Share2, Send, ExternalLink, WifiOff
} from 'lucide-react'

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
    <div className="min-h-screen bg-[#fdfaf6] p-4 md:p-10 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 data-tutorial="perm-header" className="text-xl md:text-4xl font-black flex items-center gap-3">
          <div className="bg-[#1a5f7a] p-2.5 rounded-xl shadow-lg text-white">
            <CalendarDays size={24} />
          </div>
          <span className="tracking-tight">
            Gestion des <span className="text-[#1a5f7a]">Permanences</span>
          </span>
        </h1>
        <div className="flex gap-2 w-full md:w-auto">
          <button data-tutorial="perm-link-btn" onClick={() => setShowLinkModal(true)} className="flex-1 md:flex-none px-6 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:border-[#1a5f7a] transition-all">
             <LinkIcon size={16} className="inline mr-2"/> Lien Public
          </button>
          <button data-tutorial="perm-add-btn" onClick={() => openForm()} className={`flex-1 md:flex-none px-6 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${!navigator.onLine ? 'bg-slate-300' : 'bg-[#e38154]'}`}>
            <Plus size={16} className="mr-2 inline" /> Planifier une date
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* BANNIÈRE HORS-LIGNE */}
        {!navigator.onLine && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-800 animate-in fade-in duration-500">
            <WifiOff className="text-amber-500 shrink-0" size={20} />
            <p className="text-[10px] font-black uppercase">Planning en mode lecture seule (Hors-ligne)</p>
          </div>
        )}

        {/* RECHERCHE */}
        <div data-tutorial="perm-search" className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input type="text" placeholder="Rechercher une date..." className="w-full bg-white border border-slate-100 p-4 pl-14 rounded-2xl font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#1a5f7a]/10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* --- LISTE VERSION PC --- */}
        <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="p-8">Date de permanence</th>
                <th className="p-8">Créneaux horaires</th>
                <th className="p-8">Bénévoles inscrits</th>
                <th className="p-8 text-right pr-12">Gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredShifts.map((shift, idx) => (
                <tr key={shift.id} {...(idx === 0 ? {"data-tutorial": "perm-list-row1"} : idx === 1 ? {"data-tutorial": "perm-list-row2"} : {})} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-8 text-sm font-black uppercase tracking-tight">
                    {new Date(shift.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </td>
                  <td className="p-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-2"><Clock size={14} className="text-[#1a5f7a]"/> {fmt(shift.start_time)} - {fmt(shift.end_time)}</span>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-wrap gap-2">
                      {shift.volunteers?.length > 0 ? (
                        shift.volunteers.map((v, i) => (
                          <span key={i} className="px-3 py-1 bg-cyan-50 border border-cyan-100 rounded-full text-[9px] font-black uppercase text-[#1a5f7a] flex items-center gap-1.5">
                            <UserCheck size={10} /> {v.name}
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDeleteVolunteer({ shiftId: shift.id, volunteerIndex: i, volunteerName: v.name }) }}
                              className="ml-0.5 text-[#1a5f7a]/40 hover:text-rose-500 transition-colors"
                              title="Retirer ce bénévole"
                            >
                              <X size={11} strokeWidth={3} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 italic uppercase">Libre</span>
                      )}
                    </div>
                  </td>
                  <td className="p-8 text-right pr-12 space-x-2">
                    <button data-tutorial="perm-action-edit" onClick={() => openForm(shift)} className="p-3 text-slate-300 hover:text-[#1a5f7a] hover:bg-cyan-50 rounded-xl transition-all shadow-sm">
                      <Edit2 size={18} />
                    </button>
                    <button data-tutorial="perm-action-delete" onClick={() => navigator.onLine ? setConfirmDelete(shift.id) : alert('Action impossible hors-ligne')} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- LISTE VERSION MOBILE --- */}
        <div className="md:hidden space-y-4">
          {filteredShifts.map((shift) => (
            <div key={shift.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50">
              <div className="flex justify-between items-start mb-4">
                <div className="text-[10px] font-black text-[#1a5f7a] bg-[#1a5f7a]/10 px-3 py-1 rounded-full uppercase tracking-widest">
                  {new Date(shift.date).toLocaleDateString('fr-FR', { month: 'short' })}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openForm(shift)} className="p-2 text-slate-300"><Edit2 size={18}/></button>
                  <button onClick={() => navigator.onLine ? setConfirmDelete(shift.id) : alert('Action impossible hors-ligne')} className="p-2 text-slate-300"><Trash2 size={18}/></button>
                </div>
              </div>
              <div className="font-black text-slate-900 uppercase text-sm mb-1">
                {new Date(shift.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                 <Clock size={14}/> {fmt(shift.start_time)} — {fmt(shift.end_time)}
              </div>
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  {shift.volunteers?.length > 0 ? 
                    shift.volunteers.map((v, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black uppercase text-[#1a5f7a] flex items-center gap-1.5">
                        {v.name}
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteVolunteer({ shiftId: shift.id, volunteerIndex: i, volunteerName: v.name }) }}
                          className="text-[#1a5f7a]/40 hover:text-rose-500 transition-colors"
                        >
                          <X size={11} strokeWidth={3} />
                        </button>
                      </span>
                    ))
                    : <span className="text-[9px] font-black text-slate-200 uppercase italic">Aucun inscrit</span>
                  }
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={permSteps}
        open={showTuto}
        onClose={() => { setShowTuto(false); setShowFormModal(false); setShowLinkModal(false) }}
      />

      {/* --- MODALE FORMULAIRE --- */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0">
          <div data-tutorial="perm-form-modal" className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
              <div className="flex flex-col">
                <h2 className="text-xl font-black tracking-tight">
                    {editingShift ? 'Modifier' : 'Ajouter'} une <span className="text-[#1a5f7a]">Date</span>
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Remplissez les horaires de permanence</p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">1. Date de la permanence</label>
                <input type="date" required className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a] transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">2. Heure de début</label>
                  <input type="time" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-tighter text-[#1a5f7a]">3. Heure de fin</label>
                  <input type="time" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-50">
                <button type="submit" disabled={issubmitting} className="w-full py-6 bg-[#1a5f7a] text-white rounded-[1.8rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                  {issubmitting ? <Loader2 className="animate-spin" size={18}/> : editingShift ? "Mettre à jour" : "Valider la date"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODALE LIEN PUBLIC --- */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div data-tutorial="perm-link-modal" className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in slide-in-from-bottom">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-cyan-50 text-[#1a5f7a] shadow-inner">
              <Share2 size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-900">
                Partager le <span className="text-[#1a5f7a]">Lien</span>
            </h3>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-8 leading-relaxed">
                Ce lien permet aux bénévoles de s'inscrire en autonomie. Envoyez-le via WhatsApp ou par mail.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={copyPublicLink} className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${copied ? 'bg-emerald-500' : 'bg-[#1a5f7a]'}`}>
                {copied ? <CheckCircle size={18}/> : <LinkIcon size={18}/>}
                {copied ? "Lien copié !" : "Copier maintenant"}
              </button>
              <button onClick={() => setShowLinkModal(false)} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE SUPPRESSION BÉNÉVOLE --- */}
      {confirmDeleteVolunteer && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in slide-in-from-bottom">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-rose-50 text-rose-500">
              <AlertTriangle size={32}/>
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-900">Retirer ce bénévole ?</h3>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1 leading-relaxed">
              <span className="text-[#1a5f7a]">{confirmDeleteVolunteer.volunteerName}</span> sera retiré de cette permanence.
            </p>
            <p className="text-[9px] text-slate-300 font-bold uppercase mb-8">Cette action est irréversible.</p>
            <div className="flex flex-col gap-3">
              <button onClick={removeVolunteer} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Confirmer la suppression</button>
              <button onClick={() => setConfirmDeleteVolunteer(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE SUPPRESSION --- */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in slide-in-from-bottom">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-rose-50 text-rose-600">
              <AlertTriangle size={32}/>
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-900">Supprimer ?</h3>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-8 leading-relaxed">Cette action supprimera la date et tous les inscrits.</p>
            <div className="flex flex-col gap-3">
              <button onClick={processDelete} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Confirmer</button>
              <button onClick={() => setConfirmDelete(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}