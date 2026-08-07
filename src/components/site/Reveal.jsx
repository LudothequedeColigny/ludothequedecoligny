import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Enveloppe un bloc et le fait apparaître lorsqu'il entre dans le viewport.
 * Les styles vivent dans index.css ([data-reveal] / [data-in]) pour que l'état
 * « caché » soit appliqué dès le premier paint, sans clignotement.
 *
 * Propriétés : `variant` ('up' | 'scale' | 'left' | 'right') donne la direction,
 * `delay` (ms) retarde l'apparition, `as` change la balise rendue.
 * Toutes les autres propriétés sont transmises telles quelles à l'élément.
 */
export default function Reveal({
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  // Signale que le JavaScript tourne : c'est ce marqueur qui autorise index.css à
  // masquer les blocs avant leur apparition. Posé avant le premier affichage, donc
  // sans clignotement. S'il n'est jamais posé, tout reste visible.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-anim', '')
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return

    // Environnements sans IntersectionObserver : on affiche directement
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    let timer
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        timer = setTimeout(() => setShown(true), delay)
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [delay, shown])

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      data-in={shown ? '' : undefined}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  )
}
