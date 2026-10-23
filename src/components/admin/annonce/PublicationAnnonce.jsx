import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Download, Loader2, Share2 } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { typeEvenement, dateLocale } from '../../../services/diapos/regles'
import { textesAnnonce, planAnnonce, planStoryJourJ, dernierEvenementSemblable } from '../../../services/diapos/annonce-regles'
import { dessinerAnnonce, dessinerStoryJourJ } from '../../../services/diapos/annonce'
import { versBlob, liberer, viderCache } from '../../../services/diapos/dessin'
import { publierSurReseaux, uploadSocialBlob } from '../../../services/reseauxSociaux'
import SocialPostPreview from '../SocialPostPreview'
import VueAgrandie from '../VueAgrandie'
import { partagerFichiers } from '../../../services/diapos/partage'

/**
 * Annonce d'un événement à venir : carrousel de 5 images 4:5 au plus (publié via Make)
 * et story du jour J (1 image 9:16, à enregistrer sur le téléphone).
 * Autres événements (permanence, fête du jeu, tournoi…) : une image, l'affiche sur son fond
 * flouté avec une courte phrase modifiable, et la story. Mêmes mécanismes que PublicationBilan.
 * Conception : docs/superpowers/specs/2026-10-23-annonce-evenement-design.md
 */
const SECTION = 'text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1'
const CHAMP_BASE = 'w-full rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] px-3.5 py-2.5 text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white'
const CHAMP = `${CHAMP_BASE} text-[13px] font-bold`
const CHAMP_DETAIL = `${CHAMP_BASE} text-[12px] font-semibold`

const ERREUR_APERCU = "L'aperçu n'a pas pu être fabriqué. Réessayez ou rechargez la page."
const ERREUR_TEXTES = "Ce texte n'a pas pu être enregistré. Réessayez dans un instant."
const ERREUR_TEXTES_FENETRE_FERMEE = "Le texte de l'annonce n'a pas pu être enregistré. Rouvrez l'annonce pour le corriger."
const ERREUR_STORY = "L'image de la story n'a pas pu être préparée. Réessayez ou rechargez la page."
const PARTAGE_INDISPONIBLE = "Le partage n'est pas disponible : l'image a été téléchargée."

// Signal interne : un aperçu plus récent a été demandé, celui-ci s'arrête
const ABANDON = Symbol('aperçu abandonné')
// Délai avant d'enregistrer un texte modifié (le temps de finir de taper)
const DELAI_ENREGISTREMENT = 600
// Événements passés dont on lit les photos à chaque requête (du plus récent au plus ancien)
const PAR_LOT = 5

// Date du jour (« 2026-10-23 ») dans le fuseau de l'appareil, celui de la ludothèque :
// les dates d'événement sont enregistrées sans fuseau
const aujourdhui = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PublicationAnnonce({ event, texte, onTexteChange, onEventChange, onErreur, onPublication }) {
  // Soirée ou après-midi famille : carrousel complet et ses textes
  const avecCarrousel = typeEvenement(event.title) !== 'permanence'
  // Autres événements : une seule image (l'affiche sur son fond flouté), s'il y a une affiche
  const afficheSeule = !avecCarrousel && !!event.image_url
  const avecImages = avecCarrousel || afficheSeule
  // Nombre de jeux de la collection (phrase proposée sous l'affiche) ; undefined pendant le chargement
  const [nbJeux, setNbJeux] = useState(afficheSeule ? undefined : null)
  // Textes modifiés de l'annonce (null = textes proposés) : affichés tout de suite,
  // enregistrés sur l'événement après un court délai
  const [annonce, setAnnonce] = useState(event.annonce ?? null)
  const enregistree = useRef(event.annonce ?? null)
  const enAttente = useRef(null) // { minuterie, valeur } : enregistrement programmé
  const monte = useRef(true) // fenêtre encore ouverte
  // Dernier événement passé du même genre (photos des diapositives) ; undefined pendant le chargement
  const [passe, setPasse] = useState(undefined)
  const [apercuAnnonce, setApercuAnnonce] = useState([])
  // Plan de l'aperçu affiché : la publication est redessinée à partir de lui
  const [planCarrousel, setPlanCarrousel] = useState(null)
  const [apercuStory, setApercuStory] = useState([])
  // Fichier JPEG de la story, prêt avant le geste : iPhone n'autorise le partage
  // que tout de suite après le toucher, sans fabrication d'image entre les deux
  const [fichiersStory, setFichiersStory] = useState(null)
  const [calculAnnonce, setCalculAnnonce] = useState(avecImages)
  const [calculStory, setCalculStory] = useState(true)
  const [agrandie, setAgrandie] = useState(null)
  const [etat, setEtat] = useState('') // '' | 'publication' | 'publie' | 'story'
  const [erreur, setErreur] = useState('') // aperçu, publication, story
  const [erreurTexte, setErreurTexte] = useState('') // enregistrement des textes
  // Numéros des aperçus demandés : un aperçu dépassé par un plus récent s'arrête
  const numeros = useRef({ annonce: 0, story: 0 })
  // Une fabrication d'images à la fois (carrousel, story) : mémoire des téléphones
  const fileAttente = useRef(Promise.resolve())
  const aLaSuite = tache => {
    const p = fileAttente.current.then(tache)
    fileAttente.current = p.catch(() => {})
    return p
  }
  // Enregistrements des textes : l'un après l'autre, dans l'ordre de la saisie
  const sauvegardes = useRef(Promise.resolve())
  const derniereSauvegarde = useRef(0)

  const enregistrer = valeur => {
    const demande = ++derniereSauvegarde.current
    const p = sauvegardes.current.then(() => enregistrerMaintenant(valeur, demande))
    // Un échec imprévu ne doit pas bloquer les enregistrements suivants
    sauvegardes.current = p.catch(() => {})
    return p
  }
  // Texte enregistré sur l'événement ; en cas d'échec, retour à la valeur précédente
  const enregistrerMaintenant = async (valeur, demande) => {
    const avant = enregistree.current
    if (JSON.stringify(avant) === JSON.stringify(valeur)) return
    enregistree.current = valeur
    onEventChange({ annonce: valeur })
    const { error } = await supabase.from('events').update({ annonce: valeur }).eq('id', event.id)
    if (error) {
      console.error("Textes de l'annonce :", error)
      if (enregistree.current === valeur) {
        enregistree.current = avant
        setAnnonce(a => (a === valeur ? avant : a))
        onEventChange(e => (e.annonce === valeur ? { annonce: avant } : {}))
      }
      // Une saisie plus récente suit et sera enregistrée à son tour : pas de message
      if (demande !== derniereSauvegarde.current) return
      // Fenêtre déjà fermée : le message passe par l'écran Communication
      if (monte.current) setErreurTexte(ERREUR_TEXTES)
      else onErreur?.(ERREUR_TEXTES_FENETRE_FERMEE)
    } else if (demande === derniereSauvegarde.current && monte.current) {
      setErreurTexte('')
    }
  }

  // Fenêtre fermée : texte en attente enregistré, aperçus en cours abandonnés,
  // images chargées oubliées (mémoire des téléphones)
  useEffect(() => {
    monte.current = true
    const n = numeros.current
    return () => {
      monte.current = false
      n.annonce++
      n.story++
      viderCache()
      const attente = enAttente.current
      if (attente) {
        clearTimeout(attente.minuterie)
        enAttente.current = null
        enregistrer(attente.valeur)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Événements passés (archivés compris) et leurs photos : le plus récent du même genre
  // illustre les diapositives « Ce qui vous attend », « Infos » et « La dernière fois »
  useEffect(() => {
    let annule = false
    ;(async () => {
      try {
        const { data: evs, error } = await supabase.from('events')
          .select('id, title, date, participants_count, bilan_photo_ouverture').lt('date', aujourdhui())
        if (error) throw error
        const genre = typeEvenement(event.title)
        const avant = dateLocale(event.date)
        const candidats = (evs || [])
          .filter(p => p.id !== event.id && typeEvenement(p.title) === genre && Number(p.participants_count) > 0 && dateLocale(p.date) < avant)
          .sort((a, b) => dateLocale(b.date) - dateLocale(a.date))
        // Photos lues par petits lots, du plus récent au plus ancien : on s'arrête au premier
        // événement qui en a (sans limite de nombre de lignes atteinte par l'album entier)
        let trouve = null
        for (let i = 0; i < candidats.length && !trouve && !annule; i += PAR_LOT) {
          const lot = candidats.slice(i, i + PAR_LOT)
          const { data, error: errPhotos } = await supabase.from('event_photos')
            .select('event_id, url').in('event_id', lot.map(p => p.id)).order('created_at')
          if (errPhotos) throw errPhotos
          const passes = lot.map(p => ({ ...p, photos: (data || []).filter(ph => ph.event_id === p.id).map(ph => ph.url) }))
          trouve = dernierEvenementSemblable(event, passes)
        }
        if (!annule) setPasse(trouve)
      } catch (e) {
        // Sans le passé : diapositives sur l'affiche floutée, sans « La dernière fois »
        console.warn('Événements passés :', e)
        if (!annule) setPasse(null)
      }
    })()
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  // Nombre de jeux, pour la phrase proposée sous l'affiche (sans lui : phrase sans chiffre)
  useEffect(() => {
    if (!afficheSeule) return
    let annule = false
    supabase.from('games').select('id', { count: 'exact', head: true }).then(({ count, error }) => {
      if (error) console.warn('Nombre de jeux :', error)
      if (!annule) setNbJeux(error ? null : count)
    })
    return () => { annule = true }
  }, [afficheSeule])

  // Ce qui est dessiné : la story ne dépend pas des textes, le carrousel si
  const evenementStory = useMemo(() => ({
    id: event.id, title: event.title, date: event.date, end_time: event.end_time,
    location: event.location, image_url: event.image_url,
  }), [event.id, event.title, event.date, event.end_time, event.location, event.image_url])
  const evenement = useMemo(() => ({ ...evenementStory, annonce }), [evenementStory, annonce])
  const textes = textesAnnonce(evenement, nbJeux)

  // Aperçu du carrousel recalculé (avec un court délai) à chaque changement
  useEffect(() => {
    if (!avecImages) return
    if (passe === undefined || nbJeux === undefined) { numeros.current.annonce++; setCalculAnnonce(true); return }
    const n = ++numeros.current.annonce
    setCalculAnnonce(true)
    const minuterie = setTimeout(() => aLaSuite(async () => {
      // Abandon dès qu'un aperçu plus récent est demandé
      const suite = () => { if (n !== numeros.current.annonce) throw ABANDON }
      try {
        suite()
        const plan = planAnnonce({ event: evenement, passe, nbJeux })
        // Une image à la fois : convertie dès qu'elle est dessinée, puis libérée
        const a = []
        await dessinerAnnonce(plan, async canvas => {
          suite()
          a.push(canvas.toDataURL('image/jpeg', 0.9))
        })
        suite()
        setApercuAnnonce(a)
        setPlanCarrousel(plan)
        setErreur(e => (e === ERREUR_APERCU ? '' : e))
      } catch (e) {
        if (e === ABANDON) return
        console.error("Aperçu de l'annonce :", e)
        if (n === numeros.current.annonce) setErreur(ERREUR_APERCU)
      } finally {
        if (n === numeros.current.annonce) setCalculAnnonce(false)
      }
    }), 400)
    return () => clearTimeout(minuterie)
  }, [evenement, passe, nbJeux, avecImages])

  // Story (et son fichier prêt à partager) : redessinée seulement si ce qu'elle montre change
  useEffect(() => {
    if (passe === undefined) { numeros.current.story++; setCalculStory(true); return }
    const n = ++numeros.current.story
    setCalculStory(true)
    const minuterie = setTimeout(() => aLaSuite(async () => {
      const suite = () => { if (n !== numeros.current.story) throw ABANDON }
      try {
        suite()
        const s = []
        const blobs = []
        await dessinerStoryJourJ(planStoryJourJ({ event: evenementStory, passe }), async canvas => {
          suite()
          s.push(canvas.toDataURL('image/jpeg', 0.9))
          blobs.push(await versBlob(canvas))
        })
        suite()
        setApercuStory(s)
        if (blobs.length && blobs.every(Boolean)) {
          setFichiersStory(blobs.map(b => new File([b], `story-jour-j-${evenementStory.id}.jpg`, { type: 'image/jpeg' })))
          setErreur(e => (e === ERREUR_STORY ? '' : e))
        } else {
          setFichiersStory(null)
          setErreur(ERREUR_STORY)
        }
      } catch (e) {
        if (e === ABANDON) return
        console.error('Aperçu de la story :', e)
        if (n === numeros.current.story) setErreur(ERREUR_STORY)
      } finally {
        if (n === numeros.current.story) setCalculStory(false)
      }
    }), 400)
    return () => clearTimeout(minuterie)
  }, [evenementStory, passe])

  // Modification d'un texte : visible tout de suite, enregistrée après un court délai
  const changerTextes = modifier => {
    const valeur = modifier(textes)
    setAnnonce(valeur)
    setErreurTexte('')
    if (enAttente.current) clearTimeout(enAttente.current.minuterie)
    const minuterie = setTimeout(() => { enAttente.current = null; enregistrer(valeur) }, DELAI_ENREGISTREMENT)
    enAttente.current = { minuterie, valeur }
  }
  const remettreTextes = () => {
    if (enAttente.current) clearTimeout(enAttente.current.minuterie)
    enAttente.current = null
    setAnnonce(null)
    setErreurTexte('')
    enregistrer(null)
  }
  const changerPoint = (i, v) => changerTextes(t => ({ ...t, points: t.points.map((p, j) => (j === i ? v : p)) }))
  const changerInfo = (i, champ, v) => changerTextes(t => ({ ...t, infos: t.infos.map((x, j) => (j === i ? { ...x, [champ]: v } : x)) }))

  // Carrousel (ou affiche seule) : une image à la fois, dessinée, exportée, libérée, puis envoyée
  // (mémoire des téléphones) ; publié tel que montré dans l'aperçu
  const envoyerCarrousel = async () => {
    const horodatage = Date.now()
    const adresses = []
    await dessinerAnnonce(planCarrousel, async (canvas, i) => {
      const blob = await versBlob(canvas)
      liberer(canvas)
      const url = blob && await uploadSocialBlob(blob, `annonces/${event.id}/annonce-${horodatage}-${String(i + 1).padStart(2, '0')}.jpg`)
      if (!url) throw new Error('Diapositive non enregistrée')
      adresses.push(url)
    })
    return adresses
  }

  const publier = async () => {
    setEtat('publication')
    setErreur('')
    onPublication?.(true)
    try {
      // À la suite des aperçus en cours : une seule fabrication d'images à la fois
      const adresses = await aLaSuite(envoyerCarrousel)
      await publierSurReseaux({
        message: texte,
        imageUrls: adresses,
        extra: { event_title: event.title || '', event_date: event.date || '', event_location: event.location || '' },
      })
      // Date de publication : arrête les rappels sur les téléphones (check-events-notify).
      // Un échec ici ne change rien à la publication, déjà partie.
      try {
        const publieLe = new Date().toISOString()
        const { error: errDate } = await supabase.from('events').update({ annonce_publiee_le: publieLe }).eq('id', event.id)
        if (errDate) console.warn('Date de publication non enregistrée :', errDate)
        else onEventChange?.({ annonce_publiee_le: publieLe })
      } catch (errDate) {
        console.warn('Date de publication non enregistrée :', errDate)
      }
      setEtat('publie')
    } catch (e) {
      console.error("Publication de l'annonce :", e)
      setErreur('La publication a échoué. Réessayez dans un instant.')
      setEtat('')
    } finally {
      onPublication?.(false)
    }
  }

  // Aucune attente avant le partage : le fichier est prêt depuis l'aperçu
  const enregistrerStory = async () => {
    const fichiers = fichiersStory
    if (!fichiers) { setErreur(ERREUR_STORY); return }
    setErreur('')
    setEtat('story')
    try {
      if ((await partagerFichiers(fichiers, 'Story du jour J')) === 'telecharge') setErreur(PARTAGE_INDISPONIBLE)
    } finally {
      setEtat(actuel => (actuel === 'story' ? '' : actuel))
    }
  }

  const story = (
    <div className="space-y-2">
      <p className={SECTION}>Story du jour J {calculStory && <Loader2 size={11} className="ml-1 inline animate-spin" />}</p>
      <div className="flex items-start gap-3">
        {apercuStory.length > 0 ? (
          <button type="button" onClick={() => setAgrandie(0)} className="shrink-0" aria-label="Agrandir la story">
            <img src={apercuStory[0]} alt="Story du jour J" className="h-48 rounded-lg border-2 border-[#0f172a]" />
          </button>
        ) : (
          <div className="flex h-48 w-[108px] shrink-0 items-center justify-center rounded-lg border-2 border-slate-200 bg-slate-50">
            <Loader2 size={18} className="animate-spin text-slate-300" />
          </div>
        )}
        <p className="pt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
          À enregistrer sur le téléphone, puis à publier en story Instagram ou Facebook le jour même.
        </p>
      </div>
    </div>
  )

  const blocTexte = (
    <div className="space-y-2">
      <p className={SECTION}>Texte de la publication</p>
      <textarea rows={8} value={texte} onChange={e => onTexteChange(e.target.value)}
        className="w-full resize-y rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-sm font-medium outline-none focus:bg-white" />
    </div>
  )

  const remiseTextes = (
    <>
      {/* Près des champs : en bas de la fenêtre, le message passerait inaperçu */}
      {erreurTexte && <p className="ml-1 text-[10px] font-bold text-rose-500">{erreurTexte}</p>}
      {annonce !== null && (
        <button type="button" onClick={remettreTextes}
          className="ml-1 text-[9px] font-black uppercase tracking-widest text-[#1a5f7a] underline underline-offset-2 hover:text-[#e38154]">
          Remettre {avecCarrousel ? 'les textes proposés' : 'la phrase proposée'}
        </button>
      )}
    </>
  )

  const apercu = (
    <div className="space-y-1">
      <SocialPostPreview text={texte} imageUrls={apercuAnnonce} portrait />
      <p className="h-4 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">
        {calculAnnonce && <><Loader2 size={10} className="mr-1 inline animate-spin" /> Mise à jour de l'aperçu…</>}
      </p>
    </div>
  )

  const boutonStory = (
    <button type="button" onClick={enregistrerStory} disabled={etat === 'story' || calculStory || !fichiersStory}
      className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0f172a] bg-white py-4 text-[10px] font-black uppercase tracking-widest text-[#1a5f7a] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
      {etat === 'story' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Enregistrer la story du jour J
    </button>
  )

  return (
    <div className="space-y-5">
      {avecCarrousel ? (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className={SECTION}>« Ce qui vous attend »</p>
              <input type="text" value={textes.titre} onChange={e => changerTextes(t => ({ ...t, titre: e.target.value }))}
                aria-label="Titre de « Ce qui vous attend »" placeholder="Titre" className={CHAMP} />
              {textes.points.map((p, i) => (
                <input key={i} type="text" value={p} onChange={e => changerPoint(i, e.target.value)}
                  aria-label={`Point ${i + 1}`} placeholder={`Point ${i + 1} (vide : retiré)`} className={CHAMP} />
              ))}
            </div>

            <div className="space-y-2">
              <p className={SECTION}>Infos pratiques (en plus de la date et du lieu)</p>
              {textes.infos.map((x, i) => (
                <div key={i} className="grid gap-1.5 rounded-[16px] border-2 border-slate-100 p-2">
                  <input type="text" value={x.titre} onChange={e => changerInfo(i, 'titre', e.target.value)}
                    aria-label={`Info ${i + 1} : titre`} placeholder="Titre (vide : ligne retirée)" className={CHAMP} />
                  <input type="text" value={x.detail} onChange={e => changerInfo(i, 'detail', e.target.value)}
                    aria-label={`Info ${i + 1} : détail`} placeholder="Détail" className={CHAMP_DETAIL} />
                </div>
              ))}
            </div>

            {remiseTextes}

            {blocTexte}
          </div>

          <div className="space-y-5">
            {apercu}
            {story}
          </div>
        </div>
      ) : (
        <>
          <p className="rounded-[12px] border-2 border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
            {afficheSeule
              ? "Pour cet événement, pas de carrousel d'annonce : une seule image est publiée (l'affiche sur son fond flouté, avec une courte phrase), et la story du jour J est à enregistrer."
              : "Pour cet événement, pas de carrousel d'annonce : seule la story du jour J est proposée."}
          </p>
          {afficheSeule ? (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className={SECTION}>Phrase sous l'affiche</p>
                  <input type="text" value={nbJeux === undefined && annonce === null ? '' : textes.phrase}
                    onChange={e => changerTextes(() => ({ phrase: e.target.value }))}
                    aria-label="Phrase sous l'affiche" placeholder="Phrase (vide : pas de phrase)" className={CHAMP} />
                </div>
                {remiseTextes}
                {blocTexte}
              </div>
              <div className="space-y-5">
                {apercu}
                {story}
              </div>
            </div>
          ) : story}
        </>
      )}

      {erreur && <p className="text-center text-[10px] font-bold text-rose-500">{erreur}</p>}
      <div className={'grid gap-2.5' + (avecImages ? ' sm:grid-cols-2' : '')}>
        {avecImages && (etat === 'publie' ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[10px] font-black uppercase tracking-widest text-white">
            <CheckCircle2 size={14} /> Publié avec succès !
          </div>
        ) : (
          <button type="button" onClick={publier} disabled={etat === 'publication' || !texte.trim() || calculAnnonce || !planCarrousel || !apercuAnnonce.length}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300">
            {etat === 'publication' ? <><Loader2 size={14} className="animate-spin" /> Publication…</> : <><Share2 size={14} /> Publier sur Facebook & Instagram ({apercuAnnonce.length})</>}
          </button>
        ))}
        {boutonStory}
      </div>

      {agrandie != null && (
        <VueAgrandie images={apercuStory} index={agrandie} onIndex={setAgrandie} onFermer={() => setAgrandie(null)} />
      )}
    </div>
  )
}
