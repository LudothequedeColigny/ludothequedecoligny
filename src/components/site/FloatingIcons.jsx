import { memo, useState } from 'react'

const ICON_FILES = ['01.svg', '02.svg', '03.svg', '04.svg', '05.svg', '06.svg', '07.svg']
const COLORS = ['#1a5f7a', '#e38154']

/**
 * Nuage d'icônes de jeu qui dérivent lentement en fond de section.
 * Purement décoratif : pointer-events-none et non lu par les lecteurs d'écran.
 */
const FloatingIcons = memo(function FloatingIcons({ className = '' }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const count = isMobile ? 30 : 55

  const [particles] = useState(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      file: ICON_FILES[Math.floor(Math.random() * ICON_FILES.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.floor(Math.random() * (isMobile ? 24 : 32) + 16),
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: Math.random() * 15 + 25,
      delay: Math.random() * -40,
      rotation: Math.floor(Math.random() * 360),
    }))
  )

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute opacity-30"
          style={{
            left: p.left,
            top: p.top,
            animation: `ludoFloat ${p.duration}s infinite ease-in-out ${p.delay}s`,
            willChange: 'transform',
          }}
        >
          <div
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              maskImage: `url(/icons/${p.file})`,
              WebkitMaskImage: `url(/icons/${p.file})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              transform: `rotate(${p.rotation}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  )
})

export default FloatingIcons
