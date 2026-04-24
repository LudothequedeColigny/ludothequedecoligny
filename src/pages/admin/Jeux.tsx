import { useState, useEffect, useRef } from 'react'
import { Dice5, Plus, Trash2, Edit2, X, Hash, AlertCircle, Search, CheckCircle, ImageIcon, Link as LinkIcon, Tag, ExternalLink, Users, PlayCircle, Clock, FileText, WifiOff, Eye, Loader2, Camera, ScanLine, Sparkles } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

// ─── Helpers MyLudo (via Edge Function Supabase) ──────────────────────────────

const BGG_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`

async function bggCall(endpoint: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ endpoint, ...params }).toString()
  const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, {
    headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
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
    image:       item.image       || '',   // URL Supabase déjà uploadée par la Edge Function
    categories:  item.categories  || [],
    barcode:     item.barcode     || ''
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Jeux() {
  const [jeux, setJeux] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' })
  const [showScanner, setShowScanner] = useState(false)
  const [iosWarning, setIosWarning] = useState(false)

  const [categoryInput, setCategoryInput] = useState('')
  const [availableCategories, setAvailableCategories] = useState([])

  // ── BGG autofill ──
  const [bggResults, setBggResults] = useState<{ id: string; name: string; year: string }[]>([])
  const [bggLoading, setBggLoading] = useState(false)
  const [bggFilled, setBggFilled] = useState(false)
  const bggDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bggDropdownRef = useRef(null)

  // Références pour le scanner hybride
  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  const initialGameState = {
    registration_number: '',
    barcode: '',
    name: '',
    description: '',
    observations: '',
    min_players: 1,
    max_players: 4,
    min_age: 3,
    duration: 30,
    category: '',
    image_url: '',
    youtube_url: '',
    is_available: true
  }

  const [newGame, setNewGame] = useState(initialGameState)

  useEffect(() => { fetchJeux() }, [])

  // Fermer le dropdown BGG si clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (bggDropdownRef.current && !bggDropdownRef.current.contains(e.target)) {
        setBggResults([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Debounce sur le champ Titre → recherche BGG automatique après 1s ──
  const handleNameChange = (value: string) => {
    setNewGame(prev => ({ ...prev, name: value }))
    setBggFilled(false)
    setBggResults([])

    if (bggDebounceRef.current) clearTimeout(bggDebounceRef.current)
    if (value.trim().length < 2) return

    bggDebounceRef.current = setTimeout(async () => {
      setBggLoading(true)
      try {
        const results = await bggSearch(value.trim())
        setBggResults(results)
      } catch (e) {
        console.warn('BGG search error:', e)
      } finally {
        setBggLoading(false)
      }
    }, 1000)
  }

  // ── Sélection d'un résultat → récupération des détails et remplissage ──
  const handleBggSelect = async (result: { id: string; name: string; year: string; language: string }) => {
    setBggResults([])
    setBggLoading(true)
    setNewGame(prev => ({ ...prev, name: result.name }))
    try {
      const details = await bggGetDetails(result.id)
      if (!details) return

      setNewGame(prev => ({
        ...prev,
        name:        result.name,
        description: details.description || prev.description,
        min_players: details.minPlayers  || prev.min_players,
        max_players: details.maxPlayers  || prev.max_players,
        min_age:     details.minAge      || prev.min_age,
        duration:    details.duration    || prev.duration,
        image_url:   details.image       || prev.image_url,
        category:    details.categories?.join(', ') || prev.category,
        barcode:     details.barcode     || prev.barcode
      }))
      setBggFilled(true)
    } catch (e) {
      console.warn('MyLudo details error:', e)
    } finally {
      setBggLoading(false)
    }
  }

  // --- DÉTECTION NAVIGATEUR ---
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isSafari = () => /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)

  // --- LOGIQUE DU SCANNER HYBRIDE ---
  useEffect(() => {
    if (!showScanner) return

    if (isIOS() && !isSafari()) {
      setIosWarning(true)
    } else {
      setIosWarning(false)
    }

    const timeoutId = setTimeout(async () => {
      if (!videoRef.current) return

      if ('BarcodeDetector' in window) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
          })
          streamRef.current = stream
          videoRef.current.srcObject = stream

          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39']
          })

          intervalRef.current = setInterval(async () => {
            if (!videoRef.current) { clearInterval(intervalRef.current); return }
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                clearInterval(intervalRef.current)
                stopScanner()
                setNewGame(prev => ({ ...prev, barcode: barcodes[0].rawValue }))
              }
            } catch (e) {}
          }, 100)
        } catch (err) {
          console.error('BarcodeDetector – erreur caméra :', err)
        }

      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader

        codeReader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result, error) => {
            if (result) {
              setNewGame(prev => ({ ...prev, barcode: result.getText() }))
              stopScanner()
            }
            if (error && error?.name !== 'NotFoundException') {
              console.warn('zxing – erreur scanner :', error)
            }
          }
        ).catch(err => {
          console.error('zxing – impossible de démarrer la caméra :', err)
        })
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      stopScanner()
    }
  }, [showScanner])

  const stopScanner = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (codeReaderRef.current) {
      try { import('@zxing/browser').then(({ BrowserMultiFormatReader }) => BrowserMultiFormatReader.releaseAllStreams()) } catch (e) {}
      codeReaderRef.current = null
    }
    setShowScanner(false)
  }

  // --- DONNÉES ---
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
        }
      } else {
        const cachedJeux = JSON.parse(localStorage.getItem('cache_games_list') || '[]')
        setJeux(cachedJeux)
        updateCategoriesList(cachedJeux)
      }
    } catch (err) {
      console.error("Erreur de chargement des jeux:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateCategoriesList = (gamesData) => {
    const cats = new Set()
    gamesData.forEach(j => {
      if (j.category) j.category.split(',').forEach(c => cats.add(c.trim()))
    })
    setAvailableCategories(Array.from(cats).sort())
  }

  const getNextRegistrationNumber = () => {
    if (jeux.length === 0) return '001'
    const numbers = jeux.map(j => parseInt(j.registration_number)).filter(n => !isNaN(n))
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
    return (maxNumber + 1).toString().padStart(3, '0')
  }

  const handleOpenForm = () => {
    if (!showForm) {
      setNewGame({ ...initialGameState, registration_number: getNextRegistrationNumber() })
      setBggResults([])
      setBggFilled(false)
    }
    setShowForm(!showForm)
    setEditingId(null)
  }

  const isNumberDuplicate = jeux.some(j =>
    j.registration_number === newGame.registration_number && j.id !== editingId
  )

  const addCategory = (cat) => {
    const cleanCat = cat.trim()
    if (!cleanCat) return
    const currentCats = newGame.category ? newGame.category.split(',').map(c => c.trim()) : []
    if (!currentCats.includes(cleanCat)) {
      setNewGame({ ...newGame, category: [...currentCats, cleanCat].join(', ') })
    }
    setCategoryInput('')
  }

  const removeCategory = (catToRemove) => {
    const updatedCats = newGame.category.split(',').map(c => c.trim()).filter(c => c !== catToRemove).join(', ')
    setNewGame({ ...newGame, category: updatedCats })
  }

  const filteredJeux = jeux.filter(jeu =>
    jeu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    jeu.registration_number.toString().includes(searchTerm) ||
    jeu.barcode?.toString().includes(searchTerm) ||
    jeu.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const startEdit = (jeu) => {
    if (!navigator.onLine) { alert("La modification est désactivée en mode hors-ligne."); return }
    setNewGame(jeu)
    setEditingId(jeu.id)
    setShowForm(true)
    setBggFilled(false)
    setBggResults([])
  }

  const cancelEdit = () => {
    setNewGame(initialGameState)
    setEditingId(null)
    setShowForm(false)
    setBggResults([])
    setBggFilled(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!navigator.onLine) { alert("Impossible d'uploader en mode hors-ligne."); return }

    setUploading(true)
    try {
      const compressedFile = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
          const img = new Image()
          img.src = event.target.result as string
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const MAX_WIDTH = 800
            const scaleSize = MAX_WIDTH / img.width
            canvas.width = MAX_WIDTH
            canvas.height = img.height * scaleSize
            const ctx = canvas.getContext('2d')
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob((blob) => {
              if (blob) resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
            }, 'image/webp', 0.82)
          }
        }
      })

      const fileName = `${Math.random()}-${Date.now()}.webp`
      const { error: uploadError } = await supabase.storage.from('game-images').upload(fileName, compressedFile as File)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('game-images').getPublicUrl(fileName)
      setNewGame({ ...newGame, image_url: publicUrl })
    } catch (error: any) {
      alert("Erreur lors de l'envoi : " + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isNumberDuplicate) return

    if (navigator.onLine) {
      // Si l'image vient de MyLudo, on l'uploade sur Supabase uniquement maintenant
      // → si l'utilisateur annule avant de valider, rien n'est uploadé
      let finalImageUrl = newGame.image_url || ''
      if (finalImageUrl && finalImageUrl.includes('myludo.fr')) {
        try {
          const qs = new URLSearchParams({ endpoint: 'upload-image', imageUrl: finalImageUrl }).toString()
          const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, {
            headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
          })
          if (res.ok) {
            const data = await res.json()
            finalImageUrl = data.url || finalImageUrl
          }
        } catch (e) {
          console.warn('Image upload skipped, keeping MyLudo URL:', e)
        }
      }

      const gameData = {
        registration_number: newGame.registration_number,
        barcode: newGame.barcode || '',
        name: newGame.name,
        description: newGame.description || '',
        observations: newGame.observations || '',
        min_players: parseInt(newGame.min_players as any) || 1,
        max_players: parseInt(newGame.max_players as any) || 1,
        min_age: parseInt(newGame.min_age as any) || 0,
        duration: parseInt(newGame.duration as any) || 0,
        category: newGame.category || '',
        image_url: finalImageUrl,
        youtube_url: newGame.youtube_url || '',
        is_available: newGame.is_available ?? true
      }

      let error
      if (editingId) {
        const { error: updateError } = await supabase.from('games').update(gameData).eq('id', editingId)
        error = updateError
      } else {
        const { error: insertError } = await supabase.from('games').insert([gameData])
        error = insertError
      }

      if (!error) { cancelEdit(); fetchJeux() }
      else alert("Erreur lors de l'enregistrement : " + error.message)
    } else {
      alert("⚠️ Le réseau est coupé. Impossible d'ajouter ou modifier un jeu pour le moment.")
    }
  }

  const openDeleteModal = (jeu) => {
    if (!navigator.onLine) { alert("Action impossible hors-ligne."); return }
    setDeleteModal({ show: true, id: jeu.id, name: jeu.name })
  }

  const confirmDelete = async () => {
    const { error } = await supabase.from('games').delete().eq('id', deleteModal.id)
    if (!error) { setDeleteModal({ show: false, id: null, name: '' }); fetchJeux() }
    else alert("Erreur lors de la suppression")
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-bold gap-4">
      <Dice5 className="animate-bounce" size={40} />
      <p className="tracking-widest uppercase text-xs">Mise à jour du catalogue...</p>
    </div>
  )

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
          <div className="p-3 bg-[#1a5f7a] rounded-[1.2rem] shadow-lg text-white">
            <Dice5 size={28} />
          </div>
          <span>Gestion des <span className="text-[#1a5f7a]">Jeux</span></span>
        </h1>

        <button
          onClick={editingId ? cancelEdit : handleOpenForm}
          className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 ${
            showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white hover:bg-[#d16f43]'
          }`}
        >
          {showForm ? <X size={18} className="inline mr-2" strokeWidth={3} /> : <Plus size={18} className="inline mr-2" strokeWidth={3} />}
          {editingId ? "Annuler" : (showForm ? "Fermer" : "Nouveau Jeu")}
        </button>
      </div>

      <main className="max-w-7xl mx-auto">

        {!navigator.onLine && (
          <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-800">
            <WifiOff className="text-amber-500 shrink-0" size={20} />
            <p className="text-[10px] font-black uppercase">Catalogue en mode lecture seule (Hors-ligne)</p>
          </div>
        )}

        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input
            type="text"
            placeholder="Rechercher par titre, numéro, code-barres..."
            className="w-full bg-white border border-slate-100 p-5 pl-16 rounded-[1.5rem] font-bold outline-none focus:ring-4 focus:ring-[#1a5f7a]/5 shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* MODALE DU FORMULAIRE */}
        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10">
            <div className="absolute inset-0 bg-[#1a5f7a]/40 backdrop-blur-sm" onClick={cancelEdit}></div>
            <div className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
              <form onSubmit={handleSubmit} className="p-6 md:p-12">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{editingId ? 'Modifier le jeu' : 'Ajouter un jeu'}</h2>
                  <button type="button" onClick={cancelEdit} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2 mb-2"><Hash size={16} /> Informations principales</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">N° d'enregistrement</label>
                        <input required className={`w-full p-4 rounded-2xl bg-slate-50 font-black outline-none border-2 ${isNumberDuplicate ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-transparent'}`} value={newGame.registration_number} onChange={e => setNewGame({ ...newGame, registration_number: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Code-Barres (Scan)</label>
                        <div className="flex gap-2 items-center">
                          <input className="flex-1 min-w-0 p-4 rounded-2xl bg-slate-50 font-black outline-none border-2 border-transparent focus:border-[#1a5f7a]/10" value={newGame.barcode} placeholder="Scannez..." onChange={e => setNewGame({ ...newGame, barcode: e.target.value })} />
                          <button type="button" onClick={() => setShowScanner(true)} className="shrink-0 p-4 bg-slate-800 text-white rounded-2xl active:scale-95 shadow-md flex items-center justify-center"><ScanLine size={20} /></button>
                        </div>
                      </div>
                    </div>

                    {/* ── TITRE avec autocomplétion MyLudo ── */}
                    <div className="space-y-2" ref={bggDropdownRef}>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                        Titre du jeu
                        {bggLoading && <Loader2 size={10} className="animate-spin text-[#1a5f7a]" />}
                        {bggFilled && !bggLoading && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <Sparkles size={10} /> Rempli via MyLudo
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          required
                          placeholder="Ex : Catan, Ticket to Ride..."
                          className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#1a5f7a]/10"
                          value={newGame.name}
                          onChange={e => handleNameChange(e.target.value)}
                        />

                        {/* Dropdown résultats MyLudo */}
                        {bggResults.length > 0 && (
                          <div className="absolute z-50 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                              <Sparkles size={12} className="text-[#1a5f7a]" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Résultats MyLudo</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {bggResults.map(result => (
                                <button
                                  key={result.id}
                                  type="button"
                                  onClick={() => handleBggSelect(result)}
                                  className="w-full text-left px-4 py-3 hover:bg-[#f0f7f9] transition-colors flex items-center justify-between gap-3 border-b border-slate-50 last:border-0"
                                >
                                  <span className="font-bold text-sm text-slate-800 truncate">{result.name}</span>
                                  <div className="shrink-0 flex items-center gap-2">
                                    {result.language && (
                                      <span className="text-[9px] font-black text-[#1a5f7a] bg-cyan-50 px-2 py-1 rounded-lg">{result.language}</span>
                                    )}
                                    {result.year && (
                                      <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg">{result.year}</span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Indicateur pendant récupération des détails */}
                      {bggLoading && bggResults.length === 0 && (
                        <p className="text-[9px] text-[#1a5f7a] font-black ml-2 flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> Récupération des informations MyLudo...
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><FileText size={12} /> Description du jeu</label>
                      <textarea rows={3} placeholder="Règles ou thème..." className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]/10 resize-none" value={newGame.description || ''} onChange={e => setNewGame({ ...newGame, description: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#e38154] uppercase ml-2 flex items-center gap-1"><AlertCircle size={12} /> Observations (État, pièces...)</label>
                      <textarea rows={3} placeholder="Vrac d'infos : usure, pièces manquantes..." className="w-full p-4 rounded-2xl bg-orange-50/30 font-medium text-sm outline-none border-2 border-transparent focus:border-orange-200 resize-none" value={newGame.observations || ''} onChange={e => setNewGame({ ...newGame, observations: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Joueurs Min</label>
                        <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none" value={newGame.min_players} onChange={e => setNewGame({ ...newGame, min_players: parseInt(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Joueurs Max</label>
                        <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none" value={newGame.max_players} onChange={e => setNewGame({ ...newGame, max_players: parseInt(e.target.value) })} />
                      </div>
                    </div>

                    <div className="space-y-2 relative">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Catégories</label>
                      <div className="flex gap-2 items-center">
                        <input placeholder="Ajouter..." className="flex-1 min-w-0 p-4 rounded-2xl bg-slate-50 font-bold text-sm outline-none" value={categoryInput} onChange={e => setCategoryInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(categoryInput) } }} />
                        <button type="button" onClick={() => addCategory(categoryInput)} className="shrink-0 p-4 bg-[#1a5f7a] text-white rounded-2xl shadow-lg flex items-center justify-center"><Plus size={20} strokeWidth={3} /></button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {newGame.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, i) => (
                          <span key={i} className="px-3 py-2 bg-[#1a5f7a] text-white text-[9px] font-black uppercase rounded-xl flex items-center gap-2">
                            {cat} <X size={14} className="cursor-pointer" onClick={() => removeCategory(cat)} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-[#e38154] uppercase tracking-widest flex items-center gap-2 mb-2"><ImageIcon size={16} /> Médias & Âge</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><ExternalLink size={12} /> URL Image</label>
                        <div className="flex gap-2 items-center">
                          <input placeholder="Lien..." className="flex-1 min-w-0 p-4 rounded-2xl bg-slate-50 font-bold text-xs outline-none" value={newGame.image_url} onChange={e => setNewGame({ ...newGame, image_url: e.target.value })} />
                          <label className="shrink-0 cursor-pointer p-4 bg-[#e38154] text-white rounded-2xl flex items-center justify-center active:scale-95 shadow-md">
                            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading || !navigator.onLine} />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><PlayCircle size={12} /> URL Vidéo</label>
                        <input placeholder="YouTube..." className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-xs outline-none" value={newGame.youtube_url} onChange={e => setNewGame({ ...newGame, youtube_url: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Âge Min</label>
                        <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none" value={newGame.min_age} onChange={e => setNewGame({ ...newGame, min_age: parseInt(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Durée (min)</label>
                        <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none" value={newGame.duration} onChange={e => setNewGame({ ...newGame, duration: parseInt(e.target.value) })} />
                      </div>
                    </div>

                    {newGame.image_url && (
                      <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden">
                        <img src={newGame.image_url} className="h-20 max-w-full object-contain rounded-lg" alt="Aperçu" />
                      </div>
                    )}

                    <button type="submit" disabled={isNumberDuplicate} className={`w-full py-5 md:py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isNumberDuplicate ? 'bg-slate-200 text-slate-400' : 'bg-[#1a5f7a] text-white active:scale-95'}`}>
                      {editingId ? "Enregistrer les modifications" : "Valider l'ajout du jeu"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LISTE DES JEUX — TABLEAU DESKTOP */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="p-8">N° / Barcode</th>
                <th className="p-8">Jeu</th>
                <th className="p-8">Config.</th>
                <th className="p-8 text-right pr-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredJeux.map((jeu) => (
                <tr key={jeu.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-8">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#1a5f7a] bg-cyan-50 px-3 py-1 rounded-lg border border-cyan-100 w-fit">#{jeu.registration_number}</span>
                        {jeu.barcode && <CheckCircle size={14} className="text-emerald-500" />}
                      </div>
                      {jeu.barcode && <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><ScanLine size={10} /> {jeu.barcode}</span>}
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 shrink-0 bg-slate-50 rounded-xl border border-slate-100 p-1 flex items-center justify-center overflow-hidden">
                        {jeu.image_url
                          ? <img src={jeu.image_url} loading="lazy" decoding="async" onLoad={e => (e.currentTarget.style.opacity = '1')} style={{ opacity: 0, transition: 'opacity 0.4s' }} className="max-w-full max-h-full object-contain" alt="" />
                          : <Dice5 size={24} className="text-slate-200" />
                        }
                      </div>
                      <div>
                        <div className="font-black uppercase text-sm text-slate-800">{jeu.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {jeu.category?.split(',').map((cat, i) => (
                            <span key={i} className="text-[8px] font-black text-[#e38154] uppercase bg-orange-50 px-1.5 py-0.5 rounded">{cat.trim()}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-700 flex items-center gap-2"><Users size={12} className="text-[#1a5f7a]" /> {jeu.min_players}-{jeu.max_players} j.</div>
                      <div className="text-[10px] font-black text-slate-400 flex items-center gap-2"><Clock size={12} /> {jeu.duration} min</div>
                    </div>
                  </td>
                  <td className="p-8 pr-12 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => startEdit(jeu)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#1a5f7a] hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
                      <button onClick={() => openDeleteModal(jeu)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LISTE DES JEUX — CARDS MOBILE */}
        <div className="md:hidden space-y-4">
          {filteredJeux.map((jeu) => (
            <div key={jeu.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 shrink-0 bg-slate-50 rounded-2xl flex items-center justify-center p-2">
                  {jeu.image_url
                    ? <img src={jeu.image_url} loading="lazy" decoding="async" onLoad={e => (e.currentTarget.style.opacity = '1')} style={{ opacity: 0, transition: 'opacity 0.4s' }} className="max-w-full max-h-full object-contain" alt="" />
                    : <Dice5 size={28} className="text-slate-200" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-[#1a5f7a] bg-cyan-50 px-2 py-1 rounded-lg">#{jeu.registration_number}</span>
                    {jeu.barcode && <CheckCircle size={12} className="text-emerald-500" />}
                  </div>
                  <h3 className="font-black text-slate-900 uppercase text-xs mt-1 truncate">{jeu.name}</h3>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button onClick={() => startEdit(jeu)} className="flex-1 py-4 bg-slate-50 text-[#1a5f7a] rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2"><Edit2 size={14} /> Modifier</button>
                <button onClick={() => openDeleteModal(jeu)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODALE SCANNER HYBRIDE */}
      {showScanner && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-slate-900/95 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
            <h3 className="text-center font-black uppercase text-xs tracking-widest mb-4">Scannez le code-barres</h3>
            {iosWarning && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-[10px] font-black uppercase text-center">
                ⚠️ Sur iPhone, le scan nécessite Safari. Veuillez ouvrir cette page dans Safari.
              </div>
            )}
            <video ref={videoRef} className="w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900" autoPlay muted playsInline />
            <p className="text-center text-[9px] text-slate-400 italic mt-4 mb-6">Pointez la caméra vers le code-barres du jeu</p>
            <button onClick={stopScanner} className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-colors">
              Annuler le scan
            </button>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a5f7a]/80 backdrop-blur-md" onClick={() => setDeleteModal({ show: false })}></div>
          <div className="relative bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-8 border-rose-500">
            <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Supprimer ?</h3>
            <p className="text-xs text-slate-500 mb-8 italic">"{deleteModal.name}"</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Supprimer</button>
              <button onClick={() => setDeleteModal({ show: false })} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}