// TutorialOverlay.jsx — v7
// - Spotlight correct dans les modales fixed (scroll interne)
// - Support double spotlight via id2
// - Tooltip toujours dans le viewport

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

export function TutorialButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Aide & tutoriel"
      className="fixed bottom-6 right-6 z-[900] flex items-center gap-2 px-4 py-3 bg-[#1a5f7a] text-white rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-[#154f67] hover:scale-105 active:scale-95 transition-all duration-200"
    >
      <BookOpen size={16} strokeWidth={2.5} />
      Tutoriel
    </button>
  )
}

// ── Utilitaire : getBoundingClientRect fiable même dans une modale scrollable ──
function getViewportRect(el) {
  const r = el.getBoundingClientRect()
  return {
    top:    r.top,
    left:   r.left,
    right:  r.right,
    bottom: r.bottom,
    width:  r.width,
    height: r.height,
  }
}

// ── Scroll l'élément dans son conteneur scrollable le plus proche ─────────────
function scrollToElement(el) {
  // Cherche le premier ancêtre avec overflow scroll/auto
  let parent = el.parentElement
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent)
    const overflow = style.overflow + style.overflowY
    if (/auto|scroll/.test(overflow)) {
      const parentRect = parent.getBoundingClientRect()
      const elRect     = el.getBoundingClientRect()
      const targetTop  = elRect.top - parentRect.top + parent.scrollTop - parent.clientHeight / 2 + elRect.height / 2
      parent.scrollTo({ top: targetTop, behavior: 'smooth' })
      return
    }
    parent = parent.parentElement
  }
  // Fallback : scroll global via window — fonctionne pour les éléments en bas de page
  const r = el.getBoundingClientRect()
  const targetY = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2
  window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })
}

export default function TutorialOverlay({ steps = [], open, onClose }) {
  const [current,    setCurrent]    = useState(0)
  const [spots,      setSpots]      = useState([])   // array de { top, left, width, height }
  const [tipPos,     setTipPos]     = useState(null)
  const timerRef   = useRef(null)
  const currentRef = useRef(0)

  useEffect(() => { currentRef.current = current }, [current])

  const step    = steps[current] ?? null
  const isFirst = current === 0
  const isLast  = current === steps.length - 1

  // ── Centre-écran fallback ─────────────────────────────────────────────────
  const centerTip = useCallback(() => {
    const MARGIN = 16
    const TW = Math.min(320, window.innerWidth - MARGIN * 2)
    const left = Math.max(MARGIN, window.innerWidth / 2 - TW / 2)
    setSpots([])
    setTipPos({ top: Math.max(20, window.innerHeight / 2 - 145), left, width: TW, placement: 'center' })
  }, [])

  // ── Mesure 1 ou 2 éléments et calcule spotlight(s) + tooltip ─────────────
  const measureStep = useCallback((stepObj, extraDelay = 0) => {
    clearTimeout(timerRef.current)
    setTipPos(null)
    setSpots([])

    const totalDelay = (stepObj?.actionDelay ?? 150) + extraDelay

    timerRef.current = setTimeout(() => {
      const ids = [stepObj?.id, stepObj?.id2].filter(Boolean)
      if (!ids.length) { centerTip(); return }

      // Pour chaque id, prend le premier élément visible dans le viewport
      const findVisible = (id) => {
        const all = Array.from(document.querySelectorAll(`[data-tutorial="${id}"]`))
        if (!all.length) return null
        const visible = all.find(el => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0
        })
        return visible || all[0]
      }

      const els = ids.map(findVisible).filter(Boolean)
      if (!els.length) {
        console.warn('[Tutoriel] introuvable: ' + ids.join(', '))
        centerTip()
        return
      }

      // Si l'étape demande pas de spotlight → tooltip centré
      if (stepObj.noSpotlight) {
        centerTip()
        return
      }

      // Scroll vers le premier élément
      scrollToElement(els[0])

      setTimeout(() => {
        const newSpots = els.map(el => {
          const r = getViewportRect(el)
          // PAD réduit pour les petits éléments (boutons icônes < 60px)
          const PAD = r.width < 60 || r.height < 60 ? 5 : 10
          return {
            top:    r.top    - PAD,
            left:   r.left   - PAD,
            width:  r.width  + PAD * 2,
            height: r.height + PAD * 2,
          }
        })
        setSpots(newSpots)

        // Calcul position tooltip
        const primary = getViewportRect(els[0])
        const MARGIN  = 16
        const TW      = Math.min(320, window.innerWidth - MARGIN * 2)
        const TH      = 290
        const GAP     = 14

        const below = window.innerHeight - primary.bottom
        const above = primary.top
        let pl = 'bottom'
        if (below < TH + GAP && above > TH + GAP) pl = 'top'
        else if (below < TH + GAP && above < TH + GAP) pl = 'center'

        const anchorR = getViewportRect(els[els.length - 1])

        let top, left
        if (pl === 'center') {
          top  = window.innerHeight / 2 - TH / 2
          left = MARGIN
        } else if (pl === 'bottom') {
          top  = anchorR.bottom + GAP
          left = primary.left + primary.width / 2 - TW / 2
        } else {
          top  = primary.top - TH - GAP
          left = primary.left + primary.width / 2 - TW / 2
        }

        // Clamp strict des deux côtés
        left = Math.max(MARGIN, Math.min(left, window.innerWidth - TW - MARGIN))
        top  = Math.max(MARGIN, Math.min(top,  window.innerHeight - TH - MARGIN))

        setTipPos({ top, left, width: TW, placement: pl })
      }, 450)

    }, totalDelay)
  }, [centerTip])

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= steps.length) return
    const next = steps[idx]
    setCurrent(idx)
    currentRef.current = idx
    if (next?.action) {
      next.action()
      measureStep(next, 250)
    } else {
      measureStep(next, 0)
    }
  }, [steps, measureStep])

  // ── Ouverture / fermeture ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      clearTimeout(timerRef.current)
      setTipPos(null)
      setSpots([])
      setCurrent(0)
      return
    }
    const first = steps[0]
    setCurrent(0)
    currentRef.current = 0
    if (first?.action) first.action()
    measureStep(first, first?.action ? 250 : 0)
  }, [open]) // eslint-disable-line

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const fn = () => measureStep(steps[currentRef.current], 0)
    window.addEventListener('resize', fn)
    return () => { window.removeEventListener('resize', fn); clearTimeout(timerRef.current) }
  }, [open, measureStep, steps])

  // ── Clavier ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const fn = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goTo(currentRef.current + 1)
      if (e.key === 'ArrowLeft')  goTo(currentRef.current - 1)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose, goTo])

  if (!open || !step) return null

  const dark = '#1a5f7a', orange = '#e38154', green = '#10b981', white = '#fff'

  // ── SVG mask : on perce un trou pour chaque spotlight ────────────────────
  const renderOverlay = () => {
    if (!spots.length) {
      return <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,24,40,0.78)' }} />
    }
    return (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <mask id="tuto-holes">
            <rect width="100%" height="100%" fill="white" />
            {spots.map((s, i) => (
              <rect key={i} x={s.left} y={s.top} width={s.width} height={s.height} rx="12" fill="black" />
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(8,24,40,0.78)" mask="url(#tuto-holes)" />
        {spots.map((s, i) => (
          <rect key={i} x={s.left} y={s.top} width={s.width} height={s.height} rx="12" fill="none" stroke={orange} strokeWidth="2.5" />
        ))}
      </svg>
    )
  }

  return (
    <>
      {/* Fond sombre + spotlight(s) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 950, pointerEvents: 'none' }}>
        {renderOverlay()}
      </div>

      {/* Backdrop cliquable */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 951 }} onClick={onClose} />

      {/* Tooltip */}
      {tipPos && (
        <div
          style={{ position: 'fixed', top: tipPos.top, left: tipPos.left, width: tipPos.width, maxWidth: 'calc(100vw - 32px)', zIndex: 960, boxSizing: 'border-box' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Flèche */}
          {spots.length > 0 && tipPos.placement !== 'center' && (
            <div style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0,
              ...(tipPos.placement === 'bottom'
                ? { top: -10, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `10px solid ${white}` }
                : { bottom: -10, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: `10px solid ${white}` })
            }} />
          )}

          <div style={{ background: white, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.40)' }}>
            {/* En-tête */}
            <div style={{ background: dark, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={13} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.6)' }}>
                  Étape {current + 1} / {steps.length}
                </span>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, padding: '3px 6px', cursor: 'pointer', display: 'flex', color: 'rgba(255,255,255,0.75)' }}>
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>

            {/* Progression */}
            <div style={{ height: 3, background: '#f1f5f9' }}>
              <div style={{ height: '100%', background: orange, width: `${(current + 1) / steps.length * 100}%`, transition: 'width 0.35s ease' }} />
            </div>

            {/* Contenu */}
            <div style={{ padding: '14px 16px 10px' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.3 }}>{step.title}</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{step.description}</p>
              {step.tip && (
                <div style={{ marginTop: 10, padding: '8px 11px', background: '#fffbeb', borderRadius: 9, border: '1px solid #fde68a', display: 'flex', gap: 7 }}>
                  <span style={{ fontSize: 13 }}>💡</span>
                  <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{step.tip}</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button
                onClick={() => goTo(current - 1)} disabled={isFirst}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '7px 11px', background: isFirst ? '#f8fafc' : '#f1f5f9', color: isFirst ? '#cbd5e1' : '#475569', border: 'none', borderRadius: 9, cursor: isFirst ? 'not-allowed' : 'pointer', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}
              >
                <ChevronLeft size={12} strokeWidth={3} /> Préc.
              </button>

              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {current + 1} / {steps.length}
              </span>

              {isLast ? (
                <button onClick={onClose}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '7px 11px', background: green, color: white, border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(16,185,129,0.3)' }}
                >
                  Terminer ✓
                </button>
              ) : (
                <button onClick={() => goTo(current + 1)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '7px 11px', background: dark, color: white, border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(26,95,122,0.25)' }}
                >
                  Suiv. <ChevronRight size={12} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}