import Modal from './Modal'

/** Confirmation partagée : coche verte, titre, message, bouton de sortie. */
export default function SuccessModal({
  open,
  onClose,
  title = 'Merci !',
  message,
  actionLabel = 'Fermer',
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={440} panelClassName="p-8 text-center md:p-11">
      <div className="mx-auto mb-5 flex h-[76px] w-[76px] -rotate-3 items-center justify-center rounded-[26px] border-2 border-[#0f172a] bg-emerald-500 text-[32px] font-extrabold text-white shadow-[5px_5px_0_#0f172a]">
        ✓
      </div>
      <h2 className="mb-2.5 font-display text-[30px] font-extrabold uppercase tracking-[-0.04em]">{title}</h2>
      <p className="mb-6 text-[14.5px] font-medium leading-[1.6] text-slate-500">{message}</p>
      <button
        onClick={onClose}
        className="w-full rounded-[18px] border-2 border-[#0f172a] bg-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#1a5f7a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#1a5f7a]"
      >
        {actionLabel}
      </button>
    </Modal>
  )
}
