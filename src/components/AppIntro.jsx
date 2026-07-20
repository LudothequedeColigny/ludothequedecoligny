import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const SESSION_KEY = 'app_opened'
const INITIAL_SIZE = 120
const LOGO_SHADOW = 'drop-shadow(0px 8px 24px rgba(0,0,0,0.4))'
// Position de repli si le logo du header n'est pas trouvable dans le DOM
// (route de démarrage différente de Home, montage retardé...)
const FALLBACK_TARGET = { x: 28, y: 28, size: 48 }

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768
}

export default function AppIntro() {
  const [shouldRender] = useState(() => {
    if (typeof window === 'undefined') return false
    if (sessionStorage.getItem(SESSION_KEY)) return false
    return isMobileDevice()
  })

  // Stocké en ref (pas en state) : la mesure/correction du logo du header ne doit jamais
  // provoquer un re-render pendant la phase 1, seule la bascule `moved` (à 300ms) la consulte.
  const targetRef = useRef(FALLBACK_TARGET)
  const [moved, setMoved] = useState(false)
  const [fading, setFading] = useState(false)
  const [hidden, setHidden] = useState(false)

  // Mesure la position réelle du logo dans le header de la page en dessous, avant le premier
  // paint (useLayoutEffect), sans jamais déclencher de re-render de la phase 1.
  useLayoutEffect(() => {
    if (!shouldRender) return

    const measure = () => {
      const el = document.querySelector('[data-app-logo="header"]')
      if (!el) return null
      const rect = el.getBoundingClientRect()
      if (rect.width === 0) return null
      return { x: rect.left, y: rect.top, size: rect.width }
    }

    const found = measure()
    if (found) {
      targetRef.current = found
      return
    }

    // targetRef garde déjà FALLBACK_TARGET ; on tente de trouver la vraie position
    // en arrière-plan pour la phase 2 (dans 300ms), sans jamais toucher au rendu de la phase 1.
    let attempts = 0
    let rafId
    const retry = () => {
      attempts += 1
      const rect = measure()
      if (rect) {
        targetRef.current = rect
        return
      }
      if (attempts < 5) rafId = requestAnimationFrame(retry)
    }
    rafId = requestAnimationFrame(retry)
    return () => cancelAnimationFrame(rafId)
  }, [shouldRender])

  // Phase 1 (0 → 0.3s) stable, Phase 2 (0.3s → 0.8s) déplacement/réduction, Phase 3 (0.8s → 1s) fondu du fond
  useEffect(() => {
    if (!shouldRender) return
    const t1 = setTimeout(() => setMoved(true), 300)
    const t2 = setTimeout(() => setFading(true), 800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [shouldRender])

  const handleBackgroundFadeEnd = (e) => {
    if (e.propertyName !== 'opacity') return
    sessionStorage.setItem(SESSION_KEY, '1')
    setHidden(true)
  }

  if (!shouldRender || hidden) return null

  const target = targetRef.current
  const scale = target.size / INITIAL_SIZE
  const screenCenterX = window.innerWidth / 2
  const screenCenterY = window.innerHeight / 2
  const targetCenterX = target.x + target.size / 2
  const targetCenterY = target.y + target.size / 2
  const deltaX = targetCenterX - screenCenterX
  const deltaY = targetCenterY - screenCenterY

  return (
    <div
      className="fixed inset-0"
      style={{
        zIndex: 9999,
        background: '#0f3d4f',
        opacity: fading ? 0 : 1,
        transition: 'opacity 200ms ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
      onTransitionEnd={handleBackgroundFadeEnd}
    >
      <img
        src="/logo-feuille.svg"
        alt=""
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: INITIAL_SIZE,
          height: INITIAL_SIZE,
          transform: moved
            ? `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(${scale})`
            : 'translate(-50%, -50%) scale(1)',
          transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'center',
          // Persiste inchangée en phases 1 et 2 ; ne se dissout qu'avec le fondu du
          // conteneur en phase 3 (opacity du parent), jamais retirée séparément avant.
          filter: LOGO_SHADOW,
        }}
      />
    </div>
  )
}
