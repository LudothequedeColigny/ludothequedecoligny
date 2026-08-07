import Modal from '../site/Modal'

/**
 * Fenêtre de saisie de l'espace de gestion : barre de titre (titre + sous-titre +
 * croix), corps qui défile, et pied optionnel pour le bouton de validation.
 *
 * `accent` colore le mot mis en avant du titre et l'ombre du panneau.
 */
export default function FormModal({
  open,
  onClose,
  title,
  titleAccent,
  subtitle,
  accent = '#1a5f7a',
  maxWidth = 560,
  footer,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={maxWidth}
      backdrop="ink"
      shadowColor={accent}
      showClose={false}
      panelClassName="flex max-h-[90vh] flex-col"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-6 py-5">
        <div className="min-w-0">
          <h2 className="font-display text-[21px] font-extrabold tracking-[-0.04em]">
            {title} {titleAccent && <span style={{ color: accent }}>{titleAccent}</span>}
          </h2>
          {subtitle && (
            <p className="mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>

      {footer && (
        <div className="shrink-0 border-t-2 border-slate-100 p-6">{footer}</div>
      )}
    </Modal>
  )
}

/** Libellé de champ numéroté, comme dans la maquette (« 1. Date de la permanence »). */
export function FieldLabel({ children, className = '' }) {
  return (
    <div className={`mb-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a] ${className}`}>
      {children}
    </div>
  )
}

/** Champ de saisie contouré, commun à toutes les fenêtres de saisie. */
export const FIELD =
  'w-full rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white'
