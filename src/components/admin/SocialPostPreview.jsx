import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Facebook, Instagram, ImageIcon } from 'lucide-react'

/**
 * Aperçu simulé d'un post Facebook/Instagram — utilisé par l'écran Communication :
 * partage d'affiche, « Nouveau post » et « Nouveaux jeux ».
 * Plusieurs images : carrousel qu'on fait défiler comme sur Instagram (glisser
 * du doigt, flèches ou points), avec le compteur « 2 / 9 ».
 * `portrait` : images 4:5 (annonce d'un événement), montrées entières comme sur Instagram.
 */
export default function SocialPostPreview({ text, imageUrl, imageUrls, portrait = false }) {
  const urls = imageUrls || (imageUrl ? [imageUrl] : [])
  const bande = useRef(null)
  const [index, setIndex] = useState(0)
  const plusieurs = urls.length > 1

  // Nouvelle série d'images : retour à la première
  const cle = urls.join('|')
  useEffect(() => {
    setIndex(0)
    bande.current?.scrollTo({ left: 0, behavior: 'instant' })
  }, [cle])

  const allerA = i => {
    const el = bande.current
    if (!el) return
    const cible = Math.max(0, Math.min(urls.length - 1, i))
    el.scrollTo({ left: cible * el.clientWidth, behavior: 'smooth' })
  }

  const auDefilement = () => {
    const el = bande.current
    if (el && el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

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

        {/* Photo(s) */}
        <div className={'relative w-full bg-slate-100 ' + (portrait ? 'aspect-[4/5]' : 'aspect-square')}>
          {urls.length > 0 ? (
            <div
              ref={bande}
              onScroll={auDefilement}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {urls.map((u, i) => (
                <img key={`${i}-${u.slice(-40)}`} src={u} alt={`Image ${i + 1} sur ${urls.length}`}
                  className="h-full w-full shrink-0 snap-center object-cover" draggable={false} />
              ))}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon size={40} className="text-slate-300" />
            </div>
          )}

          {plusieurs && (
            <>
              <span className="absolute top-3 left-3 z-10 bg-slate-900/70 text-white text-[9px] font-black px-2 py-1 rounded-full">
                {index + 1} / {urls.length}
              </span>
              {index > 0 && (
                <button type="button" onClick={() => allerA(index - 1)} aria-label="Image précédente"
                  className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white">
                  <ChevronLeft size={18} />
                </button>
              )}
              {index < urls.length - 1 && (
                <button type="button" onClick={() => allerA(index + 1)} aria-label="Image suivante"
                  className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white">
                  <ChevronRight size={18} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Points du carrousel */}
        {plusieurs && (
          <div className="flex justify-center gap-1 pt-2.5">
            {urls.map((u, i) => (
              <button key={`${i}-${u.slice(-40)}`} type="button" onClick={() => allerA(i)} aria-label={`Aller à l'image ${i + 1}`}
                className={'h-1.5 w-1.5 rounded-full ' + (i === index ? 'bg-[#1a5f7a]' : 'bg-slate-300')} />
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
