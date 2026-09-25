import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react'

/**
 * Fenêtre d'agrandissement d'une image (photo d'événement ou boîte de jeu).
 * Le fond de page reste visible, simplement flouté.
 *
 * On passe d'une image à l'autre sans fermer : flèches, clavier ← →,
 * ou glissement du doigt sur téléphone.
 *
 * items : [{ id, src, title, badge, href }]
 * fit   : 'cover' (photos, l'image remplit le cadre) ou 'contain' (boîtes de jeux)
 */
export default function MediaLightbox({ items, index, onIndex, onClose, fit = 'cover' }) {
  const [drag, setDrag] = useState(0)       // décalage du doigt pendant le glissement
  const touchRef = useRef(null)
  const count = items.length
  const item = items[index]

  const go = (step) => {
    if (count < 2) return
    onIndex((index + step + count) % count)
  }

  // Clavier : flèches pour changer d'image, Échap pour fermer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // La page derrière ne défile plus pendant l'affichage
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  // Les images voisines sont chargées d'avance : le défilement reste fluide
  useEffect(() => {
    if (count < 2) return
    ;[items[(index + 1) % count], items[(index - 1 + count) % count]].forEach(neighbour => {
      if (neighbour?.src) { const img = new window.Image(); img.src = neighbour.src }
    })
  }, [index, items, count])

  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchMove = (e) => {
    if (!touchRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchRef.current.x
    const dy = t.clientY - touchRef.current.y
    // Glissement horizontal seulement : un mouvement vertical ne doit rien déclencher
    if (Math.abs(dx) > Math.abs(dy)) setDrag(dx)
  }

  const onTouchEnd = () => {
    if (Math.abs(drag) > 50) go(drag < 0 ? 1 : -1)
    setDrag(0)
    touchRef.current = null
  }

  if (!item) return null

  const ARROW = 'flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0f172a] bg-white text-[#1a5f7a] shadow-[3px_3px_0_#0f172a] transition-colors hover:bg-[#e38154] hover:text-white'

  return (
    <div
      className="anim-fade-in fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-[18px]"
      style={{ background: 'rgba(15,23,42,.38)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title || 'Photo agrandie'}
    >
      {count > 1 && (
        <span className="absolute left-4 top-4 rounded-full border-2 border-[#0f172a] bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a]">
          {index + 1} / {count}
        </span>
      )}

      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0f172a] bg-white text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
      >
        <X size={22} />
      </button>

      <div
        className="flex w-full max-w-[900px] flex-col items-center gap-4"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex w-full items-center justify-center gap-3">
          {count > 1 && (
            <button onClick={() => go(-1)} aria-label="Image précédente" className={`${ARROW} hidden shrink-0 sm:flex`}>
              <ChevronLeft size={22} />
            </button>
          )}

          <img
            key={item.id}
            src={item.src}
            alt={item.title || ''}
            className={`max-h-[70vh] min-w-0 rounded-[22px] border-2 border-[#0f172a] bg-white ${fit === 'contain' ? 'object-contain p-3' : 'object-cover'}`}
            style={{ transform: `translateX(${drag / 3}px)`, transition: drag ? 'none' : 'transform .2s ease-out' }}
            draggable={false}
          />

          {count > 1 && (
            <button onClick={() => go(1)} aria-label="Image suivante" className={`${ARROW} hidden shrink-0 sm:flex`}>
              <ChevronRight size={22} />
            </button>
          )}
        </div>

        {(item.title || item.badge || item.href) && (
          <div className="max-w-full rounded-[22px] border-2 border-[#0f172a] bg-white px-5 py-3.5 text-center shadow-[4px_4px_0_#1a5f7a]">
            {item.title && (
              <p className="font-display text-[17px] font-extrabold leading-tight tracking-[-0.03em]">{item.title}</p>
            )}
            {item.badge && (
              <span className="mt-2 inline-block rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white">
                {item.badge}
              </span>
            )}
            {item.href && (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] transition-colors hover:text-[#e38154]"
              >
                Voir la fiche du jeu <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}

        {count > 1 && (
          <>
            {/* Téléphone : flèches côte à côte sous l'image, en plus du glissement */}
            <div className="flex items-center gap-6 sm:hidden">
              <button onClick={() => go(-1)} aria-label="Image précédente" className={ARROW}><ChevronLeft size={22} /></button>
              <button onClick={() => go(1)} aria-label="Image suivante" className={ARROW}><ChevronRight size={22} /></button>
            </div>

            <div className="flex max-w-full flex-wrap justify-center gap-1.5">
              {items.map((thumb, i) => (
                <button
                  key={thumb.id}
                  onClick={() => onIndex(i)}
                  aria-label={`Image ${i + 1}`}
                  className={'h-1.5 rounded-full transition-all ' + (i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80')}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
