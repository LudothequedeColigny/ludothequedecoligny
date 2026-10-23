import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Download, Image as ImageIcon, Loader2, Share2 } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { planCarrousel, planStory, prochainRendezVous, choisirJeux } from '../../../services/diapos/regles'
import { dessinerCarrousel } from '../../../services/diapos/carrousel'
import { dessinerStory } from '../../../services/diapos/story'
import { jaquettesDuBilan } from '../../../services/diapos/jaquettes'
import { versBlob } from '../../../services/diapos/dessin'
import { publierSurReseaux, uploadSocialBlob } from '../../../services/reseauxSociaux'

/**
 * Publication du bilan d'une soirée ou d'un après-midi : choix des photos,
 * aperçu du carrousel (≤ 10 diapositives 4:5) et de la story (4 images 9:16),
 * publication du carrousel via Make, story à enregistrer sur le téléphone.
 * Conception : docs/superpowers/specs/2026-10-23-bilan-automatique-design.md
 */
const SECTION = 'text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1'

function ChoixPhoto({ photos, valeur, onChoix, avecSans }) {
  return (
    <div className="flex flex-wrap gap-2">
      {avecSans && (
        <button type="button" onClick={() => onChoix(null)}
          className={'flex h-14 w-14 items-center justify-center rounded-xl border-2 text-[8px] font-black uppercase text-slate-400 ' +
            (valeur == null ? 'border-[#1a5f7a] ring-2 ring-[#1a5f7a]/30' : 'border-slate-200')}>
          Sans
        </button>
      )}
      {photos.map(p => (
        <button key={p.id} type="button" onClick={() => onChoix(p.url)} aria-pressed={valeur === p.url}
          className={'h-14 w-14 overflow-hidden rounded-xl border-2 ' +
            (valeur === p.url ? 'border-[#1a5f7a] ring-2 ring-[#1a5f7a]/30' : 'border-transparent opacity-60 hover:opacity-100')}>
          <img src={p.url} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  )
}

export default function PublicationBilan({ event, photos, jeux, participants, texte, onTexteChange, texteModifie, onTexteReset, onJeuxChange }) {
  const album = useMemo(() => [...photos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [photos])
  const urls = album.map(p => p.url)
  const [photoOuverture, setPhotoOuverture] = useState(event.bilan_photo_ouverture || null)
  const [photoJeux, setPhotoJeux] = useState(event.bilan_photo_jeux || null)
  const [prochain, setProchain] = useState(null)
  // Jaquettes calculées pour une liste de jeux donnée (cle) : à l'ouverture, la liste arrive après coup
  const [jaquettesDe, setJaquettesDe] = useState({ cle: null, map: null })
  const [apercuCarrousel, setApercuCarrousel] = useState([])
  const [apercuStory, setApercuStory] = useState([])
  const [canvases, setCanvases] = useState({ carrousel: [], story: [] })
  const [calcul, setCalcul] = useState(false)
  const [agrandie, setAgrandie] = useState(null)
  const [etat, setEtat] = useState('') // '' | 'publication' | 'publie' | 'story'
  const [erreur, setErreur] = useState('')
  const numero = useRef(0)

  // Prochain rendez-vous (hors permanences) et jaquettes chez nous
  useEffect(() => {
    let annule = false
    supabase.from('events').select('title, date, location, image_url').gte('date', new Date().toISOString().slice(0, 10))
      .order('date').then(({ data }) => { if (!annule) setProchain(prochainRendezVous(data || [], new Date())) })
    return () => { annule = true }
  }, [])
  const cleJeux = jeux.map(j => `${j.id}:${j.image_url}`).join(',')
  useEffect(() => {
    let annule = false
    jaquettesDuBilan(jeux).catch(() => new Map()).then(m => { if (!annule) setJaquettesDe({ cle: cleJeux, map: m }) })
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleJeux])
  // null tant que les jaquettes de la liste actuelle ne sont pas prêtes
  const jaquettes = jaquettesDe.cle === cleJeux ? jaquettesDe.map : null

  const donnees = useMemo(() => ({
    event,
    participants: participants === '' ? null : Number(participants),
    photos: urls,
    photoOuverture,
    photoJeux,
    jeux: jeux.map(j => ({ ...j, image: jaquettes?.get(j.id) || j.image_url })),
    prochain,
    maintenant: new Date(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [event, participants, urls.join(','), photoOuverture, photoJeux, jeux, jaquettes, prochain])

  const { ecartes } = choisirJeux(jeux)

  // Aperçu recalculé (avec un court délai) à chaque changement
  useEffect(() => {
    if (!urls.length) { setApercuCarrousel([]); setApercuStory([]); return }
    // Attendre les jaquettes copiées chez nous : celles de MyLudo ne se dessinent pas (CORS)
    if (!jaquettes) { numero.current++; setCalcul(true); return }
    const n = ++numero.current
    setCalcul(true)
    const minuterie = setTimeout(async () => {
      const [c, s] = await Promise.all([dessinerCarrousel(planCarrousel(donnees)), dessinerStory(planStory(donnees))])
      if (n !== numero.current) return
      setCanvases({ carrousel: c, story: s })
      setApercuCarrousel(c.map(x => x.toDataURL('image/jpeg', 0.6)))
      setApercuStory(s.map(x => x.toDataURL('image/jpeg', 0.6)))
      setCalcul(false)
    }, 400)
    return () => clearTimeout(minuterie)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donnees])

  const choisirOuverture = async url => {
    setPhotoOuverture(url)
    await supabase.from('events').update({ bilan_photo_ouverture: url }).eq('id', event.id)
  }
  const choisirPhotoJeux = async url => {
    setPhotoJeux(url)
    await supabase.from('events').update({ bilan_photo_jeux: url }).eq('id', event.id)
  }
  const choisirPhotoDuJeu = async (jeu, url) => {
    onJeuxChange(jeux.map(j => (j.id === jeu.id ? { ...j, photo_url: url } : j)))
    await supabase.from('event_games_played').update({ photo_url: url }).eq('id', jeu.id)
  }

  const publier = async () => {
    setEtat('publication')
    setErreur('')
    try {
      const horodatage = Date.now()
      const adresses = []
      // Une à la fois : mémoire des téléphones
      for (let i = 0; i < canvases.carrousel.length; i++) {
        const blob = await versBlob(canvases.carrousel[i])
        const url = blob && await uploadSocialBlob(blob, `bilans/${event.id}/carrousel-${horodatage}-${String(i + 1).padStart(2, '0')}.jpg`)
        if (!url) throw new Error('Diapositive non enregistrée')
        adresses.push(url)
      }
      await publierSurReseaux({ message: texte, imageUrls: adresses, extra: { games: jeux.map(j => j.name) } })
      setEtat('publie')
    } catch (e) {
      console.error('Publication du bilan :', e)
      setErreur('La publication a échoué. Réessayez dans un instant.')
      setEtat('')
    }
  }

  const enregistrerStory = async () => {
    setEtat('story')
    try {
      const fichiers = []
      for (let i = 0; i < canvases.story.length; i++) {
        const blob = await versBlob(canvases.story[i])
        if (blob) fichiers.push(new File([blob], `story-${event.id}-${i + 1}.jpg`, { type: 'image/jpeg' }))
      }
      if (navigator.canShare?.({ files: fichiers })) {
        await navigator.share({ files: fichiers, title: 'Story du bilan' })
      } else {
        for (const f of fichiers) {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(f)
          a.download = f.name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 2000)
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') console.error('Story :', e)
    } finally {
      setEtat(actuel => (actuel === 'story' ? '' : actuel))
    }
  }

  if (!album.length) {
    return <p className="text-[11px] italic text-slate-400 px-1">Ajoutez au moins une photo de l'événement pour fabriquer le carrousel et la story.</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className={SECTION}>Photo d'ouverture</p>
          <ChoixPhoto photos={album} valeur={photoOuverture || urls[0]} onChoix={choisirOuverture} />
        </div>
        <div className="space-y-2">
          <p className={SECTION}>Photo « plein de jeux »</p>
          <ChoixPhoto photos={album} valeur={photoJeux || urls.find(u => u !== (photoOuverture || urls[0])) || urls[0]} onChoix={choisirPhotoJeux} />
        </div>
      </div>

      {jeux.length > 0 && (
        <div className="space-y-3">
          <p className={SECTION}>Une photo pour chaque jeu (ou « sans » : jaquette sur photo floutée)</p>
          {jeux.map(j => (
            <div key={j.id} className="flex flex-wrap items-center gap-3 rounded-[16px] border-2 border-slate-100 p-2.5">
              <div className="flex w-36 shrink-0 items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
                  {j.image_url ? <img src={j.image_url} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon size={16} className="text-slate-300" />}
                </div>
                <span className="text-[11px] font-bold leading-tight text-slate-700">{j.name}</span>
              </div>
              <ChoixPhoto photos={album} valeur={j.photo_url} onChoix={url => choisirPhotoDuJeu(j, url)} avecSans />
            </div>
          ))}
          {ecartes.length > 0 && (
            <p className="rounded-[12px] border-2 border-[#f59e0b] bg-[#fffbeb] px-3 py-2 text-[10.5px] font-semibold text-[#b45309]">
              Le carrousel est limité à 6 jeux : {ecartes.map(j => j.name).join(', ')} n'y figure{ecartes.length > 1 ? 'nt' : ''} pas.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className={SECTION}>Aperçu du carrousel {calcul && <Loader2 size={11} className="ml-1 inline animate-spin" />}</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {apercuCarrousel.map((src, i) => (
            <button key={i} type="button" onClick={() => setAgrandie(src)} className="shrink-0">
              <img src={src} alt={`Diapositive ${i + 1}`} className="h-36 rounded-lg border-2 border-[#0f172a]" />
            </button>
          ))}
        </div>
        <p className={SECTION}>Aperçu de la story</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {apercuStory.map((src, i) => (
            <button key={i} type="button" onClick={() => setAgrandie(src)} className="shrink-0">
              <img src={src} alt={`Story ${i + 1}`} className="h-44 rounded-lg border-2 border-[#0f172a]" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={SECTION}>Texte de la publication</p>
        <textarea rows={7} value={texte} onChange={e => onTexteChange(e.target.value)}
          className="w-full resize-y rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-sm font-medium outline-none focus:bg-white" />
        {texteModifie && (
          <button type="button" onClick={onTexteReset}
            className="ml-1 text-[9px] font-black uppercase tracking-widest text-[#1a5f7a] underline underline-offset-2 hover:text-[#e38154]">
            Remettre le texte proposé
          </button>
        )}
      </div>

      {erreur && <p className="text-center text-[10px] font-bold text-rose-500">{erreur}</p>}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {etat === 'publie' ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[10px] font-black uppercase tracking-widest text-white">
            <CheckCircle2 size={14} /> Publié avec succès !
          </div>
        ) : (
          <button type="button" onClick={publier} disabled={etat === 'publication' || calcul || !texte.trim() || !canvases.carrousel.length}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300">
            {etat === 'publication' ? <><Loader2 size={14} className="animate-spin" /> Publication…</> : <><Share2 size={14} /> Publier le carrousel ({canvases.carrousel.length})</>}
          </button>
        )}
        <button type="button" onClick={enregistrerStory} disabled={etat === 'story' || calcul || !canvases.story.length}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0f172a] bg-white py-4 text-[10px] font-black uppercase tracking-widest text-[#1a5f7a] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          {etat === 'story' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Enregistrer la story
        </button>
      </div>

      {agrandie && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/80 p-4" onClick={() => setAgrandie(null)}>
          <img src={agrandie} alt="" className="max-h-[90vh] max-w-full rounded-xl border-2 border-white" />
        </div>
      )}
    </div>
  )
}
