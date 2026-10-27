import { useState } from 'react'
import { Search, Loader2, Printer } from 'lucide-react'
import MaskIcon from '../../site/MaskIcon'

// Précharge un QR code en base64 pour l'impression (évite les images manquantes en PDF)
async function fetchQrAsBase64(url) {
  try {
    const resp = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&margin=2`)
    const blob = await resp.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch { return '' }
}

/**
 * Onglet « Vidéo des règles » de la fenêtre Étiquettes : étiquettes QR (A3, 3 × 85 mm)
 * des jeux qui ont une vidéo. Repris tel quel de l'ancien générateur.
 */
export default function OngletQr({ jeux }) {
  const NOM_LUDO = 'Ludothèque de Coligny'
  const jeuxAvecVideo = jeux.filter(j => j.youtube_url?.trim())
  const [selected, setSelected] = useState(new Set(jeuxAvecVideo.map(j => j.id)))
  const [searchFilter, setSearchFilter] = useState('')
  const [printing, setPrinting] = useState(false)

  const filteredJeux = jeuxAvecVideo.filter(j => j.name.toLowerCase().includes(searchFilter.toLowerCase()))
  const jeuxSelectionnes = jeux.filter(j => selected.has(j.id) && j.youtube_url?.trim())

  const toggleAll = () => selected.size === jeuxAvecVideo.length
    ? setSelected(new Set())
    : setSelected(new Set(jeuxAvecVideo.map(j => j.id)))

  const toggleOne = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const handlePrint = async () => {
    setPrinting(true)
    const qrMap = {}
    await Promise.all(jeuxSelectionnes.map(async jeu => { qrMap[jeu.id] = await fetchQrAsBase64(jeu.youtube_url) }))

    const win = window.open('', '_blank')
    if (!win) { setPrinting(false); return }

    // CSS d'impression : A3 portrait, 3×85mm, polices identiques à l'aperçu modale
    // Aperçu modale : 128px = 85mm → scale 1.504 · polices en px = h_ligne × facteur
    // Impression : mêmes proportions, unités mm et pt
    // L1 h=3.81mm → police 8.896pt (11×0.8087)
    // L2 h=6.09mm → police 14.557pt (18×0.8087)
    // L3 h=8.12mm → A3: 8.896pt normal · B3: 8.896pt italic
    // L4 h=19.03mm → A4: 11.322pt italic (14×0.8087)
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Étiquettes QR</title>
<style>
@page{size:A3 portrait;margin:9mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Calibri,'Segoe UI',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.grid{display:grid;grid-template-columns:repeat(3,85mm);column-gap:9.297mm;row-gap:0;width:279mm}
.card{width:85mm;height:36.988mm;display:flex;flex-direction:column;border:0.4pt solid #000;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
.l1{height:3.805mm;min-height:3.805mm;font-size:6.964pt;font-style:italic;text-align:center;display:flex;align-items:center;justify-content:center;line-height:1;overflow:hidden}
.l2{height:6.083mm;min-height:6.083mm;font-size:11.105pt;font-weight:bold;text-align:center;display:flex;align-items:center;justify-content:center;line-height:1;border-bottom:0.4pt solid #000;overflow:hidden}
.l3{height:8.108mm;min-height:8.108mm;display:flex;border-bottom:0.4pt dashed #000;overflow:hidden}
.l3a{width:66.141mm;min-width:66.141mm;font-size:8.094pt;text-align:center;display:flex;align-items:center;justify-content:center;padding:0.332mm 0.664mm;line-height:1.25;border-right:0.4pt dashed #000;overflow:hidden}
.l3b{width:18.727mm;min-width:18.727mm;font-size:8.094pt;font-style:italic;text-align:center;display:flex;align-items:center;justify-content:center;padding:0.332mm;line-height:1.25;overflow:hidden}
.l4{flex:1;display:flex;overflow:hidden}
.l4a{width:66.141mm;min-width:66.141mm;font-size:10.352pt;font-style:italic;text-align:center;display:flex;align-items:center;justify-content:center;padding:0.664mm;line-height:1.25;border-right:0.4pt dashed #000;overflow:hidden;word-break:break-word}
.l4b{width:18.727mm;min-width:18.727mm;display:flex;align-items:center;justify-content:center;padding:0.664mm;overflow:hidden}
.l4b img{width:15.938mm;height:15.938mm;display:block}
</style></head><body>
<div class="grid">
${jeuxSelectionnes.map(jeu => `<div class="card">
  <div class="l1">${NOM_LUDO}</div>
  <div class="l2">${jeu.name}</div>
  <div class="l3">
    <div class="l3a">Les règles de ce jeu sont disponibles en vidéo sur internet en tapant les mots clés suivants :</div>
    <div class="l3b">ou en flashant<br>ce QR Code</div>
  </div>
  <div class="l4">
    <div class="l4a">Ludochrono - ${jeu.name.toLowerCase()}</div>
    <div class="l4b">${qrMap[jeu.id] ? `<img src="${qrMap[jeu.id]}" alt="QR"/>` : ''}</div>
  </div>
</div>`).join('')}
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
    win.document.close()
    setPrinting(false)
  }

  // Aperçu modale : 85mm → 128px (×1.504)
  // Hauteurs en px : L1=5.73 · L2=9.16 · L3=12.21 · L4=28.62
  // Polices : fontSize = hauteur_ligne_px × facteur (pour tenir dans la cellule)
  // L1: 5.73×0.65=3.7px · L2: 9.16×0.65=5.9px · L3: 12.21×0.35=4.3px · L4: 28.62×0.19=5.5px
  const cA = 99.6, cB = 28.2


  return (
    <>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r-2 border-[#0f172a]">
            <p className="px-4 pt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              {jeuxAvecVideo.length} jeu{jeuxAvecVideo.length > 1 ? 'x' : ''} avec vidéo · <span className="text-[#1a5f7a]">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
            </p>
            <div className="p-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
                  <input placeholder="Filtrer..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] py-2.5 pl-8 pr-3 text-xs font-bold outline-none focus:bg-white" />
                </div>
                <button onClick={toggleAll}
                  className="whitespace-nowrap rounded-[14px] border-2 border-[#0f172a] bg-white px-3 py-2.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-600 transition-colors hover:bg-[#1a5f7a] hover:text-white">
                  {selected.size === jeuxAvecVideo.length ? 'Aucun' : 'Tous'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-0.5">
              {filteredJeux.map(jeu => (
                <label key={jeu.id} className="flex cursor-pointer items-center gap-3 rounded-[14px] p-2.5 transition-colors hover:bg-slate-50">
                  <div className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 border-[#0f172a] transition-all ${selected.has(jeu.id) ? 'bg-[#1a5f7a]' : 'bg-white'}`}>
                    {selected.has(jeu.id) && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={selected.has(jeu.id)} onChange={() => toggleOne(jeu.id)} />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-800 truncate">{jeu.name}</div>
                    <div className="text-[9px] text-slate-400">#{jeu.registration_number}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#fdfaf6] p-6">
            {jeuxSelectionnes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                <MaskIcon file="ludo-etiquette-qr.svg" size={56} color="currentColor" />
                <p className="font-black text-xs uppercase tracking-wide">Sélectionnez des jeux</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-4">
                  Aperçu — {jeuxSelectionnes.length} étiquette{jeuxSelectionnes.length > 1 ? 's' : ''} · A3 portrait · 3 × 85mm
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 128px)', columnGap: '14px', rowGap: '0px' }}>
                  {jeuxSelectionnes.map(jeu => (
                    <div key={jeu.id} style={{ width: '128px', height: '55.7px', display: 'flex', flexDirection: 'column', fontFamily: "Calibri,'Segoe UI',Arial,sans-serif", backgroundColor: 'white', border: '1px solid #000', overflow: 'hidden' }}>
                      {/* L1 : h=5.73px · 3.7px */}
                      <div style={{ height: '5.73px', minHeight: '5.73px', fontSize: '3.7px', fontStyle: 'italic', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, overflow: 'hidden' }}>
                        {NOM_LUDO}
                      </div>
                      {/* L2 : h=9.16px · 5.9px · bordure pleine bas */}
                      <div style={{ height: '9.16px', minHeight: '9.16px', fontSize: '5.9px', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, borderBottom: '0.5px solid #000', overflow: 'hidden' }}>
                        {jeu.name}
                      </div>
                      {/* L3 : h=12.21px · bordure pointillée bas */}
                      <div style={{ height: '12.21px', minHeight: '12.21px', display: 'flex', borderBottom: '0.5px dashed #000', overflow: 'hidden' }}>
                        {/* A3 : 4.3px normal */}
                        <div style={{ width: `${cA}px`, minWidth: `${cA}px`, fontSize: '4.3px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5px 1px', lineHeight: 1.25, borderRight: '0.5px dashed #000', overflow: 'hidden' }}>
                          Les règles de ce jeu sont disponibles en vidéo sur internet en tapant les mots clés suivants :
                        </div>
                        {/* B3 : 4.3px italic */}
                        <div style={{ width: `${cB}px`, minWidth: `${cB}px`, fontSize: '4.3px', fontStyle: 'italic', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5px', lineHeight: 1.25, overflow: 'hidden' }}>
                          ou en flashant<br/>ce QR Code
                        </div>
                      </div>
                      {/* L4 : reste · 5.5px italic */}
                      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        <div style={{ width: `${cA}px`, minWidth: `${cA}px`, fontSize: '5.5px', fontStyle: 'italic', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1px', lineHeight: 1.25, borderRight: '0.5px dashed #000', overflow: 'hidden', wordBreak: 'break-word' }}>
                          {`Ludochrono - ${jeu.name.toLowerCase()}`}
                        </div>
                        <div style={{ width: `${cB}px`, minWidth: `${cB}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1px', overflow: 'hidden' }}>
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(jeu.youtube_url)}&margin=2`} alt="QR" style={{ width: '24px', height: '24px', display: 'block' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t-2 border-[#0f172a] p-6">
          <p className="text-[10px] font-semibold text-slate-400">A3 portrait · 3 × 85mm · interstice 9mm · QR pré-chargés</p>
          <button onClick={handlePrint} disabled={jeuxSelectionnes.length === 0 || printing}
            className={`flex items-center gap-2 rounded-[18px] border-2 border-[#0f172a] px-7 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-[transform,box-shadow] duration-200 ${jeuxSelectionnes.length === 0 || printing ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-[#1a5f7a] text-white shadow-[4px_4px_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]'}`}>
            {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {printing ? 'Chargement des QR...' : 'Imprimer les étiquettes'}
          </button>
        </div>
    </>
  )
}
