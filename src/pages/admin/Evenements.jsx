import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import GenerateurAffiche from './GenerateurAffiche'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { supabase } from '../../services/supabaseClient'
import { volunteerHeaders } from '../../services/functionHeaders'
import { sendEmail } from '../../services/emailService'
import { useToast } from '../../components/ToastContext'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import MaskIcon from '../../components/site/MaskIcon'
import IconButton from '../../components/admin/IconButton'
import SearchField from '../../components/admin/SearchField'
import ConfirmModal from '../../components/admin/ConfirmModal'
import { DataCard } from '../../components/admin/DataCard'
import { BTN_ORANGE, BTN_INK, BTN_TEAL } from '../../components/admin/buttons'

// Styles des champs du formulaire d'événement, repris de la maquette
const E_SECTION = 'mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em]'
const E_LABEL = 'mb-2 block text-[9px] font-extrabold uppercase italic tracking-[0.14em] text-slate-400'
const E_INPUT = 'w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white'

// Les cinq onglets de l'écran Communication
const COMM_TABS = [
  { id: 'events', label: 'Événements', shadow: '#1a5f7a' },
  { id: 'affiche', label: "Générateur d'affiches", shadow: '#e38154' },
  { id: 'posts', label: 'Posts', shadow: '#10b981' },
  { id: 'jeux', label: 'Nouveaux jeux', shadow: '#f59e0b' },
  { id: 'semaine', label: 'Jeu de la semaine', shadow: '#8b5cf6' },
]
import {
  Calendar, MapPin, Plus, Trash2, Clock, ImageIcon,
  X, Loader2, Type, AlignLeft, Edit2, Mail, Send, CheckCircle2, Users, ChevronDown, ChevronUp, PlusCircle, Paperclip, GripVertical, Building2, Trash, Share2, BarChart2, Search, Dice5, Archive, ArchiveRestore, LayoutGrid, List, Copy,
  Newspaper, School
} from 'lucide-react'
import ModelesMessages from '../../components/admin/ModelesMessages'
import SocialPostPreview from '../../components/admin/SocialPostPreview'
import useApercusCarres from '../../hooks/useApercusCarres'
import NouveauxJeux from '../../components/admin/NouveauxJeux'
import JeuSemaine from '../../components/admin/JeuSemaine'
import { chargerFileJeuSemaine } from '../../services/jeuSemaineFile'
import { chargerJeuxAAnnoncer } from '../../services/nouveauxJeux'
import { copierJaquette } from '../../services/diapos/jaquettes'
import { typeEvenement as getEventType, sansAccents } from '../../services/diapos/regles'
import PublicationBilan from '../../components/admin/bilan/PublicationBilan'
import PublicationBilanPermanence from '../../components/admin/bilan/PublicationBilanPermanence'
import { estPermanence } from '../../services/diapos/permanence-regles'
import PublicationAnnonce from '../../components/admin/annonce/PublicationAnnonce'
import { uploadSquareVersion, publierSurReseaux } from '../../services/reseauxSociaux'
import { blocDeFloutage, pixelateRegion, COTE_MAX_PHOTO } from '../../services/floutage'

// Destinataires enregistrés : trois catégories, chacune avec son propre texte
// d'annonce. À l'envoi, seules les mairies sont cochées d'office (choix de
// Victor) : la presse et les écoles se cochent à la demande.
const CATEGORIES_CONTACT = [
  { id: 'mairie', label: 'Mairie', groupe: 'Mairies & Collectivités' },
  { id: 'presse', label: 'Presse', groupe: 'Presse' },
  { id: 'ecole', label: 'École', groupe: 'Écoles' },
]
const CONTACT_VIDE = { nom: '', email: '', categorie: 'mairie' }

// Onglets de la fenêtre d'envoi : un texte par public
const MAIL_TABS = [
  { id: 'collectivites', label: 'Mairies', icon: Building2, field: 'bodyCollectivites', groups: ['mairie'], aide: "Message envoyé aux mairies & collectivités — invite à communiquer sur l'événement" },
  { id: 'presse', label: 'Presse', icon: Newspaper, field: 'bodyPresse', groups: ['presse'], aide: "Message envoyé à la presse — annonce l'événement et invite à venir" },
  { id: 'ecole', label: 'École', icon: School, field: 'bodyEcole', groups: ['ecole'], aide: 'Message envoyé aux écoles — à transmettre aux familles' },
  { id: 'adherents', label: 'Adhérents', icon: Users, field: 'bodyAdherents', groups: ['adherent', 'abonne'], aide: 'Message envoyé aux adhérents et aux inscrits aux dates — invite à venir participer' },
]

/** Groupe repliable de contacts enregistrés dans la fenêtre d'envoi (mairies, presse, écoles). */
function GroupeContacts({ titre, destinataires, ouvert, onBasculerOuvert, onBasculerGroupe, onBasculerContact }) {
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <button
        onClick={onBasculerOuvert}
        className="flex w-full items-center justify-between border-b-2 border-[#0f172a] bg-[#fdfaf6] p-4 transition-colors hover:bg-slate-100"
      >
        <div className="flex items-center gap-3">
          <input type="checkbox" readOnly
            checked={destinataires.every(r => r.checked)}
            onClick={e => { e.stopPropagation(); onBasculerGroupe() }}
            className="w-4 h-4 accent-[#1a5f7a] cursor-pointer"
          />
          <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{titre}</span>
          <span className="text-[9px] font-bold text-slate-400">
            ({destinataires.filter(r => r.checked).length}/{destinataires.length})
          </span>
        </div>
        {ouvert ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {ouvert && (
        <div className="divide-y divide-slate-50">
          {destinataires.map(r => (
            <label key={r.email} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer sm:px-5">
              <input type="checkbox" checked={r.checked} onChange={() => onBasculerContact(r.email)}
                className="w-4 h-4 accent-[#1a5f7a] cursor-pointer flex-shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs font-bold text-slate-700 sm:flex-1">{r.label}</span>
                <span className="break-all text-[9px] text-slate-400">{r.email}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const VIEW_MODE_STORAGE_KEY = 'evenements_view_mode'

// ─── Helpers MyLudo (via Edge Function Supabase — même pattern que Jeux.tsx) ──
const BGG_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`

async function bggCall(endpoint, params) {
  const qs = new URLSearchParams({ endpoint, ...params }).toString()
  const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, {
    headers: await volunteerHeaders(),
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

const buildBilanFbText = (event, participantsOverride, games = []) => {
  const moment = getEventType(event.title) === 'soiree' ? 'soirée' : 'après-midi'
  const raw = participantsOverride !== undefined ? participantsOverride : event.participants_count
  const count = raw !== null && raw !== undefined && raw !== '' ? raw : 0
  const names = games.map(g => g.name).filter(Boolean)
  const gamesLine = names.length > 0 ? `\n\n🃏 Jeux joués : ${names.join(', ')}.` : ''
  return `🎲 ${event.title} — Retour sur notre dernière édition !

👥 ${count} personnes nous ont rejoints pour cette ${moment}.${gamesLine}

Merci à tous les participants ! On se retrouve très vite pour la prochaine édition 🎉

Ludothèque de Coligny
www.ludothequedecoligny.fr`
}

export default function Evenements() {
  const { addToast } = useToast()
  // Adresse ouverte depuis un rappel sur téléphone : ?annonce=<id> ou ?bilan=<id>
  const [searchParams, setSearchParams] = useSearchParams()
  const adresseTraitee = useRef(null)
  const [events, setEvents] = useState([])
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'affiche' | 'posts' | 'jeux' | 'semaine'
  const [loading, setLoading] = useState(true)
  // Compteurs des badges d'onglets
  const [templatesCount, setTemplatesCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)
  const [jeuxAAnnoncerCount, setJeuxAAnnoncerCount] = useState(0)
  const [jeuSemaineCount, setJeuSemaineCount] = useState(0)
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
  const [composeData, setComposeData] = useState({ subject: '', bodyCollectivites: '', bodyPresse: '', bodyEcole: '', bodyAdherents: '', recipients: [] })
  const [activeMailTab, setActiveMailTab] = useState('collectivites') // un des MAIL_TABS
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [sendingMail, setSendingMail] = useState(false)
  // Fenêtre « Annonce » (carrousel Facebook/Instagram et story du jour J)
  const [fbModal, setFbModal] = useState({ show: false, event: null })
  const [fbText, setFbText] = useState('')
  // Publication en cours : la fenêtre ne se ferme pas, pour que le résultat reste visible
  const [annonceEnPublication, setAnnonceEnPublication] = useState(false)
  const fermerAnnonce = () => { if (!annonceEnPublication) setFbModal({ show: false, event: null }) }
  // Post Facebook/Instagram autonome (sans événement lié)
  const [postText, setPostText] = useState('')
  const [postImageUrl, setPostImageUrl] = useState('')
  const [postUploading, setPostUploading] = useState(false)
  const [publishingPost, setPublishingPost] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  // Aperçus fidèles : images mises au carré sur le fond bois, comme à la publication
  const apercuPost = useApercusCarres(postImageUrl ? [postImageUrl] : [])
  const [groupesOuverts, setGroupesOuverts] = useState({ mairie: true, presse: true, ecole: true })
  const [modelesOpen, setModelesOpen] = useState(false)
  const [showAdherents, setShowAdherents] = useState(true)
  const [showAbonnes, setShowAbonnes] = useState(true)
  const [selectedEvents, setSelectedEvents] = useState([])
  const [showEventPicker, setShowEventPicker] = useState(false)
  const [collectivites, setCollectivites] = useState([])
  const [collectivitesModal, setCollectivitesModal] = useState(false)
  const [newCollectivite, setNewCollectivite] = useState(CONTACT_VIDE)
  const [editingCollectivite, setEditingCollectivite] = useState(null)
  const [showTuto, setShowTuto] = useState(false)
  // Import de description depuis un événement précédent
  const [showImportDesc, setShowImportDesc] = useState(false)
  const [importDescSearch, setImportDescSearch] = useState('')

  // Modale de bilan d'événement passé
  const [bilanModal, setBilanModal] = useState({ show: false, event: null })
  // Publication du bilan d'une permanence en cours : la fenêtre ne se ferme pas
  const [bilanEnPublication, setBilanEnPublication] = useState(false)
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
  // Recherche de jeux joués : la collection de la ludothèque d'abord, MyLudo ensuite
  const [gameSearchQuery, setGameSearchQuery] = useState('')
  const [gameSearchResults, setGameSearchResults] = useState([])
  const [catalogueResults, setCatalogueResults] = useState([])
  const catalogueRef = useRef(null) // [{ id, name, image_url, cle }] chargé à l'ouverture d'un bilan
  const [gameSearchLoading, setGameSearchLoading] = useState(false)
  const [addingGameId, setAddingGameId] = useState(null)
  const gameSearchDebounceRef = useRef(null)
  // Publication du bilan sur Facebook & Instagram
  const [bilanFbText, setBilanFbText] = useState('')
  const [bilanFbTextEdited, setBilanFbTextEdited] = useState(false)

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
    // On archive d'abord les événements trop anciens, puis on charge la liste,
    // pour qu'ils apparaissent tout de suite au bon endroit.
    archiveOldEvents().then(nb => {
      if (nb > 0) addToast(`${nb} événement${nb > 1 ? 's' : ''} de plus de trois mois archivé${nb > 1 ? 's' : ''}.`, 'success')
      fetchEvents()
      fetchArchivedEvents()
    })
    fetchPhotoEventIds()
  }, [])

  // ── Compteurs des badges d'onglets ──────────────────────────────────────────
  useEffect(() => {
    async function fetchCounters() {
      const { count: tmplCount, error: tmplError } = await supabase
        .from('affiche_templates')
        .select('*', { count: 'exact', head: true })
      if (!tmplError) setTemplatesCount(tmplCount || 0)

      // Table "posts" facultative — si elle n'existe pas, on ignore silencieusement
      // et le badge ne s'affiche simplement pas.
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { count: pCount, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth)
      if (!postsError) setPostsCount(pCount || 0)

      chargerJeuxAAnnoncer()
        .then(({ aAnnoncer }) => setJeuxAAnnoncerCount(aAnnoncer.length))
        .catch(() => {})   // badge simplement absent

      chargerFileJeuSemaine()
        .then(({ attente }) => setJeuSemaineCount(attente.length))
        .catch(() => {})   // badge simplement absent
    }
    fetchCounters()
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

  // Événements passés ou archivés ayant une description à importer — réutilise les listes déjà chargées
  const importableEvents = useMemo(() => {
    const now = new Date()
    const seen = new Set()
    return [...events, ...archivedEvents]
      .filter(e => (new Date(e.date) < now || e.archived_at) && e.description && e.description.trim() !== '')
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [events, archivedEvents])

  const filteredImportableEvents = importableEvents.filter(e =>
    !importDescSearch.trim() || e.title.toLowerCase().includes(importDescSearch.trim().toLowerCase())
  )

  const importDescriptionFrom = (event) => {
    setNewEvent(prev => ({ ...prev, description: event.description }))
    setShowImportDesc(false)
    setImportDescSearch('')
  }

  // Archivage automatique des événements passés depuis plus de trois mois.
  // Ils ne sont plus supprimés : ils rejoignent simplement les archives, où ils
  // restent consultables et désarchivables. Ce ménage tournait auparavant sur la
  // page d'accueil publique — donc à chaque visite d'un inconnu, et en
  // supprimant réellement les événements. Il se fait désormais ici, à
  // l'ouverture de l'écran Communication, par un bénévole connecté.
  const archiveOldEvents = async () => {
    const troisMois = new Date()
    troisMois.setMonth(troisMois.getMonth() - 3)
    const { data, error } = await supabase
      .from('events')
      .update({ archived_at: new Date().toISOString() })
      .lt('date', troisMois.toISOString())
      .is('archived_at', null)
      .select('id')
    if (error) { console.warn('Archivage automatique impossible :', error.message); return 0 }
    return data?.length || 0
  }

  const archiveEvent = async (eventId) => {
    await supabase.from('events').update({ archived_at: new Date().toISOString() }).eq('id', eventId)
    fetchEvents()
    fetchArchivedEvents()
    addToast('Événement archivé avec succès.', 'success')
  }

  const unarchiveEvent = async (eventId) => {
    await supabase.from('events').update({ archived_at: null }).eq('id', eventId)
    fetchEvents()
    fetchArchivedEvents()
    addToast('Événement désarchivé avec succès.', 'success')
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
      addToast("Erreur upload", 'error')
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
      addToast("Erreur de lecture du fichier", 'error')
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

    let error = null;

    if (editingId) {
      const { error: err } = await supabase.from('events').update(eventToSave).eq('id', editingId).select()
      error = err
    } else {
      const { error: err } = await supabase.from('events').insert([eventToSave]).select()
      error = err
    }
    
    if (error) {
        addToast("Erreur d'enregistrement : " + error.message, 'error')
    } else {
        cancelEdit()
        fetchEvents()
        addToast(editingId ? 'Événement modifié avec succès.' : 'Événement créé avec succès.', 'success')
    }
  }

  const fetchCollectivites = async () => {
    const { data } = await supabase.from('collectivites').select('*').order('nom')
    if (data) setCollectivites(data.map(c => ({ id: c.id, email: c.email, label: c.nom, categorie: c.categorie || 'mairie' })))
  }

  useEffect(() => { fetchCollectivites() }, [])

  const saveCollectivite = async () => {
    if (!newCollectivite.nom || !newCollectivite.email) return
    if (editingCollectivite) {
      await supabase.from('collectivites').update({ nom: newCollectivite.nom, email: newCollectivite.email, categorie: newCollectivite.categorie }).eq('id', editingCollectivite)
    } else {
      await supabase.from('collectivites').insert({ nom: newCollectivite.nom, email: newCollectivite.email, categorie: newCollectivite.categorie })
    }
    setNewCollectivite(CONTACT_VIDE)
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

    const avecAffiche = eventsBlocks.some(b => b.event.image_url)

    const bodyPresse = `Bonjour,

La ludothèque de Coligny (association PACTES) organise ${n > 1 ? 'les événements suivants, ouverts' : "l'événement suivant, ouvert"} à tous :

[BLOCS_EVENEMENTS]

${avecAffiche ? "Vous trouverez l'affiche en pièce jointe. " : ''}Nous serions heureux que vous puissiez ${n > 1 ? 'les annoncer' : "l'annoncer"} dans vos pages, ou venir nous rencontrer sur place pour un reportage.

Je reste à votre disposition pour tout renseignement.

Bien cordialement,

Victor Guyon
Ludothèque de Coligny – association PACTES
06 71 41 56 96`

    const bodyEcole = `Bonjour,

La ludothèque de Coligny (association PACTES) organise ${n > 1 ? 'les événements suivants, ouverts' : "l'événement suivant, ouvert"} à tous, petits et grands :

[BLOCS_EVENEMENTS]

Pourriez-vous transmettre cette information aux familles de l'école (cahier de liaison, panneau d'affichage ou messagerie de l'école) ?${avecAffiche ? " L'affiche est jointe à ce message." : ''}

Merci beaucoup pour votre aide.

Bonne journée,

Victor Guyon
Ludothèque de Coligny – association PACTES
06 71 41 56 96`

    const bodyAdherents = `Bonjour,

Nous avons le plaisir de vous inviter à ${n > 1 ? 'nos prochains événements' : 'notre prochain événement'} :

[BLOCS_EVENEMENTS]

${n > 1 ? 'Ces événements sont' : "Cet événement est"} ouvert${n > 1 ? 's' : ''} à tous, n'hésitez pas à en parler autour de vous !

Nous espérons vous y retrouver nombreux.

À très bientôt,

L'équipe de la Ludothèque de Coligny
06 71 41 56 96`

    return { bodyCollectivites, bodyPresse, bodyEcole, bodyAdherents, blocksHtml }
  }

  const openComposeModal = async (event) => {
    setLoadingRecipients(true)
    setComposeModal({ show: true, event })
    setSelectedEvents([makeEventBlock(event)])
    setShowEventPicker(false)
    setActiveMailTab('collectivites')
    const subject = `Communication Événement - Association PACTES - ${event.title}`
    const { bodyCollectivites, bodyPresse, bodyEcole, bodyAdherents } = buildBodies([makeEventBlock(event)])
    const bodies = { bodyCollectivites, bodyPresse, bodyEcole, bodyAdherents }
    // Mairies cochées d'office ; presse et écoles décochées (cochées à la demande)
    const contactRecipients = collectivites.map(c => ({ ...c, group: c.categorie, checked: c.categorie === 'mairie' }))
    try {
      const [{ data: members }, { data: abonnes }] = await Promise.all([
        supabase.from('members').select('email, first_name, last_name, refuse_actualites, jeton_desabonnement'),
        supabase.from('abonnes_dates').select('email, jeton_desabonnement').order('created_at'),
      ])
      // Les adhérents qui ont demandé à ne plus recevoir les actualités sont retirés
      const memberRecipients = members
        ? members.filter(m => m.email && m.email.includes('@') && !m.refuse_actualites)
            .map(m => ({ email: m.email, label: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email, group: 'adherent', checked: true, jeton: m.jeton_desabonnement }))
        : []
      // Inscrits aux dates depuis le site : même message que les adhérents.
      // Une adresse déjà connue comme adhérent (même désabonné) n'est pas reprise.
      const adressesAdherents = new Set((members || []).map(m => (m.email || '').trim().toLowerCase()))
      const abonneRecipients = (abonnes || [])
        .filter(a => !adressesAdherents.has(a.email.toLowerCase()))
        .map(a => ({ email: a.email, label: a.email, group: 'abonne', checked: true, jeton: a.jeton_desabonnement }))
      setComposeData({ subject, ...bodies, recipients: [...contactRecipients, ...memberRecipients, ...abonneRecipients] })
    } catch (e) {
      setComposeData({ subject, ...bodies, recipients: contactRecipients })
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
    const { bodyCollectivites, bodyPresse, bodyEcole, bodyAdherents } = buildBodies(newBlocks)
    setComposeData(prev => ({
      ...prev,
      subject: newBlocks.length > 1 ? 'Communication Événements - Association PACTES' : prev.subject,
      bodyCollectivites,
      bodyPresse,
      bodyEcole,
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

  // Dernière ligne de chaque mail : comment ne plus le recevoir (obligation RGPD).
  // Adhérents : lien personnel vers la page /desabonnement (le repère
  // [LIEN_DESABONNEMENT] est remplacé pour chaque destinataire au moment de l'envoi).
  // Collectivités : réponse au mail, qui arrive sur la boîte de la ludothèque.
  const MENTION_DESABONNEMENT = {
    adherent: `Vous recevez ce message en tant qu'adhérent de la ludothèque. <a href="[LIEN_DESABONNEMENT]" style="color:#64748b;">Ne plus recevoir nos actualités</a>`,
    abonne: `Vous recevez ce message car vous avez demandé à recevoir nos prochaines dates. <a href="[LIEN_DESABONNEMENT]" style="color:#64748b;">Ne plus recevoir nos actualités</a>`,
    mairie: "Vous recevez ce message car votre structure figure dans la liste de diffusion de la ludothèque. Pour ne plus le recevoir, répondez simplement à ce mail.",
    presse: "Vous recevez ce message car votre rédaction figure dans la liste de diffusion de la ludothèque. Pour ne plus le recevoir, répondez simplement à ce mail.",
    ecole: "Vous recevez ce message car votre établissement figure dans la liste de diffusion de la ludothèque. Pour ne plus le recevoir, répondez simplement à ce mail.",
  }
  const lienDesabonnement = jeton => jeton
    ? `https://www.ludothequedecoligny.fr/desabonnement?jeton=${encodeURIComponent(jeton)}`
    : 'mailto:ludothequedecoligny@outlook.fr?subject=Ne%20plus%20recevoir%20les%20actualit%C3%A9s'

  const bodyToHtml = (bodyText, blocksHtml, groupe) => {
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
        <p style="margin-top:16px;font-size:11px;line-height:1.5;color:#64748b;">${MENTION_DESABONNEMENT[groupe]}</p>
      </div>
    </div>`
  }

  const handleSendMail = async () => {
    const activeRecipients = composeData.recipients.filter(r => r.checked)
    if (activeRecipients.length === 0) { addToast('Aucun destinataire sélectionné.', 'warning'); return }
    if (selectedEvents.length === 0) { addToast('Aucun événement sélectionné.', 'warning'); return }
    setSendingMail(true)
    try {
      const { blocksHtml } = buildBodies(selectedEvents)
      // Contacts enregistrés : un message par catégorie, identique pour tous
      const htmlContacts = {
        mairie: bodyToHtml(composeData.bodyCollectivites, blocksHtml, 'mairie'),
        presse: bodyToHtml(composeData.bodyPresse, blocksHtml, 'presse'),
        ecole: bodyToHtml(composeData.bodyEcole, blocksHtml, 'ecole'),
      }
      const htmlAdherents = bodyToHtml(composeData.bodyAdherents, blocksHtml, 'adherent')
      const htmlAbonnes = bodyToHtml(composeData.bodyAdherents, blocksHtml, 'abonne')
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
        const estContact = r.group in htmlContacts
        const html = estContact
          ? htmlContacts[r.group]
          : (r.group === 'abonne' ? htmlAbonnes : htmlAdherents).replaceAll('[LIEN_DESABONNEMENT]', lienDesabonnement(r.jeton))
        try {
          await sendEmail({
            to: [r.email],
            subject: composeData.subject,
            html,
            image_urls,
            ...(!estContact ? { calendar_events: calendarEvents } : {}),
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
      addToast(`Email envoyé avec succès à ${activeRecipients.length} destinataire${activeRecipients.length > 1 ? 's' : ''}.`, 'success')
    } catch (err) {
      console.error('Erreur envoi:', err)
      addToast("Erreur lors de l'envoi. Vérifiez la console.", 'error')
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
    setAnnonceEnPublication(false)
    setFbModal({ show: true, event })
  }

  const handlePublishPost = async () => {
    if (!postText.trim()) return
    setPublishingPost(true)
    setPostSuccess(false)
    try {
      // L'image (fichier de l'ordinateur ou lien) est d'abord déposée chez nous,
      // mise au carré : Make ne sait télécharger qu'une adresse publique, et son
      // scénario ne publie une photo que si elle est hébergée dans notre stockage.
      // Sans image : texte seul, publié sur Facebook uniquement (Instagram
      // refuse les publications sans image).
      let imageHebergee = null
      if (postImageUrl) {
        imageHebergee = await uploadSquareVersion(postImageUrl, `posts/post-${Date.now()}-social.jpg`)
        if (!imageHebergee) {
          addToast("L'image n'a pas pu être préparée. Essayez avec un fichier enregistré sur l'ordinateur.", 'error')
          return
        }
      }

      await publierSurReseaux({ message: postText, imageUrls: imageHebergee ? [imageHebergee] : [] })

      // Trace de la publication : le texte et l'adresse de l'image déposée chez
      // nous (jamais l'image elle-même, qui gonflerait la base).
      const { error: postSaveError } = await supabase.from('posts').insert({
        message: postText,
        image_url: imageHebergee,
        has_image: !!postImageUrl,
      })
      // La table `posts` est facultative : si elle n'existe pas encore, la
      // publication reste réussie, seul l'historique est manquant.
      if (postSaveError) console.warn('Publication non enregistrée dans `posts` :', postSaveError.message)
      else setPostsCount(c => c + 1)

      setPostSuccess(true)
      setPostText('')
      setPostImageUrl('')
      addToast('Publication envoyée avec succès.', 'success')
    } catch (err) {
      console.error('Erreur publication post:', err)
      addToast("Erreur lors de la publication. Vérifiez la console.", 'error')
    } finally {
      setPublishingPost(false)
    }
  }

  // Diapositives déjà publiées (event-images/bilans/{id}/ pour le bilan,
  // event-images/annonces/{id}/ pour l'annonce) : effacées quand l'événement ou une de
  // ses photos est supprimé (promesse « retrait sur simple demande »). Elles sont
  // refabriquées à la publication suivante. Renvoie false en cas d'échec.
  const effacerDiapositives = async (eventId, genre = 'bilans') => {
    try {
      const dossier = `${genre}/${eventId}`
      const chemins = []
      for (let debut = 0; ; debut += 100) {
        const { data, error } = await supabase.storage.from('event-images').list(dossier, { limit: 100, offset: debut })
        if (error) throw error
        chemins.push(...(data || []).filter(f => f.name).map(f => `${dossier}/${f.name}`))
        if (!data || data.length < 100) break
      }
      if (chemins.length) {
        const { error } = await supabase.storage.from('event-images').remove(chemins)
        if (error) throw error
      }
      return true
    } catch (err) {
      console.warn(`Diapositives non effacées (${genre}) :`, err)
      return false
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
    // Visuels publiés : un échec est signalé, la suppression de l'événement continue
    const bilansEffaces = await effacerDiapositives(deleteModal.id, 'bilans')
    const annoncesEffacees = await effacerDiapositives(deleteModal.id, 'annonces')
    if (!bilansEffaces || !annoncesEffacees) addToast("Les visuels publiés n'ont pas pu être effacés.", 'error')

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
    addToast('Événement supprimé avec succès.', 'success')
  }

  // ─── BILAN D'ÉVÉNEMENT ─────────────────────────────────────────────────────

  const fetchBilanPhotos = async (eventId) => {
    const { data } = await supabase.from('event_photos').select('*').eq('event_id', eventId).order('created_at', { ascending: false })
    setBilanPhotos(data || [])
    return data || []
  }

  const fetchBilanGames = async (eventId) => {
    // Ordre de saisie, stable d'une ouverture à l'autre (les 6 jeux du carrousel en dépendent)
    const { data } = await supabase.from('event_games_played').select('*').eq('event_id', eventId)
      .order('created_at').order('id')
    setBilanGames(data || [])
    return data || []
  }

  const openBilanModal = async (event) => {
    setBilanEnPublication(false)
    setBilanModal({ show: true, event })
    setBilanParticipants(event.participants_count != null ? String(event.participants_count) : '')
    setGameSearchQuery('')
    setGameSearchResults([])
    setCatalogueResults([])
    chargerCatalogue()
    setBilanFbText(buildBilanFbText(event))
    setBilanFbTextEdited(false)
    cancelPhotoQueue()
    await Promise.all([fetchBilanPhotos(event.id), fetchBilanGames(event.id)])
  }

  // Regénère le texte de publication quand le nombre de participants ou la liste
  // des jeux change, sauf si l'utilisateur a déjà modifié le texte manuellement
  // (ne pas écraser sa rédaction).
  useEffect(() => {
    if (!bilanFbTextEdited && bilanModal.event) {
      setBilanFbText(buildBilanFbText(bilanModal.event, bilanParticipants, bilanGames))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilanParticipants, bilanGames])

  // Remet le texte proposé à jour (participants + jeux), en abandonnant les retouches
  const resetBilanFbText = () => {
    if (!bilanModal.event) return
    setBilanFbText(buildBilanFbText(bilanModal.event, bilanParticipants, bilanGames))
    setBilanFbTextEdited(false)
  }

  const closeBilanModal = () => {
    if (bilanEnPublication) return
    setBilanModal({ show: false, event: null })
    setBilanPhotos([])
    setBilanGames([])
    setGameSearchQuery('')
    setGameSearchResults([])
    setCatalogueResults([])
    setBilanFbText('')
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
      addToast('Nombre de participants enregistré.', 'success')
    } catch (err) {
      console.error('Erreur sauvegarde participants:', err)
      addToast("Erreur lors de l'enregistrement du nombre de participants.", 'error')
    } finally {
      setSavingParticipants(false)
    }
  }

  // Met à jour un événement partout où il est affiché (fenêtres Bilan et Annonce, listes)
  // `patch` : champs à changer, ou fonction qui les calcule depuis l'événement
  const majEvenement = (id, patch) => {
    const appliquer = e => (e.id === id ? { ...e, ...(typeof patch === 'function' ? patch(e) : patch) } : e)
    setBilanModal(prev => (prev.event ? { ...prev, event: appliquer(prev.event) } : prev))
    setFbModal(prev => (prev.event ? { ...prev, event: appliquer(prev.event) } : prev))
    setEvents(prev => prev.map(appliquer))
    setArchivedEvents(prev => prev.map(appliquer))
  }

  // Rappel touché sur un téléphone : ouvre directement la fenêtre Annonce ou Bilan
  // de l'événement, avec les mêmes fonctions que les boutons. Attend la fin du
  // chargement de la liste ; le paramètre est retiré de l'adresse, pour qu'un
  // rechargement de la page ne rouvre pas la fenêtre.
  useEffect(() => {
    const genre = searchParams.has('annonce') ? 'annonce' : searchParams.has('bilan') ? 'bilan' : null
    if (!genre) { adresseTraitee.current = null; return }
    if (loading) return
    const id = searchParams.get(genre)
    const cle = `${genre}=${id}`
    if (adresseTraitee.current === cle) return   // déjà traitée (liste rechargée entre-temps)
    adresseTraitee.current = cle

    const sansRappel = new URLSearchParams(searchParams)
    sansRappel.delete('annonce')
    sansRappel.delete('bilan')
    setSearchParams(sansRappel, { replace: true })

    ;(async () => {
      let ev = events.find(e => String(e.id) === id)
      if (!ev && /^\d+$/.test(id || '')) {
        const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
        if (error) {
          console.warn('Événement du rappel non lu :', error)
          addToast("L'événement n'a pas pu être lu. Vérifiez la connexion puis rouvrez le rappel.", 'error')
          return
        }
        ev = data
      }
      if (!ev) { addToast("Cet événement n'existe plus.", 'warning'); return }
      if (genre === 'annonce') openFbModal(ev)
      else openBilanModal(ev)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams])

  // Rappel du jeudi (jeu de la semaine) : ouvre l'onglet, puis retire le paramètre
  useEffect(() => {
    if (searchParams.get('onglet') !== 'jeu-semaine') return
    setActiveTab('semaine')
    const sansOnglet = new URLSearchParams(searchParams)
    sansOnglet.delete('onglet')
    setSearchParams(sansOnglet, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const deleteBilanPhoto = async (photo) => {
    try {
      const { error: deleteError } = await supabase.from('event_photos').delete().eq('id', photo.id)
      if (deleteError) throw deleteError
      if (photo.url && photo.url.includes('event-images')) {
        const path = photo.url.split('/event-images/')[1]?.split('?')[0]
        if (path) await supabase.storage.from('event-images').remove([decodeURIComponent(path)])
      }
      setBilanPhotos(prev => prev.filter(p => p.id !== photo.id))
      fetchPhotoEventIds()
      // La photo n'illustre plus ni un jeu, ni l'ouverture, ni la diapositive « plein de jeux »
      const eventId = bilanModal.event.id
      // Ni les diapositives déjà publiées, qui pouvaient la montrer
      if (!(await effacerDiapositives(eventId, 'bilans'))) {
        addToast("Photo supprimée, mais les images du carrousel déjà publié n'ont pas pu être effacées.", 'error')
      }
      const [jeux, ouverture, pleinDeJeux] = await Promise.all([
        supabase.from('event_games_played').update({ photo_url: null }).eq('photo_url', photo.url),
        supabase.from('events').update({ bilan_photo_ouverture: null }).eq('id', eventId).eq('bilan_photo_ouverture', photo.url),
        supabase.from('events').update({ bilan_photo_jeux: null }).eq('id', eventId).eq('bilan_photo_jeux', photo.url),
      ])
      if (!jeux.error) setBilanGames(prev => prev.map(g => (g.photo_url === photo.url ? { ...g, photo_url: null } : g)))
      if (!ouverture.error) majEvenement(eventId, e => (e.bilan_photo_ouverture === photo.url ? { bilan_photo_ouverture: null } : {}))
      if (!pleinDeJeux.error) majEvenement(eventId, e => (e.bilan_photo_jeux === photo.url ? { bilan_photo_jeux: null } : {}))
      if (jeux.error || ouverture.error || pleinDeJeux.error) {
        console.error('Nettoyage des choix de photo :', jeux.error || ouverture.error || pleinDeJeux.error)
        addToast("Photo supprimée, mais les choix du carrousel qui l'utilisaient n'ont pas pu être effacés.", 'error')
      }
    } catch (err) {
      console.error('Erreur suppression photo:', err)
      addToast('Erreur lors de la suppression de la photo.', 'error')
    }
  }

  // ── Éditeur de floutage ──
  const loadPhotoIntoEditor = useCallback((file) => {
    const canvas = blurCanvasRef.current
    if (!canvas || !file) return
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      // 2 400 px au plus sur le grand côté (1 200 px de large auparavant) : une
      // photo prise en largeur reste nette une fois recadrée en hauteur dans
      // les diapositives du bilan (1 080 × 1 350).
      const scale = Math.min(1, COTE_MAX_PHOTO / Math.max(img.naturalWidth, img.naturalHeight))
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
      if (w > 0 && h > 0) pixelateRegion(ctx, x, y, w, h, blocDeFloutage(canvas.width))
    })
    basePixelsRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    pendingRectsRef.current = []
    setHasPendingRects(false)
  }

  const resetBlur = () => {
    const file = bilanPhotoFiles[bilanPhotoIndex]
    if (file) loadPhotoIntoEditor(file)
  }

  // Image enregistrée : toujours la photo floutée, jamais l'affichage de l'éditeur.
  // Les rectangles dessinés mais pas encore appliqués sont floutés ici (sinon les
  // visages partaient en clair sous les repères orange : incident du 25/10/2026).
  const exportCurrentCanvasAsWebp = () => new Promise(resolve => {
    const canvas = blurCanvasRef.current
    if (!canvas || !basePixelsRef.current) { resolve(null); return }
    if (pendingRectsRef.current.length > 0) applyBlur()
    dragStartRef.current = null
    // Repart des pixels floutés, sans aucun repère dessiné par-dessus
    canvas.getContext('2d').putImageData(basePixelsRef.current, 0, 0)
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
      await fetchBilanPhotos(bilanModal.event.id)
      fetchPhotoEventIds()
    } catch (err) {
      console.error('Erreur upload photos bilan:', err)
      addToast("Erreur lors de l'upload des photos.", 'error')
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

  // ── Recherche & ajout de jeux joués : collection de la ludothèque, puis MyLudo ──
  // Noms des jeux de la collection (quelques centaines, lus à l'ouverture du bilan) : recherche instantanée,
  // sans tenir compte des accents ni des majuscules
  // Rechargé à chaque ouverture : un jeu ajouté entre-temps au catalogue est proposé
  const chargerCatalogue = async () => {
    const { data, error } = await supabase.from('games').select('id, name, image_url').order('name')
    if (error) { console.warn('Collection pour la recherche :', error); return }
    catalogueRef.current = (data || []).filter(g => g.name).map(g => ({ ...g, cle: sansAccents(g.name).trim() }))
  }

  const handleGameSearchChange = (value) => {
    setGameSearchQuery(value)
    if (gameSearchDebounceRef.current) clearTimeout(gameSearchDebounceRef.current)
    const recherche = sansAccents(value).trim()
    if (recherche.length < 2) { setGameSearchResults([]); setCatalogueResults([]); return }
    // Jeux déjà dans le bilan : plus proposés
    const dejaJoues = new Set(bilanGames.map(g => sansAccents(g.name).trim()))
    const dansLaLudo = (catalogueRef.current || [])
      .filter(g => g.cle.includes(recherche) && !dejaJoues.has(g.cle))
      // Ceux qui commencent par la recherche d'abord
      .sort((a, b) => Number(!a.cle.startsWith(recherche)) - Number(!b.cle.startsWith(recherche)))
      .slice(0, 8)
    setCatalogueResults(dansLaLudo)
    setGameSearchResults([])
    gameSearchDebounceRef.current = setTimeout(async () => {
      setGameSearchLoading(true)
      try {
        // MyLudo ensuite, sans répéter les jeux de la collection
        const connus = new Set([...(catalogueRef.current || []).map(g => g.cle), ...dejaJoues])
        const results = (await bggSearchGames(value.trim())).filter(r => !connus.has(sansAccents(r.name).trim()))
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

  // Jeu de la collection : son nom et sa jaquette (déjà chez nous), « dispo à la ludothèque »
  const ajouterJeuDeLaLudo = async (jeu) => {
    if (!bilanModal.event) return
    setAddingGameId(`ludo-${jeu.id}`)
    try {
      const { data, error } = await supabase.from('event_games_played').insert({
        event_id: bilanModal.event.id,
        name: jeu.name.trim(),
        image_url: jeu.image_url || '',
        external_url: '',
        in_catalogue: true,
      }).select()
      if (error) throw error
      setBilanGames(prev => [...prev, data[0]])
      setCatalogueResults(prev => prev.filter(r => r.id !== jeu.id))
    } catch (err) {
      console.error('Erreur ajout jeu:', err)
      addToast("Erreur lors de l'ajout du jeu.", 'error')
    } finally {
      setAddingGameId(null)
    }
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
        // Copie chez nous : MyLudo interdit la réutilisation dans les visuels
        image_url: await copierJaquette(result.image || ''),
        external_url: '',
        in_catalogue: inCatalogue,
      }).select()
      if (error) throw error
      setBilanGames(prev => [...prev, data[0]])
      setGameSearchResults(prev => prev.filter(r => r.id !== result.id))
    } catch (err) {
      console.error('Erreur ajout jeu:', err)
      addToast("Erreur lors de l'ajout du jeu.", 'error')
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
    title: `Onglets de Communication`,
    description: `Basculez entre la gestion des événements, le générateur d'affiches, les posts libres et l'annonce des nouveaux jeux. Le générateur crée une affiche A4 haute résolution et peut pré-remplir automatiquement le formulaire d'événement avec la date et le lieu. "Nouveaux jeux" prépare un carrousel Facebook & Instagram avec les jeux qui viennent d'arriver. "Jeu de la semaine" publie chaque semaine une des vidéos du dossier Drive en Reel sur Facebook & Instagram ; un rappel arrive le jeudi à 17 h.`,
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
    description: `Un onglet par public, chacun avec son message : "Mairies" (invitation à relayer l'événement), "Presse" (annonce et invitation à venir), "École" (information à transmettre aux familles) et "Adhérents" (invitation à participer). Tous peuvent être modifiés avant envoi.`,
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
    description: `Les destinataires sont regroupés par liste : Mairies & Collectivités, Presse, Écoles, Adhérents et Inscrits aux dates. La presse et les écoles ne sont pas cochées d'office : cochez-les quand l'événement les concerne. Cochez la case d'un groupe pour tout sélectionner d'un clic.`,
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
    description: `Ce bouton ouvre la liste des contacts (mairies, presse, écoles) — nous allons l'explorer ensemble à l'étape suivante. Le bouton "Modèles de messages", juste à côté, propose deux textes de présentation de la ludothèque à copier, pour la presse et pour les écoles.`,
    action: () => { closeForm(); openCompose(false); openCollectivites(false) },
  },
  {
    id: 'evt-collectivites-modal',
    title: `Fenêtre des contacts`,
    description: `Cette fenêtre liste les mairies, journaux et écoles enregistrés comme destinataires permanents. Ajoutez un contact en choisissant sa catégorie, puis en renseignant son nom et son email. Les adhérents, eux, sont automatiquement récupérés depuis la base de données lors de l'envoi.`,
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

  // `events` ne contient déjà que les événements non archivés (voir fetchEvents)
  const upcomingEventsCount = events.filter(e => new Date(e.date) > new Date()).length

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-5 font-body text-[#0f172a] md:p-11">
      <div className="mx-auto max-w-[1240px]">

      <div data-tutorial="evt-header">
        <AdminPageHeader icon="ludo-communication.svg" title="Gestion de la" accent="Communication">
          {activeTab === 'events' && (
            <button
              data-tutorial="evt-add-btn"
              onClick={editingId ? cancelEdit : () => setShowForm(!showForm)}
              className={`${showForm ? BTN_INK : BTN_ORANGE} w-full md:w-auto`}
            >
              {showForm ? <><X size={16} strokeWidth={3} /> Fermer</> : <><Plus size={16} strokeWidth={3} /> Nouvel événement</>}
            </button>
          )}
        </AdminPageHeader>
      </div>

      {/* Onglets */}
      <div data-tutorial="evt-tabs" className="mb-6 grid grid-cols-3 gap-2.5 sm:grid-cols-5 sm:gap-3.5">
        {COMM_TABS.map(tab => {
          const active = activeTab === tab.id
          const count = { events: upcomingEventsCount, affiche: templatesCount, posts: postsCount, jeux: jeuxAAnnoncerCount, semaine: jeuSemaineCount }[tab.id]
          const icone = { events: 'ludo-calendrier-evenement.svg', affiche: 'ludo-affiche.svg', posts: 'ludo-post.svg', jeux: 'ludo-nouveau-jeu.svg', semaine: 'ludo-video.svg' }[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-[#0f172a] px-1.5 py-3.5 transition-[transform,box-shadow] sm:gap-3 sm:rounded-[28px] sm:p-5 duration-200 hover:translate-x-[2px] hover:translate-y-[2px]"
              style={{
                background: active ? `${tab.shadow}1a` : '#fff',
                boxShadow: `${active ? 2 : 4}px ${active ? 2 : 4}px 0 ${tab.shadow}`,
                transform: active ? 'translate(2px, 2px)' : undefined,
              }}
            >
              <MaskIcon file={icone} size={40} color={active ? tab.shadow : '#64748b'} />
              <span className="inline-flex flex-wrap items-center justify-center gap-1.5 text-center text-[8.5px] font-extrabold uppercase leading-snug tracking-[0.08em] sm:gap-2 sm:text-[10px] sm:tracking-[0.16em]" style={{ color: active ? '#0f172a' : '#64748b' }}>
                {tab.label}
                {count > 0 && (
                  <span className="rounded-full px-2.5 py-0.5 text-[9px] font-extrabold text-white" style={{ background: tab.shadow }}>
                    {count}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <main>
        {activeTab === 'affiche' && (
          <GenerateurAffiche events={events} onCreateEvent={handleCreateEventFromAffiche} />
        )}

        {activeTab === 'jeux' && <NouveauxJeux onCountChange={setJeuxAAnnoncerCount} />}
        {activeTab === 'semaine' && <JeuSemaine onCountChange={setJeuSemaineCount} />}

        {activeTab === 'posts' && (
          <DataCard shadow="#10b981">
            <div className="flex items-center gap-3.5 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#ecfdf5] text-[#10b981]">
                <MaskIcon file="ludo-post.svg" size={30} color="#10b981" />
              </div>
              <div>
                <h2 className="font-display text-[19px] font-extrabold uppercase tracking-[-0.03em]">Nouveau post</h2>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Publier directement sur Facebook &amp; Instagram, sans lien avec un événement</p>
              </div>
            </div>

            <div className="max-w-2xl p-6 md:p-8">
              <div className={`${E_SECTION} text-[#1a5f7a]`}>Message</div>
              <textarea
                rows={8}
                placeholder="Rédigez votre publication..."
                className="mb-5 w-full resize-y rounded-[24px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5 text-[13.5px] font-medium text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white"
                value={postText}
                onChange={e => setPostText(e.target.value)}
              />

              <div className={`${E_SECTION} text-[#1a5f7a]`}>Photo (optionnel)</div>
              <input
                placeholder="Lien URL de l'image..."
                className={`${E_INPUT} mb-3.5 text-[12.5px]`}
                value={postImageUrl}
                onChange={e => setPostImageUrl(e.target.value)}
              />
              <div className="mb-5 flex flex-col items-center gap-3.5 rounded-[24px] border-[3px] border-dashed border-slate-300 bg-[#fdfaf6] p-6">
                {postImageUrl && <img src={postImageUrl} className="h-28 object-contain" alt="Aperçu" />}
                <label className="cursor-pointer rounded-[16px] border-2 border-[#0f172a] bg-white px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] transition-colors hover:bg-slate-100">
                  {postUploading ? "Chargement..." : "Uploader un fichier"}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePostFileUpload} />
                </label>
              </div>

              <SocialPostPreview text={postText} imageUrls={apercuPost} />

              {postSuccess ? (
                <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#0f172a] bg-[#10b981] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
                  <CheckCircle2 size={16} /> Publié avec succès !
                </div>
              ) : (
                <button
                  onClick={handlePublishPost}
                  disabled={publishingPost || !postText.trim()}
                  className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ${
                    publishingPost || !postText.trim()
                      ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                      : 'bg-[#e38154] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]'
                  }`}
                >
                  {publishingPost ? <><Loader2 size={16} className="animate-spin" /> Publication...</> : <><Share2 size={16} /> Publier</>}
                </button>
              )}
            </div>
          </DataCard>
        )}

        {activeTab === 'events' && (<>
        {showForm && (
          <form data-tutorial="evt-form" className="mb-6 rounded-[34px] border-2 border-[#0f172a] bg-white p-6 shadow-[6px_6px_0_#1a5f7a] md:p-10" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-2 lg:gap-11">
              <div data-tutorial="evt-form-details">
                <div className={`${E_SECTION} text-[#1a5f7a]`}><Type size={15} /> Détails</div>
                <input required placeholder="Titre" className={`${E_INPUT} mb-3.5`} value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />

                <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={E_LABEL}>Date &amp; début</label>
                    <input type="datetime-local" required className={E_INPUT} value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
                  </div>
                  <div>
                    <label className={E_LABEL}>Heure de fin (optionnel)</label>
                    <input type="time" className={E_INPUT} value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} />
                  </div>
                </div>

                <input required placeholder="Lieu" className={`${E_INPUT} mb-4`} value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} />

                <div data-tutorial="evt-form-affiche">
                  <label className={E_LABEL}>Affiche</label>
                  <input placeholder="Lien URL de l'image..." className={`${E_INPUT} mb-3.5 text-[12.5px]`} value={newEvent.image_url} onChange={e => setNewEvent({ ...newEvent, image_url: e.target.value })} />
                  <div className="flex flex-col items-center gap-3.5 rounded-[24px] border-[3px] border-dashed border-slate-300 bg-[#fdfaf6] p-6">
                    {newEvent.image_url
                      ? <img src={newEvent.image_url} className="h-28 rounded-[14px] border-2 border-[#0f172a] object-contain" alt="Aperçu" />
                      : <div className="h-[110px] w-[110px] rounded-[14px] border-2 border-[#0f172a] bg-slate-100" />}
                    <label className="cursor-pointer rounded-[16px] border-2 border-[#0f172a] bg-white px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] transition-colors hover:bg-slate-100">
                      {uploading ? "Chargement..." : "Uploader un fichier"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <div data-tutorial="evt-form-description" className="flex flex-col">
                <div className={`${E_SECTION} text-[#e38154]`}><AlignLeft size={15} /> Description</div>
                <textarea
                  placeholder="Détails..." rows={10}
                  className="mb-3.5 min-h-[220px] w-full flex-1 resize-none rounded-[24px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5 text-[13.5px] font-medium text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white"
                  value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                />
                <button
                  type="button" onClick={() => setShowImportDesc(true)}
                  className="flex items-center gap-2 self-start py-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-[#1a5f7a]"
                >
                  <Copy size={13} /> Importer depuis un événement précédent
                </button>
                <button
                  data-tutorial="evt-form-submit" type="submit" disabled={uploading}
                  className={`${BTN_TEAL} mt-4 w-full py-5`}
                >
                  Enregistrer l'événement
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="mb-4 flex justify-end">
          <div data-tutorial="evt-view-toggle" className="flex gap-1.5 rounded-[18px] border-2 border-[#0f172a] bg-slate-100 p-1.5">
            {[{ mode: 'grid', Icon: LayoutGrid, label: 'Vue grille' }, { mode: 'list', Icon: List, label: 'Vue liste' }].map(({ mode, Icon, label }) => (
              <button
                key={mode} onClick={() => setViewMode(mode)} title={label} aria-label={label}
                className={`flex h-10 w-10 items-center justify-center rounded-[12px] transition-colors ${
                  viewMode === mode ? 'bg-white text-[#1a5f7a] shadow-[2px_2px_0_#0f172a]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-[32px] border-2 border-slate-200 bg-white p-5">
                <div className="mb-4 h-40 rounded-[20px] bg-slate-100" />
                <div className="mb-2 h-4 w-3/4 rounded-full bg-slate-100" />
                <div className="h-3 w-1/2 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, idx) => (
              <div
                key={event.id}
                {...(idx === 0 ? { "data-tutorial": "evt-list-card1" } : idx === 1 ? { "data-tutorial": "evt-list-card2" } : {})}
                className={`flex flex-col overflow-hidden rounded-[32px] border-2 border-[#0f172a] bg-white ${isPastEvent(event) ? 'opacity-75 grayscale-[60%] hover:opacity-95 hover:grayscale-0' : ''}`}
                style={{ boxShadow: `5px 5px 0 ${isPastEvent(event) ? '#94a3b8' : '#1a5f7a'}` }}
              >
                {/* Hauteur calée sur la colonne d'actions : 5 boutons de 32px + 4 écarts de 4px + marges */}
                <div className="relative flex h-[212px] items-center justify-center border-b-2 border-[#0f172a] bg-[#fdfaf6] p-3">
                  {event.image_url ? <img src={event.image_url} className="max-h-full max-w-full object-contain" alt="" /> : <ImageIcon size={44} className="text-slate-200" />}

                  {isPastEvent(event) && (
                    <span className="absolute left-3 top-3 rounded-full border-2 border-[#0f172a] bg-slate-500 px-2.5 py-1 text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-white">
                      Passé
                    </span>
                  )}

                  <div className="evt-card-actions absolute right-3 top-3 flex flex-col gap-1">
                    <IconButton data-tutorial="evt-action-edit" title="Modifier" className="h-8 w-8 rounded-[10px] bg-white" onClick={() => startEdit(event)}><Edit2 size={15} /></IconButton>
                    <IconButton data-tutorial="evt-action-mail" title="Composer l'email" tone="warn" className="h-8 w-8 rounded-[10px] bg-white" onClick={() => openComposeModal(event)}><Mail size={15} /></IconButton>
                    <IconButton data-tutorial="evt-action-share" title="Publier sur Facebook & Instagram" className="h-8 w-8 rounded-[10px] bg-white text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white" onClick={() => openFbModal(event)}><Share2 size={15} /></IconButton>
                    {isPastEvent(event) && (
                      <IconButton data-tutorial="evt-action-bilan" title="Bilan de l'événement" tone="success" className="h-8 w-8 rounded-[10px] bg-white" onClick={() => openBilanModal(event)}><BarChart2 size={15} /></IconButton>
                    )}
                    {isPastEvent(event) && hasBilan(event) ? (
                      <IconButton title="Archiver" tone="warn" className="h-8 w-8 rounded-[10px] bg-white" onClick={() => archiveEvent(event.id)}><Archive size={15} /></IconButton>
                    ) : (
                      <IconButton title="Supprimer" tone="danger" className="h-8 w-8 rounded-[10px] bg-white" onClick={() => setDeleteModal({ show: true, id: event.id, title: event.title })}><Trash2 size={15} /></IconButton>
                    )}
                  </div>

                  {event.mail_sent_at && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border-2 border-[#0f172a] bg-[#10b981] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-white">
                      <Send size={10} /> Diffusé le {new Date(event.mail_sent_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="mb-3.5 font-display text-[18px] font-extrabold uppercase tracking-[-0.03em]">{event.title}</h3>
                  <div className="flex flex-col gap-2 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                    <div className="flex items-center gap-2.5">
                      <Clock size={14} className="shrink-0 text-[#1a5f7a]" />
                      {new Date(event.date).toLocaleString('fr-FR', { day: 'numeric', month: 'short' })} · {new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {event.end_time && ` — ${event.end_time.replace(':', 'h')}`}
                    </div>
                    <div className="flex items-center gap-2.5"><MapPin size={14} className="shrink-0 text-[#e38154]" /> {event.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DataCard>
            {events.map((event) => (
              <div
                key={event.id}
                className={`flex flex-wrap items-center gap-4 border-b border-slate-100 p-4 last:border-b-0 ${isPastEvent(event) ? 'opacity-75 grayscale-[60%]' : ''}`}
              >
                <div className="relative flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6]">
                  {event.image_url ? <img src={event.image_url} className="h-full w-full object-cover" alt="" /> : <ImageIcon size={20} className="text-slate-200" />}
                </div>

                <div className="min-w-0 flex-1 basis-[220px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13px] font-extrabold uppercase tracking-[-0.01em]">{event.title}</span>
                    {event.mail_sent_at && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-[#0f172a] bg-[#10b981] px-2 py-0.5 text-[7.5px] font-extrabold uppercase tracking-[0.1em] text-white">
                        <Send size={9} /> Diffusé
                      </span>
                    )}
                    {isPastEvent(event) && (
                      <span className="shrink-0 rounded-full border-2 border-[#0f172a] bg-slate-500 px-2 py-0.5 text-[7.5px] font-extrabold uppercase tracking-[0.1em] text-white">Passé</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} className="text-[#1a5f7a]" />
                      {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="inline-flex items-center gap-1.5"><MapPin size={12} className="text-[#e38154]" /> {event.location}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <IconButton title="Modifier" className="h-9 w-9 rounded-[11px]" onClick={() => startEdit(event)}><Edit2 size={15} /></IconButton>
                  <IconButton title="Composer l'email" tone="warn" className="h-9 w-9 rounded-[11px]" onClick={() => openComposeModal(event)}><Mail size={15} /></IconButton>
                  <IconButton title="Publier sur Facebook & Instagram" className="h-9 w-9 rounded-[11px] bg-[#eff6ff] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white" onClick={() => openFbModal(event)}><Share2 size={15} /></IconButton>
                  {isPastEvent(event) && (
                    <IconButton title="Bilan de l'événement" tone="success" className="h-9 w-9 rounded-[11px]" onClick={() => openBilanModal(event)}><BarChart2 size={15} /></IconButton>
                  )}
                  {isPastEvent(event) && hasBilan(event) ? (
                    <IconButton title="Archiver" tone="warn" className="h-9 w-9 rounded-[11px]" onClick={() => archiveEvent(event.id)}><Archive size={15} /></IconButton>
                  ) : (
                    <IconButton title="Supprimer" tone="danger" className="h-9 w-9 rounded-[11px]" onClick={() => setDeleteModal({ show: true, id: event.id, title: event.title })}><Trash2 size={15} /></IconButton>
                  )}
                </div>
              </div>
            ))}
          </DataCard>
        )}
        </>)}
      </main>
      </div>

      
      {/* MODALE COMPOSITION EMAIL */}
      {composeModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={() => setComposeModal({ show: false, event: null })} />
          <div data-tutorial="evt-compose-modal" className="anim-modal-in relative flex max-h-[92vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#f59e0b]">

            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#fffbeb] text-[#f59e0b]"><MaskIcon file="ludo-ecrire-mail.svg" size={30} color="#f59e0b" /></div>
                <div className="min-w-0">
                  <h3 className="font-display text-[19px] font-extrabold tracking-[-0.04em]">Composer l'<span className="text-[#f59e0b]">email</span></h3>
                  <p className="mt-1.5 truncate text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{composeModal.event?.title}</p>
                </div>
              </div>
              <button onClick={() => setComposeModal({ show: false, event: null })} aria-label="Fermer"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white">✕</button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">

              {/* Objet */}
              <div className="space-y-2">
                <label className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Objet</label>
                <input
                  className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-bold text-sm outline-none focus:bg-white"
                  value={composeData.subject}
                  onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              {/* Corps — un onglet par public (mairies, presse, école, adhérents) */}
              <div className="space-y-3">
                <div data-tutorial="evt-compose-tabs" className="grid w-full grid-cols-2 gap-1.5 rounded-[18px] border-2 border-[#0f172a] bg-slate-100 p-1.5 sm:flex sm:w-fit">
                  {MAIL_TABS.map(tab => {
                    const Icone = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveMailTab(tab.id)}
                        className={'flex items-center justify-center gap-1.5 rounded-[12px] px-2 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.08em] transition-colors sm:gap-2 sm:px-4 sm:text-[9.5px] sm:tracking-[0.14em] ' +
                          (activeMailTab === tab.id ? 'bg-white text-[#1a5f7a] shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                        <Icone size={11} />
                        {tab.label}
                        <span className="text-[8px] font-bold opacity-60">
                          ({composeData.recipients.filter(r => tab.groups.includes(r.group) && r.checked).length})
                        </span>
                      </button>
                    )
                  })}
                </div>

                {MAIL_TABS.filter(tab => tab.id === activeMailTab).map(tab => (
                  <div key={tab.id} className="space-y-1">
                    <p className="text-[9px] text-slate-400 font-medium ml-1">{tab.aide}</p>
                    <textarea
                      rows={8}
                      className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-medium text-sm outline-none focus:bg-white resize-y"
                      value={composeData[tab.field]}
                      onChange={e => setComposeData(prev => ({ ...prev, [tab.field]: e.target.value }))}
                    />
                    <p className="text-[8px] text-slate-300 ml-1 italic">
                      [BLOCS_EVENEMENTS] sera remplacé par les détails des événements sélectionnés
                    </p>
                  </div>
                ))}
              </div>

              {/* Événements — blocs éditables */}
              <div data-tutorial="evt-compose-events" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a] flex items-center gap-2">
                    <Calendar size={12} /> Événements ({selectedEvents.length})
                  </label>
                  <button onClick={() => setShowEventPicker(v => !v)}
                    className="flex items-center gap-2 rounded-[14px] border-2 border-[#0f172a] bg-[#f0f7f9] px-3.5 py-2 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white">
                    <PlusCircle size={12} /> Ajouter un événement
                  </button>
                </div>
                {showEventPicker && (
                  <div className="border-2 border-[#1a5f7a]/20 rounded-2xl overflow-hidden">
                    <div className="p-3 bg-[#1a5f7a]/5 border-b border-[#1a5f7a]/10">
                      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Choisir un événement à ajouter</p>
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
                      <div className="flex items-center justify-between border-b-2 border-[#0f172a] bg-[#fdfaf6] p-4">
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
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Titre</label>
                            <input value={b.titre} onChange={e => updateEventBlock(b.event.id, 'titre', e.target.value)}
                              className="mt-1.5 w-full rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2.5 text-xs font-bold outline-none focus:bg-white" />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lieu</label>
                            <input value={b.lieu} onChange={e => updateEventBlock(b.event.id, 'lieu', e.target.value)}
                              className="mt-1.5 w-full rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2.5 text-xs font-bold outline-none focus:bg-white" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                            <input value={b.date} onChange={e => updateEventBlock(b.event.id, 'date', e.target.value)}
                              className="mt-1.5 w-full rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2.5 text-xs font-bold outline-none focus:bg-white" />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Horaires</label>
                            <input value={b.horaire} onChange={e => updateEventBlock(b.event.id, 'horaire', e.target.value)}
                              className="mt-1.5 w-full rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2.5 text-xs font-bold outline-none focus:bg-white" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Description (optionnel)</label>
                          <textarea value={b.description} onChange={e => updateEventBlock(b.event.id, 'description', e.target.value)}
                            rows={2} className="mt-1.5 w-full resize-none rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] p-2.5 text-xs font-medium outline-none focus:bg-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destinataires */}
              <div data-tutorial="evt-compose-recipients" className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a] flex items-center gap-2">
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

                    {/* Contacts enregistrés : mairies toujours affichées, presse et écoles si la liste en contient */}
                    {CATEGORIES_CONTACT.map(cat => {
                      const destinataires = composeData.recipients.filter(r => r.group === cat.id)
                      if (cat.id !== 'mairie' && destinataires.length === 0) return null
                      return (
                        <div key={cat.id} className={cat.id === 'mairie' ? '' : 'mt-4'}>
                          <GroupeContacts
                            titre={cat.groupe}
                            destinataires={destinataires}
                            ouvert={groupesOuverts[cat.id]}
                            onBasculerOuvert={() => setGroupesOuverts(g => ({ ...g, [cat.id]: !g[cat.id] }))}
                            onBasculerGroupe={() => toggleGroup(cat.id)}
                            onBasculerContact={toggleRecipient}
                          />
                        </div>
                      )
                    })}

                    {/* Groupe Adhérents */}
                    {composeData.recipients.filter(r => r.group === 'adherent').length > 0 && (
                      <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setShowAdherents(v => !v)}
                          className="flex w-full items-center justify-between border-b-2 border-[#0f172a] bg-[#fdfaf6] p-4 transition-colors hover:bg-slate-100"
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
                              <label key={r.email} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer sm:px-5">
                                <input type="checkbox" checked={r.checked} onChange={() => toggleRecipient(r.email)}
                                  className="w-4 h-4 accent-[#1a5f7a] cursor-pointer flex-shrink-0" />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                                  <span className="text-xs font-bold text-slate-700 sm:flex-1">{r.label}</span>
                                  <span className="break-all text-[9px] text-slate-400">{r.email}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Groupe Inscrits aux dates (site public, non adhérents) */}
                    {composeData.recipients.filter(r => r.group === 'abonne').length > 0 && (
                      <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setShowAbonnes(v => !v)}
                          className="flex w-full items-center justify-between border-b-2 border-[#0f172a] bg-[#fdfaf6] p-4 transition-colors hover:bg-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <input type="checkbox" readOnly
                              checked={composeData.recipients.filter(r => r.group === 'abonne').every(r => r.checked)}
                              onClick={e => { e.stopPropagation(); toggleGroup('abonne') }}
                              className="w-4 h-4 accent-[#1a5f7a] cursor-pointer"
                            />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Inscrits aux dates</span>
                            <span className="text-[9px] font-bold text-slate-400">
                              ({composeData.recipients.filter(r => r.group === 'abonne' && r.checked).length}/{composeData.recipients.filter(r => r.group === 'abonne').length})
                            </span>
                          </div>
                          {showAbonnes ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </button>
                        {showAbonnes && (
                          <div className="divide-y divide-slate-50">
                            {composeData.recipients.filter(r => r.group === 'abonne').map(r => (
                              <label key={r.email} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer sm:px-5">
                                <input type="checkbox" checked={r.checked} onChange={() => toggleRecipient(r.email)}
                                  className="w-4 h-4 accent-[#1a5f7a] cursor-pointer flex-shrink-0" />
                                <span className="break-all text-xs font-bold text-slate-700">{r.email}</span>
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
            <div className="flex shrink-0 flex-wrap gap-2.5 border-t-2 border-slate-100 p-6">
              <button onClick={() => setComposeModal({ show: false, event: null })}
                className="flex-1 basis-[140px] rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100">
                Annuler
              </button>
              <button data-tutorial="evt-compose-send" onClick={handleSendMail} disabled={sendingMail || composeData.recipients.filter(r => r.checked).length === 0}
                className={'flex flex-1 basis-[180px] items-center justify-center gap-2 rounded-[18px] border-2 border-[#0f172a] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ' +
                  (sendingMail || composeData.recipients.filter(r => r.checked).length === 0
                    ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                    : 'bg-[#1a5f7a] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]')}>
                {sendingMail ? <><Loader2 size={14} className="animate-spin" /> Envoi...</> : <><Send size={14} /> Envoyer ({composeData.recipients.filter(r => r.checked).length})</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY ENVOI EN COURS */}
      {sendingMail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex flex-col items-center gap-4 rounded-[34px] border-2 border-[#0f172a] bg-white px-10 py-9 text-center shadow-[12px_12px_0_#1a5f7a]">
            <Loader2 className="animate-spin text-[#1a5f7a]" size={38} />
            <div>
              <h3 className="font-display text-[20px] font-extrabold uppercase tracking-[-0.03em]">Envoi en cours...</h3>
              <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Merci de patienter</p>
            </div>
          </div>
        </div>
      )}


      <ConfirmModal
        open={deleteModal.show}
        onClose={() => setDeleteModal({ show: false })}
        onConfirm={confirmDelete}
        title="Supprimer ?"
        message={deleteModal.title ? `« ${deleteModal.title} » sera définitivement supprimé.` : "Cet événement sera définitivement supprimé."}
        confirmLabel="Oui, supprimer"
        cancelLabel="Conserver"
        tone="danger"
        icon={<Trash2 size={26} />}
      />

      {/* MODALE IMPORT DESCRIPTION DEPUIS UN ÉVÉNEMENT PRÉCÉDENT */}
      {showImportDesc && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={() => { setShowImportDesc(false); setImportDescSearch('') }} />
          <div className="anim-modal-in relative flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div>
                <h3 className="font-display text-[21px] font-extrabold tracking-[-0.04em]">Choisir un <span className="text-[#1a5f7a]">événement</span></h3>
                <p className="mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Sa description sera recopiée</p>
              </div>
              <button
                onClick={() => { setShowImportDesc(false); setImportDescSearch('') }} aria-label="Fermer"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="shrink-0 p-6 pb-3">
              <SearchField
                placeholder="Rechercher par titre..."
                value={importDescSearch}
                onChange={e => setImportDescSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-6 pb-6">
              {filteredImportableEvents.length === 0 ? (
                <p className="py-8 text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Aucun événement trouvé</p>
              ) : (
                filteredImportableEvents.map(event => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => importDescriptionFrom(event)}
                    className="w-full rounded-[20px] border-2 border-slate-200 bg-[#fdfaf6] p-4 text-left transition-colors hover:border-[#0f172a] hover:bg-[#f0f7f9]"
                  >
                    <p className="truncate text-sm font-extrabold uppercase">{event.title}</p>
                    <p className="mb-1.5 mt-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="truncate text-xs italic text-slate-500">
                      {event.description.length > 50 ? event.description.slice(0, 50) + '…' : event.description}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOUTONS MODÈLES DE MESSAGES ET DESTINATAIRES ENREGISTRÉS en bas de page */}
      <div className="mx-auto mb-4 mt-8 flex max-w-[1240px] flex-wrap justify-end gap-2.5 px-5 md:px-11">
        <button
          onClick={() => setModelesOpen(true)}
          className="flex items-center gap-2 rounded-[16px] border-2 border-[#0f172a] bg-white px-5 py-3 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:bg-[#1a5f7a] hover:text-white">
          <MaskIcon file="ludo-modeles.svg" size={20} color="currentColor" /> Modèles de messages
        </button>
        <button
          data-tutorial="evt-collectivites-btn"
          onClick={() => setCollectivitesModal(true)}
          className="flex items-center gap-2 rounded-[16px] border-2 border-[#0f172a] bg-white px-5 py-3 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:bg-[#1a5f7a] hover:text-white">
          <MaskIcon file="ludo-carnet.svg" size={20} color="currentColor" /> Destinataires enregistrés
        </button>
      </div>

      {/* SECTION ÉVÉNEMENTS ARCHIVÉS */}
      <div data-tutorial="evt-archived" className="mx-auto mb-10 mt-6 max-w-[1240px] px-5 md:px-11">
        <button
          onClick={() => setArchivedOpen(v => !v)}
          className="flex w-full items-center justify-between rounded-[20px] border-2 border-[#0f172a] bg-white p-5 shadow-[4px_4px_0_#f59e0b] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#f59e0b]">
          <span className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
            <MaskIcon file="ludo-archives.svg" size={22} color="#f59e0b" /> Événements archivés
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] text-slate-500">{archivedEvents.length}</span>
          </span>
          {archivedOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {archivedOpen && (
          <div className="mt-4 space-y-3">
            {archivedEvents.length === 0 ? (
              <p className="text-center text-[10px] text-slate-400 py-6">Aucun événement archivé</p>
            ) : (
              archivedEvents.map(event => (
                <div key={event.id} className="flex flex-wrap items-center gap-4 rounded-[20px] border-2 border-[#0f172a] bg-white p-4 shadow-[3px_3px_0_#94a3b8]">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6]">
                    {event.image_url ? <img src={event.image_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-slate-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 uppercase truncate">{event.title}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · {event.location}
                    </p>
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                    <IconButton tone="success" title="Bilan de l'événement" onClick={() => openBilanModal(event)}><BarChart2 size={16} /></IconButton>
                    <IconButton tone="warn" title="Désarchiver" onClick={() => unarchiveEvent(event.id)}><ArchiveRestore size={16} /></IconButton>
                    <IconButton tone="danger" title="Supprimer définitivement" onClick={() => setDeleteModal({ show: true, id: event.id, title: event.title })}><Trash2 size={16} /></IconButton>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODALE GESTION COLLECTIVITÉS */}
      {collectivitesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={() => { setCollectivitesModal(false); setEditingCollectivite(null); setNewCollectivite(CONTACT_VIDE) }} />
          <div data-tutorial="evt-collectivites-modal" className="anim-modal-in relative flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">

            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#f0f7f9] text-[#1a5f7a]"><MaskIcon file="ludo-carnet.svg" size={30} color="#1a5f7a" /></div>
                <div>
                  <h3 className="font-display text-[21px] font-extrabold tracking-[-0.04em]">Destinataires <span className="text-[#1a5f7a]">enregistrés</span></h3>
                  <p className="mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{collectivites.length} contact{collectivites.length > 1 ? 's' : ''} : mairies, presse, écoles</p>
                </div>
              </div>
              <button onClick={() => { setCollectivitesModal(false); setEditingCollectivite(null); setNewCollectivite(CONTACT_VIDE) }} aria-label="Fermer"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white">✕</button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">

              {/* Note info adhérents */}
              <div className="flex items-start gap-3 rounded-[20px] border-2 border-[#1a5f7a] bg-[#f0f7f9] p-4">
                <Users size={16} className="mt-0.5 shrink-0 text-[#1a5f7a]" />
                <p className="text-[10.5px] font-medium leading-relaxed text-[#1a5f7a]">
                  Les emails des <strong>adhérents</strong> n'ont pas besoin d'être renseignés ici — ils sont automatiquement récupérés depuis la base de données lors de l'envoi.
                </p>
              </div>

              {/* Formulaire ajout/édition */}
              <div id="collectivite-form" className="scroll-mt-4 space-y-3 rounded-[22px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">
                  {editingCollectivite ? '✏️ Modifier le contact' : 'Ajouter un contact'}
                </p>
                <div className="flex gap-1.5" role="radiogroup" aria-label="Catégorie du contact">
                  {CATEGORIES_CONTACT.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={newCollectivite.categorie === cat.id}
                      onClick={() => setNewCollectivite(prev => ({ ...prev, categorie: cat.id }))}
                      className={'flex-1 rounded-[12px] border-2 border-[#0f172a] py-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em] transition-colors ' +
                        (newCollectivite.categorie === cat.id ? 'bg-[#1a5f7a] text-white' : 'bg-white text-slate-500 hover:bg-slate-100')}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    placeholder={newCollectivite.categorie === 'presse' ? 'Nom (ex: Le Progrès, Voix de l’Ain)' : newCollectivite.categorie === 'ecole' ? 'Nom (ex: École de Coligny)' : 'Nom (ex: Mairie de Beaupont)'}
                    className="rounded-[14px] border-2 border-[#0f172a] bg-white p-3 text-sm font-bold outline-none"
                    value={newCollectivite.nom}
                    onChange={e => setNewCollectivite(prev => ({ ...prev, nom: e.target.value }))}
                  />
                  <input
                    placeholder="Email"
                    type="email"
                    className="rounded-[14px] border-2 border-[#0f172a] bg-white p-3 text-sm font-bold outline-none"
                    value={newCollectivite.email}
                    onChange={e => setNewCollectivite(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveCollectivite}
                    disabled={!newCollectivite.nom || !newCollectivite.email}
                    className={'flex-1 rounded-[14px] border-2 border-[#0f172a] py-3 text-[9.5px] font-extrabold uppercase tracking-[0.14em] transition-colors ' +
                      (newCollectivite.nom && newCollectivite.email
                        ? 'bg-[#1a5f7a] text-white hover:bg-[#134a5e]'
                        : 'cursor-not-allowed bg-slate-100 text-slate-300')}>
                    {editingCollectivite ? 'Enregistrer les modifications' : 'Ajouter'}
                  </button>
                  {editingCollectivite && (
                    <button onClick={() => { setEditingCollectivite(null); setNewCollectivite(CONTACT_VIDE) }}
                      className="rounded-[14px] border-2 border-[#0f172a] bg-white px-4 py-3 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500 hover:bg-slate-100">
                      Annuler
                    </button>
                  )}
                </div>
              </div>

              {/* Liste */}
              <div className="flex flex-col gap-2.5">
                {collectivites.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-[18px] border-2 border-slate-200 bg-white px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-extrabold uppercase">{c.label}</span>
                        <span className={'shrink-0 rounded-full border-2 border-[#0f172a] px-2 py-0.5 text-[7.5px] font-extrabold uppercase tracking-[0.1em] ' +
                          (c.categorie === 'presse' ? 'bg-[#fdf1ea] text-[#e38154]' : c.categorie === 'ecole' ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#f0f7f9] text-[#1a5f7a]')}>
                          {CATEGORIES_CONTACT.find(cat => cat.id === c.categorie)?.label}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] font-bold text-slate-400">{c.email}</p>
                    </div>
                    <IconButton
                      title="Modifier"
                      onClick={() => {
                        setEditingCollectivite(c.id)
                        setNewCollectivite({ nom: c.label, email: c.email, categorie: c.categorie })
                        document.getElementById('collectivite-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      <Edit2 size={15} />
                    </IconButton>
                    <IconButton tone="danger" title="Supprimer" onClick={() => deleteCollectivite(c.id)}><Trash size={15} /></IconButton>
                  </div>
                ))}
                {collectivites.length === 0 && (
                  <p className="py-6 text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Aucun contact enregistré</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      <ModelesMessages open={modelesOpen} onClose={() => setModelesOpen(false)} />

      {/* Force l'affichage des boutons de carte pendant le tutoriel */}
      {showTuto && (
        <style>{`.evt-card-actions { opacity: 1 !important; }`}</style>
      )}

      {/* ── TUTORIEL ─────────────────────────────────────────────────────── */}
      {!(composeModal.show || fbModal.show || bilanModal.show || collectivitesModal || modelesOpen || showImportDesc || deleteModal.show) && (
        <TutorialButton onClick={() => setShowTuto(true)} />
      )}
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

      {/* FENÊTRE « ANNONCE » : CARROUSEL FACEBOOK & INSTAGRAM ET STORY DU JOUR J */}
      {fbModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={fermerAnnonce} />
          <div className="anim-modal-in relative flex max-h-[92vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#3b82f6]">

            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#eff6ff] text-[#3b82f6]"><MaskIcon file="ludo-annonce.svg" size={30} color="#3b82f6" /></div>
                <div className="min-w-0">
                  <h3 className="font-display text-[19px] font-extrabold tracking-[-0.04em] text-[#3b82f6]">Annonce</h3>
                  <p className="mt-1.5 truncate text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{fbModal.event?.title}</p>
                </div>
              </div>
              <button onClick={fermerAnnonce} disabled={annonceEnPublication} aria-label="Fermer"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <PublicationAnnonce
                key={fbModal.event.id}
                event={fbModal.event}
                texte={fbText}
                onTexteChange={setFbText}
                onEventChange={patch => majEvenement(fbModal.event.id, patch)}
                onErreur={message => addToast(message, 'error')}
                onPublication={setAnnonceEnPublication}
              />
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t-2 border-slate-100 p-6">
              <button onClick={fermerAnnonce} disabled={annonceEnPublication}
                className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                {annonceEnPublication ? 'Publication en cours…' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE BILAN D'ÉVÉNEMENT */}
      {bilanModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-[22px]">
          <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={closeBilanModal} />
          <div className="anim-modal-in relative flex max-h-[92vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#10b981]">

            <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#ecfdf5] text-[#10b981]"><MaskIcon file="ludo-bilan.svg" size={30} color="#10b981" /></div>
                <div className="min-w-0">
                  <h3 className="font-display text-[19px] font-extrabold tracking-[-0.04em]">Bilan de l'<span className="text-[#10b981]">événement</span></h3>
                  <p className="mt-1.5 truncate text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{bilanModal.event?.title}</p>
                </div>
              </div>
              <button onClick={closeBilanModal} disabled={bilanEnPublication} aria-label="Fermer"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">✕</button>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto p-6">

              {/* SECTION PARTICIPANTS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2">
                  <MaskIcon file="ludo-joueurs.svg" size={22} color="currentColor" /> Participants
                </h4>
                <div className="flex gap-2.5 sm:gap-3">
                  <input
                    type="number" inputMode="numeric" min={0} placeholder="Nombre"
                    className="w-0 min-w-0 flex-1 rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 font-bold text-sm outline-none focus:border-[#1a5f7a] focus:bg-white"
                    value={bilanParticipants}
                    onChange={e => setBilanParticipants(e.target.value)}
                  />
                  <button onClick={saveParticipants} disabled={savingParticipants}
                    className={'flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest transition-all sm:px-6 ' +
                      (savingParticipants ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#1a5f7a] text-white hover:bg-[#134a5e]')}>
                    {savingParticipants ? <Loader2 size={14} className="animate-spin" /> : 'Enregistrer'}
                  </button>
                </div>
              </div>

              {/* SECTION PHOTOS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2">
                  <MaskIcon file="ludo-photo.svg" size={22} color="currentColor" /> Photos
                </h4>

                {bilanPhotoFiles.length > 0 ? (
                  <div className="space-y-4 rounded-[22px] border-2 border-[#0f172a] bg-[#fdfaf6] p-6">
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
                  <div className="flex flex-col items-center justify-center rounded-[24px] border-[3px] border-dashed border-slate-300 bg-[#fdfaf6] p-8">
                    <label className="cursor-pointer rounded-[16px] border-2 border-[#0f172a] bg-white px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] transition-colors hover:bg-slate-100">
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
                          className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 text-rose-500 rounded-lg shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
                  <MaskIcon file="ludo-jeux-joues.svg" size={22} color="currentColor" /> Jeux joués
                </h4>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    placeholder="Rechercher un jeu (ludothèque, puis MyLudo)…"
                    className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] py-4 pl-11 pr-10 text-sm font-bold outline-none focus:bg-white"
                    value={gameSearchQuery}
                    onChange={e => handleGameSearchChange(e.target.value)}
                  />
                  {gameSearchLoading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1a5f7a] animate-spin" />}

                  {(catalogueResults.length > 0 || gameSearchResults.length > 0) && (
                    <div className="absolute z-50 top-full mt-2 w-full rounded-[18px] border-2 border-[#0f172a] bg-white shadow-[4px_4px_0_#1a5f7a] max-h-80 overflow-y-auto">
                      {catalogueResults.length > 0 && (
                        <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-[#1a5f7a]">Dans la ludothèque</p>
                      )}
                      {catalogueResults.map(jeu => (
                        <div key={`ludo-${jeu.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {jeu.image_url ? <img src={jeu.image_url} alt="" className="w-full h-full object-contain" /> : <Dice5 size={16} className="text-slate-300" />}
                          </div>
                          <p className="flex-1 min-w-0 text-xs font-bold text-slate-800 truncate">{jeu.name}</p>
                          <button onClick={() => ajouterJeuDeLaLudo(jeu)} disabled={addingGameId === `ludo-${jeu.id}`}
                            className="shrink-0 px-3 py-2 bg-[#1a5f7a]/10 text-[#1a5f7a] rounded-xl text-[9px] font-black uppercase hover:bg-[#1a5f7a]/20 transition-colors flex items-center gap-1">
                            {addingGameId === `ludo-${jeu.id}` ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Ajouter</>}
                          </button>
                        </div>
                      ))}
                      {gameSearchResults.length > 0 && (
                        <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Ailleurs (MyLudo)</p>
                      )}
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
                      <div key={game.id} className="relative flex flex-col items-center overflow-hidden rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-3 text-center">
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
                  <MaskIcon file="ludo-post.svg" size={22} color="currentColor" /> Publier sur les réseaux
                </h4>
                {estPermanence(bilanModal.event.title) ? (
                  <PublicationBilanPermanence
                    key={bilanModal.event.id}
                    event={bilanModal.event}
                    photos={bilanPhotos}
                    onPublication={setBilanEnPublication}
                    onEventChange={patch => majEvenement(bilanModal.event.id, patch)}
                    onErreur={message => addToast(message, 'error')}
                  />
                ) : getEventType(bilanModal.event.title) === 'permanence' ? (
                  <p className="text-[11px] italic text-slate-400 px-1">Le bilan de cet événement n'est pas encore proposé.</p>
                ) : (
                  <PublicationBilan
                    key={bilanModal.event.id}
                    event={bilanModal.event}
                    photos={bilanPhotos}
                    jeux={bilanGames}
                    participants={bilanParticipants}
                    texte={bilanFbText}
                    onTexteChange={t => { setBilanFbText(t); setBilanFbTextEdited(true) }}
                    texteModifie={bilanFbTextEdited}
                    onTexteReset={resetBilanFbText}
                    onJeuxChange={setBilanGames}
                    onEventChange={patch => majEvenement(bilanModal.event.id, patch)}
                    onErreur={message => addToast(message, 'error')}
                  />
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 border-t-2 border-slate-100 p-6">
              <button onClick={closeBilanModal} disabled={bilanEnPublication}
                className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                {bilanEnPublication ? 'Publication en cours…' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}