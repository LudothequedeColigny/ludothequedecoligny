import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { 
  Calendar, MapPin, Plus, Trash2, Clock, ImageIcon, 
  Upload, X, Loader2, Type, AlignLeft, Edit2, Mail, Send 
} from 'lucide-react'

export default function Evenements() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, title: '' })
  const [mailModal, setMailModal] = useState({ show: false, event: null })

  const initialEventState = {
    title: '',
    date: '', 
    end_time: '', // Maintenant sauvegardé en base
    location: '',
    description: '',
    image_url: ''
  }

  const [newEvent, setNewEvent] = useState(initialEventState)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
    if (error) console.error("Erreur de chargement:", error)
    setEvents(data || [])
    setLoading(false)
  }

  const startEdit = (event) => {
    setNewEvent({
        ...event,
        date: event.date ? event.date.slice(0, 16) : '', 
        end_time: event.end_time || '' // On récupère l'heure de fin existante
    })
    setEditingId(event.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setNewEvent(initialEventState)
    setEditingId(null)
    setShowForm(false)
  }

  async function handleFileUpload(event) {
    try {
      setUploading(true)
      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('event-images').getPublicUrl(fileName)
      setNewEvent({ ...newEvent, image_url: data.publicUrl })
    } catch (error) {
      alert("Erreur upload")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    // CORRECTION : On ajoute end_time dans l'objet envoyé à Supabase
    const eventToSave = {
      title: newEvent.title,
      date: newEvent.date,
      end_time: newEvent.end_time, // Ligne ajoutée pour la sauvegarde
      location: newEvent.location,
      description: newEvent.description,
      image_url: newEvent.image_url
    }

    let savedEvent = null;
    let error = null;

    if (editingId) {
      const { data, error: err } = await supabase.from('events').update(eventToSave).eq('id', editingId).select()
      savedEvent = data ? data[0] : null
      error = err
    } else {
      const { data, error: err } = await supabase.from('events').insert([eventToSave]).select()
      savedEvent = data ? data[0] : null
      error = err
    }
    
    if (error) {
        alert("Erreur d'enregistrement : " + error.message)
    } else {
        // Pour le mail, on utilise l'événement sauvegardé qui contient maintenant l'heure de fin
        if (!editingId && savedEvent) setMailModal({ show: true, event: savedEvent })
        cancelEdit()
        fetchEvents()
    }
  }

  const handleSendMail = () => {
    const { event } = mailModal
    const collectivites = ["mairie@domsure.fr", "mairie@beaupont.fr", "mairie.verjon@wanadoo.fr", "contact@mairie-beny.fr", "accueil@saintamour39.fr", "mairie@lestroischateaux.fr", "mairie.valdepy@orange.fr", "villemotier@wanadoo.fr", "mairie.valsuran@valsuran.fr", "mairie@andelot-morval.fr", "mairie.veria@wanadoo.fr", "mairie.broissia@orange.fr", "mairie.balanod@aricia.fr", "mairie.montagnalereconduit@wanadoo.fr", "mairiejoudes@wanadoo.fr", "mairie.condal@wanadoo.fr", "mairie@cormoz.fr", "mairie@foissiat.com", "mairie@saintetiennedubois.fr", "genemapi@hotmail.fr", "mairie-salavre@orange.fr"]

    const start = new Date(event.date);
    const dateFormatee = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const heureDebut = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // Utilisation de l'heure de fin sauvegardée
    const plageHoraire = event.end_time ? `de ${heureDebut} à ${event.end_time.replace(':', 'h')}` : `à partir de ${heureDebut}`;

    const subject = encodeURIComponent(`Communication Événement - Association PACTES - ${event.title}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nL'association PACTES à Coligny souhaiterait communiquer sur un événement organisé qui va avoir lieu à la date suivante :\n\n` +
      `Le ${dateFormatee} - ${event.title} à ${event.location}. ${plageHoraire}. ${event.description || ""}\n\n` +
      `Pouvez-vous les intégrer dans vos communications afin de faire connaître l'existence de cet évènement à vos concitoyens ?\n\n` +
      `Vous en souhaitant bonne réception.\n\nBonne journée.\n\nVictor Guyon\n06 71 41 56 96`
    );

    window.open(`https://outlook.live.com/mail/0/deeplink/compose?bcc=${collectivites.join(',')}&subject=${subject}&body=${body}`, '_blank');
    setMailModal({ show: false, event: null });
  }

  const confirmDelete = async () => {
    await supabase.from('events').delete().eq('id', deleteModal.id)
    setDeleteModal({ show: false, id: null, title: '' })
    fetchEvents()
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-black uppercase text-xs tracking-widest">Chargement...</div>

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 flex items-center gap-4">
          <div className="p-3 bg-[#1a5f7a] rounded-[1.2rem] shadow-lg text-white"><Calendar size={28} /></div>
          <span>Gestion des <span className="text-[#1a5f7a]">Événements</span></span>
        </h1>
        <button onClick={editingId ? cancelEdit : () => setShowForm(!showForm)} className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl ${showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white'}`}>
          {showForm ? "Fermer" : "Nouvel Événement"}
        </button>
      </div>

      <main className="max-w-7xl mx-auto">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-50 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2"><Type size={16} /> Détails</h3>
                <input required placeholder="Titre" className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 italic">Date & Début</label>
                    <input type="datetime-local" required className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-sm" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 italic">Heure de fin (Optionnel)</label>
                    <input type="time" className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-sm" value={newEvent.end_time} onChange={e => setNewEvent({...newEvent, end_time: e.target.value})} />
                  </div>
                </div>

                <input required placeholder="Lieu" className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-sm" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Affiche</label>
                  <input placeholder="Lien URL de l'image..." className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-[10px] outline-none" value={newEvent.image_url} onChange={e => setNewEvent({...newEvent, image_url: e.target.value})} />
                  <div className="border-4 border-dashed border-slate-50 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50/50">
                    {newEvent.image_url && <img src={newEvent.image_url} className="h-32 object-contain mb-4" alt="Aperçu" />}
                    <label className="cursor-pointer bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase text-[#1a5f7a]">
                      {uploading ? "Chargement..." : "Uploader un fichier"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-6 flex flex-col">
                <h3 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2"><AlignLeft size={16} /> Description</h3>
                <textarea placeholder="Détails..." className="w-full p-6 rounded-[2rem] bg-slate-50 font-medium text-sm outline-none flex-1 min-h-[200px]" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                <button type="submit" disabled={uploading} className="w-full py-6 mt-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl bg-[#1a5f7a] text-white">
                  Enregistrer l'événement
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map(event => (
            <div key={event.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="h-48 bg-slate-50 relative flex items-center justify-center p-4">
                {event.image_url ? <img src={event.image_url} className="max-w-full max-h-full object-contain" alt="" /> : <ImageIcon size={48} className="text-slate-200" />}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <button onClick={() => startEdit(event)} className="p-2.5 bg-white text-slate-400 rounded-xl shadow-lg hover:bg-[#1a5f7a] hover:text-white"><Edit2 size={16} /></button>
                  <button onClick={() => setDeleteModal({show: true, id: event.id, title: event.title})} className="p-2.5 bg-white text-slate-400 rounded-xl shadow-lg hover:bg-rose-500 hover:text-white"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-lg font-black text-slate-900 uppercase mb-4">{event.title}</h3>
                <div className="space-y-2 mb-4 font-black uppercase text-[9px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-[#1a5f7a]" /> 
                    {new Date(event.date).toLocaleString('fr-FR', {day:'numeric', month:'short'})}
                    {" | "}
                    {/* Affichage de la plage horaire sous la carte de gestion aussi pour vérification */}
                    {new Date(event.date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})} 
                    {event.end_time && ` — ${event.end_time.replace(':', 'h')}`}
                  </div>
                  <div className="flex items-center gap-3"><MapPin size={14} className="text-[#e38154]" /> {event.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      
      {/* ... (Reste du code des modales inchangé) */}
      {mailModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1a5f7a]/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center">
             <Send className="mx-auto text-[#e38154] mb-6" size={40} />
             <h3 className="text-2xl font-black uppercase mb-2">Événement enregistré !</h3>
             <p className="text-xs text-slate-500 mb-8">Ouvrir Outlook pour informer les mairies ?</p>
             <button onClick={handleSendMail} className="w-full py-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest mb-3">Ouvrir Outlook Web</button>
             <button onClick={() => setMailModal({show: false})} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Plus tard</button>
          </div>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center">
             <h3 className="text-xl font-black uppercase mb-8">Supprimer l'événement ?</h3>
             <button onClick={confirmDelete} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black mb-3 uppercase text-[10px]">Confirmer</button>
             <button onClick={() => setDeleteModal({show: false})} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}