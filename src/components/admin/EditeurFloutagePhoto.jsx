import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '../site/Modal'
import { blocDeFloutage, pixelateRegion, COTE_MAX_PHOTO } from '../../services/floutage'

/**
 * Fenêtre de floutage d'une seule photo (onglet « Posts »), mêmes règles que la fenêtre Bilan :
 * l'image rendue est TOUJOURS la photo floutée, jamais l'affichage de l'éditeur ; un rectangle
 * tracé est flouté même sans clic sur « Appliquer le flou » (incident du 25-26/10/2026).
 */
export default function EditeurFloutagePhoto({ fichier, onTermine, onAnnuler }) {
  const canvasRef = useRef(null)
  const base = useRef(null)          // pixels floutés validés
  const rects = useRef([])           // rectangles tracés, pas encore floutés
  const depart = useRef(null)
  const [enAttente, setEnAttente] = useState(false)
  const [pret, setPret] = useState(false)
  const [floute, setFloute] = useState(false)
  const [export_, setExport] = useState(false)

  const charger = () => {
    const canvas = canvasRef.current
    if (!canvas || !fichier) return
    setPret(false)
    setFloute(false)
    const img = new Image()
    const url = URL.createObjectURL(fichier)
    img.onload = () => {
      const k = Math.min(1, COTE_MAX_PHOTO / Math.max(img.naturalWidth, img.naturalHeight))
      canvas.width = Math.round(img.naturalWidth * k)
      canvas.height = Math.round(img.naturalHeight * k)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      base.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      rects.current = []
      setEnAttente(false)
      setPret(true)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => { URL.revokeObjectURL(url); onAnnuler() }
    img.src = url
  }
  // La fenêtre (et son canvas) n'existe qu'une fois ouverte : chargement au tour suivant
  useEffect(() => { if (fichier) requestAnimationFrame(charger) }, [fichier]) // eslint-disable-line react-hooks/exhaustive-deps

  const point = (cx, cy) => {
    const c = canvasRef.current
    const r = c.getBoundingClientRect()
    return { x: (cx - r.left) * (c.width / r.width), y: (cy - r.top) * (c.height / r.height) }
  }
  const redessiner = (vivant) => {
    const c = canvasRef.current
    if (!c || !base.current) return
    const ctx = c.getContext('2d')
    ctx.putImageData(base.current, 0, 0)
    ;[...rects.current, ...(vivant ? [vivant] : [])].forEach(r => {
      ctx.fillStyle = 'rgba(227,129,84,0.35)'; ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.strokeStyle = '#e38154'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.setLineDash([])
    })
  }
  const rectDe = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) })
  const bas = (cx, cy) => { depart.current = point(cx, cy) }
  const bouge = (cx, cy) => { if (depart.current) redessiner(rectDe(depart.current, point(cx, cy))) }
  const haut = (cx, cy) => {
    if (!depart.current) return
    const r = rectDe(depart.current, point(cx, cy))
    depart.current = null
    if (r.w > 4 && r.h > 4) { rects.current = [...rects.current, r]; setEnAttente(true) }
    redessiner(null)
  }

  const appliquer = () => {
    const c = canvasRef.current
    if (!c || !base.current || rects.current.length === 0) return
    const ctx = c.getContext('2d')
    ctx.putImageData(base.current, 0, 0)
    rects.current.forEach(r => {
      const x = Math.max(0, Math.floor(r.x))
      const y = Math.max(0, Math.floor(r.y))
      const w = Math.min(c.width - x, Math.ceil(r.w))
      const h = Math.min(c.height - y, Math.ceil(r.h))
      if (w > 0 && h > 0) pixelateRegion(ctx, x, y, w, h, blocDeFloutage(c.width))
    })
    base.current = ctx.getImageData(0, 0, c.width, c.height)
    rects.current = []
    setEnAttente(false)
    setFloute(true)
  }

  // Image rendue : toujours les pixels floutés, sans aucun repère dessiné par-dessus
  const terminer = () => {
    const c = canvasRef.current
    if (!c || !base.current) return
    setExport(true)
    if (rects.current.length > 0) appliquer()
    depart.current = null
    c.getContext('2d').putImageData(base.current, 0, 0)
    c.toBlob(blob => { setExport(false); if (blob) onTermine(blob) }, 'image/webp', 0.82)
  }

  const BTN = 'flex-1 rounded-[14px] border-2 border-[#0f172a] py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-colors disabled:opacity-40'
  return (
    <Modal open={!!fichier} onClose={() => { if (!export_) onAnnuler() }} title="Flouter les visages" maxWidth={720} backdrop="ink" panelClassName="p-6 md:p-8">
      <h2 className="mb-1 font-display text-[22px] font-extrabold uppercase tracking-[-0.03em]">Flouter les visages</h2>
      <p className="mb-4 text-[12px] font-medium text-slate-500">Tracez un rectangle sur chaque visage à cacher (enfants notamment). C'est la photo floutée qui sera utilisée.</p>
      <canvas
        ref={canvasRef}
        className="max-h-[60vh] w-full cursor-crosshair touch-none rounded-2xl border-2 border-dashed border-slate-200 object-contain"
        onMouseDown={e => bas(e.clientX, e.clientY)}
        onMouseMove={e => bouge(e.clientX, e.clientY)}
        onMouseUp={e => haut(e.clientX, e.clientY)}
        onMouseLeave={() => { depart.current = null; redessiner(null) }}
        onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; bas(t.clientX, t.clientY) }}
        onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; bouge(t.clientX, t.clientY) }}
        onTouchEnd={e => { e.preventDefault(); const t = e.changedTouches[0]; haut(t.clientX, t.clientY) }}
      />
      <div className="mt-4 flex flex-wrap gap-2.5">
        <button type="button" onClick={appliquer} disabled={!enAttente || export_} className={`${BTN} bg-[#e38154] text-white`}>Appliquer le flou</button>
        <button type="button" onClick={charger} disabled={!pret || export_} className={`${BTN} bg-white text-slate-500`}>Recommencer</button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        <button type="button" onClick={onAnnuler} disabled={export_} className={`${BTN} bg-[#fdfaf6] text-slate-500`}>Annuler</button>
        <button type="button" onClick={terminer} disabled={!pret || export_} className={`${BTN} bg-[#1a5f7a] text-white`}>
          {export_ ? <Loader2 size={13} className="mx-auto animate-spin" /> : (enAttente || floute ? 'Terminer' : 'Pas de visage à flouter')}
        </button>
      </div>
    </Modal>
  )
}
