// TutorialOverlay.jsx — v8
// - Overlay position: fixed, coordonnées viewport (getBoundingClientRect) directement
// - Scroll natif via scrollIntoView (gère seul le scroll interne des modales)
// - Tooltip mobile ancré en bas via CSS fixed (bottom/left/right), jamais recalculé en px
// - Boutons mobile min 44px de hauteur (cible tactile)
// - Support double spotlight via id2, support noSpotlight pour les étapes de bienvenue
// - Fallback : tooltip centré sans spotlight si l'élément data-tutorial est introuvable

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

// ── Utilitaire : getBoundingClientRect — coordonnées viewport, directement
// utilisables par un overlay position: fixed (même repère que le SVG fixed) ──
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

export default function TutorialOverlay({ steps = [], open, onClose }) {
  const [current,    setCurrent]    = useState(0)
  const [spots,      setSpots]      = useState([])   // array de { top, left, width, height }
  const [tipPos,     setTipPos]     = useState(null)
  const timerRef   = useRef(null)
  const scrollTimerRef = useRef(null)
  const currentRef = useRef(0)

  useEffect(() => { currentRef.current = current }, [current])

  const step    = steps[current] ?? null
  const isFirst = current === 0
  const isLast  = current === steps.length - 1

  // ── Centre-écran fallback ─────────────────────────────────────────────────
  const isMobile = () => window.innerWidth < 640

  const centerTip = useCallback(() => {
    const MARGIN = 16
    setSpots([])
    if (isMobile()) {
      // Sur mobile : bulle toujours ancrée en bas via CSS fixed (jamais de top calculé en px)
      setTipPos({ placement: 'bottom-fixed' })
    } else {
      const TW = Math.min(320, window.innerWidth - MARGIN * 2)
      const left = Math.max(MARGIN, window.innerWidth / 2 - TW / 2)
      setTipPos({ top: Math.max(20, window.innerHeight / 2 - 145), left, width: TW, placement: 'center' })
    }
  }, [])

  // ── Mesure 1 ou 2 éléments et calcule spotlight(s) + tooltip ─────────────
  const measureStep = useCallback((stepObj, extraDelay = 0) => {
    clearTimeout(timerRef.current)
    clearTimeout(scrollTimerRef.current)
    setTipPos(null)
    setSpots([])

    // extraDelay laisse le temps à l'action() de l'étape (ex: ouvrir une modale)
    // de rendre le DOM avant qu'on ne cherche l'élément data-tutorial.
    timerRef.current = setTimeout(() => {
      // Étape de bienvenue sans ciblage : tooltip centré immédiatement, pas de recherche DOM.
      if (stepObj?.noSpotlight) { centerTip(); return }

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

      // Scroll natif — gère seul le scroll interne des modales/conteneurs scrollables
      // (overflow: auto/scroll), pas besoin de chercher l'ancêtre scrollable à la main.
      els[0].scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Attend que le scroll (et l'éventuelle animation d'ouverture) se stabilise
      // avant de mesurer les positions finales. Configurable par étape (actionDelay), défaut 150ms.
      const settleDelay = stepObj?.actionDelay ?? 150
      scrollTimerRef.current = setTimeout(() => {
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
        const mobile  = isMobile()

        if (mobile) {
          // Sur mobile : bulle toujours ancrée en bas via CSS fixed (bottom/left/right),
          // jamais un `top` recalculé en px — robuste au resize (barre d'adresse mobile)
          // et à la hauteur réelle du contenu.
          setTipPos({ placement: 'bottom-fixed' })
        } else {
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

          left = Math.max(MARGIN, Math.min(left, window.innerWidth - TW - MARGIN))
          top  = Math.max(MARGIN, Math.min(top,  window.innerHeight - TH - MARGIN))

          setTipPos({ top, left, width: TW, placement: pl })
        }
      }, settleDelay)

    }, extraDelay)
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
      clearTimeout(scrollTimerRef.current)
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
    return () => { window.removeEventListener('resize', fn); clearTimeout(timerRef.current); clearTimeout(scrollTimerRef.current) }
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
  const isMobileTip = tipPos?.placement === 'bottom-fixed'

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

  // Style du conteneur tooltip : fixed, coordonnées viewport directes (desktop)
  // ou ancrage CSS bottom/left/right (mobile), jamais un top mobile recalculé en px.
  const tipContainerStyle = isMobileTip
    ? { position: 'fixed', bottom: 16, left: 16, right: 16, width: 'calc(100vw - 32px)', zIndex: 960, boxSizing: 'border-box' }
    : { position: 'fixed', top: tipPos?.top, left: tipPos?.left, width: tipPos?.width, maxWidth: 'calc(100vw - 32px)', zIndex: 960, boxSizing: 'border-box' }

  // Cible tactile min 44px sur mobile pour les boutons de navigation
  const navBtnStyle = (extra = {}) => ({
    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3,
    padding: isMobileTip ? '10px 14px' : '7px 11px',
    minHeight: isMobileTip ? 44 : undefined,
    borderRadius: 9, cursor: 'pointer', fontSize: 10, fontWeight: 900,
    textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
    border: 'none',
    ...extra,
  })

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
        <div style={tipContainerStyle} onClick={e => e.stopPropagation()}>
          {/* Flèche (desktop uniquement — la bulle mobile est ancrée en bas, sans flèche) */}
          {spots.length > 0 && !isMobileTip && tipPos.placement !== 'center' && (
            <div style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0,
              ...(tipPos.placement === 'bottom'
                ? { top: -10, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `10px solid ${white}` }
                : { bottom: -10, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: `10px solid ${white}` })
            }} />
          )}

          <div style={{ background: white, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.40)' }}>
            {/* En-tête */}
            <div style={{ background: dark, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

            {/* Contenu — compact sur mobile */}
            <div style={{ padding: isMobileTip ? '10px 14px 6px' : '14px 16px 10px' }}>
              <p style={{ fontSize: isMobileTip ? 13 : 14, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.3 }}>{step.title}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5, fontWeight: 500,
                display: '-webkit-box', WebkitLineClamp: isMobileTip ? 3 : 10, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>{step.description}</p>
              {step.tip && !isMobileTip && (
                <div style={{ marginTop: 10, padding: '8px 11px', background: '#fffbeb', borderRadius: 9, border: '1px solid #fde68a', display: 'flex', gap: 7 }}>
                  <span style={{ fontSize: 13 }}>💡</span>
                  <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{step.tip}</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div style={{ padding: isMobileTip ? '0 12px 10px' : '0 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button
                onClick={() => goTo(current - 1)} disabled={isFirst}
                style={navBtnStyle({ background: isFirst ? '#f8fafc' : '#f1f5f9', color: isFirst ? '#cbd5e1' : '#475569', cursor: isFirst ? 'not-allowed' : 'pointer' })}
              >
                <ChevronLeft size={12} strokeWidth={3} /> Préc.
              </button>

              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {current + 1} / {steps.length}
              </span>

              {isLast ? (
                <button onClick={onClose}
                  style={navBtnStyle({ background: green, color: white, boxShadow: '0 3px 10px rgba(16,185,129,0.3)' })}
                >
                  Terminer ✓
                </button>
              ) : (
                <button onClick={() => goTo(current + 1)}
                  style={navBtnStyle({ background: dark, color: white, boxShadow: '0 3px 10px rgba(26,95,122,0.25)' })}
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
