import { useEffect, useRef, useState } from 'react'

/**
 * Compteur animé qui démarre quand le nombre devient visible à l'écran.
 * Relance l'animation si `value` change (données Supabase chargées après le montage).
 */
export default function CountUp({ value = 0, duration = 1200, className = '', ...rest }) {
  const ref = useRef(null)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const el = ref.current
    const target = Number(value) || 0

    if (!el || target === 0) {
      setDisplay(target)
      return
    }

    let raf
    const run = () => {
      const start = performance.now()
      const step = (now) => {
        const p = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setDisplay(Math.round(target * eased))
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    if (typeof IntersectionObserver === 'undefined') {
      setDisplay(target)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        run()
      },
      { threshold: 0.2 }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} className={className} {...rest}>
      {display}
    </span>
  )
}
