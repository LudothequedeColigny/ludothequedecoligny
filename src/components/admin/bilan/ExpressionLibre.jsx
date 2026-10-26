import ChoixPhoto from './ChoixPhoto'
import { LONGUEUR_EXPRESSION } from '../../../hooks/useExpressionLibre'

const SECTION = 'text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1'

/**
 * Section « Expression libre (facultatif) » des fenêtres Bilan : une phrase dessinée
 * en une image (vide = pas d'image), sur une photo du bilan ou sur un fond flouté.
 * `photos` = photos du bilan ({ id, url }) ; `aide` = où l'image s'ajoute.
 */
export default function ExpressionLibre({ expression, photos, onTexte, onPhoto, erreur, aide }) {
  const urls = photos.map(p => p.url)
  const photo = urls.includes(expression.photo) ? expression.photo : null
  return (
    <div className="space-y-2">
      <p className={SECTION}>Expression libre (facultatif)</p>
      <textarea rows={3} maxLength={LONGUEUR_EXPRESSION} value={expression.texte} onChange={e => onTexte(e.target.value)}
        placeholder="Peu de participants mais une super ambiance !" aria-label="Expression libre"
        className="w-full resize-none rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-sm font-medium outline-none focus:bg-white" />
      <div className="flex items-start justify-between gap-3 px-1">
        <p className="text-[11px] font-semibold leading-relaxed text-slate-500">{aide}</p>
        <p className="shrink-0 text-[10px] font-black tabular-nums text-slate-400">{expression.texte.length} / {LONGUEUR_EXPRESSION}</p>
      </div>
      <p className={SECTION}>Fond de l'image</p>
      <ChoixPhoto photos={photos} valeur={photo} onChoix={onPhoto} avecSans libelleSans="Fond flouté" />
      {!photos.length && (
        <p className="ml-1 text-[11px] font-semibold text-slate-400">Ajoutez des photos au bilan pour en mettre une en fond.</p>
      )}
      {erreur && <p className="ml-1 text-[10px] font-bold text-rose-500">{erreur}</p>}
    </div>
  )
}
