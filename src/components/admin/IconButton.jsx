/**
 * Petit bouton carré d'action des listes (modifier, supprimer, relancer, prolonger).
 * `tone` choisit la couleur ; au survol, le fond se remplit et l'icône passe en blanc.
 */
const TONES = {
  neutral: 'bg-[#fdfaf6] text-[#1a5f7a] hover:bg-[#1a5f7a] hover:text-white',
  danger: 'bg-[#fff1f2] text-[#f43f5e] hover:bg-[#f43f5e] hover:text-white',
  warn: 'bg-[#fffbeb] text-[#b45309] hover:bg-[#f59e0b] hover:text-white',
  alert: 'bg-[#fff1f2] text-[#be123c] hover:bg-[#f43f5e] hover:text-white',
  success: 'bg-[#ecfdf5] text-[#047857] hover:bg-[#10b981] hover:text-white',
}

export default function IconButton({ tone = 'neutral', title, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] transition-colors disabled:pointer-events-none disabled:opacity-40 ${TONES[tone] || TONES.neutral} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
