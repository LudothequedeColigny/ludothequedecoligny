import { useState, useEffect, useRef, useMemo } from 'react'
import { Dice5, Plus, Trash2, Edit2, X, Hash, AlertCircle, Search, CheckCircle, ImageIcon, Link as LinkIcon, Tag, ExternalLink, Users, PlayCircle, Clock, FileText, WifiOff, Eye, Loader2, Camera, ScanLine, Sparkles, QrCode, Printer } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'

// ─── Helpers MyLudo (via Edge Function Supabase) ──────────────────────────────

const BGG_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`

async function bggCall(endpoint: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ endpoint, ...params }).toString()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
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
    barcode:     item.barcode     || ''
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const JEUX_TUTORIAL_STEPS = (openForm, cancelForm) => [
  { id: 'jeux-header', noSpotlight: true, title: 'Bienvenue sur la page Jeux', description: `Cette page centralise tout le catalogue de la ludothèque : ajouter, modifier, supprimer des jeux et suivre leur disponibilité.`, action: () => cancelForm() },
  { id: 'jeux-scanner-btn', title: 'Scanner un jeu par code-barres', description: `Ce bouton ouvre la caméra pour scanner le code-barres d'une boîte. Si le jeu est reconnu dans la base de données en ligne, la fiche est pré-remplie automatiquement.`, action: () => cancelForm() },
  { id: 'jeux-add-btn', title: 'Ajouter un jeu manuellement', description: `Cliquez ici pour ouvrir le formulaire de création. Le numéro d'inventaire est pré-rempli automatiquement.`, action: () => cancelForm() },
  { id: 'jeux-form-modal', title: `Formulaire d'ajout d'un jeu`, description: `Ce formulaire permet de saisir toutes les informations d'un jeu.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-numero', title: `Numéro d'inventaire et code-barres`, description: `Le numéro d'inventaire identifie le jeu de façon unique. Le code-barres peut être scanné via la caméra ou saisi manuellement.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-titre', title: 'Titre avec autocomplétion MyLudo', description: `En tapant le nom du jeu, MyLudo propose des suggestions et remplit la fiche complète.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-desc-obs', title: 'Description et observations', description: `La description présente le thème. Les observations servent à noter l'état du jeu.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-joueurs-age', id2: 'jeux-form-age-duree', title: 'Nombre de joueurs, âge et durée', description: `Ces informations s'affichent dans le catalogue public.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-medias', title: 'Image et vidéo', description: `Ajoutez une image et un lien YouTube de règles.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-form-submit', title: 'Enregistrer le jeu', description: `Cliquez pour valider l'ajout.`, action: () => openForm(), actionDelay: 350 },
  { id: 'jeux-search', title: 'Barre de recherche', description: `Filtrez la liste en temps réel.`, action: () => cancelForm() },
  { id: 'jeux-list-row1', id2: 'jeux-list-row2', title: 'Catalogue des jeux', description: `Chaque ligne affiche la photo, le nom, les catégories et le nombre de joueurs.`, action: () => cancelForm() },
  { id: 'jeux-action-edit', title: 'Modifier un jeu', description: `L'icône crayon ouvre la fiche en mode édition.`, action: () => cancelForm() },
  { id: 'jeux-action-delete', title: 'Supprimer un jeu', description: `L'icône poubelle supprime définitivement le jeu après confirmation.`, tip: `Un jeu actuellement emprunté ne peut pas être supprimé.`, action: () => cancelForm() },
]

// ─── GÉNÉRATEUR D'ÉTIQUETTES ──────────────────────────────────────────────────
// A3 portrait · 3×85mm · marges 9mm · interstice col 9mm · row-gap 0
// ColA=66.22mm · ColB=18.78mm · L1=3.81mm · L2=6.09mm · L3=8.12mm · L4=19.03mm
// Polices (pt Excel × 0.8087387) : 11→8.896pt · 14→11.322pt · 18→14.557pt

// Précharge un QR code en base64 pour l'impression (évite les images manquantes en PDF)
async function fetchQrAsBase64(url: string): Promise<string> {
  try {
    const resp = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&margin=2`)
    const blob = await resp.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch { return '' }
}

// ─── GÉNÉRATEUR D'ÉTIQUETTES ──────────────────────────────────────────────────

function GenerateurEtiquettes({ jeux, onClose }: { jeux: any[]; onClose: () => void }) {
  const NOM_LUDO = 'Ludothèque de Coligny'
  const jeuxAvecVideo = jeux.filter(j => j.youtube_url?.trim())
  const [selected, setSelected] = useState<Set<string>>(new Set(jeuxAvecVideo.map(j => j.id)))
  const [searchFilter, setSearchFilter] = useState('')
  const [printing, setPrinting] = useState(false)

  const filteredJeux = jeuxAvecVideo.filter(j => j.name.toLowerCase().includes(searchFilter.toLowerCase()))
  const jeuxSelectionnes = jeux.filter(j => selected.has(j.id) && j.youtube_url?.trim())

  const toggleAll = () => selected.size === jeuxAvecVideo.length
    ? setSelected(new Set())
    : setSelected(new Set(jeuxAvecVideo.map(j => j.id)))

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const handlePrint = async () => {
    setPrinting(true)
    const qrMap: Record<string, string> = {}
    await Promise.all(jeuxSelectionnes.map(async jeu => { qrMap[jeu.id] = await fetchQrAsBase64(jeu.youtube_url) }))

    const win = window.open('', '_blank')
    if (!win) { setPrinting(false); return }

    // CSS d'impression : A3 portrait, 3×85mm, polices identiques à l'aperçu modale
    // Aperçu modale : 128px = 85mm → scale 1.504 · polices en px = h_ligne × facteur
    // Impression : mêmes proportions, unités mm et pt
    // L1 h=3.81mm → police 8.896pt (11×0.8087)
    // L2 h=6.09mm → police 14.557pt (18×0.8087)
    // L3 h=8.12mm → A3: 8.896pt normal · B3: 8.896pt italic
    // L4 h=19.03mm → A4: 11.322pt italic (14×0.8087)
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Étiquettes QR</title>
<style>
@page{size:A3 portrait;margin:9mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Calibri,'Segoe UI',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.grid{display:grid;grid-template-columns:repeat(3,85mm);column-gap:9.297mm;row-gap:0;width:279mm}
.card{width:85mm;height:36.988mm;display:flex;flex-direction:column;border:0.4pt solid #000;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
.l1{height:3.805mm;min-height:3.805mm;font-size:6.964pt;font-style:italic;text-align:center;display:flex;align-items:center;justify-content:center;line-height:1;overflow:hidden}
.l2{height:6.083mm;min-height:6.083mm;font-size:11.105pt;font-weight:bold;text-align:center;display:flex;align-items:center;justify-content:center;line-height:1;border-bottom:0.4pt solid #000;overflow:hidden}
.l3{height:8.108mm;min-height:8.108mm;display:flex;border-bottom:0.4pt dashed #000;overflow:hidden}
.l3a{width:66.141mm;min-width:66.141mm;font-size:8.094pt;text-align:center;display:flex;align-items:center;justify-content:center;padding:0.332mm 0.664mm;line-height:1.25;border-right:0.4pt dashed #000;overflow:hidden}
.l3b{width:18.727mm;min-width:18.727mm;font-size:8.094pt;font-style:italic;text-align:center;display:flex;align-items:center;justify-content:center;padding:0.332mm;line-height:1.25;overflow:hidden}
.l4{flex:1;display:flex;overflow:hidden}
.l4a{width:66.141mm;min-width:66.141mm;font-size:10.352pt;font-style:italic;text-align:center;display:flex;align-items:center;justify-content:center;padding:0.664mm;line-height:1.25;border-right:0.4pt dashed #000;overflow:hidden;word-break:break-word}
.l4b{width:18.727mm;min-width:18.727mm;display:flex;align-items:center;justify-content:center;padding:0.664mm;overflow:hidden}
.l4b img{width:15.938mm;height:15.938mm;display:block}
</style></head><body>
<div class="grid">
${jeuxSelectionnes.map(jeu => `<div class="card">
  <div class="l1">${NOM_LUDO}</div>
  <div class="l2">${jeu.name}</div>
  <div class="l3">
    <div class="l3a">Les règles de ce jeu sont disponibles en vidéo sur internet en tapant les mots clés suivants :</div>
    <div class="l3b">ou en flashant<br>ce QR Code</div>
  </div>
  <div class="l4">
    <div class="l4a">Ludochrono - ${jeu.name.toLowerCase()}</div>
    <div class="l4b">${qrMap[jeu.id] ? `<img src="${qrMap[jeu.id]}" alt="QR"/>` : ''}</div>
  </div>
</div>`).join('')}
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
    win.document.close()
    setPrinting(false)
  }

  // Aperçu modale : 85mm → 128px (×1.504)
  // Hauteurs en px : L1=5.73 · L2=9.16 · L3=12.21 · L4=28.62
  // Polices : fontSize = hauteur_ligne_px × facteur (pour tenir dans la cellule)
  // L1: 5.73×0.65=3.7px · L2: 9.16×0.65=5.9px · L3: 12.21×0.35=4.3px · L4: 28.62×0.19=5.5px
  const cA = 99.6, cB = 28.2

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1a5f7a]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        <div className="p-8 pb-5 flex items-start justify-between shrink-0 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <span className="p-2 bg-[#1a5f7a] text-white rounded-xl"><QrCode size={20} /></span>
              Générateur d'étiquettes QR
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              {jeuxAvecVideo.length} jeu{jeuxAvecVideo.length > 1 ? 'x' : ''} avec vidéo ·{' '}
              <span className="text-[#1a5f7a]">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col overflow-hidden">
            <div className="p-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
                  <input placeholder="Filtrer..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 font-bold text-xs outline-none" />
                </div>
                <button onClick={toggleAll}
                  className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-wide hover:bg-[#1a5f7a] hover:text-white transition-colors whitespace-nowrap">
                  {selected.size === jeuxAvecVideo.length ? 'Aucun' : 'Tous'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-0.5">
              {filteredJeux.map(jeu => (
                <label key={jeu.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selected.has(jeu.id) ? 'bg-[#1a5f7a] border-[#1a5f7a]' : 'border-slate-300 bg-white'}`}>
                    {selected.has(jeu.id) && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={selected.has(jeu.id)} onChange={() => toggleOne(jeu.id)} />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-800 truncate">{jeu.name}</div>
                    <div className="text-[9px] text-slate-400">#{jeu.registration_number}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
            {jeuxSelectionnes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                <QrCode size={40} />
                <p className="font-black text-xs uppercase tracking-wide">Sélectionnez des jeux</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-4">
                  Aperçu — {jeuxSelectionnes.length} étiquette{jeuxSelectionnes.length > 1 ? 's' : ''} · A3 portrait · 3 × 85mm
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 128px)', columnGap: '14px', rowGap: '0px' }}>
                  {jeuxSelectionnes.map(jeu => (
                    <div key={jeu.id} style={{ width: '128px', height: '55.7px', display: 'flex', flexDirection: 'column', fontFamily: "Calibri,'Segoe UI',Arial,sans-serif", backgroundColor: 'white', border: '1px solid #000', overflow: 'hidden' }}>
                      {/* L1 : h=5.73px · 3.7px */}
                      <div style={{ height: '5.73px', minHeight: '5.73px', fontSize: '3.7px', fontStyle: 'italic', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, overflow: 'hidden' }}>
                        {NOM_LUDO}
                      </div>
                      {/* L2 : h=9.16px · 5.9px · bordure pleine bas */}
                      <div style={{ height: '9.16px', minHeight: '9.16px', fontSize: '5.9px', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, borderBottom: '0.5px solid #000', overflow: 'hidden' }}>
                        {jeu.name}
                      </div>
                      {/* L3 : h=12.21px · bordure pointillée bas */}
                      <div style={{ height: '12.21px', minHeight: '12.21px', display: 'flex', borderBottom: '0.5px dashed #000', overflow: 'hidden' }}>
                        {/* A3 : 4.3px normal */}
                        <div style={{ width: `${cA}px`, minWidth: `${cA}px`, fontSize: '4.3px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5px 1px', lineHeight: 1.25, borderRight: '0.5px dashed #000', overflow: 'hidden' }}>
                          Les règles de ce jeu sont disponibles en vidéo sur internet en tapant les mots clés suivants :
                        </div>
                        {/* B3 : 4.3px italic */}
                        <div style={{ width: `${cB}px`, minWidth: `${cB}px`, fontSize: '4.3px', fontStyle: 'italic', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5px', lineHeight: 1.25, overflow: 'hidden' }}>
                          ou en flashant<br/>ce QR Code
                        </div>
                      </div>
                      {/* L4 : reste · 5.5px italic */}
                      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        <div style={{ width: `${cA}px`, minWidth: `${cA}px`, fontSize: '5.5px', fontStyle: 'italic', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1px', lineHeight: 1.25, borderRight: '0.5px dashed #000', overflow: 'hidden', wordBreak: 'break-word' as const }}>
                          {`Ludochrono - ${jeu.name.toLowerCase()}`}
                        </div>
                        <div style={{ width: `${cB}px`, minWidth: `${cB}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1px', overflow: 'hidden' }}>
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(jeu.youtube_url)}&margin=2`} alt="QR" style={{ width: '24px', height: '24px', display: 'block' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400 font-semibold">A3 portrait · 3 × 85mm · interstice 9mm · QR pré-chargés</p>
          <button onClick={handlePrint} disabled={jeuxSelectionnes.length === 0 || printing}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 ${jeuxSelectionnes.length === 0 || printing ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#1a5f7a] text-white hover:bg-[#154d63]'}`}>
            {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {printing ? 'Chargement des QR...' : 'Imprimer les étiquettes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function Jeux() {
  const [jeux, setJeux] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTuto, setShowTuto] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' })
  const [showScanner, setShowScanner] = useState(false)
  const [iosWarning, setIosWarning] = useState(false)
  const [showEtiquettes, setShowEtiquettes] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const [categoryInput, setCategoryInput] = useState('')
  const [availableCategories, setAvailableCategories] = useState([])

  const [bggResults, setBggResults] = useState<{ id: string; name: string; year: string; language?: string }[]>([])
  const [bggLoading, setBggLoading] = useState(false)
  const [bggFilled, setBggFilled] = useState(false)
  const [scanToAdd, setScanToAdd] = useState(false)
  const bggDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bggDropdownRef = useRef(null)

  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  const initialGameState = {
    registration_number: '', barcode: '', name: '', description: '', observations: '',
    min_players: 1, max_players: 4, min_age: 3, duration: 30,
    category: '', image_url: '', youtube_url: '', is_available: true
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
    setBggFilled(false)
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

  const handleBggSelect = async (result: { id: string; name: string; year: string; language: string }) => {
    setBggResults([])
    setBggLoading(true)
    setNewGame(prev => ({ ...prev, name: result.name }))
    try {
      const details = await bggGetDetails(result.id)
      if (!details) return
      setNewGame(prev => ({
        ...prev,
        name: result.name,
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
    } catch (e) { console.warn('MyLudo details error:', e) }
    finally { setBggLoading(false) }
  }

  const handleBarcodeDetected = async (barcode: string) => {
    setNewGame(prev => ({ ...prev, barcode }))
    if (scanToAdd) {
      setBggLoading(true)
      try {
        const qs = new URLSearchParams({ endpoint: 'search-by-barcode', barcode }).toString()
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } })
        const details = await res.json()
        if (details) {
          setNewGame(prev => ({
            ...prev, barcode,
            name:        details.name        || prev.name,
            description: details.description || prev.description,
            min_players: details.minPlayers  || prev.min_players,
            max_players: details.maxPlayers  || prev.max_players,
            min_age:     details.minAge      || prev.min_age,
            duration:    details.duration    || prev.duration,
            image_url:   details.image       || prev.image_url,
            category:    details.categories?.join(', ') || prev.category,
            registration_number: prev.registration_number || getNextRegistrationNumber()
          }))
          setBggFilled(true)
          setShowForm(true)
        } else {
          setShowForm(true)
          alert(`Jeu non trouvé sur MyLudo pour le code-barres ${barcode}. Remplissez les informations manuellement.`)
        }
      } catch (e) { console.warn('Barcode search error:', e); setShowForm(true) }
      finally { setBggLoading(false); setScanToAdd(false) }
    }
  }

  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isSafari = () => /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)

  useEffect(() => {
    if (!showScanner) return
    if (isIOS() && !isSafari()) { setIosWarning(true) } else { setIosWarning(false) }
    const timeoutId = setTimeout(async () => {
      if (!videoRef.current) return
      if ('BarcodeDetector' in window) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
          streamRef.current = stream
          videoRef.current.srcObject = stream
          const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39'] })
          intervalRef.current = setInterval(async () => {
            if (!videoRef.current) { clearInterval(intervalRef.current); return }
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) { clearInterval(intervalRef.current); stopScanner(); handleBarcodeDetected(barcodes[0].rawValue) }
            } catch (e) {}
          }, 100)
        } catch (err) { console.error('BarcodeDetector – erreur caméra :', err) }
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader
        codeReader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result, error) => {
            if (result) { handleBarcodeDetected(result.getText()); stopScanner() }
            if (error && error?.name !== 'NotFoundException') console.warn('zxing:', error)
          }
        ).catch(err => console.error('zxing – démarrage impossible :', err))
      }
    }, 100)
    return () => { clearTimeout(timeoutId); stopScanner() }
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
    if (!showForm) { setNewGame({ ...initialGameState, registration_number: getNextRegistrationNumber() }); setBggResults([]); setBggFilled(false) }
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
    if (!navigator.onLine) { alert("La modification est désactivée en mode hors-ligne."); return }
    setNewGame(jeu); setEditingId(jeu.id); setShowForm(true); setBggFilled(false); setBggResults([])
  }

  const cancelEdit = () => {
    setNewGame(initialGameState); setEditingId(null); setShowForm(false); setBggResults([]); setBggFilled(false)
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
            canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(blob => {
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
    } catch (error: any) { alert("Erreur lors de l'envoi : " + error.message) }
    finally { setUploading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isNumberDuplicate) return
    if (navigator.onLine) {
      let finalImageUrl = newGame.image_url || ''
      if (finalImageUrl && finalImageUrl.includes('myludo.fr')) {
        try {
          const qs = new URLSearchParams({ endpoint: 'upload-image', imageUrl: finalImageUrl }).toString()
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
          const res = await fetch(`${BGG_FUNCTION_URL}?${qs}`, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } })
          if (res.ok) { const data = await res.json(); finalImageUrl = data.url || finalImageUrl }
        } catch (e) { console.warn('Image upload skipped:', e) }
      }
      const gameData = {
        registration_number: newGame.registration_number, barcode: newGame.barcode || '',
        name: newGame.name, description: newGame.description || '', observations: newGame.observations || '',
        min_players: parseInt(newGame.min_players as any) || 1, max_players: parseInt(newGame.max_players as any) || 1,
        min_age: parseInt(newGame.min_age as any) || 0, duration: parseInt(newGame.duration as any) || 0,
        category: newGame.category || '', image_url: finalImageUrl,
        youtube_url: newGame.youtube_url || '', is_available: newGame.is_available ?? true
      }
      let error
      if (editingId) { const { error: e } = await supabase.from('games').update(gameData).eq('id', editingId); error = e }
      else { const { error: e } = await supabase.from('games').insert([gameData]); error = e }
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

  const jeuxSteps = useMemo(() => JEUX_TUTORIAL_STEPS(
    () => {
      setNewGame(g => ({ ...initialGameState, registration_number: g.registration_number || getNextRegistrationNumber() }))
      setBggResults([]); setBggFilled(false); setEditingId(null); setShowForm(true)
    },
    () => { setShowForm(false); setEditingId(null) }
  ), []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#fdfaf6] text-[#1a5f7a] font-bold gap-4">
      <Dice5 className="animate-bounce" size={40} />
      <p className="tracking-widest uppercase text-xs">Mise à jour du catalogue...</p>
    </div>
  )

  const nbJeuxAvecVideo = jeux.filter(j => j.youtube_url?.trim()).length

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 data-tutorial="jeux-header" className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
          <div className="p-3 bg-[#1a5f7a] rounded-[1.2rem] shadow-lg text-white"><Dice5 size={28} /></div>
          <span>Gestion des <span className="text-[#1a5f7a]">Jeux</span></span>
        </h1>

        <div className="flex gap-3 w-full md:w-auto">
          {/* BOUTON NOUVEAU */}
          <button
            data-tutorial="jeux-add-btn"
            onClick={editingId ? cancelEdit : handleOpenForm}
            className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 ${showForm ? 'bg-slate-800 text-white' : 'bg-[#e38154] text-white hover:bg-[#d16f43]'}`}
          >
            {showForm ? <X size={18} className="inline mr-2" strokeWidth={3} /> : <Plus size={18} className="inline mr-2" strokeWidth={3} />}
            {editingId ? "Annuler" : (showForm ? "Fermer" : "Nouveau Jeu")}
          </button>

          {/* BOUTON SCAN */}
          <button
            data-tutorial="jeux-scanner-btn"
            onClick={() => {
              setScanToAdd(true)
              setNewGame({ ...initialGameState, registration_number: getNextRegistrationNumber() })
              setBggFilled(false)
              setShowScanner(true)
            }}
            className="flex-1 md:flex-none px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 bg-[#1a5f7a] text-white hover:bg-[#154f67] flex items-center justify-center gap-2"
          >
            <ScanLine size={18} strokeWidth={3} /> Ajouter par scan
          </button>

          {/* BOUTON ÉTIQUETTES QR — masqué sur mobile */}
          {!isMobile && (
            <button
              onClick={() => setShowEtiquettes(true)}
              title={`Générer des étiquettes QR (${nbJeuxAvecVideo} jeu${nbJeuxAvecVideo > 1 ? 'x' : ''} avec vidéo)`}
              className="relative px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 bg-white border border-slate-200 text-[#1a5f7a] hover:bg-[#1a5f7a] hover:text-white hover:border-[#1a5f7a] flex items-center gap-2"
            >
              <QrCode size={18} strokeWidth={2.5} />
              <span className="hidden lg:inline">Étiquettes</span>
              {nbJeuxAvecVideo > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#e38154] text-white text-[8px] font-black rounded-full w-5 h-5 flex items-center justify-center leading-none">
                  {nbJeuxAvecVideo}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto">

        {!navigator.onLine && (
          <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-800">
            <WifiOff className="text-amber-500 shrink-0" size={20} />
            <p className="text-[10px] font-black uppercase">Catalogue en mode lecture seule (Hors-ligne)</p>
          </div>
        )}

        <div data-tutorial="jeux-search" className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input type="text" placeholder="Rechercher par titre, numéro, code-barres..." className="w-full bg-white border border-slate-100 p-5 pl-16 rounded-[1.5rem] font-bold outline-none focus:ring-4 focus:ring-[#1a5f7a]/5 shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* MODALE DU FORMULAIRE */}
        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10">
            <div className="absolute inset-0 bg-[#1a5f7a]/40 backdrop-blur-sm" onClick={cancelEdit}></div>
            <div data-tutorial="jeux-form-modal" className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
              <form onSubmit={handleSubmit} className="p-6 md:p-12">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{editingId ? 'Modifier le jeu' : 'Ajouter un jeu'}</h2>
                  <button type="button" onClick={cancelEdit} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-[#1a5f7a] uppercase tracking-widest flex items-center gap-2 mb-2"><Hash size={16} /> Informations principales</h3>

                    <div data-tutorial="jeux-form-numero" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div data-tutorial="jeux-form-titre" className="space-y-2" ref={bggDropdownRef}>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                        Titre du jeu
                        {bggLoading && <Loader2 size={10} className="animate-spin text-[#1a5f7a]" />}
                        {bggFilled && !bggLoading && <span className="flex items-center gap-1 text-emerald-500"><Sparkles size={10} /> Rempli via MyLudo</span>}
                      </label>
                      <div className="relative">
                        <input required placeholder="Ex : Catan, Ticket to Ride..." className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#1a5f7a]/10" value={newGame.name} onChange={e => handleNameChange(e.target.value)} />
                        {bggResults.length > 0 && (
                          <div className="absolute z-50 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                              <Sparkles size={12} className="text-[#1a5f7a]" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Résultats MyLudo</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {bggResults.map(result => (
                                <button key={result.id} type="button" onClick={() => handleBggSelect(result)} className="w-full text-left px-4 py-3 hover:bg-[#f0f7f9] transition-colors flex items-center justify-between gap-3 border-b border-slate-50 last:border-0">
                                  <span className="font-bold text-sm text-slate-800 truncate">{result.name}</span>
                                  <div className="shrink-0 flex items-center gap-2">
                                    {result.language && <span className="text-[9px] font-black text-[#1a5f7a] bg-cyan-50 px-2 py-1 rounded-lg">{result.language}</span>}
                                    {result.year && <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg">{result.year}</span>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {bggLoading && bggResults.length === 0 && (
                        <p className="text-[9px] text-[#1a5f7a] font-black ml-2 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Récupération des informations MyLudo...</p>
                      )}
                    </div>

                    <div data-tutorial="jeux-form-desc-obs" className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><FileText size={12} /> Description du jeu</label>
                        <textarea rows={3} placeholder="Règles ou thème..." className="w-full p-4 rounded-2xl bg-slate-50 font-medium text-sm outline-none border-2 border-transparent focus:border-[#1a5f7a]/10 resize-none" value={newGame.description || ''} onChange={e => setNewGame({ ...newGame, description: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[#e38154] uppercase ml-2 flex items-center gap-1"><AlertCircle size={12} /> Observations (État, pièces...)</label>
                        <textarea rows={3} placeholder="Vrac d'infos : usure, pièces manquantes..." className="w-full p-4 rounded-2xl bg-orange-50/30 font-medium text-sm outline-none border-2 border-transparent focus:border-orange-200 resize-none" value={newGame.observations || ''} onChange={e => setNewGame({ ...newGame, observations: e.target.value })} />
                      </div>
                    </div>

                    <div data-tutorial="jeux-form-joueurs-age" className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Joueurs Min</label>
                        <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none" value={newGame.min_players} onChange={e => setNewGame({ ...newGame, min_players: parseInt(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Joueurs Max</label>
                        <input type="number" className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none" value={newGame.max_players} onChange={e => setNewGame({ ...newGame, max_players: parseInt(e.target.value) })} />
                      </div>
                    </div>

                    <div className="space-y-2">
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

                  <div data-tutorial="jeux-form-medias" className="space-y-6">
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

                    <div data-tutorial="jeux-form-age-duree" className="grid grid-cols-2 gap-4">
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

                    <button data-tutorial="jeux-form-submit" type="submit" disabled={isNumberDuplicate} className={`w-full py-5 md:py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isNumberDuplicate ? 'bg-slate-200 text-slate-400' : 'bg-[#1a5f7a] text-white active:scale-95'}`}>
                      {editingId ? "Enregistrer les modifications" : "Valider l'ajout du jeu"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TABLEAU DESKTOP */}
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
              {filteredJeux.map((jeu, idx) => (
                <tr key={jeu.id} {...(idx === 0 ? {"data-tutorial": "jeux-list-row1"} : idx === 1 ? {"data-tutorial": "jeux-list-row2"} : {})} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-8">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#1a5f7a] bg-cyan-50 px-3 py-1 rounded-lg border border-cyan-100 w-fit">#{jeu.registration_number}</span>
                        {jeu.barcode && <CheckCircle size={14} className="text-emerald-500" />}
                        {jeu.youtube_url && <QrCode size={13} className="text-slate-300" title="Vidéo disponible" />}
                      </div>
                      {jeu.barcode && <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><ScanLine size={10} /> {jeu.barcode}</span>}
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 shrink-0 bg-slate-50 rounded-xl border border-slate-100 p-1 flex items-center justify-center overflow-hidden">
                        {jeu.image_url
                          ? <img src={jeu.image_url} loading="lazy" decoding="async" onLoad={e => (e.currentTarget.style.opacity = '1')} style={{ opacity: 0, transition: 'opacity 0.4s' }} className="max-w-full max-h-full object-contain" alt="" />
                          : <Dice5 size={24} className="text-slate-200" />}
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
                      <button data-tutorial="jeux-action-edit" onClick={() => startEdit(jeu)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#1a5f7a] hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
                      <button data-tutorial="jeux-action-delete" onClick={() => openDeleteModal(jeu)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CARDS MOBILE */}
        <div className="md:hidden space-y-4">
          {filteredJeux.map((jeu) => (
            <div key={jeu.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 shrink-0 bg-slate-50 rounded-2xl flex items-center justify-center p-2">
                  {jeu.image_url
                    ? <img src={jeu.image_url} loading="lazy" decoding="async" onLoad={e => (e.currentTarget.style.opacity = '1')} style={{ opacity: 0, transition: 'opacity 0.4s' }} className="max-w-full max-h-full object-contain" alt="" />
                    : <Dice5 size={28} className="text-slate-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-[#1a5f7a] bg-cyan-50 px-2 py-1 rounded-lg">#{jeu.registration_number}</span>
                    {jeu.barcode && <CheckCircle size={12} className="text-emerald-500" />}
                    {jeu.youtube_url && <QrCode size={12} className="text-slate-300" />}
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

      {/* MODALE ÉTIQUETTES */}
      {showEtiquettes && <GenerateurEtiquettes jeux={jeux} onClose={() => setShowEtiquettes(false)} />}

      {/* OVERLAY CHARGEMENT SCAN */}
      {bggLoading && scanToAdd && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#1a5f7a]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-10 flex flex-col items-center gap-4 shadow-2xl">
            <Loader2 size={40} className="animate-spin text-[#1a5f7a]" />
            <p className="font-black uppercase text-xs tracking-widest text-slate-600">Recherche sur MyLudo...</p>
          </div>
        </div>
      )}

      {/* MODALE SCANNER */}
      {showScanner && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-slate-900/95 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
            <h3 className="text-center font-black uppercase text-xs tracking-widest mb-4">Scannez le code-barres</h3>
            {iosWarning && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-[10px] font-black uppercase text-center">
                ⚠️ Sur iPhone, le scan nécessite Safari.
              </div>
            )}
            <video ref={videoRef} className="w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900" autoPlay muted playsInline />
            <p className="text-center text-[9px] text-slate-400 italic mt-4 mb-6">Pointez la caméra vers le code-barres du jeu</p>
            <button onClick={stopScanner} className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-colors">Annuler le scan</button>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a5f7a]/80 backdrop-blur-md" onClick={() => setDeleteModal({ show: false })}></div>
          <div className="relative bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-8 border-rose-500">
            <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6"><Trash2 size={28} /></div>
            <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Supprimer ?</h3>
            <p className="text-xs text-slate-500 mb-8 italic">"{deleteModal.name}"</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Supprimer</button>
              <button onClick={() => setDeleteModal({ show: false })} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Annuler</button>
            </div>
          </div>
        </div>
      )}

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