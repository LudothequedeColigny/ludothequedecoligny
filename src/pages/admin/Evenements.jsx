import { useState, useEffect } from 'react'
import GenerateurAffiche from './GenerateurAffiche'
import { supabase } from '../../services/supabaseClient'
import { sendEmail } from '../../services/emailService'
import { 
  Calendar, MapPin, Plus, Trash2, Clock, ImageIcon, 
  Upload, X, Loader2, Type, AlignLeft, Edit2, Mail, Send, CheckCircle2, Users, ChevronDown, ChevronUp, PlusCircle, Paperclip, GripVertical, Building2, Trash
} from 'lucide-react'

export default function Evenements() {
  const [events, setEvents] = useState([])
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'affiche'
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, title: '' })
  // Modale de composition email
  const [composeModal, setComposeModal] = useState({ show: false, event: null })
  const [composeData, setComposeData] = useState({ subject: '', bodyCollectivites: '', bodyAdherents: '', recipients: [] })
  const [activeMailTab, setActiveMailTab] = useState('collectivites') // 'collectivites' | 'adherents'
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [sendingMail, setSendingMail] = useState(false)
  const [successModal, setSuccessModal] = useState({ show: false, count: 0 })
  const [showMairies, setShowMairies] = useState(true)
  const [showAdherents, setShowAdherents] = useState(true)
  const [selectedEvents, setSelectedEvents] = useState([])
  const [showEventPicker, setShowEventPicker] = useState(false)
  const [collectivites, setCollectivites] = useState([])
  const [collectivitesModal, setCollectivitesModal] = useState(false)
  const [newCollectivite, setNewCollectivite] = useState({ nom: '', email: '' })
  const [editingCollectivite, setEditingCollectivite] = useState(null)

  const initialEventState = {
    title: '',
    date: '', 
    end_time: '', 
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
        end_time: event.end_time || '' 
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

  // Appelé depuis GenerateurAffiche : bascule vers l'onglet événements
  // avec le formulaire pré-rempli (date, heure, titre, lieu, image_url)
  const handleCreateEventFromAffiche = ({ date, end_time, title, location, image_url }) => {
    setNewEvent({
      ...initialEventState,
      date: date || '',
      end_time: end_time || '',
      title: title || '',
      location: location || '',
      image_url: image_url || '',
    })
    setEditingId(null)
    setShowForm(true)
    setActiveTab('events')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
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
    const eventToSave = {
      title: newEvent.title,
      date: newEvent.date,
      end_time: newEvent.end_time,
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
        if (!editingId && savedEvent) setMailModal({ show: true, event: savedEvent })
        cancelEdit()
        fetchEvents()
    }
  }

  const fetchCollectivites = async () => {
    const { data } = await supabase.from('collectivites').select('*').order('nom')
    if (data) setCollectivites(data.map(c => ({ id: c.id, email: c.email, label: c.nom })))
  }

  useEffect(() => { fetchCollectivites() }, [])

  const saveCollectivite = async () => {
    if (!newCollectivite.nom || !newCollectivite.email) return
    if (editingCollectivite) {
      await supabase.from('collectivites').update({ nom: newCollectivite.nom, email: newCollectivite.email }).eq('id', editingCollectivite)
    } else {
      await supabase.from('collectivites').insert({ nom: newCollectivite.nom, email: newCollectivite.email })
    }
    setNewCollectivite({ nom: '', email: '' })
    setEditingCollectivite(null)
    fetchCollectivites()
  }

  const deleteCollectivite = async (id) => {
    await supabase.from('collectivites').delete().eq('id', id)
    fetchCollectivites()
  }

  const buildBodies = (eventsBlocks) => {
    const blocksHtml = eventsBlocks.map(b => `
      <div style="background:white;border-left:4px solid #e38154;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
        <h2 style="color:#1a5f7a;margin:0 0 8px 0;font-size:17px;">${b.titre}</h2>
        <p style="margin:4px 0;">📅 Le <strong>${b.date}</strong> — ${b.horaire}</p>
        ${b.lieu ? `<p style="margin:4px 0;">📍 ${b.lieu}</p>` : ''}
        ${b.description ? `<p style="margin:10px 0 0 0;color:#555;font-size:14px;">${b.description}</p>` : ''}
      </div>
    `).join('')
    const n = eventsBlocks.length
    const bodyCollectivites = `Bonjour,

L'association PACTES à Coligny souhaiterait communiquer sur ${n > 1 ? 'les événements organisés suivants' : "l'événement organisé suivant"} :

[BLOCS_EVENEMENTS]

Pourriez-vous intégrer ${n > 1 ? 'ces événements' : 'cet événement'} dans vos communications afin de les faire connaître à vos concitoyens ?

Vous en souhaitant bonne réception.

Bonne journée.

Victor Guyon
06 71 41 56 96`

    const bodyAdherents = `Bonjour,

Nous avons le plaisir de vous inviter à ${n > 1 ? 'nos prochains événements' : 'notre prochain événement'} :

[BLOCS_EVENEMENTS]

${n > 1 ? 'Ces événements sont' : "Cet événement est"} ouvert${n > 1 ? 's' : ''} à tous, n'hésitez pas à en parler autour de vous !

Nous espérons vous y retrouver nombreux.

À très bientôt,

L'équipe de la Ludothèque de Coligny
06 71 41 56 96`

    return { bodyCollectivites, bodyAdherents, blocksHtml }
  }

  const openComposeModal = async (event) => {
    setLoadingRecipients(true)
    setComposeModal({ show: true, event })
    setSelectedEvents([makeEventBlock(event)])
    setShowEventPicker(false)
    setActiveMailTab('collectivites')
    const subject = `Communication Événement - Association PACTES - ${event.title}`
    const { bodyCollectivites, bodyAdherents } = buildBodies([makeEventBlock(event)])
    try {
      const { data: members } = await supabase.from('members').select('email, first_name, last_name')
      const memberRecipients = members
        ? members.filter(m => m.email && m.email.includes('@'))
            .map(m => ({ email: m.email, label: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email, group: 'adherent', checked: true }))
        : []
      const collectiviteRecipients = collectivites.map(c => ({ ...c, group: 'mairie', checked: true }))
      setComposeData({ subject, bodyCollectivites, bodyAdherents, recipients: [...collectiviteRecipients, ...memberRecipients] })
    } catch (e) {
      setComposeData({ subject, bodyCollectivites, bodyAdherents, recipients: collectivites.map(c => ({ ...c, group: 'mairie', checked: true })) })
    } finally {
      setLoadingRecipients(false)
    }
  }

  const toggleRecipient = (email) => {
    setComposeData(prev => ({
      ...prev,
      recipients: prev.recipients.map(r => r.email === email ? { ...r, checked: !r.checked } : r)
    }))
  }

  const toggleGroup = (group) => {
    const groupRecipients = composeData.recipients.filter(r => r.group === group)
    const allChecked = groupRecipients.every(r => r.checked)
    setComposeData(prev => ({
      ...prev,
      recipients: prev.recipients.map(r => r.group === group ? { ...r, checked: !allChecked } : r)
    }))
  }

  const makeEventBlock = (event) => {
    const start = new Date(event.date)
    const dateFormatee = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const heureDebut = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const plageHoraire = event.end_time
      ? `de ${heureDebut} à ${event.end_time.replace(':', 'h')}`
      : `à partir de ${heureDebut}`
    return { event, titre: event.title, date: dateFormatee, horaire: plageHoraire, lieu: event.location || '', description: event.description || '' }
  }

  const addEventToMail = (event) => {
    if (selectedEvents.find(b => b.event.id === event.id)) return
    const newBlocks = [...selectedEvents, makeEventBlock(event)]
    setSelectedEvents(newBlocks)
    const { bodyCollectivites, bodyAdherents } = buildBodies(newBlocks)
    setComposeData(prev => ({
      ...prev,
      subject: newBlocks.length > 1 ? 'Communication Événements - Association PACTES' : prev.subject,
      bodyCollectivites,
      bodyAdherents,
    }))
    setShowEventPicker(false)
  }

  const removeEventFromMail = (eventId) => {
    setSelectedEvents(prev => prev.filter(b => b.event.id !== eventId))
  }

  const updateEventBlock = (eventId, field, value) => {
    setSelectedEvents(prev => prev.map(b => b.event.id === eventId ? { ...b, [field]: value } : b))
  }

  const bodyToHtml = (bodyText, blocksHtml) => {
    const withBlocks = bodyText.replace('[BLOCS_EVENEMENTS]', blocksHtml)
    const htmlBody = withBlocks.split('\n')
      .map(line => line.trim() === '' ? '<br/>' : `<p style="margin:0 0 6px 0;">${line}</p>`)
      .join('')
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      <div style="background:#1a5f7a;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:18px;">Association PACTES – Ludothèque de Coligny</h1>
      </div>
      <div style="background:#fdfaf6;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
        ${htmlBody}
        <p style="margin-top:24px;font-size:12px;">
          <a href="https://www.ludothequedecoligny.fr" style="color:#1a5f7a;">www.ludothequedecoligny.fr</a>
        </p>
      </div>
    </div>`
  }

  const handleSendMail = async () => {
    const activeRecipients = composeData.recipients.filter(r => r.checked)
    if (activeRecipients.length === 0) { alert('Aucun destinataire sélectionné.'); return }
    if (selectedEvents.length === 0) { alert('Aucun événement sélectionné.'); return }
    setSendingMail(true)
    try {
      const { blocksHtml } = buildBodies(selectedEvents)
      const htmlCollectivites = bodyToHtml(composeData.bodyCollectivites, blocksHtml)
      const htmlAdherents = bodyToHtml(composeData.bodyAdherents, blocksHtml)
      const image_urls = selectedEvents.map(b => b.event.image_url).filter(Boolean)

      // Envoi individuel BCC — chaque destinataire reçoit son propre email
      const failed = []
      for (let i = 0; i < activeRecipients.length; i++) {
        const r = activeRecipients[i]
        const html = r.group === 'mairie' ? htmlCollectivites : htmlAdherents
        const isLast = i === activeRecipients.length - 1
        try {
          await sendEmail({
            to: [r.email],
            subject: composeData.subject,
            html,
            image_urls,
            send_confirmation: isLast,
          })
        } catch (err) {
          console.error('Échec envoi à', r.email, ':', err)
          failed.push(r.email)
        }
      }
      if (failed.length > 0) {
        console.warn('Emails non envoyés :', failed.join(', '))
      }

      for (const b of selectedEvents) {
        await supabase.from('events').update({ mail_sent_at: new Date().toISOString() }).eq('id', b.event.id)
      }
      fetchEvents()
      setComposeModal({ show: false, event: null })
      setSelectedEvents([])
      setSuccessModal({ show: true, count: activeRecipients.length })
    } catch (err) {
      console.error('Erreur envoi:', err)
      alert("Erreur lors de l'envoi. Vérifiez la console.")
    } finally {
      setSendingMail(false)
    }
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('events')}
              className={"px-5 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all " + (activeTab === 'events' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
              Événements
            </button>
            <button
              onClick={() => setActiveTab('affiche')}
              className={"px-5 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all " + (activeTab === 'affiche' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
              🎨 Affiches
            </button>
          </div>
          {activeTab === 'events' && (
            <button onClick={editingId ? cancelEdit : () => setShowForm(!showForm)} className={"px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl whitespace-nowrap " + (showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white')}>
              {showForm ? "Fermer" : "Nouvel Événement"}
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'affiche' && (
          <GenerateurAffiche events={events} onCreateEvent={handleCreateEventFromAffiche} />
        )}
        {activeTab === 'events' && (<>
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
            <div key={event.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl transition-all">
              <div className="h-48 bg-slate-50 relative flex items-center justify-center p-4">
                {event.image_url ? <img src={event.image_url} className="max-w-full max-h-full object-contain" alt="" /> : <ImageIcon size={48} className="text-slate-200" />}
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(event)} className="p-2.5 bg-white text-slate-400 rounded-xl shadow-lg hover:bg-[#1a5f7a] hover:text-white transition-all"><Edit2 size={16} /></button>
                  <button onClick={() => openComposeModal(event)} className="p-2.5 bg-white text-amber-500 rounded-xl shadow-lg hover:bg-amber-500 hover:text-white transition-all"><Mail size={16} /></button>
                  <button onClick={() => setDeleteModal({show: true, id: event.id, title: event.title})} className="p-2.5 bg-white text-slate-400 rounded-xl shadow-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                </div>
                {event.mail_sent_at && (
                  <div className="absolute bottom-4 left-4 px-3 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-full shadow-sm flex items-center gap-1.5">
                    <Send size={10} /> Diffusé le {new Date(event.mail_sent_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="p-8">
                <h3 className="text-lg font-black text-slate-900 uppercase mb-4">{event.title}</h3>
                <div className="space-y-2 mb-4 font-black uppercase text-[9px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-[#1a5f7a]" /> 
                    {new Date(event.date).toLocaleString('fr-FR', {day:'numeric', month:'short'})}
                    {" | "}
                    {new Date(event.date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})} 
                    {event.end_time && ` — ${event.end_time.replace(':', 'h')}`}
                  </div>
                  <div className="flex items-center gap-3"><MapPin size={14} className="text-[#e38154]" /> {event.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>)}
      </main>
      
      {/* MODALE COMPOSITION EMAIL */}
      {composeModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-[2.5rem] p-8 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl"><Mail size={20} /></div>
                <h3 className="text-base font-black uppercase text-slate-900">Composer l'email</h3>
              </div>
              <button onClick={() => setComposeModal({ show: false, event: null })} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6 flex-1">

              {/* Objet */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Objet</label>
                <input
                  className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                  value={composeData.subject}
                  onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              {/* Corps — onglets Collectivités / Adhérents */}
              <div className="space-y-3">
                <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-fit">
                  <button
                    onClick={() => setActiveMailTab('collectivites')}
                    className={'px-4 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-2 ' +
                      (activeMailTab === 'collectivites' ? 'bg-white text-[#1a5f7a] shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                    <Building2 size={11} />
                    Collectivités
                    <span className="text-[8px] font-bold opacity-60">
                      ({composeData.recipients.filter(r => r.group === 'mairie' && r.checked).length})
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveMailTab('adherents')}
                    className={'px-4 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-2 ' +
                      (activeMailTab === 'adherents' ? 'bg-white text-[#1a5f7a] shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                    <Users size={11} />
                    Adhérents
                    <span className="text-[8px] font-bold opacity-60">
                      ({composeData.recipients.filter(r => r.group === 'adherent' && r.checked).length})
                    </span>
                  </button>
                </div>

                {activeMailTab === 'collectivites' && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-400 font-medium ml-1">
                      Message envoyé aux mairies & collectivités — invite à communiquer sur l'événement
                    </p>
                    <textarea
                      rows={8}
                      className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a] resize-y"
                      value={composeData.bodyCollectivites}
                      onChange={e => setComposeData(prev => ({ ...prev, bodyCollectivites: e.target.value }))}
                    />
                    <p className="text-[8px] text-slate-300 ml-1 italic">
                      [BLOCS_EVENEMENTS] sera remplacé par les détails des événements sélectionnés
                    </p>
                  </div>
                )}

                {activeMailTab === 'adherents' && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-400 font-medium ml-1">
                      Message envoyé aux adhérents — invite à venir participer
                    </p>
                    <textarea
                      rows={8}
                      className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a] resize-y"
                      value={composeData.bodyAdherents}
                      onChange={e => setComposeData(prev => ({ ...prev, bodyAdherents: e.target.value }))}
                    />
                    <p className="text-[8px] text-slate-300 ml-1 italic">
                      [BLOCS_EVENEMENTS] sera remplacé par les détails des événements sélectionnés
                    </p>
                  </div>
                )}
              </div>

              {/* Événements — blocs éditables */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} /> Événements ({selectedEvents.length})
                  </label>
                  <button onClick={() => setShowEventPicker(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#1a5f7a]/10 text-[#1a5f7a] rounded-xl text-[9px] font-black uppercase tracking-wide hover:bg-[#1a5f7a]/20 transition-colors">
                    <PlusCircle size={12} /> Ajouter un événement
                  </button>
                </div>
                {showEventPicker && (
                  <div className="border-2 border-[#1a5f7a]/20 rounded-2xl overflow-hidden">
                    <div className="p-3 bg-[#1a5f7a]/5 border-b border-[#1a5f7a]/10">
                      <p className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Choisir un événement à ajouter</p>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                      {events.filter(e => !selectedEvents.find(b => b.event.id === e.id))
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map(e => (
                          <button key={e.id} onClick={() => addEventToMail(e)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                            <Paperclip size={12} className={e.image_url ? 'text-[#e38154]' : 'text-slate-200'} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{e.title}</p>
                              <p className="text-[9px] text-slate-400">{new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <Plus size={14} className="text-[#1a5f7a] shrink-0" />
                          </button>
                        ))}
                      {events.filter(e => !selectedEvents.find(b => b.event.id === e.id)).length === 0 && (
                        <p className="text-center text-[10px] text-slate-400 py-4">Tous les événements sont déjà ajoutés</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {selectedEvents.map((b, idx) => (
                    <div key={b.event.id} className="border-2 border-slate-100 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-slate-300" />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Événement {idx + 1}</span>
                          {b.event.image_url && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-[#e38154] uppercase">
                              <Paperclip size={10} /> Affiche jointe
                            </span>
                          )}
                        </div>
                        {selectedEvents.length > 1 && (
                          <button onClick={() => removeEventFromMail(b.event.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-rose-50 rounded-lg transition-all">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Titre</label>
                            <input value={b.titre} onChange={e => updateEventBlock(b.event.id, 'titre', e.target.value)}
                              className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 text-xs font-bold outline-none border border-transparent focus:border-[#1a5f7a]" />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lieu</label>
                            <input value={b.lieu} onChange={e => updateEventBlock(b.event.id, 'lieu', e.target.value)}
                              className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 text-xs font-bold outline-none border border-transparent focus:border-[#1a5f7a]" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                            <input value={b.date} onChange={e => updateEventBlock(b.event.id, 'date', e.target.value)}
                              className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 text-xs font-bold outline-none border border-transparent focus:border-[#1a5f7a]" />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Horaires</label>
                            <input value={b.horaire} onChange={e => updateEventBlock(b.event.id, 'horaire', e.target.value)}
                              className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 text-xs font-bold outline-none border border-transparent focus:border-[#1a5f7a]" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Description (optionnel)</label>
                          <textarea value={b.description} onChange={e => updateEventBlock(b.event.id, 'description', e.target.value)}
                            rows={2} className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 text-xs font-medium outline-none border border-transparent focus:border-[#1a5f7a] resize-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destinataires */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2">
                    <Users size={12} /> Destinataires
                  </label>
                  <span className="text-[9px] font-black text-slate-400 uppercase">
                    {composeData.recipients.filter(r => r.checked).length} / {composeData.recipients.length} sélectionnés
                  </span>
                </div>

                {loadingRecipients ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs p-4">
                    <Loader2 size={14} className="animate-spin" /> Chargement des destinataires...
                  </div>
                ) : (
                  <div className="space-y-2">

                    {/* Groupe Mairies */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setShowMairies(v => !v)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input type="checkbox" readOnly
                            checked={composeData.recipients.filter(r => r.group === 'mairie').every(r => r.checked)}
                            onClick={e => { e.stopPropagation(); toggleGroup('mairie') }}
                            className="w-4 h-4 accent-[#1a5f7a] cursor-pointer"
                          />
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                            Mairies & Collectivités
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            ({composeData.recipients.filter(r => r.group === 'mairie' && r.checked).length}/{composeData.recipients.filter(r => r.group === 'mairie').length})
                          </span>
                        </div>
                        {showMairies ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>
                      {showMairies && (
                        <div className="divide-y divide-slate-50">
                          {composeData.recipients.filter(r => r.group === 'mairie').map(r => (
                            <label key={r.email} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer">
                              <input type="checkbox" checked={r.checked} onChange={() => toggleRecipient(r.email)}
                                className="w-4 h-4 accent-[#1a5f7a] cursor-pointer flex-shrink-0" />
                              <span className="text-xs font-bold text-slate-700 flex-1">{r.label}</span>
                              <span className="text-[9px] text-slate-400">{r.email}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Groupe Adhérents */}
                    {composeData.recipients.filter(r => r.group === 'adherent').length > 0 && (
                      <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setShowAdherents(v => !v)}
                          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <input type="checkbox" readOnly
                              checked={composeData.recipients.filter(r => r.group === 'adherent').every(r => r.checked)}
                              onClick={e => { e.stopPropagation(); toggleGroup('adherent') }}
                              className="w-4 h-4 accent-[#1a5f7a] cursor-pointer"
                            />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Adhérents</span>
                            <span className="text-[9px] font-bold text-slate-400">
                              ({composeData.recipients.filter(r => r.group === 'adherent' && r.checked).length}/{composeData.recipients.filter(r => r.group === 'adherent').length})
                            </span>
                          </div>
                          {showAdherents ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </button>
                        {showAdherents && (
                          <div className="divide-y divide-slate-50">
                            {composeData.recipients.filter(r => r.group === 'adherent').map(r => (
                              <label key={r.email} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" checked={r.checked} onChange={() => toggleRecipient(r.email)}
                                  className="w-4 h-4 accent-[#1a5f7a] cursor-pointer flex-shrink-0" />
                                <span className="text-xs font-bold text-slate-700 flex-1">{r.label}</span>
                                <span className="text-[9px] text-slate-400">{r.email}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 bg-white rounded-b-[2.5rem] p-8 pt-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setComposeModal({ show: false, event: null })}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleSendMail} disabled={sendingMail || composeData.recipients.filter(r => r.checked).length === 0}
                className={'flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ' +
                  (sendingMail || composeData.recipients.filter(r => r.checked).length === 0
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-[#1a5f7a] text-white hover:bg-[#134a5e]')}>
                {sendingMail ? <><Loader2 size={14} className="animate-spin" /> Envoi...</> : <><Send size={14} /> Envoyer ({composeData.recipients.filter(r => r.checked).length})</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY ENVOI EN COURS */}
      {sendingMail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <Loader2 className="animate-spin mx-auto text-[#1a5f7a] mb-6" size={40} />
            <h3 className="text-lg font-black uppercase text-slate-900">Envoi en cours...</h3>
            <p className="text-[11px] text-slate-400 mt-2">Merci de patienter</p>
          </div>
        </div>
      )}

      {/* MODALE SUCCÈS */}
      {successModal.show && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-xl font-black uppercase mb-4 text-slate-900">Emails envoyés !</h3>
            <p className="text-[11px] font-medium text-slate-500 mb-8 leading-relaxed">
              <strong>{successModal.count} destinataire{successModal.count > 1 ? 's' : ''}</strong> ont reçu votre email avec succès.
            </p>
            <button onClick={() => setSuccessModal({ show: false, count: 0 })}
              className="w-full py-5 bg-[#1a5f7a] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
              Fermer
            </button>
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

      {/* BOUTON DESTINATAIRES ENREGISTRÉS en bas de page */}
      <div className="max-w-7xl mx-auto mt-8 mb-4 flex justify-end px-4 md:px-0">
        <button
          onClick={() => setCollectivitesModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-200 transition-colors shadow-sm">
          <Building2 size={14} /> Destinataires enregistrés
        </button>
      </div>

      {/* MODALE GESTION COLLECTIVITÉS */}
      {collectivitesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">

            <div className="sticky top-0 bg-white rounded-t-[2.5rem] p-8 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#1a5f7a]/10 text-[#1a5f7a] rounded-xl"><Building2 size={20} /></div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">Destinataires enregistrés</h3>
                  <p className="text-[10px] text-slate-400">{collectivites.length} collectivité{collectivites.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => { setCollectivitesModal(false); setEditingCollectivite(null); setNewCollectivite({ nom: '', email: '' }) }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6 flex-1">

              {/* Note info adhérents */}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <Users size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-blue-600 font-medium leading-relaxed">
                  Les emails des <strong>adhérents</strong> n'ont pas besoin d'être renseignés ici — ils sont automatiquement récupérés depuis la base de données lors de l'envoi.
                </p>
              </div>

              {/* Formulaire ajout/édition */}
              <div id="collectivite-form" className="bg-slate-50 rounded-2xl p-5 space-y-3 scroll-mt-4">
                <p className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">
                  {editingCollectivite ? '✏️ Modifier la collectivité' : 'Ajouter une collectivité'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    placeholder="Nom (ex: Mairie de Beaupont)"
                    className="p-3 rounded-xl bg-white text-sm font-bold outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                    value={newCollectivite.nom}
                    onChange={e => setNewCollectivite(prev => ({ ...prev, nom: e.target.value }))}
                  />
                  <input
                    placeholder="Email"
                    type="email"
                    className="p-3 rounded-xl bg-white text-sm font-bold outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                    value={newCollectivite.email}
                    onChange={e => setNewCollectivite(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveCollectivite}
                    disabled={!newCollectivite.nom || !newCollectivite.email}
                    className={'flex-1 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ' +
                      (newCollectivite.nom && newCollectivite.email
                        ? 'bg-[#1a5f7a] text-white hover:bg-[#134a5e]'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed')}>
                    {editingCollectivite ? 'Enregistrer les modifications' : 'Ajouter'}
                  </button>
                  {editingCollectivite && (
                    <button onClick={() => { setEditingCollectivite(null); setNewCollectivite({ nom: '', email: '' }) }}
                      className="px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200">
                      Annuler
                    </button>
                  )}
                </div>
              </div>

              {/* Liste */}
              <div className="divide-y divide-slate-50">
                {collectivites.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{c.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingCollectivite(c.id)
                        setNewCollectivite({ nom: c.label, email: c.email })
                        document.getElementById('collectivite-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="p-2 text-slate-300 hover:text-[#1a5f7a] hover:bg-[#1a5f7a]/10 rounded-lg transition-all">
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteCollectivite(c.id)}
                      className="p-2 text-slate-300 hover:text-rose-400 hover:bg-rose-50 rounded-lg transition-all">
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
                {collectivites.length === 0 && (
                  <p className="text-center text-[10px] text-slate-400 py-6">Aucune collectivité enregistrée</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}