import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToast } from '../ToastContext'
import MaskIcon from '../site/MaskIcon'
import { ACTIONS_PUBLICATION, reglagesPublication } from '../../services/calendrierPublications'

/**
 * Paramètres → « Calendrier des publications » : délai avant l'événement, heure du rappel et
 * interrupteur du rappel pour chaque action. Les mêmes réglages pilotent l'onglet Calendrier de
 * Communication et les rappels sur téléphone (check-events-notify).
 */
export default function ReglagesPublications({ onClose }) {
  const { addToast } = useToast()
  const [valeurs, setValeurs] = useState(null)
  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('id, value').like('id', 'publication_%').then(({ data }) => {
      setValeurs(reglagesPublication(Object.fromEntries((data || []).map(l => [l.id, l.value]))))
    })
  }, [])
  useEffect(() => {
    const echap = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [onClose])

  const changer = (cle, champ, v) => setValeurs(vs => ({ ...vs, [cle]: { ...vs[cle], [champ]: v } }))

  const enregistrer = async () => {
    setEnregistrement(true)
    const lignes = ACTIONS_PUBLICATION.flatMap(a => {
      const r = valeurs[a.cle]
      return [
        { id: `publication_${a.cle}_jours`, value: String(r.jours) },
        { id: `publication_${a.cle}_heure`, value: r.heure },
        { id: `publication_${a.cle}_rappel`, value: r.rappel ? 'true' : 'false' },
      ]
    })
    const { error } = await supabase.from('settings').upsert(lignes, { onConflict: 'id' })
    setEnregistrement(false)
    if (error) { addToast('Enregistrement impossible : ' + error.message, 'error'); return }
    addToast('Calendrier des publications enregistré.', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/70 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[28px] border-2 border-[#0f172a] bg-white shadow-[8px_8px_0_#0f172a]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b-2 border-slate-100 p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#faf5ff] text-[#a855f7]"><MaskIcon file="ludo-calendrier.svg" size={30} color="currentColor" /></div>
            <div>
              <h3 className="font-display text-[19px] font-extrabold tracking-[-0.04em]">Calendrier des publications</h3>
              <p className="mt-1 text-[12.5px] text-slate-500">Quand communiquer avant chaque événement.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {!valeurs ? <Loader2 className="mx-auto animate-spin text-[#1a5f7a]" /> : ACTIONS_PUBLICATION.map(a => (
            <div key={a.cle} className="rounded-[18px] border-2 border-[#0f172a] p-4">
              <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[#0f172a]" style={{ background: a.couleur }} />
                <span className="font-display text-[16px] font-extrabold">{a.libelle}</span>
                {!a.permanence && <span className="w-full pl-[22px] text-[11.5px] text-slate-500 sm:w-auto sm:pl-0">soirées et après-midis famille seulement</span>}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13.5px] font-semibold">
                <label className="flex items-center gap-2">
                  <input type="number" min="0" max="60" value={valeurs[a.cle].jours}
                    onChange={e => changer(a.cle, 'jours', Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0)))}
                    className="w-16 rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] px-2 py-1.5 text-center font-bold" />
                  {valeurs[a.cle].jours === 0 ? 'le jour même' : valeurs[a.cle].jours === 1 ? 'jour avant' : 'jours avant'}
                </label>
                <label className="flex items-center gap-2">
                  Rappel à
                  <input type="time" value={valeurs[a.cle].heure} onChange={e => changer(a.cle, 'heure', e.target.value || a.heure)}
                    className="rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6] px-2 py-1.5 font-bold" />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={valeurs[a.cle].rappel} onChange={e => changer(a.cle, 'rappel', e.target.checked)} className="h-5 w-5 accent-[#1a5f7a]" />
                  Rappel sur téléphone
                </label>
              </div>
            </div>
          ))}
          <p className="text-[12.5px] leading-relaxed text-slate-500">
            Les permanences n'ont que l'annonce et les deux stories. Les bilans gardent leurs règles
            (permanence : 1 h après la fin ; soirée et famille : le lendemain à 9 h).
          </p>
        </div>

        <div className="border-t-2 border-slate-100 p-6">
          <button type="button" onClick={enregistrer} disabled={!valeurs || enregistrement}
            className="flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] py-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[5px_5px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a] disabled:opacity-50">
            {enregistrement ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
