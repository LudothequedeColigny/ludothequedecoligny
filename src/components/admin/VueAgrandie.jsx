import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

/**
 * Image agrandie, avec passage à la précédente / suivante (flèches, glisser, clavier).
 * Partagée par les fenêtres Bilan et Annonce de l'écran Communication, et par l'aperçu des étiquettes (`rendre`).
 */
export default function VueAgrandie({ images, index, onIndex, onFermer, rendre }) {
  const debutToucher = useRef(null)
  const n = images.length
  const aller = i => { if (i >= 0 && i < n) onIndex(i) }

  useEffect(() => {
    const touche = e => {
      if (e.key === 'ArrowLeft') aller(index - 1)
      else if (e.key === 'ArrowRight') aller(index + 1)
      else if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  })

  if (!images[index]) return null
  const fleche = 'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white'
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/85 p-4" onClick={onFermer}
      onTouchStart={e => { debutToucher.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (debutToucher.current == null) return
        const ecart = e.changedTouches[0].clientX - debutToucher.current
        debutToucher.current = null
        if (Math.abs(ecart) > 40) aller(index + (ecart < 0 ? 1 : -1))
      }}>
      {rendre
        ? <div onClick={e => e.stopPropagation()} className="max-h-[86vh] overflow-hidden rounded-xl border-2 border-white bg-white">{rendre(index)}</div>
        : <img src={images[index]} alt={`Image ${index + 1} sur ${n}`} onClick={e => e.stopPropagation()}
            className="max-h-[86vh] max-w-full rounded-xl border-2 border-white" />}
      <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-black text-white">
        {index + 1} / {n}
      </span>
      <button type="button" onClick={onFermer} aria-label="Fermer"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white">
        <X size={18} />
      </button>
      {index > 0 && (
        <button type="button" onClick={e => { e.stopPropagation(); aller(index - 1) }} aria-label="Image précédente" className={`${fleche} left-3`}>
          <ChevronLeft size={22} />
        </button>
      )}
      {index < n - 1 && (
        <button type="button" onClick={e => { e.stopPropagation(); aller(index + 1) }} aria-label="Image suivante" className={`${fleche} right-3`}>
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  )
}
