import Modal from '../site/Modal'

/**
 * Fenêtre de confirmation de l'espace de gestion : pastille colorée, titre,
 * message, puis le bouton d'action et le bouton d'annulation empilés.
 *
 * `tone` choisit la couleur de l'action : 'danger' (rouge), 'success' (vert),
 * 'neutral' (bleu) ou 'exit' (pastille rouge mais action bleue).
 */
const TONES = {
  danger: { accent: '#f43f5e', tile: '#fff1f2', tileShadow: '#f43f5e', tilt: 'rotate-3' },
  success: { accent: '#10b981', tile: '#10b981', tileShadow: '#0f172a', tilt: '-rotate-3' },
  neutral: { accent: '#1a5f7a', tile: '#f0f7f9', tileShadow: '#1a5f7a', tilt: '-rotate-3' },
  // Déconnexion : pastille rouge (l'avertissement) mais action bleue (rien n'est détruit)
  exit: { accent: '#1a5f7a', tile: '#fff1f2', tileShadow: '#f43f5e', tilt: '' },
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'neutral',
  icon,
  busy = false,
  children,
}) {
  const t = TONES[tone] || TONES.neutral

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={430}
      backdrop="ink"
      shadowColor={t.accent}
      showClose={false}
      panelClassName="p-8 text-center md:p-9"
    >
      <div
        className={`mx-auto mb-5 flex h-[70px] w-[70px] items-center justify-center rounded-[24px] border-2 border-[#0f172a] text-[30px] font-extrabold ${t.tilt}`}
        style={{ background: t.tile, boxShadow: `4px 4px 0 ${t.tileShadow}`, color: t.tile === '#10b981' ? '#fff' : t.accent }}
      >
        {icon}
      </div>

      <h2 className="mb-2.5 font-display text-[26px] font-extrabold uppercase tracking-[-0.04em]">{title}</h2>
      {message && (
        <p className="mb-6 text-sm font-medium leading-[1.6] text-slate-500">{message}</p>
      )}

      {children}

      <div className="flex flex-col gap-2.5">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="rounded-[18px] border-2 border-[#0f172a] px-4 py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] disabled:pointer-events-none disabled:opacity-50"
          style={{ background: t.accent }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] px-4 py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  )
}
