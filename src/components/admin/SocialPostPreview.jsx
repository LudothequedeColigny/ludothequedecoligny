import { Facebook, Instagram, ImageIcon } from 'lucide-react'

/**
 * Aperçu simulé d'un post Facebook/Instagram — utilisé par l'écran Communication :
 * bilan d'événement, partage d'affiche, « Nouveau post » et « Nouveaux jeux ».
 */
export default function SocialPostPreview({ text, imageUrl, imageUrls }) {
  const urls = imageUrls || (imageUrl ? [imageUrl] : [])
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aperçu</label>
      <div className="relative max-w-[400px] mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <span className="absolute top-3 right-3 z-10 bg-slate-900/70 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
          Aperçu
        </span>

        {/* En-tête */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-[#1a5f7a] text-white flex items-center justify-center font-black text-xs shrink-0">
            LC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight truncate">Ludothèque de Coligny</p>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Facebook size={11} />
              <Instagram size={11} />
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className="relative w-full aspect-square bg-slate-100 flex items-center justify-center">
          {urls.length > 1 && (
            <span className="absolute top-3 left-3 z-10 bg-slate-900/70 text-white text-[9px] font-black px-2 py-1 rounded-full">
              1 / {urls.length}
            </span>
          )}
          {urls.length > 0 ? (
            <img src={urls[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={40} className="text-slate-300" />
          )}
        </div>

        {/* Points du carrousel */}
        {urls.length > 1 && (
          <div className="flex justify-center gap-1 pt-2.5">
            {urls.map((u, i) => (
              <span key={u} className={'h-1.5 w-1.5 rounded-full ' + (i === 0 ? 'bg-[#1a5f7a]' : 'bg-slate-300')} />
            ))}
          </div>
        )}

        {/* Texte */}
        <div className="p-4">
          <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
            {text || 'Votre texte apparaîtra ici...'}
          </p>
        </div>
      </div>
    </div>
  )
}
