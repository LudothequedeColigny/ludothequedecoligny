import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Image as ImageIcon, Loader2, Share2, X } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { planCarrousel, planStory, prochainRendezVous, choisirJeux } from '../../../services/diapos/regles'
import { dessinerCarrousel } from '../../../services/diapos/carrousel'
import { dessinerStory } from '../../../services/diapos/story'
import { jaquettesDuBilan, estChezNous } from '../../../services/diapos/jaquettes'
import { versBlob, liberer, viderCache } from '../../../services/diapos/dessin'
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

const ERREUR_APERCU = "L'aperçu n'a pas pu être fabriqué. Réessayez ou rechargez la page."
const ERREUR_CHOIX = "Ce choix n'a pas pu être enregistré. Réessayez dans un instant."
const ERREUR_STORY = "Les images de la story n'ont pas pu être préparées. Réessayez ou rechargez la page."
const PARTAGE_INDISPONIBLE = "Le partage n'est pas disponible : les images ont été téléchargées."

// Signal interne : un aperçu plus récent a été demandé, celui-ci s'arrête
const ABANDON = Symbol('aperçu abandonné')

// Nombre de participants utilisable, ou null (vide, 0 ou illisible : pas de diapositive « nombre »)
const nombreParticipants = v => {
  const n = v === '' || v == null ? NaN : Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

function telecharger(fichiers) {
  for (const f of fichiers) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f)
    a.download = f.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
}

/** Image agrandie, avec passage à la précédente / suivante (flèches, glisser, clavier). */
function VueAgrandie({ images, index, onIndex, onFermer }) {
  const debutToucher = useRef(null)
  const n = images.length
  const aller = i => { if (i >= 0 && i < n) onIndex(i) }

  useEffect(() => {
    const touche = e => {
      if (e.key === 'ArrowLeft') aller(index - 1)
      else if (e.key === 'ArrowRight') aller(index + 1)
      else if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  })

  if (!images[index]) return null
  const fleche = 'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white'
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/85 p-4" onClick={onFermer}
      onTouchStart={e => { debutToucher.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (debutToucher.current == null) return
        const ecart = e.changedTouches[0].clientX - debutToucher.current
        debutToucher.current = null
        if (Math.abs(ecart) > 40) aller(index + (ecart < 0 ? 1 : -1))
      }}>
      <img src={images[index]} alt={`Image ${index + 1} sur ${n}`} onClick={e => e.stopPropagation()}
        className="max-h-[86vh] max-w-full rounded-xl border-2 border-white" />
      <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-black text-white">
        {index + 1} / {n}
      </span>
      <button type="button" onClick={onFermer} aria-label="Fermer"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white">
        <X size={18} />
      </button>
      {index > 0 && (
        <button type="button" onClick={e => { e.stopPropagation(); aller(index - 1) }} aria-label="Image précédente" className={`${fleche} left-3`}>
          <ChevronLeft size={22} />
        </button>
      )}
      {index < n - 1 && (
        <button type="button" onClick={e => { e.stopPropagation(); aller(index + 1) }} aria-label="Image suivante" className={`${fleche} right-3`}>
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  )
}

export default function PublicationBilan({ event, photos, jeux, participants, texte, onTexteChange, texteModifie, onTexteReset, onJeuxChange, onEventChange }) {
  const album = useMemo(() => [...photos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [photos])
  const urls = album.map(p => p.url)
  // Choix enregistrés sur l'événement ; une photo retirée de l'album ne compte plus
  const photoOuverture = urls.includes(event.bilan_photo_ouverture) ? event.bilan_photo_ouverture : null
  const photoJeux = urls.includes(event.bilan_photo_jeux) ? event.bilan_photo_jeux : null
  const [prochain, setProchain] = useState(null)
  // Jaquettes calculées pour une liste de jeux donnée (cle) : à l'ouverture, la liste arrive après coup
  const [jaquettesDe, setJaquettesDe] = useState({ cle: null, map: null })
  const [apercuCarrousel, setApercuCarrousel] = useState([])
  const [apercuStory, setApercuStory] = useState([])
  // Les 4 fichiers JPEG de la story, prêts avant le geste : iPhone n'autorise le partage
  // que tout de suite après le toucher, sans fabrication d'images entre les deux
  const [fichiersStory, setFichiersStory] = useState(null)
  // Plans de l'aperçu affiché : publication et story sont redessinées à partir d'eux
  const [plans, setPlans] = useState(null)
  const [calcul, setCalcul] = useState(false)
  const [agrandie, setAgrandie] = useState(null)
  const [etat, setEtat] = useState('') // '' | 'publication' | 'publie' | 'story'
  const [erreur, setErreur] = useState('')
  const numero = useRef(0)

  // Fenêtre fermée : aperçu en cours abandonné, images chargées oubliées (mémoire des téléphones)
  useEffect(() => () => { numero.current++; viderCache() }, [])

  // Prochain rendez-vous (hors permanences et événements archivés) et jaquettes chez nous
  useEffect(() => {
    let annule = false
    supabase.from('events').select('title, date, location, image_url').gte('date', new Date().toISOString().slice(0, 10))
      .is('archived_at', null).order('date').then(({ data, error }) => {
        // En cas d'échec, la carte affiche « Toutes nos dates »
        if (error) console.warn('Prochain rendez-vous :', error)
        if (!annule) setProchain(prochainRendezVous(data || [], new Date()))
      })
    return () => { annule = true }
  }, [])
  const cleJeux = jeux.map(j => `${j.id}:${j.image_url}`).join(',')
  useEffect(() => {
    let annule = false
    jaquettesDuBilan(jeux, { estAnnule: () => annule }).catch(() => new Map()).then(m => {
      if (annule) return
      setJaquettesDe({ cle: cleJeux, map: m })
      // Jaquettes copiées chez nous : la liste du bilan les reprend, pour ne plus les recopier
      const copiees = new Map(jeux
        .filter(j => m.get(j.id) && m.get(j.id) !== j.image_url && estChezNous(m.get(j.id)) && !estChezNous(j.image_url))
        .map(j => [j.id, { avant: j.image_url, apres: m.get(j.id) }]))
      if (copiees.size) {
        onJeuxChange(prev => prev.map(g => (copiees.get(g.id)?.avant === g.image_url ? { ...g, image_url: copiees.get(g.id).apres } : g)))
      }
    })
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleJeux])
  // null tant que les jaquettes de la liste actuelle ne sont pas prêtes
  const jaquettes = jaquettesDe.cle === cleJeux ? jaquettesDe.map : null

  const donnees = useMemo(() => ({
    event,
    participants: nombreParticipants(participants),
    photos: urls,
    photoOuverture,
    photoJeux,
    jeux: jeux.map(j => ({
      ...j,
      photo_url: urls.includes(j.photo_url) ? j.photo_url : null,
      image: jaquettes?.get(j.id) || j.image_url,
    })),
    prochain,
    maintenant: new Date(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [event, participants, urls.join(','), photoOuverture, photoJeux, jeux, jaquettes, prochain])

  const { ecartes } = choisirJeux(jeux)

  // Aperçu recalculé (avec un court délai) à chaque changement
  useEffect(() => {
    if (!urls.length) { numero.current++; setApercuCarrousel([]); setApercuStory([]); setFichiersStory(null); setPlans(null); setCalcul(false); return }
    // Attendre les jaquettes copiées chez nous : celles de MyLudo ne se dessinent pas (CORS)
    if (!jaquettes) { numero.current++; setCalcul(true); return }
    const n = ++numero.current
    setCalcul(true)
    const minuterie = setTimeout(async () => {
      // Abandon dès qu'un aperçu plus récent est demandé
      const suite = () => { if (n !== numero.current) throw ABANDON }
      try {
        const plan = { carrousel: planCarrousel(donnees), story: planStory(donnees) }
        // Une image à la fois : convertie dès qu'elle est dessinée, puis libérée
        const c = []
        await dessinerCarrousel(plan.carrousel, async canvas => {
          suite()
          c.push(canvas.toDataURL('image/jpeg', 0.9))
        })
        const s = []
        const blobs = []
        await dessinerStory(plan.story, async canvas => {
          suite()
          s.push(canvas.toDataURL('image/jpeg', 0.9))
          blobs.push(await versBlob(canvas))
        })
        suite()
        setApercuCarrousel(c)
        setApercuStory(s)
        setPlans(plan)
        if (blobs.every(Boolean)) {
          setFichiersStory(blobs.map((b, i) => new File([b], `story-${event.id}-${i + 1}.jpg`, { type: 'image/jpeg' })))
          setErreur(e => (e === ERREUR_APERCU || e === ERREUR_STORY ? '' : e))
        } else {
          setFichiersStory(null)
          setErreur(ERREUR_STORY)
        }
      } catch (e) {
        if (e === ABANDON) return
        console.error('Aperçu du bilan :', e)
        if (n === numero.current) setErreur(ERREUR_APERCU)
      } finally {
        if (n === numero.current) setCalcul(false)
      }
    }, 400)
    return () => clearTimeout(minuterie)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donnees])

  // Choix enregistrés tout de suite, annulés si l'enregistrement échoue
  const choisirPhotoEvenement = async (champ, url) => {
    const avant = event[champ] ?? null
    setErreur('')
    onEventChange({ [champ]: url })
    const { error } = await supabase.from('events').update({ [champ]: url }).eq('id', event.id)
    if (error) {
      console.error('Choix de photo :', error)
      onEventChange(e => (e[champ] === url ? { [champ]: avant } : {}))
      setErreur(ERREUR_CHOIX)
    }
  }
  const choisirPhotoDuJeu = async (jeu, url) => {
    const avant = jeu.photo_url ?? null
    setErreur('')
    onJeuxChange(prev => prev.map(j => (j.id === jeu.id ? { ...j, photo_url: url } : j)))
    const { error } = await supabase.from('event_games_played').update({ photo_url: url }).eq('id', jeu.id)
    if (error) {
      console.error('Photo du jeu :', error)
      onJeuxChange(prev => prev.map(j => (j.id === jeu.id && j.photo_url === url ? { ...j, photo_url: avant } : j)))
      setErreur(ERREUR_CHOIX)
    }
  }

  const publier = async () => {
    setEtat('publication')
    setErreur('')
    try {
      const horodatage = Date.now()
      const adresses = []
      // Une diapositive à la fois : dessinée, exportée, libérée, puis envoyée (mémoire des téléphones)
      await dessinerCarrousel(plans.carrousel, async (canvas, i) => {
        const blob = await versBlob(canvas)
        liberer(canvas)
        const url = blob && await uploadSocialBlob(blob, `bilans/${event.id}/carrousel-${horodatage}-${String(i + 1).padStart(2, '0')}.jpg`)
        if (!url) throw new Error('Diapositive non enregistrée')
        adresses.push(url)
      })
      await publierSurReseaux({ message: texte, imageUrls: adresses, extra: { games: jeux.map(j => j.name) } })
      setEtat('publie')
    } catch (e) {
      console.error('Publication du bilan :', e)
      setErreur('La publication a échoué. Réessayez dans un instant.')
      setEtat('')
    }
  }

  // Aucune attente avant navigator.share : les fichiers sont prêts depuis l'aperçu
  const enregistrerStory = async () => {
    const fichiers = fichiersStory
    if (!fichiers) { setErreur(ERREUR_STORY); return }
    setErreur('')
    let partageable = false
    try { partageable = !!navigator.canShare?.({ files: fichiers }) } catch { partageable = false }
    if (!partageable) {
      telecharger(fichiers)
      setErreur(PARTAGE_INDISPONIBLE)
      return
    }
    setEtat('story')
    try {
      await navigator.share({ files: fichiers, title: 'Story du bilan' })
    } catch (e) {
      // Annulé par l'utilisateur : rien à signaler
      if (e?.name !== 'AbortError') {
        console.warn('Partage de la story :', e)
        telecharger(fichiers)
        setErreur(PARTAGE_INDISPONIBLE)
      }
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
          <ChoixPhoto photos={album} valeur={photoOuverture || urls[0]} onChoix={url => choisirPhotoEvenement('bilan_photo_ouverture', url)} />
        </div>
        <div className="space-y-2">
          <p className={SECTION}>Photo « plein de jeux »</p>
          <ChoixPhoto photos={album} valeur={photoJeux || urls.find(u => u !== (photoOuverture || urls[0])) || urls[0]} onChoix={url => choisirPhotoEvenement('bilan_photo_jeux', url)} />
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
              <ChoixPhoto photos={album} valeur={urls.includes(j.photo_url) ? j.photo_url : null} onChoix={url => choisirPhotoDuJeu(j, url)} avecSans />
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
            <button key={i} type="button" onClick={() => setAgrandie({ liste: 'carrousel', index: i })} className="shrink-0">
              <img src={src} alt={`Diapositive ${i + 1}`} className="h-36 rounded-lg border-2 border-[#0f172a]" />
            </button>
          ))}
        </div>
        <p className={SECTION}>Aperçu de la story</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {apercuStory.map((src, i) => (
            <button key={i} type="button" onClick={() => setAgrandie({ liste: 'story', index: i })} className="shrink-0">
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
          <button type="button" onClick={publier} disabled={etat === 'publication' || calcul || !texte.trim() || !plans || !apercuCarrousel.length}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300">
            {etat === 'publication' ? <><Loader2 size={14} className="animate-spin" /> Publication…</> : <><Share2 size={14} /> Publier sur Facebook & Instagram ({apercuCarrousel.length})</>}
          </button>
        )}
        <button type="button" onClick={enregistrerStory} disabled={etat === 'story' || calcul || !apercuStory.length}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0f172a] bg-white py-4 text-[10px] font-black uppercase tracking-widest text-[#1a5f7a] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          {etat === 'story' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Enregistrer la story
        </button>
      </div>

      {agrandie && (
        <VueAgrandie
          images={agrandie.liste === 'story' ? apercuStory : apercuCarrousel}
          index={agrandie.index}
          onIndex={i => setAgrandie(a => ({ ...a, index: i }))}
          onFermer={() => setAgrandie(null)}
        />
      )}
    </div>
  )
}
