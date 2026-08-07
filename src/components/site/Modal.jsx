import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Coquille commune à toutes les modales du site public :
 * voile bleu flouté, panneau contouré à ombre pleine, bouton de fermeture en pastille,
 * et — pour les fiches événement/jeu — le bandeau orange en pied de panneau.
 *
 * Ferme au clic sur le voile et à la touche Échap, et bloque le défilement du fond.
 *
 * Propriétés : `maxWidth` (px), `scroll` (le contenu défile dans le panneau),
 * `strip` (bandeau orange en pied), `panelClassName` (padding, alignement…),
 * `backdrop` ('teal' pour le site public, 'ink' pour l'espace de gestion),
 * `shadowColor`, et `showClose` pour masquer la croix.
 */
export default function Modal({
  open,
  onClose,
  title,
  maxWidth = 520,
  scroll = false,
  strip = false,
  panelClassName = '',
  closeTone = 'white',
  backdrop = 'teal',
  shadowColor = '#0f172a',
  showClose = true,
  children,
}) {
  useEffect(() => {
    if (!open) return

    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-[22px]"
    >
      <div
        onClick={onClose}
        className="anim-fade-in absolute inset-0 backdrop-blur-[6px]"
        // Voile bleu sur le site public, encre dans l'espace de gestion
        style={{ background: backdrop === 'ink' ? 'rgba(15,23,42,.7)' : 'rgba(26,95,122,.88)' }}
      />

      <div
        className={`anim-modal-in relative w-full rounded-[36px] border-2 border-[#0f172a] bg-white ${
          scroll ? 'max-h-[90vh] overflow-y-auto overflow-x-hidden' : 'overflow-hidden'
        } ${panelClassName}`}
        style={{ maxWidth, boxShadow: `12px 12px 0 ${shadowColor}` }}
      >
        {showClose && (
          <button
            onClick={onClose}
            aria-label="Fermer"
            className={`absolute right-4 top-4 z-[3] flex h-11 w-11 items-center justify-center rounded-[14px] border-2 border-[#0f172a] text-base font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white ${
              closeTone === 'cream' ? 'bg-[#fdfaf6]' : 'bg-white'
            }`}
          >
            ✕
          </button>
        )}

        {children}

        {strip && <div className="h-2.5 border-t-2 border-[#0f172a] bg-[#e38154]" />}
      </div>
    </div>,
    document.body
  )
}
