/**
 * Bandeau d'information coloré placé sous l'en-tête d'un écran
 * (« 2 prêts en retard », « catalogue en lecture seule »…).
 *
 * `tone` : 'danger' (rouge, avec point clignotant), 'warn' (ambre), 'success' (vert),
 * 'info' (bleu canard).
 */
const TONES = {
  danger: { bg: '#fff1f2', border: '#f43f5e', text: '#be123c', dot: '#f43f5e' },
  warn: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', dot: '#f59e0b' },
  success: { bg: '#ecfdf5', border: '#10b981', text: '#047857', dot: '#10b981' },
  info: { bg: '#f0f7f9', border: '#1a5f7a', text: '#1a5f7a', dot: '#1a5f7a' },
}

export default function AdminBanner({ tone = 'info', pulse = false, icon = null, children, className = '' }) {
  const t = TONES[tone] || TONES.info

  return (
    <div
      className={`mb-4 flex items-center gap-3 rounded-[20px] border-2 px-5 py-4 ${className}`}
      style={{ background: t.bg, borderColor: t.border }}
    >
      {pulse ? (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="anim-pulse-ring absolute inset-0 rounded-full" style={{ background: t.dot }} />
          <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: t.dot }} />
        </span>
      ) : icon ? (
        <span className="shrink-0" style={{ color: t.text }}>{icon}</span>
      ) : null}

      <span
        className="text-[10.5px] font-extrabold uppercase leading-tight tracking-[0.12em]"
        style={{ color: t.text }}
      >
        {children}
      </span>
    </div>
  )
}
