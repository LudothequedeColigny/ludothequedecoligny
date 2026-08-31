import { useState, useEffect, useRef, useMemo } from 'react'
import { Dice5, Plus, Trash2, Edit2, X, Hash, AlertCircle, Search, CheckCircle, ImageIcon, Link as LinkIcon, Tag, ExternalLink, Users, PlayCircle, Clock, FileText, WifiOff, Eye, Loader2, Camera, ScanLine, Sparkles, QrCode, Printer } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import TutorialOverlay, { TutorialButton } from '../../components/TutorialOverlay'
import { useToast } from '../../components/ToastContext'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminBanner from '../../components/admin/AdminBanner'
import { CAMERA_CONSTRAINTS, createNativeDetector, logCameraSettings } from '../../services/barcodeScanner'
import SearchField from '../../components/admin/SearchField'
import IconButton from '../../components/admin/IconButton'
import ConfirmModal from '../../components/admin/ConfirmModal'
import { DataCard, DataHeader, DataRow, DataEmpty } from '../../components/admin/DataCard'
import { BTN_ORANGE, BTN_TEAL, BTN_INK, BTN_OUTLINE } from '../../components/admin/buttons'

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
  { id: 'jeux-etiquettes-btn', title: 'Générer des étiquettes QR', description: `Ce bouton ouvre le générateur d'étiquettes à coller sur les boîtes des jeux ayant une vidéo de règles renseignée : un QR code renvoie directement vers la vidéo YouTube. Imprimable en A3, 3 étiquettes par page.`, action: () => cancelForm(), tip: `Ce bouton est masqué sur smartphone — la génération d'étiquettes se fait depuis un ordinateur.` },
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

// Colonnes du tableau des jeux (ordinateur) : n°, jeu, configuration, actions
const GAMES_COLS = 'minmax(0, 1.15fr) minmax(0, 1.6fr) minmax(0, 1.2fr) 108px'

// Styles des champs du formulaire de jeu, repris de la maquette
const F_SECTION = 'mb-3.5 text-[10px] font-extrabold uppercase tracking-[0.18em]'
const F_LABEL = 'mb-2 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400'
const F_INPUT = 'w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[15px] text-[13.5px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white'
const F_TEXTAREA = 'w-full resize-none rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-[13px] font-medium text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white'
const F_SQUARE = 'flex w-12 shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] text-white transition-transform active:scale-95'

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
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-[22px]">
      <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={onClose} />
      <div className="anim-modal-in relative flex max-h-[92vh] w-full max-w-[940px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#e38154]">

        <div className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-[#0f172a] px-7 py-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#e38154] text-white">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="font-display text-[21px] font-extrabold tracking-[-0.04em]">
                Générateur d'<span className="text-[#e38154]">étiquettes</span>
              </h2>
              <p className="mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                {jeuxAvecVideo.length} jeu{jeuxAvecVideo.length > 1 ? 'x' : ''} avec vidéo ·{' '}
                <span className="text-[#1a5f7a]">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r-2 border-[#0f172a]">
            <div className="p-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
                  <input placeholder="Filtrer..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] py-2.5 pl-8 pr-3 text-xs font-bold outline-none focus:bg-white" />
                </div>
                <button onClick={toggleAll}
                  className="whitespace-nowrap rounded-[14px] border-2 border-[#0f172a] bg-white px-3 py-2.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-600 transition-colors hover:bg-[#1a5f7a] hover:text-white">
                  {selected.size === jeuxAvecVideo.length ? 'Aucun' : 'Tous'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-0.5">
              {filteredJeux.map(jeu => (
                <label key={jeu.id} className="flex cursor-pointer items-center gap-3 rounded-[14px] p-2.5 transition-colors hover:bg-slate-50">
                  <div className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 border-[#0f172a] transition-all ${selected.has(jeu.id) ? 'bg-[#1a5f7a]' : 'bg-white'}`}>
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

          <div className="flex-1 overflow-y-auto bg-[#fdfaf6] p-6">
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

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t-2 border-[#0f172a] p-6">
          <p className="text-[10px] font-semibold text-slate-400">A3 portrait · 3 × 85mm · interstice 9mm · QR pré-chargés</p>
          <button onClick={handlePrint} disabled={jeuxSelectionnes.length === 0 || printing}
            className={`flex items-center gap-2 rounded-[18px] border-2 border-[#0f172a] px-7 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-[transform,box-shadow] duration-200 ${jeuxSelectionnes.length === 0 || printing ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-[#1a5f7a] text-white shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]'}`}>
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
  const [iosWarning, setIosWarning] = useState(false)
  const [scanError, setScanError] = useState('')
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
          addToast(`Jeu non trouvé sur MyLudo pour le code-barres ${barcode}. Remplissez les informations manuellement.`, 'warning')
        }
      } catch (e) { console.warn('Barcode search error:', e); setShowForm(true) }
      finally { setBggLoading(false); setScanToAdd(false) }
    }
  }

  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isSafari = () => /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)

  useEffect(() => {
    if (!showScanner) return
    setScanError('')
    if (isIOS() && !isSafari()) { setIosWarning(true) } else { setIosWarning(false) }
    const timeoutId = setTimeout(async () => {
      if (!videoRef.current) return
      const detector = await createNativeDetector()
      if (detector) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
          streamRef.current = stream
          videoRef.current.srcObject = stream
          logCameraSettings(stream)
          intervalRef.current = setInterval(async () => {
            if (!videoRef.current) { clearInterval(intervalRef.current); return }
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) { clearInterval(intervalRef.current); stopScanner(); handleBarcodeDetected(barcodes[0].rawValue) }
            } catch (e) {}
          }, 100)
        } catch (err) {
          console.error('BarcodeDetector – erreur caméra :', err)
          setScanError("La caméra n'a pas pu être ouverte. Vérifiez l'autorisation dans le navigateur.")
        }
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader
        codeReader.decodeFromConstraints(
          CAMERA_CONSTRAINTS,
          videoRef.current,
          (result, error) => {
            if (result) { handleBarcodeDetected(result.getText()); stopScanner() }
            if (error && error?.name !== 'NotFoundException') console.warn('zxing:', error)
          }
        ).catch(err => {
          console.error('zxing – démarrage impossible :', err)
          setScanError("La caméra n'a pas pu être ouverte. Vérifiez l'autorisation dans le navigateur.")
        })
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
    if (!navigator.onLine) { addToast("La modification est désactivée en mode hors-ligne.", 'warning'); return }
    setNewGame(jeu); setEditingId(jeu.id); setShowForm(true); setBggFilled(false); setBggResults([])
  }

  const cancelEdit = () => {
    setNewGame(initialGameState); setEditingId(null); setShowForm(false); setBggResults([]); setBggFilled(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!navigator.onLine) { addToast("Impossible d'uploader en mode hors-ligne.", 'warning'); return }
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
    } catch (error: any) { addToast("Erreur lors de l'envoi : " + error.message, 'error') }
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
      setBggResults([]); setBggFilled(false); setEditingId(null); setShowForm(true)
    },
    () => { setShowForm(false); setEditingId(null) }
  ), []) // eslint-disable-line react-hooks/exhaustive-deps

  const nbJeuxAvecVideo = jeux.filter(j => j.youtube_url?.trim()).length

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
                setBggFilled(false)
                setShowScanner(true)
              }}
              className={`${BTN_TEAL} flex-1 md:flex-none`}
            >
              <ScanLine size={16} strokeWidth={3} /> Ajouter par scan
            </button>

            {/* Étiquettes QR — masqué sur mobile, la génération se fait sur ordinateur */}
            {!isMobile && (
              <button
                data-tutorial="jeux-etiquettes-btn"
                onClick={() => setShowEtiquettes(true)}
                title={`Générer des étiquettes QR (${nbJeuxAvecVideo} jeu${nbJeuxAvecVideo > 1 ? 'x' : ''} avec vidéo)`}
                className={`${BTN_OUTLINE} relative`}
              >
                <QrCode size={16} strokeWidth={2.5} />
                <span className="hidden lg:inline">Étiquettes</span>
                {nbJeuxAvecVideo > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#0f172a] bg-[#e38154] text-[9px] font-extrabold leading-none text-white">
                    {nbJeuxAvecVideo}
                  </span>
                )}
              </button>
            )}
          </div>
        </AdminPageHeader>
      </div>

      <main>

        {!navigator.onLine && (
          <AdminBanner tone="warn" icon={<WifiOff size={18} />}>
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
                        {bggFilled && !bggLoading && <span className="flex items-center gap-1 text-emerald-500"><Sparkles size={10} /> Rempli via MyLudo</span>}
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
                        <p className="mt-2 flex items-center gap-1 text-[9px] font-extrabold text-[#1a5f7a]"><Loader2 size={10} className="animate-spin" /> Récupération des informations MyLudo...</p>
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
              <DataEmpty icon={<Dice5 size={36} className="text-slate-200" />}>
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
                      : <Dice5 size={22} className="text-slate-200" />}
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
                <DataEmpty icon={<Dice5 size={36} className="text-slate-200" />}>
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
                      : <Dice5 size={26} className="text-slate-200" />}
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
      {showEtiquettes && <GenerateurEtiquettes jeux={jeux} onClose={() => setShowEtiquettes(false)} />}

      {/* OVERLAY CHARGEMENT SCAN */}
      {bggLoading && scanToAdd && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }}>
          <div className="anim-modal-in flex flex-col items-center gap-4 rounded-[34px] border-2 border-[#0f172a] bg-white px-10 py-9 shadow-[12px_12px_0_#1a5f7a]">
            <Loader2 size={38} className="animate-spin text-[#1a5f7a]" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Recherche sur MyLudo...</p>
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
              {iosWarning && (
                <AdminBanner tone="warn">⚠️ Sur iPhone, le scan nécessite Safari.</AdminBanner>
              )}
              {scanError && <AdminBanner tone="danger">{scanError}</AdminBanner>}
              <video
                ref={videoRef}
                className="w-full overflow-hidden rounded-[22px] border-2 border-[#0f172a] bg-slate-900"
                autoPlay muted playsInline
              />
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
        icon={<Trash2 size={26} />}
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