import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Share2 } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { dateLocale } from '../../../services/diapos/regles'
import {
  prochainePermanence, planBilanPermanence, texteBilanPermanence, pretsPartis, jeuxDistincts, jourComplet,
} from '../../../services/diapos/permanence-regles'
import { dessinerBilanPermanence } from '../../../services/diapos/permanence'
import { versBlob, liberer, viderCache } from '../../../services/diapos/dessin'
import { estChezNous } from '../../../services/diapos/jaquettes'
import { publierSurReseaux, uploadSocialBlob } from '../../../services/reseauxSociaux'
import SocialPostPreview from '../SocialPostPreview'
import ExpressionLibre from './ExpressionLibre'
import useExpressionLibre, { expressionPourApercu } from '../../../hooks/useExpressionLibre'

/**
 * Bilan d'une permanence passée : carrousel de 3 images 4:5 (nombre de prêts, jeux
 * empruntés, prochaine permanence), plus l'expression libre s'il y en a une
 * (avant « Prochaine permanence »), publié via Make. Pas de story.
 * Seuls les jeux sont lus (jamais qui a emprunté quoi).
 * Conception : docs/superpowers/specs/2026-10-23-bilan-permanence-design.md
 */
const SECTION = 'text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1'

const ERREUR_PRETS = "Les prêts n'ont pas pu être lus. Réessayez ou rechargez la page."
const ERREUR_APERCU = "L'aperçu n'a pas pu être fabriqué. Réessayez ou rechargez la page."
const ERREUR_PUBLICATION = 'La publication a échoué. Réessayez dans un instant.'

// Signal interne : la fenêtre a été fermée, l'aperçu en cours s'arrête
const ABANDON = Symbol('aperçu abandonné')

// « samedi 3 octobre »
const jourDeLaPermanence = date => {
  const j = jourComplet(dateLocale(date))
  return j.charAt(0).toLowerCase() + j.slice(1)
}

export default function PublicationBilanPermanence({ event, photos = [], onPublication, onEventChange, onErreur }) {
  // Photos du bilan, de la plus ancienne à la plus récente (fond de l'expression libre)
  const album = useMemo(() => [...photos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [photos])
  const urls = album.map(p => p.url)
  // undefined pendant la lecture ; null si les prêts n'ont pas pu être lus
  const [donnees, setDonnees] = useState(undefined) // { prets (empruntés), nbJeux, prochaine }
  // Texte retouché par le bénévole (null = texte proposé)
  const [texteSaisi, setTexteSaisi] = useState(null)
  const [apercu, setApercu] = useState([])
  // Plan de l'aperçu affiché : la publication redessine celui-là
  const [plan, setPlan] = useState(null)
  const [calcul, setCalcul] = useState(false)
  const [etat, setEtat] = useState('') // '' | 'publication' | 'publie'
  const [erreur, setErreur] = useState('')
  // Numéro de l'aperçu demandé : changé à la fermeture, l'aperçu en cours s'arrête
  const numero = useRef(0)
  // Phrase libre : affichée tout de suite, enregistrée sur l'événement après un court délai
  const { expression, changerTexte, changerPhoto, erreur: erreurExpression } = useExpressionLibre(event, onEventChange, onErreur)
  const libre = expressionPourApercu(expression, urls)
  const cleLibre = JSON.stringify(libre)
  // Une fabrication d'images à la fois (aperçu, publication) : mémoire des téléphones
  const fileAttente = useRef(Promise.resolve())
  const aLaSuite = tache => {
    const p = fileAttente.current.then(tache)
    fileAttente.current = p.catch(() => {})
    return p
  }

  // Fenêtre fermée : aperçu en cours abandonné, images chargées oubliées
  useEffect(() => {
    const n = numero
    return () => {
      n.current++
      viderCache()
    }
  }, [])

  // Prêts du jour (en cours et rendus) et prochaine permanence : lectures seules
  useEffect(() => {
    let annule = false
    setDonnees(undefined)
    ;(async () => {
      const jour = String(event.date).slice(0, 10)
      // Jamais de donnée d'adhérent : le jeu et les dates seulement
      const champsEnCours = 'game_id, loan_date, games(id, name, image_url)'
      const champsRendus = 'game_id, loan_date, return_date, games(id, name, image_url)'
      try {
        const [enCours, rendus, evs, reglages] = await Promise.all([
          supabase.from('loans').select(champsEnCours).eq('loan_date', jour),
          supabase.from('loan_history').select(champsRendus).eq('loan_date', jour),
          supabase.from('events').select('title, date, end_time, location, archived_at')
            .ilike('title', '%permanence%').is('archived_at', null).order('date'),
          supabase.from('settings').select('id, value').or('id.like.horaire_%,id.like.adresse_%'),
        ])
        if (annule) return
        if (enCours.error || rendus.error) throw enCours.error || rendus.error
        // Sans événements ni Paramètres : prochaine permanence calculée avec ce qui a été lu
        if (evs.error) console.warn('Prochaine permanence (événements) :', evs.error)
        if (reglages.error) console.warn('Prochaine permanence (Paramètres) :', reglages.error)
        let prochaine = null
        try {
          const horaires = Object.fromEntries((reglages.error ? [] : reglages.data || []).map(s => [s.id, s.value]))
          prochaine = prochainePermanence({
            evenements: evs.error ? [] : evs.data || [], horaires, maintenant: new Date(),
          })
        } catch (e) {
          // Carte « Bientôt : surveillez nos publications »
          console.warn('Prochaine permanence :', e)
        }
        // Un jeu rendu le jour même n'est pas compté ; jaquette hébergée ailleurs (MyLudo) :
        // interdite dans un canvas, case avec le nom seul
        const prets = pretsPartis([...(enCours.data || []), ...(rendus.data || [])]).map(p => (
          p.games && p.games.image_url && !estChezNous(p.games.image_url)
            ? { ...p, games: { ...p.games, image_url: null } }
            : p
        ))
        setDonnees({ prets, nbJeux: jeuxDistincts(prets).length, prochaine })
      } catch (e) {
        if (annule) return
        console.error('Prêts de la permanence :', e)
        setDonnees(null)
      }
    })()
    return () => { annule = true }
  }, [event.id, event.date])

  const nbJeux = donnees?.nbJeux
  const textePropose = useMemo(
    () => (donnees ? texteBilanPermanence({ event, prets: donnees.prets, prochaine: donnees.prochaine }) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [donnees],
  )
  const texte = texteSaisi ?? textePropose

  // Aperçu : les images exactes, dessinées une à une ; après un court délai,
  // pour que l'expression libre ne soit pas redessinée à chaque lettre
  useEffect(() => {
    if (!donnees || !donnees.nbJeux) return
    const n = ++numero.current
    setCalcul(true)
    const minuterie = setTimeout(() => aLaSuite(async () => {
      const suite = () => { if (n !== numero.current) throw ABANDON }
      try {
        suite()
        const p = planBilanPermanence({ event, prets: donnees.prets, prochaine: donnees.prochaine, expression: libre, photos: urls })
        const a = []
        await dessinerBilanPermanence(p, async canvas => {
          suite()
          a.push(canvas.toDataURL('image/jpeg', 0.9))
        })
        suite()
        setApercu(a)
        setPlan(p)
        setErreur(e => (e === ERREUR_APERCU ? '' : e))
      } catch (e) {
        if (e === ABANDON) return
        console.error('Aperçu du bilan de permanence :', e)
        if (n === numero.current) setErreur(ERREUR_APERCU)
      } finally {
        if (n === numero.current) setCalcul(false)
      }
    }), 400)
    return () => clearTimeout(minuterie)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donnees, cleLibre])

  // Une image à la fois : dessinée, exportée, libérée, puis déposée chez nous
  // (Make n'accepte que nos adresses) ; publiée telle que montrée dans l'aperçu
  const envoyerImages = async () => {
    const horodatage = Date.now()
    const adresses = []
    await dessinerBilanPermanence(plan, async (canvas, i) => {
      const blob = await versBlob(canvas)
      liberer(canvas)
      const url = blob && await uploadSocialBlob(blob, `bilans/${event.id}/permanence-${horodatage}-${String(i + 1).padStart(2, '0')}.jpg`)
      if (!url) throw new Error('Image non enregistrée')
      adresses.push(url)
    })
    return adresses
  }

  const publier = async () => {
    setEtat('publication')
    setErreur('')
    onPublication?.(true)
    try {
      const adresses = await aLaSuite(envoyerImages)
      await publierSurReseaux({
        message: texte,
        imageUrls: adresses,
        extra: { event_title: event.title || '', event_date: event.date || '', event_location: event.location || '' },
      })
      // Date de publication : arrête les rappels sur les téléphones (check-events-notify).
      // Un échec ici ne change rien à la publication, déjà partie.
      try {
        const publieLe = new Date().toISOString()
        const { error: errDate } = await supabase.from('events').update({ bilan_publie_le: publieLe }).eq('id', event.id)
        if (errDate) console.warn('Date de publication non enregistrée :', errDate)
        else onEventChange?.({ bilan_publie_le: publieLe })
      } catch (errDate) {
        console.warn('Date de publication non enregistrée :', errDate)
      }
      setEtat('publie')
    } catch (e) {
      console.error('Publication du bilan de permanence :', e)
      setErreur(ERREUR_PUBLICATION)
      setEtat('')
    } finally {
      onPublication?.(false)
    }
  }

  if (donnees === undefined) {
    return (
      <p className="flex items-center gap-2 px-1 text-[11px] font-semibold text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Lecture des prêts…
      </p>
    )
  }
  if (donnees === null) {
    return <p className="px-1 text-[11px] font-bold text-rose-500">{ERREUR_PRETS}</p>
  }
  if (!nbJeux) {
    return (
      <p className="rounded-[12px] border-2 border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
        Aucun prêt enregistré à la date de cette permanence : pas de bilan à publier.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-2">
          <p className={SECTION}>Texte de la publication</p>
          <textarea rows={12} value={texte} onChange={e => setTexteSaisi(e.target.value)}
            className="w-full resize-y rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-sm font-medium outline-none focus:bg-white" />
          {texteSaisi !== null && (
            <button type="button" onClick={() => setTexteSaisi(null)}
              className="ml-1 text-[9px] font-black uppercase tracking-widest text-[#1a5f7a] underline underline-offset-2 hover:text-[#e38154]">
              Remettre le texte proposé
            </button>
          )}
          <p className="ml-1 text-[11px] font-semibold leading-relaxed text-slate-500">
            Les prêts sont retrouvés par leur date : {nbJeux} {nbJeux === 1 ? 'jeu emprunté' : 'jeux empruntés'} le {jourDeLaPermanence(event.date)} (un jeu rendu le jour même n'est pas compté).
          </p>
          <div className="pt-3">
            <ExpressionLibre expression={expression} photos={album} onTexte={changerTexte} onPhoto={changerPhoto} erreur={erreurExpression}
              aide={"S'ajoute juste avant «\u00a0Prochaine permanence\u00a0»."} />
          </div>
        </div>

        <div className="space-y-1">
          <SocialPostPreview text={texte} imageUrls={apercu} portrait />
          <p className="h-4 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">
            {calcul && <><Loader2 size={10} className="mr-1 inline animate-spin" /> Mise à jour de l'aperçu…</>}
          </p>
        </div>
      </div>

      {erreur && <p className="text-center text-[10px] font-bold text-rose-500">{erreur}</p>}
      {etat === 'publie' ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[10px] font-black uppercase tracking-widest text-white">
          <CheckCircle2 size={14} /> Publié avec succès !
        </div>
      ) : (
        <button type="button" onClick={publier} disabled={etat === 'publication' || !texte.trim() || calcul || !plan || !apercu.length}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300">
          {etat === 'publication' ? <><Loader2 size={14} className="animate-spin" /> Publication…</> : <><Share2 size={14} /> Publier sur Facebook & Instagram ({apercu.length || 3})</>}
        </button>
      )}
    </div>
  )
}
