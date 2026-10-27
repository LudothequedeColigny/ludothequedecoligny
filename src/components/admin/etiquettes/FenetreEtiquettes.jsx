import { useState } from 'react'
import MaskIcon from '../../site/MaskIcon'
import OngletCodeBarres from './OngletCodeBarres'
import OngletQr from './OngletQr'

/**
 * Bouton « Étiquettes » de l'écran Jeux : étiquettes code-barres des boîtes (onglet
 * par défaut) et étiquettes QR de la vidéo des règles. Ordinateur seulement.
 */
export default function FenetreEtiquettes({ jeux, categories, onClose, onOuvrirJeu, onChange }) {
  const [onglet, setOnglet] = useState('code')
  const ONGLETS = [{ id: 'code', label: 'Code-barres' }, { id: 'qr', label: 'Vidéo des règles' }]
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-[22px]">
      <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={onClose} />
      <div className="anim-modal-in relative flex max-h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#e38154]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b-2 border-[#0f172a] px-7 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#e38154]">
              <MaskIcon file={onglet === 'code' ? 'ludo-etiquettes.svg' : 'ludo-etiquette-qr.svg'} size={30} color="#ffffff" />
            </div>
            <h2 className="font-display text-[21px] font-extrabold tracking-[-0.04em]">Générateur d'<span className="text-[#e38154]">étiquettes</span></h2>
          </div>
          <div className="flex items-center gap-2">
            {ONGLETS.map(o => (
              <button key={o.id} onClick={() => setOnglet(o.id)}
                className={`rounded-[14px] border-2 border-[#0f172a] px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.14em] transition-colors ${onglet === o.id ? 'bg-[#1a5f7a] text-white' : 'bg-white text-slate-600 hover:bg-[#f0f7f9]'}`}>
                {o.label}
              </button>
            ))}
            <button onClick={onClose} aria-label="Fermer" className="ml-2 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[15px] font-extrabold text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white">✕</button>
          </div>
        </div>
        {onglet === 'code'
          ? <OngletCodeBarres jeux={jeux} categories={categories} onOuvrirJeu={onOuvrirJeu} onChange={onChange} />
          : <OngletQr jeux={jeux} />}
      </div>
    </div>
  )
}
