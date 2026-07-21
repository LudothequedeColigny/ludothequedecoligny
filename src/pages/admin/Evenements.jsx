import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import GenerateurAffiche from './GenerateurAffiche'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { supabase } from '../../services/supabaseClient'
import { sendEmail } from '../../services/emailService'
import {
  Calendar, MapPin, Plus, Trash2, Clock, ImageIcon,
  Upload, X, Loader2, Type, AlignLeft, Edit2, Mail, Send, CheckCircle2, Users, ChevronDown, ChevronUp, PlusCircle, Paperclip, GripVertical, Building2, Trash, Share2, Megaphone, BarChart2, Search, Dice5, Facebook, Instagram, Archive, ArchiveRestore, LayoutGrid, List, ImagePlus
} from 'lucide-react'

const VIEW_MODE_STORAGE_KEY = 'evenements_view_mode'

// ─── Helpers MyLudo (via Edge Function Supabase — même pattern que Jeux.tsx) ──
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
    .map(item => ({ id: String(item.id), name: item.name, year: item.year || '', language: item.language || '' }))
    .filter(i => i.name && i.id)
}

async function bggGameDetails(id) {
  const item = await bggCall('thing', { id })
  if (!item) return null
  return { name: item.name || '', image: item.image || '' }
}

// Détecte le type d'un événement à partir de son titre (même logique que VieAssociation.jsx)
const DIACRITICS_REGEX = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')
const normalizeTitle = (s) => (s || '').normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase()
const getEventType = (title) => {
  const t = normalizeTitle(title)
  if (t.includes('soiree')) return 'soiree'
  if (t.includes('famil')) return 'famille'
  return 'permanence'
}

const buildBilanFbText = (event) => {
  const moment = getEventType(event.title) === 'soiree' ? 'soirée' : 'après-midi'
  const count = event.participants_count != null ? event.participants_count : 0
  return `🎲 ${event.title} — Retour sur notre dernière édition !

👥 ${count} personnes nous ont rejoints pour cette ${moment}.

Merci à tous les participants ! On se retrouve très vite pour la prochaine édition 🎉

Ludothèque de Coligny
www.ludothequedecoligny.fr`
}

// Effet mosaïque : moyenne les couleurs par bloc de BLOCK_SIZE px
const BLUR_BLOCK_SIZE = 15
function pixelateRegion(ctx, x, y, w, h) {
  for (let by = y; by < y + h; by += BLUR_BLOCK_SIZE) {
    for (let bx = x; bx < x + w; bx += BLUR_BLOCK_SIZE) {
      const bw = Math.min(BLUR_BLOCK_SIZE, x + w - bx)
      const bh = Math.min(BLUR_BLOCK_SIZE, y + h - by)
      if (bw <= 0 || bh <= 0) continue
      const block = ctx.getImageData(bx, by, bw, bh)
      let r = 0, g = 0, b = 0, a = 0
      const n = block.data.length / 4
      for (let i = 0; i < block.data.length; i += 4) {
        r += block.data[i]; g += block.data[i + 1]; b += block.data[i + 2]; a += block.data[i + 3]
      }
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n); a = Math.round(a / n)
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
      ctx.fillRect(bx, by, bw, bh)
    }
  }
}

// Aperçu simulé d'un post Facebook/Instagram — utilisé par la modale de bilan,
// la modale de partage d'affiche et la modale "Nouveau post"
function SocialPostPreview({ text, imageUrl, games }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aperçu</label>
      <div className="relative max-w-[400px] mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <span className="absolute top-3 right-3 z-10 bg-slate-900/70 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
          Aperçu
        </span>

        {/* En-tête */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-[#1a5f7a] text-white flex items-center justify-center font-black text-xs shrink-0">
            LC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight truncate">Ludothèque de Coligny</p>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Facebook size={11} />
              <Instagram size={11} />
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className="w-full aspect-square bg-slate-100 flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={40} className="text-slate-300" />
          )}
        </div>

        {/* Texte + jeux joués */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
            {text || 'Votre texte apparaîtra ici...'}
          </p>

          {games && games.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-500 mb-2">🎲 Jeux de la soirée :</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {games.map(game => (
                  <div key={game.id} className="flex flex-col items-center shrink-0 w-14">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {game.image_url ? <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" /> : <Dice5 size={20} className="text-slate-200" />}
                    </div>
                    <p className="text-[8px] text-slate-500 mt-1 text-center line-clamp-1 w-full">{game.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Evenements() {
  const [events, setEvents] = useState([])
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'affiche'
  const [loading, setLoading] = useState(true)
  // Vue grille / liste des événements actifs — persistée en localStorage
  const [viewMode, setViewModeState] = useState(() => {
    if (typeof window === 'undefined') return 'grid'
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'grid'
  })
  const setViewMode = (mode) => {
    setViewModeState(mode)
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }
  // Archivage des événements
  const [archivedEvents, setArchivedEvents] = useState([])
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [photoEventIds, setPhotoEventIds] = useState(new Set())
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
  // Modale publication Facebook/Instagram
  const [fbModal, setFbModal] = useState({ show: false, event: null })
  const [fbText, setFbText] = useState('')
  const [publishingFb, setPublishingFb] = useState(false)
  const [fbSuccess, setFbSuccess] = useState(false)
  // Post Facebook/Instagram autonome (sans événement lié)
  const [postText, setPostText] = useState('')
  const [postImageUrl, setPostImageUrl] = useState('')
  const [postUploading, setPostUploading] = useState(false)
  const [publishingPost, setPublishingPost] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  const [showMairies, setShowMairies] = useState(true)
  const [showAdherents, setShowAdherents] = useState(true)
  const [selectedEvents, setSelectedEvents] = useState([])
  const [showEventPicker, setShowEventPicker] = useState(false)
  const [collectivites, setCollectivites] = useState([])
  const [collectivitesModal, setCollectivitesModal] = useState(false)
  const [newCollectivite, setNewCollectivite] = useState({ nom: '', email: '' })
  const [editingCollectivite, setEditingCollectivite] = useState(null)
  const [showTuto, setShowTuto] = useState(false)

  // Modale de bilan d'événement passé
  const [bilanModal, setBilanModal] = useState({ show: false, event: null })
  const [bilanParticipants, setBilanParticipants] = useState('')
  const [savingParticipants, setSavingParticipants] = useState(false)
  const [bilanPhotos, setBilanPhotos] = useState([])
  const [bilanGames, setBilanGames] = useState([])
  // Éditeur de floutage — file d'attente de photos en cours d'édition
  const [bilanPhotoFiles, setBilanPhotoFiles] = useState([])
  const [bilanPhotoIndex, setBilanPhotoIndex] = useState(0)
  const [preparedPhotoBlobs, setPreparedPhotoBlobs] = useState([])
  const [hasPendingRects, setHasPendingRects] = useState(false)
  const [uploadingBilanPhotos, setUploadingBilanPhotos] = useState(false)
  const blurCanvasRef = useRef(null)
  const basePixelsRef = useRef(null)
  const dragStartRef = useRef(null)
  const pendingRectsRef = useRef([])
  // Recherche de jeux joués via MyLudo
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const [gameSearchResults, setGameSearchResults] = useState([])
  const [gameSearchLoading, setGameSearchLoading] = useState(false)
  const [addingGameId, setAddingGameId] = useState(null)
  const gameSearchDebounceRef = useRef(null)
  // Publication du bilan sur Facebook & Instagram
  const [bilanFbText, setBilanFbText] = useState('')
  const [bilanSelectedPhotoUrl, setBilanSelectedPhotoUrl] = useState('')
  const [publishingBilanFb, setPublishingBilanFb] = useState(false)
  const [bilanFbSuccess, setBilanFbSuccess] = useState(false)
  const [bilanFbError, setBilanFbError] = useState('')

  const initialEventState = {
    title: '',
    date: '', 
    end_time: '', 
    location: '',
    description: '',
    image_url: ''
  }

  const [newEvent, setNewEvent] = useState(initialEventState)

  useEffect(() => {
    fetchEvents()
    fetchArchivedEvents()
    fetchPhotoEventIds()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .is('archived_at', null)
      .order('date', { ascending: true })
    if (error) console.error("Erreur de chargement:", error)
    setEvents(data || [])
    setLoading(false)
  }

  async function fetchArchivedEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
    if (error) console.error("Erreur de chargement des archives:", error)
    setArchivedEvents(data || [])
  }

  async function fetchPhotoEventIds() {
    const { data } = await supabase.from('event_photos').select('event_id')
    setPhotoEventIds(new Set((data || []).map(p => p.event_id)))
  }

  const isPastEvent = (event) => new Date(event.date) < new Date()
  const hasBilan = (event) => Number(event.participants_count) > 0 || photoEventIds.has(event.id)

  const archiveEvent = async (eventId) => {
    await supabase.from('events').update({ archived_at: new Date().toISOString() }).eq('id', eventId)
    fetchEvents()
    fetchArchivedEvents()
  }

  const unarchiveEvent = async (eventId) => {
    await supabase.from('events').update({ archived_at: null }).eq('id', eventId)
    fetchEvents()
    fetchArchivedEvents()
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

  function handlePostFileUpload(event) {
    const file = event.target.files[0]
    if (!file) return
    setPostUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setPostImageUrl(reader.result)
      setPostUploading(false)
    }
    reader.onerror = () => {
      alert("Erreur de lecture du fichier")
      setPostUploading(false)
    }
    reader.readAsDataURL(file)
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
      const calendarEvents = selectedEvents.map(b => ({
        title: b.titre,
        date: b.event.date,
        end_time: b.event.end_time,
        location: b.lieu,
        description: b.description,
      }))

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
            ...(r.group === 'adherent' ? { calendar_events: calendarEvents } : {}),
          })
        } catch (err) {
          console.error('Échec envoi à', r.email, ':', err)
          failed.push(r.email)
        }
      }
      if (failed.length > 0) {
        console.warn('Emails non envoyés :', failed.join(', '))
      }

      // Envoyer la confirmation récapitulative après la boucle complète
      const sent = activeRecipients.filter(r => !failed.includes(r.email)).map(r => r.email)
      await sendEmail({
        to: ['ludothequedecoligny@outlook.fr'],
        subject: `✅ Récapitulatif : "${composeData.subject}"`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
          <div style="background:#1a5f7a;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:18px;">✅ Récapitulatif d'envoi</h1>
          </div>
          <div style="background:#fdfaf6;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
            <p><strong>Objet :</strong> ${composeData.subject}</p>
            <p><strong>✓ ${sent.length} email(s) envoyé(s) avec succès</strong></p>
            <ul style="font-size:13px;color:#555;">${sent.map(e => `<li>${e}</li>`).join('')}</ul>
            ${failed.length > 0 ? `
            <p style="color:#e53e3e;margin-top:16px;"><strong>✗ ${failed.length} échec(s) :</strong></p>
            <ul style="font-size:13px;color:#e53e3e;">${failed.map(e => `<li>${e}</li>`).join('')}</ul>
            <p style="font-size:12px;color:#888;">Ces adresses ont été rejetées (bounce). Vérifiez-les dans Resend → Suppressions.</p>
            ` : ''}
          </div>
        </div>`,
        send_confirmation: false,
      })

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

  const openFbModal = (event) => {
    const start = new Date(event.date)
    const dateFormatee = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const heureDebut = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const plageHoraire = event.end_time
      ? `de ${heureDebut} à ${event.end_time.replace(':', 'h')}`
      : `à partir de ${heureDebut}`
    const text = `🎲 ${event.title}

📅 Le ${dateFormatee} — ${plageHoraire}
📍 ${event.location || ''}

${event.description || ''}

Ludothèque de Coligny 🎯
www.ludothequedecoligny.fr`
    setFbText(text)
    setFbModal({ show: true, event })
    setFbSuccess(false)
  }

  const handlePublishFb = async () => {
    if (!fbModal.event) return
    setPublishingFb(true)
    try {
      let image_url = fbModal.event.image_url || null

      // Si dataURL → upload avec nom basé sur le titre (upsert pour éviter les doublons)
      // Si déjà URL publique Supabase → réutiliser directement sans créer de nouveau fichier
      if (image_url && image_url.startsWith('data:')) {
        const fetchRes = await fetch(image_url)
        const blob = await fetchRes.blob()
        const safeName = (fbModal.event.title || 'affiche')
          .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50)
        const fileName = safeName + '.png'
        const { error: uploadError } = await supabase.storage
          .from('event-images').upload(fileName, blob, { contentType: 'image/png', upsert: true })
        if (!uploadError) {
          const { data } = supabase.storage.from('event-images').getPublicUrl(fileName)
          image_url = data.publicUrl
          await supabase.from('events').update({ image_url }).eq('id', fbModal.event.id)
        }
      }

            console.log('📤 Envoi à Make - message:', fbText.substring(0, 50), '| image_url:', image_url?.substring(0, 80))
      const res = await fetch('https://hook.eu1.make.com/f67dbu4u19znh05m9tmkak3wx5hqeqf9', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fbText,
          image_url,
          event_title: fbModal.event.title || '',
          event_date: fbModal.event.date || '',
          event_location: fbModal.event.location || '',
        }),
      })
      console.log('📬 Réponse Make:', res.status, res.ok)
      if (!res.ok) throw new Error('Erreur Make: ' + res.status)
      setFbSuccess(true)
    } catch (err) {
      console.error('❌ Erreur publication Facebook:', err)
      alert("Erreur lors de la publication. Vérifiez la console.")
    } finally {
      setPublishingFb(false)
    }
  }

  const handlePublishPost = async () => {
    if (!postText.trim()) return
    setPublishingPost(true)
    setPostSuccess(false)
    let tempBlobUrl = null
    try {
      let imagePayloadUrl = postImageUrl || null

      // Si la dataURL est trop volumineuse pour le webhook Make, on la convertit
      // en Blob et on utilise une URL temporaire (révoquée juste après l'envoi)
      const MAX_DATA_URL_LENGTH = 5_000_000 // ~5 Mo en base64
      if (imagePayloadUrl && imagePayloadUrl.startsWith('data:') && imagePayloadUrl.length > MAX_DATA_URL_LENGTH) {
        const blob = await (await fetch(imagePayloadUrl)).blob()
        tempBlobUrl = URL.createObjectURL(blob)
        imagePayloadUrl = tempBlobUrl
      }

      const res = await fetch('https://hook.eu1.make.com/f67dbu4u19znh05m9tmkak3wx5hqeqf9', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: postText,
          image_url: imagePayloadUrl,
        }),
      })
      if (!res.ok) throw new Error('Erreur Make: ' + res.status)
      setPostSuccess(true)
      setPostText('')
      setPostImageUrl('')
    } catch (err) {
      console.error('Erreur publication post:', err)
      alert("Erreur lors de la publication. Vérifiez la console.")
    } finally {
      if (tempBlobUrl) URL.revokeObjectURL(tempBlobUrl)
      setPublishingPost(false)
    }
  }

  const confirmDelete = async () => {
    // Nettoyer les photos de bilan (Storage + table) avant de supprimer l'événement,
    // nécessaire pour les événements archivés (supprimés définitivement) qui en ont
    const { data: photosToDelete } = await supabase.from('event_photos').select('url').eq('event_id', deleteModal.id)
    if (photosToDelete && photosToDelete.length > 0) {
      const paths = photosToDelete
        .map(p => p.url && p.url.includes('event-images') ? decodeURIComponent(p.url.split('/event-images/')[1]?.split('?')[0] || '') : null)
        .filter(Boolean)
      if (paths.length > 0) await supabase.storage.from('event-images').remove(paths)
      await supabase.from('event_photos').delete().eq('event_id', deleteModal.id)
    }
    await supabase.from('event_games_played').delete().eq('event_id', deleteModal.id)

    // Supprimer l'affiche de l'événement dans Storage si elle existe
    const eventToDelete = [...events, ...archivedEvents].find(e => e.id === deleteModal.id)
    if (eventToDelete?.image_url && eventToDelete.image_url.includes('event-images')) {
      const path = eventToDelete.image_url.split('/event-images/')[1]?.split('?')[0]
      if (path) await supabase.storage.from('event-images').remove([decodeURIComponent(path)])
    }
    await supabase.from('events').delete().eq('id', deleteModal.id)
    setDeleteModal({ show: false, id: null, title: '' })
    fetchEvents()
    fetchArchivedEvents()
    fetchPhotoEventIds()
  }

  // ─── BILAN D'ÉVÉNEMENT ─────────────────────────────────────────────────────

  const fetchBilanPhotos = async (eventId) => {
    const { data } = await supabase.from('event_photos').select('*').eq('event_id', eventId).order('created_at', { ascending: false })
    setBilanPhotos(data || [])
    return data || []
  }

  const fetchBilanGames = async (eventId) => {
    const { data } = await supabase.from('event_games_played').select('*').eq('event_id', eventId)
    setBilanGames(data || [])
  }

  const openBilanModal = async (event) => {
    setBilanModal({ show: true, event })
    setBilanParticipants(event.participants_count != null ? String(event.participants_count) : '')
    setGameSearchQuery('')
    setGameSearchResults([])
    setBilanFbText(buildBilanFbText(event))
    setBilanSelectedPhotoUrl('')
    setBilanFbSuccess(false)
    setBilanFbError('')
    cancelPhotoQueue()
    const [photos] = await Promise.all([fetchBilanPhotos(event.id), fetchBilanGames(event.id)])
    setBilanSelectedPhotoUrl(photos.length > 0 ? photos[0].url : '')
  }

  const closeBilanModal = () => {
    setBilanModal({ show: false, event: null })
    setBilanPhotos([])
    setBilanGames([])
    setGameSearchQuery('')
    setGameSearchResults([])
    setBilanFbText('')
    setBilanSelectedPhotoUrl('')
    setBilanFbSuccess(false)
    setBilanFbError('')
    cancelPhotoQueue()
  }

  const saveParticipants = async () => {
    if (!bilanModal.event) return
    setSavingParticipants(true)
    try {
      const count = bilanParticipants === '' ? null : parseInt(bilanParticipants, 10)
      const { error } = await supabase.from('events').update({ participants_count: count }).eq('id', bilanModal.event.id)
      if (error) throw error
      fetchEvents()
    } catch (err) {
      console.error('Erreur sauvegarde participants:', err)
      alert("Erreur lors de l'enregistrement du nombre de participants.")
    } finally {
      setSavingParticipants(false)
    }
  }

  const deleteBilanPhoto = async (photo) => {
    try {
      if (photo.url && photo.url.includes('event-images')) {
        const path = photo.url.split('/event-images/')[1]?.split('?')[0]
        if (path) await supabase.storage.from('event-images').remove([decodeURIComponent(path)])
      }
      await supabase.from('event_photos').delete().eq('id', photo.id)
      setBilanPhotos(prev => prev.filter(p => p.id !== photo.id))
      setBilanSelectedPhotoUrl(prev => prev === photo.url ? '' : prev)
      fetchPhotoEventIds()
    } catch (err) {
      console.error('Erreur suppression photo:', err)
      alert('Erreur lors de la suppression de la photo.')
    }
  }

  // ── Éditeur de floutage ──
  const loadPhotoIntoEditor = useCallback((file) => {
    const canvas = blurCanvasRef.current
    if (!canvas || !file) return
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const maxW = 1200
      const scale = Math.min(1, maxW / img.naturalWidth)
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      basePixelsRef.current = ctx.getImageData(0, 0, w, h)
      pendingRectsRef.current = []
      setHasPendingRects(false)
      URL.revokeObjectURL(objectUrl)
    }
    img.src = objectUrl
  }, [])

  useEffect(() => {
    if (bilanPhotoFiles.length > 0 && bilanPhotoFiles[bilanPhotoIndex]) {
      loadPhotoIntoEditor(bilanPhotoFiles[bilanPhotoIndex])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilanPhotoFiles, bilanPhotoIndex])

  const handlePhotoFilesSelected = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setPreparedPhotoBlobs([])
    setBilanPhotoIndex(0)
    setBilanPhotoFiles(files)
    e.target.value = ''
  }

  const cancelPhotoQueue = () => {
    setBilanPhotoFiles([])
    setBilanPhotoIndex(0)
    setPreparedPhotoBlobs([])
    pendingRectsRef.current = []
    dragStartRef.current = null
    setHasPendingRects(false)
  }

  const getCanvasPoint = (clientX, clientY) => {
    const canvas = blurCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  const redrawWithOverlay = (liveRect) => {
    const canvas = blurCanvasRef.current
    if (!canvas || !basePixelsRef.current) return
    const ctx = canvas.getContext('2d')
    ctx.putImageData(basePixelsRef.current, 0, 0)
    const allRects = liveRect ? [...pendingRectsRef.current, liveRect] : pendingRectsRef.current
    allRects.forEach(r => {
      ctx.fillStyle = 'rgba(227,129,84,0.35)'
      ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.strokeStyle = '#e38154'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(r.x, r.y, r.w, r.h)
      ctx.setLineDash([])
    })
  }

  const handlePointerDown = (clientX, clientY) => {
    dragStartRef.current = getCanvasPoint(clientX, clientY)
  }

  const handlePointerMove = (clientX, clientY) => {
    if (!dragStartRef.current) return
    const p = getCanvasPoint(clientX, clientY)
    const start = dragStartRef.current
    redrawWithOverlay({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) })
  }

  const handlePointerUp = (clientX, clientY) => {
    if (!dragStartRef.current) return
    const p = getCanvasPoint(clientX, clientY)
    const start = dragStartRef.current
    dragStartRef.current = null
    const rect = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) }
    if (rect.w > 4 && rect.h > 4) {
      pendingRectsRef.current = [...pendingRectsRef.current, rect]
      setHasPendingRects(true)
    }
    redrawWithOverlay(null)
  }

  const applyBlur = () => {
    const canvas = blurCanvasRef.current
    if (!canvas || !basePixelsRef.current || pendingRectsRef.current.length === 0) return
    const ctx = canvas.getContext('2d')
    ctx.putImageData(basePixelsRef.current, 0, 0)
    pendingRectsRef.current.forEach(r => {
      const x = Math.max(0, Math.floor(r.x))
      const y = Math.max(0, Math.floor(r.y))
      const w = Math.min(canvas.width - x, Math.ceil(r.w))
      const h = Math.min(canvas.height - y, Math.ceil(r.h))
      if (w > 0 && h > 0) pixelateRegion(ctx, x, y, w, h)
    })
    basePixelsRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    pendingRectsRef.current = []
    setHasPendingRects(false)
  }

  const resetBlur = () => {
    const file = bilanPhotoFiles[bilanPhotoIndex]
    if (file) loadPhotoIntoEditor(file)
  }

  const exportCurrentCanvasAsWebp = () => new Promise(resolve => {
    const canvas = blurCanvasRef.current
    if (!canvas) { resolve(null); return }
    canvas.toBlob(blob => resolve(blob), 'image/webp', 0.82)
  })

  const uploadBilanPhotos = async (blobs) => {
    if (!bilanModal.event) return
    setUploadingBilanPhotos(true)
    try {
      for (const blob of blobs) {
        const timestamp = Date.now()
        const fileName = `bilan-${bilanModal.event.id}-${timestamp}.webp`
        const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, blob, { contentType: 'image/webp' })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('event-images').getPublicUrl(fileName)
        await supabase.from('event_photos').insert({ event_id: bilanModal.event.id, url: data.publicUrl })
      }
      const photos = await fetchBilanPhotos(bilanModal.event.id)
      setBilanSelectedPhotoUrl(prev => prev || (photos[0]?.url || ''))
      fetchPhotoEventIds()
    } catch (err) {
      console.error('Erreur upload photos bilan:', err)
      alert("Erreur lors de l'upload des photos.")
    } finally {
      setUploadingBilanPhotos(false)
      cancelPhotoQueue()
    }
  }

  const goToNextPhoto = async () => {
    const blob = await exportCurrentCanvasAsWebp()
    if (!blob) return
    const isLast = bilanPhotoIndex + 1 >= bilanPhotoFiles.length
    const newPrepared = [...preparedPhotoBlobs, blob]
    if (isLast) {
      await uploadBilanPhotos(newPrepared)
    } else {
      setPreparedPhotoBlobs(newPrepared)
      setBilanPhotoIndex(i => i + 1)
    }
  }

  // ── Recherche & ajout de jeux joués (MyLudo) ──
  const handleGameSearchChange = (value) => {
    setGameSearchQuery(value)
    if (gameSearchDebounceRef.current) clearTimeout(gameSearchDebounceRef.current)
    if (value.trim().length < 2) { setGameSearchResults([]); return }
    gameSearchDebounceRef.current = setTimeout(async () => {
      setGameSearchLoading(true)
      try {
        const results = await bggSearchGames(value.trim())
        const enriched = await Promise.all(results.map(async r => {
          try {
            const details = await bggGameDetails(r.id)
            return { ...r, image: details?.image || '' }
          } catch {
            return { ...r, image: '' }
          }
        }))
        setGameSearchResults(enriched)
      } catch (e) {
        console.warn('Erreur recherche MyLudo:', e)
      } finally {
        setGameSearchLoading(false)
      }
    }, 800)
  }

  const addGameToBilan = async (result) => {
    if (!bilanModal.event) return
    setAddingGameId(result.id)
    try {
      const { data: matches } = await supabase.from('games').select('id').ilike('name', result.name)
      const inCatalogue = !!(matches && matches.length > 0)
      const { data, error } = await supabase.from('event_games_played').insert({
        event_id: bilanModal.event.id,
        name: result.name,
        image_url: result.image || '',
        external_url: '',
        in_catalogue: inCatalogue,
      }).select()
      if (error) throw error
      setBilanGames(prev => [...prev, data[0]])
      setGameSearchResults(prev => prev.filter(r => r.id !== result.id))
    } catch (err) {
      console.error('Erreur ajout jeu:', err)
      alert("Erreur lors de l'ajout du jeu.")
    } finally {
      setAddingGameId(null)
    }
  }

  const deleteBilanGame = async (gameId) => {
    try {
      await supabase.from('event_games_played').delete().eq('id', gameId)
      setBilanGames(prev => prev.filter(g => g.id !== gameId))
    } catch (err) {
      console.error('Erreur suppression jeu:', err)
    }
  }

  // ── Publication du bilan sur Facebook & Instagram ──
  const publishBilanToSocial = async () => {
    if (!bilanFbText.trim() || !bilanSelectedPhotoUrl) return
    setPublishingBilanFb(true)
    setBilanFbSuccess(false)
    setBilanFbError('')
    try {
      const res = await fetch('https://hook.eu1.make.com/f67dbu4u19znh05m9tmkak3wx5hqeqf9', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: bilanFbText,
          image_url: bilanSelectedPhotoUrl,
        }),
      })
      if (!res.ok) throw new Error('Erreur Make: ' + res.status)
      setBilanFbSuccess(true)
    } catch (err) {
      console.error('Erreur publication bilan réseaux sociaux:', err)
      setBilanFbError("Erreur lors de la publication. Réessayez.")
    } finally {
      setPublishingBilanFb(false)
    }
  }


const EVENEMENTS_TUTORIAL_STEPS = (openForm, closeForm, openCompose, openCollectivites) => [
  {
    id: 'evt-header',
    noSpotlight: true,
    title: `Bienvenue sur la page Événements`,
    description: `Cette page vous permet de créer et gérer tous les événements de la ludothèque, de générer des affiches et d'envoyer des emails de communication à vos contacts.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-tabs',
    title: `Onglets Événements / Affiches`,
    description: `Basculez entre la gestion des événements et le générateur d'affiches. Le générateur crée une affiche A4 haute résolution et peut pré-remplir automatiquement le formulaire d'événement avec la date et le lieu.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-add-btn',
    title: `Créer un nouvel événement`,
    description: `Ce bouton ouvre le formulaire de création. Nous allons le parcourir ensemble.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-form',
    title: `Formulaire de création d'événement`,
    description: `Ce formulaire permet de renseigner toutes les informations de l'événement : titre, date, horaires, lieu, affiche et description.`,
    action: () => { openForm(); openCompose(false); openCollectivites(false) },
    actionDelay: 400,
  },
  {
    id: 'evt-form-details',
    title: `Titre, date et lieu`,
    description: `Saisissez le titre, la date et l'heure de début (obligatoires), l'heure de fin (optionnelle — si renseignée, l'email affichera une plage horaire complète) et le lieu de l'événement.`,
    action: () => { openForm(); openCompose(false); openCollectivites(false) },
    actionDelay: 400,
  },
  {
    id: 'evt-form-affiche',
    title: `Affiche de l'événement`,
    description: `Collez une adresse internet d'image ou uploadez un fichier depuis votre appareil. Si vous avez généré une affiche via l'onglet Affiches, elle est déjà pré-remplie automatiquement ici.`,
    action: () => { openForm(); openCompose(false); openCollectivites(false) },
    actionDelay: 400,
  },
  {
    id: 'evt-form-description',
    title: `Description`,
    description: `Rédigez une description détaillée de l'événement. Ce texte peut être repris dans le corps des emails de communication envoyés aux adhérents et collectivités.`,
    action: () => { openForm(); openCompose(false); openCollectivites(false) },
    actionDelay: 400,
  },
  {
    id: 'evt-form-submit',
    title: `Enregistrer l'événement`,
    description: `Ce bouton enregistre l'événement. Il apparaît immédiatement dans la liste. Depuis sa carte, vous pourrez envoyer un email de communication à vos contacts.`,
    action: () => { openForm(); openCompose(false); openCollectivites(false) },
    actionDelay: 400,
  },
  {
    id: 'evt-list-card1',
    id2: 'evt-list-card2',
    title: `Liste des événements`,
    description: `Chaque carte affiche le titre, la date, l'heure et le lieu. Un badge vert indique qu'un email de communication a déjà été envoyé pour cet événement. Au survol, trois icônes apparaissent.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-action-edit',
    title: `Modifier un événement`,
    description: `L'icône crayon ouvre le formulaire en mode édition avec toutes les informations pré-remplies. Modifiez puis enregistrez pour mettre à jour l'événement.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-action-mail',
    title: `Envoyer un email de communication`,
    description: `L'icône enveloppe ouvre la fenêtre de composition d'email — nous allons l'explorer ensemble à l'étape suivante.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-action-share',
    title: `Publier sur Facebook & Instagram`,
    description: `L'icône de partage ouvre une fenêtre permettant de publier l'événement directement sur la Page Facebook et le compte Instagram de la ludothèque. Le texte du post est pré-rempli et modifiable avant publication. L'affiche est jointe automatiquement si elle existe.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-action-bilan',
    title: `Bilan de l'événement`,
    description: `Sur un événement passé, cette icône ouvre la fenêtre de bilan : nombre de participants, ajout de photos (avec floutage des visages), jeux joués et publication d'un résumé sur les réseaux sociaux.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
    tip: `Cette icône n'apparaît que sur les événements dont la date est passée.`,
  },
  {
    id: 'evt-view-toggle',
    title: `Vue grille ou liste`,
    description: `Basculez l'affichage des événements entre une vue en grille (cartes avec affiche) et une vue en liste (plus compacte). Votre choix est mémorisé pour vos prochaines visites.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-archived',
    title: `Événements archivés`,
    description: `Un événement passé avec un bilan complété peut être archivé plutôt que supprimé : il quitte la liste principale mais reste consultable ici, avec la possibilité de le désarchiver ou de le supprimer définitivement.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-compose-modal',
    title: `Fenêtre de composition email`,
    description: `Cette fenêtre permet de composer et envoyer un email à vos contacts. Elle contient l'objet, le corps du message (différent selon les destinataires), les événements à inclure et la liste des destinataires.`,
    action: () => { closeForm(); openCompose(true); openCollectivites(false) },
    actionDelay: 450,
  },
  {
    id: 'evt-compose-tabs',
    title: `Deux messages distincts`,
    description: `L'onglet "Collectivités" rédige un message destiné aux mairies et partenaires (invitation à relayer l'événement). L'onglet "Adhérents" rédige un message d'invitation à participer. Les deux peuvent être modifiés avant envoi.`,
    action: () => { closeForm(); openCompose(true); openCollectivites(false) },
    actionDelay: 450,
  },
  {
    id: 'evt-compose-events',
    title: `Événements inclus dans l'email`,
    description: `L'événement est ajouté automatiquement mais vous pouvez en inclure d'autres via le bouton "+ Ajouter un événement". Chaque bloc est éditable : titre, lieu, date et horaires.`,
    action: () => { closeForm(); openCompose(true); openCollectivites(false) },
    actionDelay: 450,
  },
  {
    id: 'evt-compose-recipients',
    title: `Sélection des destinataires`,
    description: `Les destinataires sont regroupés en deux listes : Mairies & Collectivités et Adhérents. Cochez ou décochez chaque contact individuellement, ou cochez la case de groupe pour tout sélectionner d'un clic.`,
    action: () => { closeForm(); openCompose(true); openCollectivites(false) },
    actionDelay: 450,
  },
  {
    id: 'evt-compose-send',
    title: `Envoyer l'email`,
    description: `Ce bouton envoie l'email à tous les destinataires cochés. Un récapitulatif confirme le nombre d'envois réussis. La carte de l'événement affiche ensuite un badge "Diffusé".`,
    action: () => { closeForm(); openCompose(true); openCollectivites(false) },
    actionDelay: 450,
  },
  {
    id: 'evt-collectivites-btn',
    title: `Gérer les destinataires enregistrés`,
    description: `Ce bouton ouvre la fenêtre de gestion des collectivités — nous allons l'explorer ensemble à l'étape suivante.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-collectivites-modal',
    title: `Fenêtre des collectivités`,
    description: `Cette fenêtre liste les mairies et organismes partenaires enregistrés comme destinataires permanents. Ajoutez une collectivité en renseignant son nom et email. Les adhérents, eux, sont automatiquement récupérés depuis la base de données lors de l'envoi.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(true) },
    actionDelay: 450,
  },
]

  // ── Steps tutoriel ─────────────────────────────────────────────────────────
  const fakeEvent = events[0] ?? null

  const evtSteps = useMemo(() => EVENEMENTS_TUTORIAL_STEPS(
    () => { setEditingId(null); setNewEvent(initialEventState); setActiveTab('events'); setShowForm(true) },
    () => { setShowForm(false); setEditingId(null) },
    (open) => {
      if (open && fakeEvent) {
        openComposeModal(fakeEvent)
      } else {
        setComposeModal({ show: false, event: null })
      }
    },
    (open) => {
      if (open) setCollectivitesModal(true)
      else setCollectivitesModal(false)
    }
  ), [fakeEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-black uppercase text-xs tracking-widest">Chargement...</div>

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 data-tutorial="evt-header" className="text-2xl md:text-4xl font-black text-slate-900 flex items-center gap-4">
          <div className="p-3 bg-[#1a5f7a] rounded-[1.2rem] shadow-lg text-white"><Megaphone size={28} /></div>
          <span>Gestion de la <span className="text-[#1a5f7a]">Communication</span></span>
        </h1>
        {activeTab === 'events' && (
          <button data-tutorial="evt-add-btn" onClick={editingId ? cancelEdit : () => setShowForm(!showForm)} className={"px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl whitespace-nowrap " + (showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white')}>
            {showForm ? "Fermer" : "Nouvel Événement"}
          </button>
        )}
      </div>

      {/* Onglets pleine largeur, style carte dashboard */}
      <div data-tutorial="evt-tabs" className="max-w-7xl mx-auto flex gap-3 w-full mb-8">
        <button
          onClick={() => setActiveTab('events')}
          className={"flex-1 flex flex-col items-center gap-3 py-6 rounded-[2rem] border-2 border-b-4 transition-all " +
            (activeTab === 'events'
              ? 'bg-[#1a5f7a]/10 border-slate-100 border-b-[#1a5f7a] shadow-sm'
              : 'bg-white border-slate-100 border-b-transparent hover:bg-slate-50')}>
          <div className="p-3 rounded-2xl bg-[#1a5f7a]/10 text-[#1a5f7a]">
            <Calendar size={22} />
          </div>
          <span className={"font-black uppercase text-[10px] tracking-widest " + (activeTab === 'events' ? 'text-[#1a5f7a]' : 'text-slate-500')}>
            Événements
          </span>
        </button>
        <button
          onClick={() => setActiveTab('affiche')}
          className={"flex-1 flex flex-col items-center gap-3 py-6 rounded-[2rem] border-2 border-b-4 transition-all " +
            (activeTab === 'affiche'
              ? 'bg-[#e38154]/10 border-slate-100 border-b-[#e38154] shadow-sm'
              : 'bg-white border-slate-100 border-b-transparent hover:bg-slate-50')}>
          <div className="p-3 rounded-2xl bg-[#e38154]/10 text-[#e38154]">
            <ImagePlus size={22} />
          </div>
          <span className={"font-black uppercase text-[10px] tracking-widest " + (activeTab === 'affiche' ? 'text-[#e38154]' : 'text-slate-500')}>
            Générateur d'affiches
          </span>
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={"flex-1 flex flex-col items-center gap-3 py-6 rounded-[2rem] border-2 border-b-4 transition-all " +
            (activeTab === 'posts'
              ? 'bg-emerald-500/10 border-slate-100 border-b-emerald-500 shadow-sm'
              : 'bg-white border-slate-100 border-b-transparent hover:bg-slate-50')}>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Megaphone size={22} />
          </div>
          <span className={"font-black uppercase text-[10px] tracking-widest " + (activeTab === 'posts' ? 'text-emerald-600' : 'text-slate-500')}>
            Posts
          </span>
        </button>
      </div>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'affiche' && (
          <GenerateurAffiche events={events} onCreateEvent={handleCreateEventFromAffiche} />
        )}
        {activeTab === 'posts' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 pb-6 border-b border-slate-50 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-500">
                <Share2 size={22} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">Nouveau post</h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Publier directement sur Facebook & Instagram, sans lien avec un événement</p>
              </div>
            </div>

            <div className="p-8 space-y-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Message</label>
                <textarea
                  rows={8}
                  placeholder="Rédigez votre publication..."
                  className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a] resize-y"
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Photo (optionnel)</label>
                <input
                  placeholder="Lien URL de l'image..."
                  className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-[10px] outline-none"
                  value={postImageUrl}
                  onChange={e => setPostImageUrl(e.target.value)}
                />
                <div className="border-4 border-dashed border-slate-50 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50/50">
                  {postImageUrl && <img src={postImageUrl} className="h-32 object-contain mb-4" alt="Aperçu" />}
                  <label className="cursor-pointer bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase text-[#1a5f7a]">
                    {postUploading ? "Chargement..." : "Uploader un fichier"}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePostFileUpload} />
                  </label>
                </div>
              </div>

              <SocialPostPreview text={postText} imageUrl={postImageUrl} />

              {postSuccess ? (
                <div className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Publié avec succès !
                </div>
              ) : (
                <button
                  onClick={handlePublishPost}
                  disabled={publishingPost || !postText.trim()}
                  className={'w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg ' +
                    (publishingPost || !postText.trim()
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-[#e38154] text-white hover:bg-[#c96e3e] cursor-pointer')}>
                  {publishingPost ? <><Loader2 size={16} className="animate-spin" /> Publication...</> : <><Share2 size={16} /> Publier</>}
                </button>
              )}
            </div>
          </div>
        )}
        {activeTab === 'events' && (<>
        {showForm && (
          <form data-tutorial="evt-form" onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-50 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div data-tutorial="evt-form-details" className="space-y-6">
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
                
                <div data-tutorial="evt-form-affiche" className="space-y-4">
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

              <div data-tutorial="evt-form-description" className="space-y-6 flex flex-col">
                <h3 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2"><AlignLeft size={16} /> Description</h3>
                <textarea data-tutorial="evt-form-description" placeholder="Détails..." className="w-full p-6 rounded-[2rem] bg-slate-50 font-medium text-sm outline-none flex-1 min-h-[200px]" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                <button data-tutorial="evt-form-submit" type="submit" disabled={uploading} className="w-full py-6 mt-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl bg-[#1a5f7a] text-white">
                  Enregistrer l'événement
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="flex justify-end mb-6">
          <div data-tutorial="evt-view-toggle" className="flex bg-slate-100 rounded-2xl p-1 gap-1">
            <button onClick={() => setViewMode('grid')} title="Vue grille"
              className={"p-3 rounded-xl transition-all " + (viewMode === 'grid' ? 'bg-white text-[#1a5f7a] shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} title="Vue liste"
              className={"p-3 rounded-xl transition-all " + (viewMode === 'list' ? 'bg-white text-[#1a5f7a] shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
              <List size={16} />
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, idx) => (
            <div key={event.id} {...(idx === 0 ? {"data-tutorial": "evt-list-card1"} : idx === 1 ? {"data-tutorial": "evt-list-card2"} : {})} className={"bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl transition-all " + (isPastEvent(event) ? "grayscale-[60%] opacity-75 hover:grayscale-[20%] hover:opacity-90" : "")}>
              <div className="h-48 bg-slate-50 relative flex items-center justify-center p-4">
                {event.image_url ? <img src={event.image_url} className="max-w-full max-h-full object-contain" alt="" /> : <ImageIcon size={48} className="text-slate-200" />}
                {isPastEvent(event) && (
                  <div className="absolute top-4 left-4 bg-slate-500/70 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Passé
                  </div>
                )}
                <div className="evt-card-actions absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button data-tutorial="evt-action-edit" onClick={() => startEdit(event)} className="p-2.5 bg-white text-slate-400 rounded-xl shadow-lg hover:bg-[#1a5f7a] hover:text-white transition-all"><Edit2 size={16} /></button>
                  <button data-tutorial="evt-action-mail" onClick={() => openComposeModal(event)} className="p-2.5 bg-white text-amber-500 rounded-xl shadow-lg hover:bg-amber-500 hover:text-white transition-all"><Mail size={16} /></button>
                  <button data-tutorial="evt-action-share" onClick={() => openFbModal(event)} title="Publier sur Facebook & Instagram" className="p-2.5 bg-white text-blue-500 rounded-xl shadow-lg hover:bg-blue-500 hover:text-white transition-all"><Share2 size={16} /></button>
                  {isPastEvent(event) && (
                    <button data-tutorial="evt-action-bilan" onClick={() => openBilanModal(event)} title="Bilan de l'événement" className="p-2.5 bg-white text-emerald-500 rounded-xl shadow-lg hover:bg-emerald-500 hover:text-white transition-all"><BarChart2 size={16} /></button>
                  )}
                  {isPastEvent(event) && hasBilan(event) ? (
                    <button onClick={() => archiveEvent(event.id)} title="Archiver" className="p-2.5 bg-white text-amber-500 rounded-xl shadow-lg hover:bg-amber-500 hover:text-white transition-all"><Archive size={16} /></button>
                  ) : (
                    <button onClick={() => setDeleteModal({show: true, id: event.id, title: event.title})} className="p-2.5 bg-white text-slate-400 rounded-xl shadow-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                  )}
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
        ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {events.map((event) => (
            <div key={event.id} className={"flex items-center flex-wrap gap-4 p-4 md:p-5 group transition-all " + (isPastEvent(event) ? "grayscale-[60%] opacity-75 hover:grayscale-[20%] hover:opacity-90" : "")}>
              <div className="w-16 h-16 rounded-xl bg-slate-50 relative flex items-center justify-center overflow-hidden shrink-0">
                {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-slate-200" />}
                {isPastEvent(event) && (
                  <div className="absolute top-0.5 left-0.5 bg-slate-500/70 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Passé
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-900 uppercase truncate">{event.title}</h3>
                  {event.mail_sent_at && (
                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-[7px] font-black uppercase rounded-full shrink-0 flex items-center gap-1">
                      <Send size={8} /> Diffusé
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-[9px] font-black uppercase text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} className="text-[#1a5f7a]" />
                    {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex items-center gap-1.5"><MapPin size={11} className="text-[#e38154]" /> {event.location}</span>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                <button onClick={() => startEdit(event)} className="min-h-11 min-w-11 flex items-center justify-center p-2 text-slate-400 rounded-lg hover:bg-[#1a5f7a] hover:text-white transition-all"><Edit2 size={15} /></button>
                <button onClick={() => openComposeModal(event)} className="min-h-11 min-w-11 flex items-center justify-center p-2 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"><Mail size={15} /></button>
                <button onClick={() => openFbModal(event)} title="Publier sur Facebook & Instagram" className="min-h-11 min-w-11 flex items-center justify-center p-2 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Share2 size={15} /></button>
                {isPastEvent(event) && (
                  <button onClick={() => openBilanModal(event)} title="Bilan de l'événement" className="min-h-11 min-w-11 flex items-center justify-center p-2 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><BarChart2 size={15} /></button>
                )}
                {isPastEvent(event) && hasBilan(event) ? (
                  <button onClick={() => archiveEvent(event.id)} title="Archiver" className="min-h-11 min-w-11 flex items-center justify-center p-2 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"><Archive size={15} /></button>
                ) : (
                  <button onClick={() => setDeleteModal({show: true, id: event.id, title: event.title})} className="min-h-11 min-w-11 flex items-center justify-center p-2 text-slate-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
        </>)}
      </main>
      
      {/* MODALE COMPOSITION EMAIL */}
      {composeModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div data-tutorial="evt-compose-modal" className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            
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
                <div data-tutorial="evt-compose-tabs" className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-fit">
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
              <div data-tutorial="evt-compose-events" className="space-y-3">
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
              <div data-tutorial="evt-compose-recipients" className="space-y-3">
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
              <button data-tutorial="evt-compose-send" onClick={handleSendMail} disabled={sendingMail || composeData.recipients.filter(r => r.checked).length === 0}
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
          data-tutorial="evt-collectivites-btn"
          onClick={() => setCollectivitesModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-200 transition-colors shadow-sm">
          <Building2 size={14} /> Destinataires enregistrés
        </button>
      </div>

      {/* SECTION ÉVÉNEMENTS ARCHIVÉS */}
      <div data-tutorial="evt-archived" className="max-w-7xl mx-auto mt-6 mb-10 px-4 md:px-0">
        <button
          onClick={() => setArchivedOpen(v => !v)}
          className="w-full flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-amber-200 transition-colors">
          <span className="flex items-center gap-3 font-black uppercase text-xs text-slate-700">
            <Archive size={16} className="text-amber-500" /> Événements archivés
            <span className="text-[9px] font-bold text-slate-400 normal-case">({archivedEvents.length})</span>
          </span>
          {archivedOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {archivedOpen && (
          <div className="mt-4 space-y-3">
            {archivedEvents.length === 0 ? (
              <p className="text-center text-[10px] text-slate-400 py-6">Aucun événement archivé</p>
            ) : (
              archivedEvents.map(event => (
                <div key={event.id} className="flex items-center flex-wrap gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-slate-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 uppercase truncate">{event.title}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · {event.location}
                    </p>
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                    <button onClick={() => openBilanModal(event)} title="Bilan de l'événement" className="min-h-11 min-w-11 flex items-center justify-center p-2.5 bg-slate-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"><BarChart2 size={16} /></button>
                    <button onClick={() => unarchiveEvent(event.id)} title="Désarchiver" className="min-h-11 min-w-11 flex items-center justify-center p-2.5 bg-slate-50 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all"><ArchiveRestore size={16} /></button>
                    <button onClick={() => setDeleteModal({show: true, id: event.id, title: event.title})} title="Supprimer définitivement" className="min-h-11 min-w-11 flex items-center justify-center p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODALE GESTION COLLECTIVITÉS */}
      {collectivitesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div data-tutorial="evt-collectivites-modal" className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">

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


      {/* Force l'affichage des boutons de carte pendant le tutoriel */}
      {showTuto && (
        <style>{`.evt-card-actions { opacity: 1 !important; }`}</style>
      )}

      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={evtSteps}
        open={showTuto}
        onClose={() => {
          setShowTuto(false)
          setShowForm(false)
          setComposeModal({ show: false, event: null })
          setCollectivitesModal(false)
        }}
      />

      {/* MODALE PUBLICATION FACEBOOK & INSTAGRAM */}
      {fbModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">

            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-[2.5rem] p-8 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"><Share2 size={20} /></div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">Publier sur Facebook & Instagram</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fbModal.event?.title}</p>
                </div>
              </div>
              <button onClick={() => setFbModal({ show: false, event: null })}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 flex-1">

              {/* Aperçu affiche */}
              {fbModal.event?.image_url && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Affiche jointe</label>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                    <img src={fbModal.event.image_url} alt="Affiche" className="w-12 h-16 object-cover rounded-lg shadow-sm" />
                    <div>
                      <p className="text-xs font-bold text-blue-800">Image publiée automatiquement</p>
                      <p className="text-[9px] text-blue-400 mt-0.5">Format JPEG requis par Instagram</p>
                    </div>
                  </div>
                </div>
              )}

              {!fbModal.event?.image_url && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-wide">⚠️ Aucune affiche — publication texte uniquement</p>
                  <p className="text-[9px] text-amber-500 mt-1">Instagram requiert une image. Sans affiche, seul Facebook sera publié.</p>
                </div>
              )}

              <SocialPostPreview text={fbText} imageUrl={fbModal.event?.image_url} />

              {/* Texte du post */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a5f7a] uppercase tracking-widest">Texte du post</label>
                <textarea
                  rows={10}
                  className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-blue-400 resize-y"
                  value={fbText}
                  onChange={e => setFbText(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white rounded-b-[2.5rem] p-8 pt-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setFbModal({ show: false, event: null })}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              {fbSuccess ? (
                <div className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} /> Publié avec succès !
                </div>
              ) : (
                <button onClick={handlePublishFb} disabled={publishingFb || !fbText}
                  className={'flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ' +
                    (publishingFb || !fbText ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600')}>
                  {publishingFb ? <><Loader2 size={14} className="animate-spin" /> Publication...</> : <><Share2 size={14} /> Publier</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE BILAN D'ÉVÉNEMENT */}
      {bilanModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">

            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-[2.5rem] p-8 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl"><BarChart2 size={20} /></div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">Bilan de l'événement</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{bilanModal.event?.title}</p>
                </div>
              </div>
              <button onClick={closeBilanModal} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-8 flex-1">

              {/* SECTION PARTICIPANTS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} /> Participants
                </h4>
                <div className="flex gap-3">
                  <input
                    type="number" min={0} placeholder="Nombre de participants"
                    className="flex-1 p-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                    value={bilanParticipants}
                    onChange={e => setBilanParticipants(e.target.value)}
                  />
                  <button onClick={saveParticipants} disabled={savingParticipants}
                    className={'px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ' +
                      (savingParticipants ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#1a5f7a] text-white hover:bg-[#134a5e]')}>
                    {savingParticipants ? <Loader2 size={14} className="animate-spin" /> : 'Enregistrer'}
                  </button>
                </div>
              </div>

              {/* SECTION PHOTOS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} /> Photos
                </h4>

                {bilanPhotoFiles.length > 0 ? (
                  <div className="space-y-4 bg-slate-50 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        Photo {bilanPhotoIndex + 1} / {bilanPhotoFiles.length} — dessinez des rectangles pour flouter
                      </p>
                      <button onClick={cancelPhotoQueue} className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-400 transition-colors">
                        Annuler
                      </button>
                    </div>
                    <canvas
                      ref={blurCanvasRef}
                      className="w-full max-w-full rounded-2xl border-2 border-dashed border-slate-200 cursor-crosshair touch-none"
                      onMouseDown={e => handlePointerDown(e.clientX, e.clientY)}
                      onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
                      onMouseUp={e => handlePointerUp(e.clientX, e.clientY)}
                      onMouseLeave={() => { dragStartRef.current = null }}
                      onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; handlePointerDown(t.clientX, t.clientY) }}
                      onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; handlePointerMove(t.clientX, t.clientY) }}
                      onTouchEnd={e => { e.preventDefault(); const t = e.changedTouches[0]; handlePointerUp(t.clientX, t.clientY) }}
                    />
                    <div className="flex flex-wrap gap-3">
                      <button onClick={applyBlur} disabled={!hasPendingRects}
                        className={'flex-1 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ' +
                          (hasPendingRects ? 'bg-[#e38154] text-white hover:bg-[#c96e3e]' : 'bg-slate-100 text-slate-300 cursor-not-allowed')}>
                        Appliquer le flou
                      </button>
                      <button onClick={resetBlur}
                        className="flex-1 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
                        Réinitialiser
                      </button>
                      <button onClick={goToNextPhoto} disabled={uploadingBilanPhotos}
                        className="flex-1 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest bg-[#1a5f7a] text-white hover:bg-[#134a5e] transition-all flex items-center justify-center gap-2">
                        {uploadingBilanPhotos
                          ? <><Loader2 size={12} className="animate-spin" /> Envoi...</>
                          : (bilanPhotoIndex + 1 < bilanPhotoFiles.length ? 'Photo suivante →' : 'Terminer et uploader')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-4 border-dashed border-slate-50 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50/50">
                    <label className="cursor-pointer bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase text-[#1a5f7a]">
                      Ajouter des photos
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFilesSelected} />
                    </label>
                    <p className="text-[9px] text-slate-300 mt-3 text-center">Chaque photo passe par un éditeur de floutage avant l'envoi.</p>
                  </div>
                )}

                {bilanPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                    {bilanPhotos.map(photo => (
                      <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 group">
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => deleteBilanPhoto(photo)}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 text-rose-500 rounded-lg shadow opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION JEUX JOUÉS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2">
                  <Dice5 size={14} /> Jeux joués
                </h4>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    placeholder="Rechercher un jeu sur MyLudo..."
                    className="w-full pl-11 pr-10 py-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]"
                    value={gameSearchQuery}
                    onChange={e => handleGameSearchChange(e.target.value)}
                  />
                  {gameSearchLoading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1a5f7a] animate-spin" />}

                  {gameSearchResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-64 overflow-y-auto">
                      {gameSearchResults.map(result => (
                        <div key={result.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {result.image ? <img src={result.image} alt="" className="w-full h-full object-cover" /> : <Dice5 size={16} className="text-slate-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{result.name}</p>
                            {result.year && <p className="text-[9px] text-slate-400">{result.year}</p>}
                          </div>
                          <button onClick={() => addGameToBilan(result)} disabled={addingGameId === result.id}
                            className="shrink-0 px-3 py-2 bg-[#1a5f7a]/10 text-[#1a5f7a] rounded-xl text-[9px] font-black uppercase hover:bg-[#1a5f7a]/20 transition-colors flex items-center gap-1">
                            {addingGameId === result.id ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Ajouter</>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {bilanGames.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {bilanGames.map(game => (
                      <div key={game.id} className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 p-3 flex flex-col items-center text-center">
                        <button onClick={() => deleteBilanGame(game.id)}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-white text-rose-400 rounded-lg shadow hover:bg-rose-50 transition-colors z-10">
                          <Trash2 size={12} />
                        </button>
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-white flex items-center justify-center mb-2">
                          {game.image_url ? <img src={game.image_url} alt={game.name} className="w-full h-full object-contain" /> : <Dice5 size={28} className="text-slate-200" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 line-clamp-2">{game.name}</p>
                        {game.in_catalogue && (
                          <span className="mt-1 bg-emerald-500 text-white text-[7px] font-black uppercase px-2 py-1 rounded-full">Dispo à la ludothèque</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION PUBLIER SUR LES RÉSEAUX */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                  <Share2 size={14} /> Publier sur les réseaux
                </h4>

                <textarea
                  rows={8}
                  className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-blue-400 resize-y"
                  value={bilanFbText}
                  onChange={e => setBilanFbText(e.target.value)}
                />

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Photo à publier</label>
                  {bilanPhotos.length === 0 ? (
                    <p className="text-[10px] text-slate-300 italic px-1">Ajoutez d'abord des photos dans la section Photos.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {bilanPhotos.map(photo => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setBilanSelectedPhotoUrl(photo.url)}
                          className={'w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ' +
                            (bilanSelectedPhotoUrl === photo.url ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent opacity-70 hover:opacity-100')}
                        >
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <SocialPostPreview text={bilanFbText} imageUrl={bilanSelectedPhotoUrl} games={bilanGames} />

                {bilanFbSuccess ? (
                  <div className="py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} /> Publié avec succès !
                  </div>
                ) : (
                  <>
                    <button
                      onClick={publishBilanToSocial}
                      disabled={publishingBilanFb || !bilanFbText.trim() || !bilanSelectedPhotoUrl}
                      className={'w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ' +
                        (publishingBilanFb || !bilanFbText.trim() || !bilanSelectedPhotoUrl
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600')}>
                      {publishingBilanFb ? <><Loader2 size={14} className="animate-spin" /> Publication...</> : <><Share2 size={14} /> Publier sur Facebook & Instagram</>}
                    </button>
                    {bilanFbError && (
                      <p className="text-[10px] text-rose-500 font-bold text-center">{bilanFbError}</p>
                    )}
                  </>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white rounded-b-[2.5rem] p-8 pt-4 border-t border-slate-100">
              <button onClick={closeBilanModal}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}