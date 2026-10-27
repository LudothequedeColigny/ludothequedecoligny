import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Trash2, Edit2, X, Hash, AlertCircle, Search, ImageIcon, ExternalLink, PlayCircle, FileText, Loader2, Camera, ScanLine, Sparkles, QrCode, Printer } from 'lucide-react'
import MaskIcon from '../../components/site/MaskIcon'
import { supabase } from '../../services/supabaseClient'
import { volunteerHeaders } from '../../services/functionHeaders'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { useToast } from '../../components/ToastContext'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminBanner from '../../components/admin/AdminBanner'
import BarcodeCamera from '../../components/admin/BarcodeCamera'
import FicheWikiludo from '../../components/admin/FicheWikiludo'
import SearchField from '../../components/admin/SearchField'
import IconButton from '../../components/admin/IconButton'
import ConfirmModal from '../../components/admin/ConfirmModal'
import FenetreEtiquettes from '../../components/admin/etiquettes/FenetreEtiquettes'
import { DataCard, DataHeader, DataRow, DataEmpty } from '../../components/admin/DataCard'
import { BTN_ORANGE, BTN_TEAL, BTN_INK, BTN_OUTLINE } from '../../components/admin/buttons'

// ─── Helpers MyLudo (via Edge Function Supabase) ──────────────────────────────

const BGG_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`

async function bggCall(endpoint: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ endpoint, ...params }).toString()
  const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, {
    headers: await volunteerHeaders(),
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function bggSearch(query: string): Promise<{ id: string; name: string; year: string; language: string }[]> {
  const data = await bggCall('search', { query })
  if (!Array.isArray(data)) return []
  return data.map((item: any) => ({
    id:       String(item.id),
    name:     item.name,
    year:     item.year || '',
    language: item.language || ''
  })).filter(i => i.name && i.id)
}

async function bggGetDetails(id: string) {
  const item = await bggCall('thing', { id })
  if (!item) return null
  return {
    name:        item.name        || '',
    description: item.description || '',
    minPlayers:  item.minPlayers  || 1,
    maxPlayers:  item.maxPlayers  || 4,
    minAge:      item.minAge      || 0,
    duration:    item.duration    || 0,
    image:       item.image       || '',
    categories:  item.categories  || [],
    barcode:     item.barcode     || '',
    thicknessMm: item.thicknessMm || null
  }
}

// ─── Wikiludo (base de notices de l'ALF, via Edge Function Supabase) ───────────
// Fiche du jeu à partir de son code-barres. Wikiludo donne la durée en « court /
// moyen / long » seulement : la durée en minutes vient de MyLudo quand il connaît le jeu.

const WIKILUDO_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wikiludo`

async function wikiludoParCodeBarres(ean: string): Promise<any | null> {
  const res = await fetch(`${WIKILUDO_FUNCTION_URL}?ean=${encodeURIComponent(ean)}`, {
    headers: await volunteerHeaders(),
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) throw new Error(`Wikiludo HTTP ${res.status}`)
  return res.json()
}

async function myludoParCodeBarres(ean: string): Promise<any | null> {
  const qs = new URLSearchParams({ endpoint: 'search-by-barcode', barcode: ean }).toString()
  const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, { headers: await volunteerHeaders(), signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`MyLudo HTTP ${res.status}`)
  return res.json()
}

// Durée approximative quand seul Wikiludo connaît le jeu (le bénévole peut corriger)
const DUREE_WIKILUDO: Record<string, number> = { court: 20, moyen: 45, long: 90 }
const dureeDepuisLibelle = (libelle: string) =>
  DUREE_WIKILUDO[Object.keys(DUREE_WIKILUDO).find(k => (libelle || '').toLowerCase().includes(k)) || ''] || 0

// ─────────────────────────────────────────────────────────────────────────────

const JEUX_TUTORIAL_STEPS = (openForm, cancelForm) => [
  { id: 'jeux-header', noSpotlight: true, title: 'Bienvenue sur la page Jeux', description: `Cette page centralise tout le catalogue de la ludothèque : ajouter, modifier, supprimer des jeux et suivre leur disponibilité.`, action: () => cancelForm() },
  { id: 'jeux-scanner-btn', title: 'Scanner un jeu par code-barres', description: `Ce bouton ouvre la caméra pour scanner le code-barres d'une boîte. Si le jeu est connu de Wikiludo (la base des ludothèques) ou de MyLudo, la fiche est pré-remplie automatiquement.`, action: () => cancelForm() },
  { id: 'jeux-etiquettes-btn', title: 'Étiquettes des boîtes', description: `Ce bouton ouvre le générateur d'étiquettes : l'onglet Code-barres prépare les planches A4 d'étiquettes à coller sur la tranche des boîtes (code-barres, numéro, couleur de la catégorie) ; l'onglet Vidéo des règles fabrique les étiquettes QR des jeux qui ont une vidéo.`, action: () => cancelForm(), tip: `Ce bouton est masqué sur smartphone — la génération d'étiquettes se fait depuis un ordinateur.` },
  { id: 'jeux-add-btn', title: 'Ajouter un jeu manuellement', description: `Cliquez ici pour ouvrir le formulaire de création. Le numéro d'inventaire est pré-rempli automatiquement.`, action: () => cancelForm() },
  { id: 'jeux-form-modal', title: `Formulaire d'ajout d'un jeu`, description: `Ce formulaire permet de saisir toutes les informations d'un jeu.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-numero', title: `Numéro d'inventaire et code-barres`, description: `Le numéro d'inventaire identifie le jeu de façon unique. Le code-barres peut être scanné via la caméra ou saisi manuellement.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-titre', title: 'Titre avec autocomplétion MyLudo', description: `En tapant le nom du jeu, MyLudo propose des suggestions. Une fois le jeu choisi, la fiche est remplie avec Wikiludo (la base des ludothèques), complétée par MyLudo.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-desc-obs', title: 'Description et observations', description: `La description présente le thème. Les observations servent à noter l'état du jeu.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-joueurs-age', id2: 'jeux-form-age-duree', title: 'Nombre de joueurs, âge et durée', description: `Ces informations s'affichent dans le catalogue public.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-medias', title: 'Image et vidéo', description: `Ajoutez une image et un lien YouTube de règles.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-submit', title: 'Enregistrer le jeu', description: `Cliquez pour valider l'ajout.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-search', title: 'Barre de recherche', description: `Filtrez la liste en temps réel.`, action: () => cancelForm() },
  { id: 'jeux-list-row1', id2: 'jeux-list-row2', title: 'Catalogue des jeux', description: `Chaque ligne affiche la photo, le nom, les catégories et le nombre de joueurs.`, action: () => cancelForm() },
  { id: 'jeux-action-edit', title: 'Modifier un jeu', description: `L'icône crayon ouvre la fiche en mode édition.`, action: () => cancelForm() },
  { id: 'jeux-action-delete', title: 'Supprimer un jeu', description: `L'icône poubelle supprime définitivement le jeu après confirmation.`, tip: `Un jeu actuellement emprunté ne peut pas être supprimé.`, action: () => cancelForm() },
]

// Colonnes du tableau des jeux (ordinateur) : n°, jeu, configuration, actions
const GAMES_COLS = 'minmax(0, 1.15fr) minmax(0, 1.6fr) minmax(0, 1.2fr) 108px'

// Styles des champs du formulaire de jeu, repris de la maquette
const F_SECTION = 'mb-3.5 text-[10px] font-extrabold uppercase tracking-[0.18em]'
const F_LABEL = 'mb-2 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400'
const F_INPUT = 'w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white'
const F_TEXTAREA = 'w-full resize-none rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-[13px] font-medium text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white'
const F_SQUARE = 'flex w-12 shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] text-white transition-transform active:scale-95'

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function Jeux() {
  const { addToast } = useToast()
  const [jeux, setJeux] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTuto, setShowTuto] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' })
  const [showScanner, setShowScanner] = useState(false)
  const [showEtiquettes, setShowEtiquettes] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const [categoryInput, setCategoryInput] = useState('')
  const [availableCategories, setAvailableCategories] = useState([])
  const [categories, setCategories] = useState<any[]>([]) // catégories de la ludothèque (table categories_jeux), triées par ordre

  const [bggResults, setBggResults] = useState<{ id: string; name: string; year: string; language?: string }[]>([])
  const [bggLoading, setBggLoading] = useState(false)
  const [bggFilled, setBggFilled] = useState<false | string>(false) // false, ou la source : « MyLudo », « Wikiludo »…
  const [absentWikiludo, setAbsentWikiludo] = useState(false) // jeu inconnu de Wikiludo : proposer de l'y ajouter
  const wikiludoConnu = useRef<Map<string, boolean>>(new Map())  // code-barres → présent dans Wikiludo ?
  const [showFicheWikiludo, setShowFicheWikiludo] = useState(false) // fenêtre « Fiche pour Wikiludo »
  const [scanToAdd, setScanToAdd] = useState(false)
  const bggDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bggDropdownRef = useRef(null)


  const initialGameState = {
    registration_number: '', barcode: '', name: '', description: '', observations: '',
    min_players: 1, max_players: 4, min_age: 3, duration: 30,
    category: '', image_url: '', youtube_url: '', is_available: true,
    categorie_id: null as number | null, epaisseur_mm: '' as any, etiquette_imprimee_le: null as string | null
  }

  const [newGame, setNewGame] = useState(initialGameState)

  // Détection mobile (masquer le bouton étiquettes sur smartphone)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { fetchJeux() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (bggDropdownRef.current && !bggDropdownRef.current.contains(e.target)) setBggResults([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNameChange = (value: string) => {
    setNewGame(prev => ({ ...prev, name: value }))
    setBggFilled(false); setAbsentWikiludo(false)
    setBggResults([])
    if (bggDebounceRef.current) clearTimeout(bggDebounceRef.current)
    if (value.trim().length < 2) return
    bggDebounceRef.current = setTimeout(async () => {
      setBggLoading(true)
      try { const results = await bggSearch(value.trim()); setBggResults(results) }
      catch (e) { console.warn('BGG search error:', e) }
      finally { setBggLoading(false) }
    }, 1000)
  }

  // Remplit la fiche à partir de Wikiludo (prioritaire) et de MyLudo (complément).
  // Utilisé par le scan et par le choix d'un jeu dans la liste des noms.
  // `wikiRepondu` : Wikiludo a bien répondu (même « inconnu ») — sinon on ne sait pas.
  const remplirFiche = (w: any, m: any, barcode: string, wikiRepondu: boolean) => {
    if (wikiRepondu && barcode) wikiludoConnu.current.set(barcode, !!w)
    setAbsentWikiludo(wikiRepondu && !w)
    const motsWikiludo = [...(w?.mechanisms || []), ...(w?.keywords || [])].map((x: string) => x.toLowerCase())
    setNewGame(prev => ({
      ...prev,
      barcode:     barcode            || prev.barcode,
      name:        w?.name            || m?.name        || prev.name,
      description: w?.description     || m?.description || prev.description,
      min_players: w?.minPlayers      || m?.minPlayers  || prev.min_players,
      max_players: w?.maxPlayers      || m?.maxPlayers  || prev.max_players,
      min_age:     w?.minAge          || m?.minAge      || prev.min_age,
      duration:    m?.duration        || dureeDepuisLibelle(w?.durationLabel) || prev.duration,
      image_url:   w?.image           || m?.image       || prev.image_url,
      category:    m?.categories?.join(', ') || motsWikiludo.join(', ') || prev.category,
      youtube_url: w?.video           || prev.youtube_url,
      // L'épaisseur n'est reprise que si la base l'acceptera (1 à 300 mm)
      epaisseur_mm: (typeof m?.thicknessMm === 'number' && m.thicknessMm >= 1 && m.thicknessMm <= 300) ? m.thicknessMm : prev.epaisseur_mm,
      registration_number: prev.registration_number || getNextRegistrationNumber()
    }))
    setBggFilled(w && m ? 'Wikiludo et MyLudo' : w ? 'Wikiludo' : 'MyLudo')
  }

  const handleBggSelect = async (result: { id: string; name: string; year: string; language: string }) => {
    setBggResults([])
    setBggLoading(true)
    setNewGame(prev => ({ ...prev, name: result.name }))
    // Wikiludo ne sait chercher que par code-barres (essayé en octobre 2026 : titre,
    // auteur, éditeur… sont ignorés). MyLudo trouve donc le jeu par son nom et donne
    // son code-barres ; la fiche Wikiludo est ensuite demandée avec ce code.
    try {
      const details = await bggGetDetails(result.id)
      if (!details) return
      const m = { ...details, name: details.name || result.name }
      let w = null, wikiRepondu = false
      if (details.barcode) {
        try { w = await wikiludoParCodeBarres(details.barcode); wikiRepondu = true }
        catch (e) { console.warn('Wikiludo :', e) }
      }
      remplirFiche(w, m, details.barcode || '', wikiRepondu)
    } catch (e) { console.warn('MyLudo details error:', e) }
    finally { setBggLoading(false) }
  }

  // Scan « Ajouter par scan » : Wikiludo (base des ludothèques) et MyLudo sont
  // interrogés ensemble. Wikiludo a la priorité pour le titre, le résumé, l'âge,
  // les joueurs, l'image et la vidéo-règle ; MyLudo apporte la durée en minutes,
  // la catégorie habituelle du catalogue, et tout ce que Wikiludo n'a pas.
  const handleBarcodeDetected = async (barcode: string) => {
    setNewGame(prev => ({ ...prev, barcode }))
    if (!scanToAdd) return
    setBggLoading(true)
    try {
      const [wiki, myludo] = await Promise.allSettled([wikiludoParCodeBarres(barcode), myludoParCodeBarres(barcode)])
      const w = wiki.status === 'fulfilled' ? wiki.value : null
      const m = myludo.status === 'fulfilled' ? myludo.value : null
      if (wiki.status === 'rejected') console.warn('Wikiludo :', wiki.reason)
      if (myludo.status === 'rejected') console.warn('MyLudo :', myludo.reason)
      if (w || m) {
        remplirFiche(w, m, barcode, wiki.status === 'fulfilled')
      } else {
        if (wiki.status === 'fulfilled') { wikiludoConnu.current.set(barcode, false); setAbsentWikiludo(true) }
        addToast(`Jeu non trouvé sur Wikiludo ni sur MyLudo pour le code-barres ${barcode}. Remplissez les informations manuellement.`, 'warning')
      }
      setShowForm(true)
    } catch (e) { console.warn('Barcode search error:', e); setShowForm(true) }
    finally { setBggLoading(false); setScanToAdd(false) }
  }

  // Fenêtre d'un jeu ouverte : on demande à Wikiludo s'il connaît ce code-barres,
  // pour proposer « Préparer la fiche Wikiludo » sinon. Réponses gardées le temps de la page.
  useEffect(() => {
    const ean = (newGame.barcode || '').trim()
    if (!showForm || !/^\d{8,14}$/.test(ean)) { setAbsentWikiludo(false); return }
    const deja = wikiludoConnu.current.get(ean)
    if (deja !== undefined) { setAbsentWikiludo(!deja); return }
    let annule = false
    const t = setTimeout(async () => {
      try {
        const fiche = await wikiludoParCodeBarres(ean)
        wikiludoConnu.current.set(ean, !!fiche)
        if (!annule) setAbsentWikiludo(!fiche)
      } catch { if (!annule) setAbsentWikiludo(false) }   // Wikiludo injoignable : on ne sait pas
    }, 600)
    return () => { annule = true; clearTimeout(t) }
  }, [showForm, newGame.barcode])

  // La caméra et la lecture des codes sont gérées par la brique BarcodeCamera.

  const stopScanner = () => setShowScanner(false)

  async function fetchJeux() {
    setLoading(true)
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase.from('games').select('*').order('registration_number', { ascending: true })
        if (!error) {
          const fetchedJeux = data || []
          setJeux(fetchedJeux)
          localStorage.setItem('cache_games_list', JSON.stringify(fetchedJeux))
          updateCategoriesList(fetchedJeux)
          const { data: cats, error: errCats } = await supabase.from('categories_jeux').select('*').order('ordre')
          if (!errCats) {
            setCategories(cats || [])
            localStorage.setItem('cache_categories_jeux', JSON.stringify(cats || []))
          } else {
            // échec : on garde la liste déjà affichée, sinon celle du cache
            console.warn('Catégories non chargées :', errCats.message)
            setCategories(prev => prev.length ? prev : JSON.parse(localStorage.getItem('cache_categories_jeux') || '[]'))
          }
        }
      } else {
        const cachedJeux = JSON.parse(localStorage.getItem('cache_games_list') || '[]')
        setJeux(cachedJeux)
        setCategories(JSON.parse(localStorage.getItem('cache_categories_jeux') || '[]'))
        updateCategoriesList(cachedJeux)
      }
    } catch (err) { console.error("Erreur de chargement des jeux:", err) }
    finally { setLoading(false) }
  }

  const updateCategoriesList = (gamesData) => {
    const cats = new Set()
    gamesData.forEach(j => { if (j.category) j.category.split(',').forEach(c => cats.add(c.trim())) })
    setAvailableCategories(Array.from(cats).sort())
  }

  const getNextRegistrationNumber = () => {
    if (jeux.length === 0) return '001'
    const numbers = jeux.map(j => parseInt(j.registration_number)).filter(n => !isNaN(n))
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
    return (maxNumber + 1).toString().padStart(3, '0')
  }

  const handleOpenForm = () => {
    if (!showForm) { setNewGame({ ...initialGameState, registration_number: getNextRegistrationNumber() }); setBggResults([]); setBggFilled(false); setAbsentWikiludo(false) }
    setShowForm(!showForm)
    setEditingId(null)
  }

  const isNumberDuplicate = jeux.some(j => j.registration_number === newGame.registration_number && j.id !== editingId)

  const addCategory = (cat) => {
    const cleanCat = cat.trim()
    if (!cleanCat) return
    const currentCats = newGame.category ? newGame.category.split(',').map(c => c.trim()) : []
    if (!currentCats.includes(cleanCat)) setNewGame({ ...newGame, category: [...currentCats, cleanCat].join(', ') })
    setCategoryInput('')
  }

  const removeCategory = (catToRemove) => {
    setNewGame({ ...newGame, category: newGame.category.split(',').map(c => c.trim()).filter(c => c !== catToRemove).join(', ') })
  }

  const filteredJeux = jeux.filter(jeu =>
    jeu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    jeu.registration_number.toString().includes(searchTerm) ||
    jeu.barcode?.toString().includes(searchTerm) ||
    jeu.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const startEdit = (jeu) => {
    if (!navigator.onLine) { addToast("La modification est désactivée en mode hors-ligne.", 'warning'); return }
    setNewGame(jeu); setEditingId(jeu.id); setShowForm(true); setBggFilled(false); setAbsentWikiludo(false); setBggResults([])
  }

  // Étiquette abîmée : le jeu revient dans la liste « à imprimer » de la fenêtre Étiquettes
  const reimprimerEtiquette = async () => {
    const { error } = await supabase.from('games').update({ etiquette_imprimee_le: null }).eq('id', editingId)
    if (error) { addToast('Impossible : ' + error.message, 'error'); return }
    setNewGame(g => ({ ...g, etiquette_imprimee_le: null }))
    fetchJeux()
    addToast("L'étiquette sera proposée à la prochaine impression.", 'success')
  }

  const cancelEdit = () => {
    setNewGame(initialGameState); setEditingId(null); setShowForm(false); setBggResults([]); setBggFilled(false); setAbsentWikiludo(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!navigator.onLine) { addToast("Impossible d'uploader en mode hors-ligne.", 'warning'); return }
    setUploading(true)
    try {
      const compressed = await new Promise<{ blob: Blob; ext: string }>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('Fichier illisible'))
        reader.readAsDataURL(file)
        reader.onload = (event) => {
          const img = new Image()
          img.onerror = () => reject(new Error('Image illisible'))
          img.src = event.target.result as string
          img.onload = () => {
            const canvas = document.createElement('canvas')
            // On réduit à 800 px de large, sans jamais AGRANDIR une image
            // déjà plus petite : l'agrandir la rendrait floue et plus lourde.
            const MAX_WIDTH = 800
            const scale = Math.min(1, MAX_WIDTH / img.width)
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
            // Certains navigateurs ne savent pas fabriquer de WebP et renvoient
            // alors un PNG, dix fois plus lourd et sans qu'on s'en aperçoive.
            // On vérifie donc ce qu'on a obtenu, et on se rabat sur du JPEG.
            canvas.toBlob(blob => {
              if (blob && blob.type === 'image/webp') { resolve({ blob, ext: 'webp' }); return }
              canvas.toBlob(jpg => {
                if (jpg) resolve({ blob: jpg, ext: 'jpg' })
                else reject(new Error('Compression impossible'))
              }, 'image/jpeg', 0.82)
            }, 'image/webp', 0.82)
          }
        }
      })
      const fileName = `${Math.random()}-${Date.now()}.${compressed.ext}`
      const { error: uploadError } = await supabase.storage
        .from('game-images').upload(fileName, compressed.blob, { contentType: compressed.blob.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('game-images').getPublicUrl(fileName)
      setNewGame({ ...newGame, image_url: publicUrl })
    } catch (error: any) { addToast("Erreur lors de l'envoi : " + error.message, 'error') }
    finally { setUploading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isNumberDuplicate) return
    if (navigator.onLine) {
      let finalImageUrl = newGame.image_url || ''
      // Image venue d'un autre site (MyLudo, Wikiludo…) : copiée dans le stockage de la
      // ludothèque, pour qu'elle ne disparaisse pas si le site d'origine la retire.
      if (finalImageUrl && /^https?:\/\//.test(finalImageUrl) && !finalImageUrl.includes('.supabase.co/')) {
        try {
          const qs = new URLSearchParams({ endpoint: 'upload-image', imageUrl: finalImageUrl }).toString()
          const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, { headers: await volunteerHeaders() })
          if (res.ok) { const data = await res.json(); finalImageUrl = data.url || finalImageUrl }
        } catch (e) { console.warn('Image upload skipped:', e) }
      }
      const gameData = {
        registration_number: newGame.registration_number, barcode: (newGame.barcode || '').replace(/\s+/g, ''),
        name: newGame.name, description: newGame.description || '', observations: newGame.observations || '',
        min_players: parseInt(newGame.min_players as any) || 1, max_players: parseInt(newGame.max_players as any) || 1,
        min_age: parseInt(newGame.min_age as any) || 0, duration: parseInt(newGame.duration as any) || 0,
        category: newGame.category || '', image_url: finalImageUrl,
        youtube_url: newGame.youtube_url || '', is_available: newGame.is_available ?? true,
        categorie_id: newGame.categorie_id || null,
        // hors de 1 à 300 mm, la base refuserait tout l'enregistrement : on laisse vide
        epaisseur_mm: (() => { const e = parseInt(newGame.epaisseur_mm as any); return e >= 1 && e <= 300 ? e : null })()
      }
      let error
      const wasEditing = !!editingId
      if (editingId) { const { error: e } = await supabase.from('games').update(gameData).eq('id', editingId); error = e }
      else { const { error: e } = await supabase.from('games').insert([gameData]); error = e }
      if (!error) { cancelEdit(); fetchJeux(); addToast(wasEditing ? 'Jeu modifié avec succès.' : 'Jeu ajouté avec succès.', 'success') }
      else addToast("Erreur lors de l'enregistrement : " + error.message, 'error')
    } else {
      addToast("⚠️ Le réseau est coupé. Impossible d'ajouter ou modifier un jeu pour le moment.", 'warning')
    }
  }

  const openDeleteModal = (jeu) => {
    if (!navigator.onLine) { addToast("Action impossible hors-ligne.", 'warning'); return }
    setDeleteModal({ show: true, id: jeu.id, name: jeu.name })
  }

  const confirmDelete = async () => {
    const { error } = await supabase.from('games').delete().eq('id', deleteModal.id)
    if (!error) { setDeleteModal({ show: false, id: null, name: '' }); fetchJeux(); addToast('Jeu supprimé avec succès.', 'success') }
    else addToast("Erreur lors de la suppression", 'error')
  }

  const jeuxSteps = useMemo(() => JEUX_TUTORIAL_STEPS(
    () => {
      setNewGame(g => ({ ...initialGameState, registration_number: g.registration_number || getNextRegistrationNumber() }))
      setBggResults([]); setBggFilled(false); setAbsentWikiludo(false); setEditingId(null); setShowForm(true)
    },
    () => { setShowForm(false); setEditingId(null) }
  ), []) // eslint-disable-line react-hooks/exhaustive-deps

  const nbEtiquettesAImprimer = jeux.filter(j => !j.etiquette_imprimee_le && j.categorie_id && j.epaisseur_mm > 0 && (j.barcode || '').trim()).length

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-5 font-body text-[#0f172a] md:p-11">
      <div className="mx-auto max-w-[1240px]">

      {/* HEADER */}
      <div data-tutorial="jeux-header">
        <AdminPageHeader icon="ludo-collection.svg" title="Gestion des" accent="Jeux">
          <div className="flex w-full flex-wrap gap-2.5 md:w-auto">
            <button
              data-tutorial="jeux-add-btn"
              onClick={editingId ? cancelEdit : handleOpenForm}
              className={`${showForm ? BTN_INK : BTN_ORANGE} flex-1 md:flex-none`}
            >
              {showForm ? <X size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
              {editingId ? "Annuler" : (showForm ? "Fermer" : "Nouveau jeu")}
            </button>

            <button
              data-tutorial="jeux-scanner-btn"
              onClick={() => {
                setScanToAdd(true)
                setNewGame({ ...initialGameState, registration_number: getNextRegistrationNumber() })
                setBggFilled(false); setAbsentWikiludo(false)
                setShowScanner(true)
              }}
              className={`${BTN_TEAL} flex-1 md:flex-none`}
            >
              <MaskIcon file="ludo-scan.svg" size={22} color="currentColor" /> Ajouter par scan
            </button>

            {/* Étiquettes QR — masqué sur mobile, la génération se fait sur ordinateur */}
            {!isMobile && (
              <button
                data-tutorial="jeux-etiquettes-btn"
                onClick={() => setShowEtiquettes(true)}
                title="Étiquettes des boîtes (code-barres) et des vidéos de règles (QR)"
                className={`${BTN_OUTLINE} relative`}
              >
                <MaskIcon file="ludo-etiquettes.svg" size={22} color="currentColor" />
                <span className="hidden lg:inline">Étiquettes</span>
                {nbEtiquettesAImprimer > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#0f172a] bg-[#e38154] text-[9px] font-extrabold leading-none text-white">
                    {nbEtiquettesAImprimer}
                  </span>
                )}
              </button>
            )}
          </div>
        </AdminPageHeader>
      </div>

      <main>

        {!navigator.onLine && (
          <AdminBanner tone="warn" icon={<MaskIcon file="ludo-hors-ligne.svg" size={24} color="currentColor" />}>
            Catalogue en mode lecture seule (hors-ligne)
          </AdminBanner>
        )}

        <SearchField
          data-tutorial="jeux-search"
          shadow="#e38154"
          className="mb-6"
          placeholder="Rechercher par titre, numéro, code-barres..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* MODALE DU FORMULAIRE */}
        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-[22px]">
            <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={cancelEdit} />
            <div
              data-tutorial="jeux-form-modal"
              className="anim-modal-in relative max-h-[88vh] w-full max-w-[820px] overflow-y-auto rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]"
            >
              <form onSubmit={handleSubmit} className="p-6 md:p-9">
                <button
                  type="button"
                  onClick={cancelEdit}
                  aria-label="Fermer"
                  className="absolute right-4 top-4 z-10 flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
                >
                  ✕
                </button>

                <h2 className="mb-6 pr-14 font-display text-[24px] font-extrabold uppercase tracking-[-0.04em] md:text-[27px]">
                  {editingId ? <>Modifier le <span className="text-[#1a5f7a]">jeu</span></> : <>Ajouter un <span className="text-[#1a5f7a]">jeu</span></>}
                </h2>

                {absentWikiludo && (
                  <div className="mb-6 hidden flex-wrap items-center gap-3 rounded-[20px] border-2 border-[#1a5f7a] bg-[#f0f7f9] px-5 py-4 lg:flex">
                    <p className="flex-1 basis-[260px] text-[12px] font-semibold leading-snug text-[#1a5f7a]">
                      Ce jeu n'est pas encore dans <strong>Wikiludo</strong>. Vous pouvez l'y ajouter pour les autres ludothèques :
                      la fiche préparée présente chaque champ de la grille Wikiludo, à copier un par un.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowFicheWikiludo(true)}
                      className="flex items-center gap-2 rounded-[12px] border-2 border-[#0f172a] bg-white px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white"
                    >
                      <FileText size={13} /> Préparer la fiche Wikiludo
                    </button>
                    <a
                      href="https://sigb01.decalog.net"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-[12px] border-2 border-[#0f172a] bg-white px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white"
                    >
                      <ExternalLink size={13} /> Ouvrir Wikiludo
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-7">
                  <div>
                    <h3 className={`${F_SECTION} flex items-center gap-2 text-[#1a5f7a]`}><Hash size={14} /> Informations principales</h3>

                    <div data-tutorial="jeux-form-numero" className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={F_LABEL}>N° d'enregistrement</label>
                        <input
                          required
                          className={isNumberDuplicate ? `${F_INPUT} border-rose-500 bg-rose-50 text-rose-600` : F_INPUT}
                          value={newGame.registration_number}
                          onChange={e => setNewGame({ ...newGame, registration_number: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={F_LABEL}>Code-barres (scan)</label>
                        <div className="flex gap-2">
                          <input className={`${F_INPUT} min-w-0 flex-1`} value={newGame.barcode} placeholder="Scannez..." onChange={e => setNewGame({ ...newGame, barcode: e.target.value })} />
                          <button type="button" onClick={() => setShowScanner(true)} aria-label="Scanner" className={`${F_SQUARE} bg-[#0f172a]`}><ScanLine size={19} /></button>
                        </div>
                      </div>
                    </div>

                    <div data-tutorial="jeux-form-titre" className="mb-3.5" ref={bggDropdownRef}>
                      <label className={F_LABEL}>
                        Titre du jeu
                        {bggLoading && <Loader2 size={10} className="animate-spin text-[#1a5f7a]" />}
                        {bggFilled && !bggLoading && <span className="flex items-center gap-1 text-emerald-500"><Sparkles size={10} /> Rempli via {bggFilled}</span>}
                      </label>
                      <div className="relative">
                        <input required placeholder="Ex : Catan, Ticket to Ride..." className={F_INPUT} value={newGame.name} onChange={e => handleNameChange(e.target.value)} />
                        {bggResults.length > 0 && (
                          <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-[18px] border-2 border-[#0f172a] bg-white shadow-[4px_4px_0_#1a5f7a]">
                            <div className="flex items-center gap-2 border-b-2 border-[#0f172a] bg-[#fdfaf6] px-3.5 py-2.5">
                              <Sparkles size={12} className="text-[#1a5f7a]" />
                              <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Résultats MyLudo</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {bggResults.map(result => (
                                <button key={result.id} type="button" onClick={() => handleBggSelect(result)} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 text-left transition-colors last:border-0 hover:bg-[#f0f7f9]">
                                  <span className="truncate text-[13px] font-bold text-slate-700">{result.name}</span>
                                  <span className="flex shrink-0 gap-1.5">
                                    {result.language && <span className="rounded-lg bg-[#f0f7f9] px-2 py-1 text-[9px] font-extrabold text-[#1a5f7a]">{result.language}</span>}
                                    {result.year && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-extrabold text-slate-400">{result.year}</span>}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {bggLoading && bggResults.length === 0 && (
                        <p className="mt-2 flex items-center gap-1 text-[9px] font-extrabold text-[#1a5f7a]"><Loader2 size={10} className="animate-spin" /> Récupération des informations (Wikiludo, MyLudo)…</p>
                      )}
                    </div>

                    <div data-tutorial="jeux-form-desc-obs">
                      <label className={F_LABEL}><FileText size={12} /> Description du jeu</label>
                      <textarea rows={3} placeholder="Règles ou thème..." className={`${F_TEXTAREA} mb-3.5`} value={newGame.description || ''} onChange={e => setNewGame({ ...newGame, description: e.target.value })} />
                      <label className={`${F_LABEL} text-[#e38154]`}><AlertCircle size={12} /> Observations (état, pièces...)</label>
                      <textarea rows={3} placeholder="Vrac d'infos : usure, pièces manquantes..." className={`${F_TEXTAREA} mb-3.5 bg-[#fff7ed]`} value={newGame.observations || ''} onChange={e => setNewGame({ ...newGame, observations: e.target.value })} />
                    </div>

                    <div data-tutorial="jeux-form-joueurs-age" className="mb-3.5 grid grid-cols-2 gap-3">
                      <div>
                        <label className={F_LABEL}>Joueurs min</label>
                        <input type="number" className={F_INPUT} value={newGame.min_players} onChange={e => setNewGame({ ...newGame, min_players: parseInt(e.target.value) })} />
                      </div>
                      <div>
                        <label className={F_LABEL}>Joueurs max</label>
                        <input type="number" className={F_INPUT} value={newGame.max_players} onChange={e => setNewGame({ ...newGame, max_players: parseInt(e.target.value) })} />
                      </div>
                    </div>

                    <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
                      <div>
                        <label className={F_LABEL}>Catégorie de la ludothèque</label>
                        <div className="flex items-center gap-2">
                          <span className="h-[46px] w-3 shrink-0 rounded-full border-2 border-[#0f172a]" style={{ background: categories.find(c => c.id === newGame.categorie_id)?.couleur || '#ffffff' }} />
                          <select className={F_INPUT} value={newGame.categorie_id ?? ''} onChange={e => setNewGame({ ...newGame, categorie_id: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">— à choisir —</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={F_LABEL}>Épaisseur boîte (mm)</label>
                        <input type="number" min="1" max="300" placeholder="ex. 45" className={F_INPUT} value={newGame.epaisseur_mm ?? ''} onChange={e => setNewGame({ ...newGame, epaisseur_mm: e.target.value })} />
                      </div>
                    </div>
                    {editingId && newGame.etiquette_imprimee_le && (
                      <button type="button" onClick={reimprimerEtiquette} className="mb-3.5 flex items-center gap-2 rounded-[12px] border-2 border-[#0f172a] bg-white px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white">
                        <Printer size={13} /> Réimprimer l'étiquette
                      </button>
                    )}

                    <div>
                      <label className={F_LABEL}>Catégories</label>
                      <div className="mb-3 flex gap-2">
                        <input placeholder="Ajouter..." className={`${F_INPUT} min-w-0 flex-1`} value={categoryInput} onChange={e => setCategoryInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(categoryInput) } }} />
                        <button type="button" onClick={() => addCategory(categoryInput)} aria-label="Ajouter la catégorie" className={`${F_SQUARE} bg-[#1a5f7a]`}><Plus size={19} strokeWidth={3} /></button>
                      </div>
                      <div className="flex flex-wrap gap-[7px]">
                        {newGame.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, i) => (
                          <span key={i} className="flex items-center gap-2 rounded-[12px] border-2 border-[#0f172a] bg-[#1a5f7a] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white">
                            {cat} <X size={13} className="cursor-pointer" onClick={() => removeCategory(cat)} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div data-tutorial="jeux-form-medias">
                    <h3 className={`${F_SECTION} flex items-center gap-2 text-[#e38154]`}><ImageIcon size={14} /> Médias &amp; âge</h3>

                    <label className={F_LABEL}><ExternalLink size={12} /> URL image</label>
                    <div className="mb-3.5 flex gap-2">
                      <input placeholder="Lien..." className={`${F_INPUT} min-w-0 flex-1 text-[12.5px]`} value={newGame.image_url} onChange={e => setNewGame({ ...newGame, image_url: e.target.value })} />
                      <label className={`${F_SQUARE} cursor-pointer bg-[#e38154]`} title="Envoyer une image">
                        {uploading ? <Loader2 size={19} className="animate-spin" /> : <Camera size={19} />}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading || !navigator.onLine} />
                      </label>
                    </div>

                    <label className={F_LABEL}><PlayCircle size={12} /> URL vidéo</label>
                    <input placeholder="YouTube..." className={`${F_INPUT} mb-3.5 text-[12.5px]`} value={newGame.youtube_url} onChange={e => setNewGame({ ...newGame, youtube_url: e.target.value })} />

                    <div data-tutorial="jeux-form-age-duree" className="mb-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className={F_LABEL}>Âge min</label>
                        <input type="number" className={F_INPUT} value={newGame.min_age} onChange={e => setNewGame({ ...newGame, min_age: parseInt(e.target.value) })} />
                      </div>
                      <div>
                        <label className={F_LABEL}>Durée (min)</label>
                        <input type="number" className={F_INPUT} value={newGame.duration} onChange={e => setNewGame({ ...newGame, duration: parseInt(e.target.value) })} />
                      </div>
                    </div>

                    <div className="mb-4 flex h-[130px] items-center justify-center overflow-hidden rounded-[20px] border-[3px] border-dashed border-slate-300 bg-[#fdfaf6] p-4">
                      {newGame.image_url
                        ? <img src={newGame.image_url} className="max-h-full max-w-full object-contain" alt="Aperçu" />
                        : <span className="font-mono text-[10px] text-slate-400">aperçu de l'image</span>}
                    </div>

                    <button
                      data-tutorial="jeux-form-submit"
                      type="submit"
                      disabled={isNumberDuplicate}
                      className={`w-full rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ${
                        isNumberDuplicate
                          ? 'bg-slate-200 text-slate-400'
                          : 'bg-[#1a5f7a] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]'
                      }`}
                    >
                      {editingId ? "Enregistrer les modifications" : "Valider l'ajout du jeu"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-[30px] border-2 border-slate-200 bg-white p-5">
                <div className="mb-4 h-20 rounded-[18px] bg-slate-100" />
                <div className="mb-2 h-4 w-3/4 rounded-full bg-slate-100" />
                <div className="h-3 w-1/2 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* LISTE — tableau sur ordinateur, cartes sur téléphone */}
        {!loading && (
          <DataCard className="hidden md:block">
            <DataHeader columns={GAMES_COLS}>
              <div>N° / Code-barres</div><div>Jeu</div><div>Config.</div>
              <div className="text-right">Actions</div>
            </DataHeader>

            {filteredJeux.length === 0 ? (
              <DataEmpty icon={<MaskIcon file="ludo-etagere-vide.svg" size={56} color="#94a3b8" />}>
                Aucun jeu ne correspond à cette recherche.
              </DataEmpty>
            ) : filteredJeux.map((jeu, idx) => (
              <DataRow
                key={jeu.id}
                columns={GAMES_COLS}
                {...(idx === 0 ? { 'data-tutorial': 'jeux-list-row1' } : idx === 1 ? { 'data-tutorial': 'jeux-list-row2' } : {})}
              >
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-[10px] border-2 border-[#0f172a] bg-[#f0f7f9] px-3 py-1 text-xs font-extrabold text-[#1a5f7a]">
                      #{jeu.registration_number}
                    </span>
                    {jeu.youtube_url && <QrCode size={13} className="text-slate-300" />}
                  </div>
                  {jeu.barcode && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <ScanLine size={10} /> {jeu.barcode}
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-1">
                    {jeu.image_url
                      ? <img src={jeu.image_url} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" alt="" />
                      : <MaskIcon file="ludo-boite-jeu.svg" size={34} color="#cbd5e1" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-extrabold uppercase tracking-[-0.01em]">{jeu.name}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {jeu.category?.split(',').filter(Boolean).map((cat, i) => (
                        <span key={i} className="rounded-[7px] bg-[#fdf1ea] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#e38154]">
                          {cat.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-[10.5px] font-extrabold text-slate-600">
                  <span>{jeu.min_players}-{jeu.max_players} joueurs</span>
                  <span className="text-slate-400">{jeu.duration} min</span>
                </div>

                <div className="flex justify-end gap-2">
                  <IconButton data-tutorial="jeux-action-edit" title="Modifier" onClick={() => startEdit(jeu)}>
                    <Edit2 size={17} />
                  </IconButton>
                  <IconButton data-tutorial="jeux-action-delete" title="Supprimer" tone="danger" onClick={() => openDeleteModal(jeu)}>
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              </DataRow>
            ))}
          </DataCard>
        )}

        {!loading && (
          <div className="space-y-4 md:hidden">
            {filteredJeux.length === 0 && (
              <DataCard>
                <DataEmpty icon={<MaskIcon file="ludo-etagere-vide.svg" size={56} color="#94a3b8" />}>
                  Aucun jeu ne correspond à cette recherche.
                </DataEmpty>
              </DataCard>
            )}
            {filteredJeux.map((jeu) => (
              <div key={jeu.id} className="rounded-[26px] border-2 border-[#0f172a] bg-white p-4 shadow-[4px_4px_0_#1a5f7a]">
                <div className="mb-4 flex gap-3.5">
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-1.5">
                    {jeu.image_url
                      ? <img src={jeu.image_url} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" alt="" />
                      : <MaskIcon file="ludo-boite-jeu.svg" size={40} color="#cbd5e1" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-[9px] border-2 border-[#0f172a] bg-[#f0f7f9] px-2 py-0.5 text-[10px] font-extrabold text-[#1a5f7a]">
                        #{jeu.registration_number}
                      </span>
                      {jeu.youtube_url && <QrCode size={12} className="text-slate-300" />}
                    </div>
                    <h3 className="mt-1.5 font-display text-[15px] font-extrabold uppercase leading-tight tracking-[-0.02em]">
                      {jeu.name}
                    </h3>
                    <p className="mt-1 text-[10px] font-extrabold text-slate-400">
                      {jeu.min_players}-{jeu.max_players} joueurs · {jeu.duration} min
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 border-t-2 border-slate-100 pt-3.5">
                  <button
                    onClick={() => startEdit(jeu)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] py-3.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a]"
                  >
                    <Edit2 size={14} /> Modifier
                  </button>
                  <IconButton tone="danger" title="Supprimer" className="h-auto w-12" onClick={() => openDeleteModal(jeu)}>
                    <Trash2 size={17} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      </div>

      {/* MODALE ÉTIQUETTES */}
      {showEtiquettes && (
        <FenetreEtiquettes
          jeux={jeux}
          categories={categories}
          onClose={() => setShowEtiquettes(false)}
          onOuvrirJeu={jeu => { setShowEtiquettes(false); startEdit(jeu) }}
          onChange={fetchJeux}
        />
      )}

      {/* OVERLAY CHARGEMENT SCAN */}
      {bggLoading && scanToAdd && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex flex-col items-center gap-4 rounded-[34px] border-2 border-[#0f172a] bg-white px-10 py-9 shadow-[12px_12px_0_#1a5f7a]">
            <Loader2 size={38} className="animate-spin text-[#1a5f7a]" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Recherche sur Wikiludo et MyLudo…</p>
          </div>
        </div>
      )}

      {/* MODALE SCANNER */}
      {showScanner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 backdrop-blur-[6px] sm:p-[22px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in relative w-full max-w-md overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#0f172a]">
            <div className="flex items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
              <div>
                <h3 className="font-display text-[21px] font-extrabold tracking-[-0.04em]">
                  Scanner un <span className="text-[#1a5f7a]">code-barres</span>
                </h3>
                <p className="mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Pointez la caméra vers la boîte du jeu
                </p>
              </div>
              <button
                onClick={stopScanner}
                aria-label="Fermer"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <BarcodeCamera onDetected={code => { stopScanner(); handleBarcodeDetected(code) }} />
              <button
                onClick={stopScanner}
                className="mt-5 w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100"
              >
                Annuler le scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FICHE POUR WIKILUDO (ordinateur) */}
      <FicheWikiludo open={showFicheWikiludo} onClose={() => setShowFicheWikiludo(false)} jeu={newGame} />

      {/* MODALE SUPPRESSION */}
      <ConfirmModal
        open={deleteModal.show}
        onClose={() => setDeleteModal({ show: false })}
        onConfirm={confirmDelete}
        title="Supprimer ?"
        message={`« ${deleteModal.name} » sera définitivement retiré du catalogue.`}
        confirmLabel="Oui, supprimer"
        cancelLabel="Conserver"
        tone="danger"
        icon={<MaskIcon file="ludo-corbeille.svg" size={40} color="currentColor" />}
      />

      {/* TUTORIEL */}
      <TutorialButton onClick={() => setShowTuto(true)} />
      <TutorialOverlay
        steps={jeuxSteps}
        open={showTuto}
        onClose={() => { setShowTuto(false); setShowForm(false); setEditingId(null) }}
      />
    </div>
  )
}