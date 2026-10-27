import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Loader2, Download, FileCheck, ChevronDown, AlertCircle } from 'lucide-react'
import MaskIcon from '../../site/MaskIcon'
import ConfirmModal from '../ConfirmModal'
import VueAgrandie from '../VueAgrandie'
import { supabase } from '../../../services/supabaseClient'
import { useToast } from '../../ToastContext'
import { preparer, repartir, raisons, depasse, numeroEtiquette, PAGE } from '../../../services/etiquettes/regles.js'
import { dessinerPage } from '../../../services/etiquettes/dessin.js'
import { versSvg } from '../../../services/etiquettes/rendu-svg.js'
import { estFichierPerime, rechargerPourNouvelleVersion } from '../../../services/nouvelleVersion.js'

/**
 * Onglet « Code-barres » de la fenêtre Étiquettes : jeux dont l'étiquette n'est pas
 * encore imprimée (tous cochés au départ), aperçu exact des planches A4, PDF.
 * Même disposition que l'onglet QR.
 */
export default function OngletCodeBarres({ jeux, categories, onOuvrirJeu, onChange }) {
  const { addToast } = useToast()
  const categoriesParId = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const aImprimer = useMemo(() => preparer(jeux.filter(j => !j.etiquette_imprimee_le), categoriesParId), [jeux, categoriesParId])
  const bloques = useMemo(() => jeux
    .map(j => ({ jeu: j, r: raisons(j, categoriesParId) }))
    .filter(x => x.r.length > 0 && !x.jeu.etiquette_imprimee_le), [jeux, categoriesParId])

  const [selection, setSelection] = useState(() => new Set(aImprimer.map(e => e.id)))
  // Étiquettes arrivées après l'ouverture (chargement tardif) : cochées d'office ; un décochage manuel est conservé
  const connus = useRef(new Set(aImprimer.map(e => e.id)))
  useEffect(() => {
    const nouveaux = aImprimer.filter(e => !connus.current.has(e.id)).map(e => e.id)
    if (!nouveaux.length) return
    nouveaux.forEach(id => connus.current.add(id))
    setSelection(s => new Set([...s, ...nouveaux]))
  }, [aImprimer])
  const [filtre, setFiltre] = useState('')
  const [voirBloques, setVoirBloques] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [telecharges, setTelecharges] = useState(null) // ids des étiquettes du dernier PDF complet
  const [confirmer, setConfirmer] = useState(false)
  const [agrandie, setAgrandie] = useState(null)

  // Recalculé seulement quand la sélection change (pas à chaque lettre du filtre)
  const choisies = useMemo(() => aImprimer.filter(e => selection.has(e.id)), [aImprimer, selection])
  const pages = useMemo(() => repartir(choisies), [choisies])
  const svgs = useMemo(() => pages.map((p, i) => versSvg(dessinerPage(p, i + 1, pages.length), PAGE.l, PAGE.h)), [pages])
  const visibles = aImprimer.filter(e => e.nom.toLowerCase().includes(filtre.toLowerCase()) || e.numero.includes(filtre))

  const basculer = id => setSelection(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toutCoche = aImprimer.length > 0 && aImprimer.every(e => selection.has(e.id))
  const tout = () => setSelection(toutCoche ? new Set() : new Set(aImprimer.map(e => e.id)))

  async function telecharger(seulementPremiere) {
    setOccupe(true)
    try {
      const { fabriquerPdf } = await import('../../../services/etiquettes/pdf.js')
      const blob = await fabriquerPdf(seulementPremiere ? pages.slice(0, 1) : pages, pages.length)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = seulementPremiere ? 'etiquettes-page-essai.pdf' : `etiquettes-code-barres-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10000)
      if (!seulementPremiere) setTelecharges(choisies.map(e => e.id))
    } catch (e) {
      // Page ouverte avant une mise en ligne : on la recharge pour prendre la nouvelle version
      if (estFichierPerime(e)) {
        addToast('Une nouvelle version du site vient d’être mise en ligne : la page se recharge, recommencez ensuite.', 'warning', 4000)
        setTimeout(() => rechargerPourNouvelleVersion(), 1500)
      } else addToast('Le PDF n’a pas pu être fabriqué : ' + e.message, 'error')
    } finally { setOccupe(false) }
  }

  async function marquer() {
    const ids = telecharges
    const { error } = await supabase.from('games').update({ etiquette_imprimee_le: new Date().toISOString() }).in('id', ids)
    setConfirmer(false)
    if (error) { addToast('Impossible : ' + error.message, 'error'); return }
    addToast(`${ids.length} étiquette${ids.length > 1 ? 's' : ''} marquée${ids.length > 1 ? 's' : ''} comme imprimée${ids.length > 1 ? 's' : ''}.`, 'success')
    setTelecharges(null)
    onChange()
  }

  const BTN = 'flex items-center gap-2 rounded-[18px] border-2 border-[#0f172a] px-5 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-[transform,box-shadow] duration-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none'

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r-2 border-[#0f172a]">
          <p className="px-4 pt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            {aImprimer.length} à imprimer · <span className="text-[#1a5f7a]">{choisies.length} sélectionnée{choisies.length > 1 ? 's' : ''}</span>
          </p>
          <div className="flex shrink-0 items-center gap-2 p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
              <input placeholder="Filtrer..." value={filtre} onChange={e => setFiltre(e.target.value)}
                className="w-full rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] py-2.5 pl-8 pr-3 text-xs font-bold outline-none focus:bg-white" />
            </div>
            <button onClick={tout} className="whitespace-nowrap rounded-[14px] border-2 border-[#0f172a] bg-white px-3 py-2.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-600 transition-colors hover:bg-[#1a5f7a] hover:text-white">
              {toutCoche ? 'Aucun' : 'Tous'}
            </button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">
            {visibles.map(e => (
              <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-[14px] p-2.5 transition-colors hover:bg-slate-50">
                <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 border-[#0f172a] ${selection.has(e.id) ? 'bg-[#1a5f7a]' : 'bg-white'}`}>
                  {selection.has(e.id) && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <input type="checkbox" className="hidden" checked={selection.has(e.id)} onChange={() => basculer(e.id)} />
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[#0f172a]" style={{ background: e.couleur }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800">{e.nom}</span>
                  <span className="text-[9px] text-slate-400">{e.numero}{depasse(e.epaisseur) ? ' · dépasse de la tranche' : ''}</span>
                </span>
              </label>
            ))}
          </div>
          {bloques.length > 0 && (
            <div className="shrink-0 border-t-2 border-[#0f172a]">
              <button onClick={() => setVoirBloques(v => !v)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#e38154]">
                <span className="flex items-center gap-1.5"><AlertCircle size={12} /> {bloques.length} ne peuvent pas encore avoir d'étiquette</span>
                <ChevronDown size={14} className={voirBloques ? 'rotate-180' : ''} />
              </button>
              {voirBloques && (
                <div className="max-h-56 space-y-0.5 overflow-y-auto px-4 pb-4">
                  {bloques.map(({ jeu, r }) => (
                    <button key={jeu.id} onClick={() => onOuvrirJeu(jeu)} className="block w-full rounded-[12px] p-2 text-left hover:bg-[#fdf1ea]">
                      <span className="block truncate text-xs font-bold text-slate-800">{jeu.name}</span>
                      <span className="text-[9px] text-slate-400">{numeroEtiquette(jeu.registration_number)} · {r.join(', ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#fdfaf6] p-6">
          {choisies.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
              <MaskIcon file="ludo-etiquettes.svg" size={56} color="currentColor" />
              <p className="text-xs font-black uppercase tracking-wide">{aImprimer.length === 0 ? 'Toutes les étiquettes sont imprimées' : 'Sélectionnez des jeux'}</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-[10px] font-black uppercase tracking-wide text-slate-400">
                Aperçu — {choisies.length} étiquette{choisies.length > 1 ? 's' : ''} · {pages.length} page{pages.length > 1 ? 's' : ''} · A4 portrait
              </p>
              <div className="space-y-6">
                {svgs.map((svg, i) => (
                  <figure key={i}>
                    <figcaption className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Page {i + 1} / {pages.length}</figcaption>
                    <button type="button" onClick={() => setAgrandie(i)} title="Agrandir"
                      className="block w-full max-w-[560px] border border-slate-300 bg-white shadow-[0_2px_10px_rgba(15,23,42,.12)] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: svg }} />
                  </figure>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t-2 border-[#0f172a] p-6">
        <p className="text-[10px] font-semibold text-slate-400">A4 portrait · étiquettes 42 mm · noms sous chaque rangée · repères de coupe</p>
        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => telecharger(true)} disabled={!choisies.length || occupe} className={`${BTN} bg-white text-[#1a5f7a]`}>Page d'essai</button>
          <button onClick={() => telecharger(false)} disabled={!choisies.length || occupe}
            className={`${BTN} bg-[#1a5f7a] text-white shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]`}>
            {occupe ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Télécharger le PDF
          </button>
          <button onClick={() => setConfirmer(true)} disabled={!telecharges?.length || occupe} className={`${BTN} bg-[#e38154] text-white`}>
            <FileCheck size={16} /> Marquer comme imprimées
          </button>
        </div>
      </div>

      {agrandie !== null && (
        <VueAgrandie images={svgs} index={agrandie} onIndex={setAgrandie} onFermer={() => setAgrandie(null)}
          rendre={i => <div className="h-[86vh] [&>svg]:h-full [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: svgs[i] }} />} />
      )}

      <ConfirmModal
        open={confirmer}
        onClose={() => setConfirmer(false)}
        onConfirm={marquer}
        tone="success"
        title="Étiquettes imprimées ?"
        message={`${telecharges?.length === 1 ? 'L’étiquette du PDF sortira' : `Les ${telecharges?.length ?? 0} étiquettes du PDF sortiront`} de la liste. Une étiquette abîmée pourra être remise dans la liste depuis la fiche du jeu (« Réimprimer l'étiquette »).`}
        confirmLabel="Marquer comme imprimées"
      />
    </>
  )
}
