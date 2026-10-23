import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Dice5, Loader2, RefreshCw, Share2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { DataCard } from './DataCard'
import { chargerJeuxAAnnoncer } from '../../services/nouveauxJeux'
import SocialPostPreview from './SocialPostPreview'
import { publierSurReseaux, uploadSocialBlob } from '../../services/reseauxSociaux'
import { prochainePermanence } from '../../services/diapos/permanence-regles'
import { planNouveauxJeux, detailsJeu, MAX_IMAGES_JEUX } from '../../services/diapos/nouveaux-jeux-regles'
import { dessinerNouveauxJeux } from '../../services/diapos/nouveaux-jeux'
import { estChezNous } from '../../services/diapos/jaquettes'
import { versBlob, liberer, viderCache } from '../../services/diapos/dessin'

/**
 * Onglet « Nouveaux jeux » de l'écran Communication : annoncer sur Facebook et
 * Instagram les jeux qui viennent d'entrer dans la collection.
 *
 * Chaque jeu ajouté depuis le 1er septembre 2026 est proposé une fois, coché d'office.
 * À la publication, les cochés sont notés « annonce », les décochés « ecarte »
 * (table annonces_jeux, réservée aux bénévoles) : ils ne reviennent plus.
 *
 * Carrousel publié (images 4:5, 10 au plus) : couverture, une image par jeu (8 au plus),
 * puis la prochaine permanence. Règles : services/diapos/nouveaux-jeux-regles.js ;
 * dessin : services/diapos/nouveaux-jeux.js. L'aperçu est l'image exacte publiée.
 */

// Signal interne : un aperçu plus récent a été demandé, celui-ci s'arrête
const ABANDON = Symbol('aperçu abandonné')
const ERREUR_APERCU = "L'aperçu n'a pas pu être fabriqué. Réessayez ou rechargez la page."

// ─── Texte proposé ───────────────────────────────────────────────────────────

const minuscule = t => t.charAt(0).toLowerCase() + t.slice(1)

// « (2 à 4 joueurs, dès 8 ans) » — les mêmes valeurs que les pastilles des images
function detailsTexte(j) {
  const parts = detailsJeu(j).map(minuscule)
  return parts.length ? ` (${parts.join(', ')})` : ''
}

// Prochaine permanence : la même que sur la dernière image du carrousel
function phrasePermanence(prochaine) {
  if (!prochaine) return 'À emprunter dès la prochaine permanence.'
  const quand = [minuscule(prochaine.jour), prochaine.heures].filter(Boolean).join(', ')
  return `À emprunter dès la prochaine permanence : ${quand}${prochaine.lieu ? `, ${prochaine.lieu}` : ''}.`
}

function construireTexte(jeux, prochaine) {
  const n = jeux.length
  return `🎲 Du nouveau à la ludothèque ! ${n > 1 ? `${n} jeux rejoignent` : 'Un jeu rejoint'} notre collection :

${jeux.map(j => `• ${(j.name || '').trim()}${detailsTexte(j)}`).join('\n')}

${phrasePermanence(prochaine)}

Pas encore adhérent ? Toutes les infos sur ludothequedecoligny.fr/adherer`
}

// ─── Onglet ──────────────────────────────────────────────────────────────────

export default function NouveauxJeux({ onCountChange }) {
  const [chargement, setChargement] = useState(true)
  const [aAnnoncer, setAAnnoncer] = useState([])
  const [ecartes, setEcartes] = useState([])
  const [voirEcartes, setVoirEcartes] = useState(false)
  const [coches, setCoches] = useState(new Set())
  // Prochaine permanence (événement saisi, sinon Paramètres) : texte et dernière image
  const [prochaine, setProchaine] = useState(null)
  const [texte, setTexte] = useState('')
  const [texteModifie, setTexteModifie] = useState(false)
  const [apercu, setApercu] = useState([]) // images de l'aperçu (JPEG), exactement celles publiées
  // Plan de l'aperçu affiché : la publication est redessinée à partir de lui
  const [planAffiche, setPlanAffiche] = useState(null)
  const [calcul, setCalcul] = useState(false) // aperçu en cours de dessin
  const [publication, setPublication] = useState('') // '' | 'en-cours' | 'ok'
  const [erreur, setErreur] = useState('')
  // Numéro du dernier aperçu demandé : un aperçu dépassé par un plus récent s'arrête
  const numero = useRef(0)
  // Une fabrication d'images à la fois (aperçu, publication) : mémoire des téléphones
  const fileAttente = useRef(Promise.resolve())
  const aLaSuite = tache => {
    const p = fileAttente.current.then(tache)
    fileAttente.current = p.catch(() => {})
    return p
  }

  // Onglet quitté : aperçu en cours abandonné, images chargées oubliées
  useEffect(() => {
    const n = numero
    return () => {
      n.current++
      viderCache()
    }
  }, [])

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const [{ aAnnoncer: a, ecartes: e }, reglages, evs] = await Promise.all([
        chargerJeuxAAnnoncer(),
        supabase.from('settings').select('id, value').or('id.like.horaire_%,id.like.adresse_%'),
        supabase.from('events').select('title, date, end_time, location, archived_at')
          .ilike('title', '%permanence%').is('archived_at', null).order('date'),
      ])
      // Sans événements ni Paramètres : prochaine permanence calculée avec ce qui a été lu
      if (reglages.error) console.warn('Prochaine permanence (Paramètres) :', reglages.error)
      if (evs.error) console.warn('Prochaine permanence (événements) :', evs.error)
      let suivante = null
      try {
        suivante = prochainePermanence({
          evenements: evs.error ? [] : evs.data || [],
          horaires: Object.fromEntries((reglages.error ? [] : reglages.data || []).map(r => [r.id, r.value])),
          maintenant: new Date(),
        })
      } catch (err) {
        console.warn('Prochaine permanence :', err)
      }
      setProchaine(suivante)
      setAAnnoncer(a)
      setEcartes(e)
      setCoches(new Set(a.map(j => j.id)))
      onCountChange?.(a.length)
    } catch (err) {
      console.error('Nouveaux jeux :', err)
      setErreur('Impossible de charger les jeux. Rechargez la page.')
    } finally {
      setChargement(false)
    }
  }, [onCountChange])

  useEffect(() => { charger() }, [charger])

  const listeVisible = voirEcartes ? [...aAnnoncer, ...ecartes] : aAnnoncer
  const choisis = listeVisible.filter(j => coches.has(j.id))
  const cleChoix = choisis.map(j => j.id).join(',')

  // Texte proposé : suit la sélection tant qu'il n'a pas été retouché à la main
  useEffect(() => {
    if (!texteModifie) setTexte(choisis.length ? construireTexte(choisis, prochaine) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleChoix, prochaine, texteModifie])

  // Aperçu redessiné (avec un court délai) à chaque changement de sélection
  useEffect(() => {
    const n = ++numero.current
    if (chargement || choisis.length === 0) {
      setApercu([])
      setPlanAffiche(null)
      setCalcul(false)
      return
    }
    setCalcul(true)
    const minuterie = setTimeout(() => aLaSuite(async () => {
      // Abandon dès qu'un aperçu plus récent est demandé
      const suite = () => { if (n !== numero.current) throw ABANDON }
      try {
        suite()
        // Jaquette restée chez MyLudo : interdite dans un canvas, traitée comme absente
        const jeux = choisis.map(j => (j.image_url && !estChezNous(j.image_url) ? { ...j, image_url: null } : j))
        const plan = planNouveauxJeux({ jeux, prochaine })
        // Une image à la fois : convertie dès qu'elle est dessinée, puis libérée
        const images = []
        await dessinerNouveauxJeux(plan, async canvas => {
          suite()
          images.push(canvas.toDataURL('image/jpeg', 0.9))
        })
        suite()
        setApercu(images)
        setPlanAffiche(plan)
        setErreur(e => (e === ERREUR_APERCU ? '' : e))
      } catch (e) {
        if (e === ABANDON) return
        console.error('Aperçu nouveaux jeux :', e)
        if (n === numero.current) {
          // Plus d'ancien aperçu publiable : il ne correspondrait plus à la sélection
          setApercu([])
          setPlanAffiche(null)
          setErreur(ERREUR_APERCU)
        }
      } finally {
        if (n === numero.current) setCalcul(false)
      }
    }), 400)
    return () => clearTimeout(minuterie)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleChoix, prochaine, chargement])

  const basculer = id => {
    // Pendant l'envoi, la sélection publiée ne change plus
    if (publication === 'en-cours') return
    setPublication('')
    setCoches(prev => {
      const suite = new Set(prev)
      if (suite.has(id)) suite.delete(id)
      else suite.add(id)
      return suite
    })
  }

  // Note les jeux cochés « annonce » (si publiés) et les décochés « ecarte »
  const enregistrerStatuts = async (publies) => {
    const lignes = listeVisible.map(j => ({
      game_id: j.id,
      statut: publies && coches.has(j.id) ? 'annonce' : (coches.has(j.id) ? null : 'ecarte'),
      le: new Date().toISOString(),
    })).filter(l => l.statut)
    if (lignes.length === 0) return
    const { error } = await supabase.from('annonces_jeux').upsert(lignes, { onConflict: 'game_id' })
    if (error) throw error
  }

  // Carrousel publié tel que montré dans l'aperçu : une image à la fois, dessinée,
  // exportée, libérée, puis déposée dans notre stockage (mémoire des téléphones)
  const envoyerCarrousel = async () => {
    const horodatage = Date.now()
    const adresses = []
    await dessinerNouveauxJeux(planAffiche, async (canvas, i) => {
      const blob = await versBlob(canvas)
      liberer(canvas)
      const url = blob && await uploadSocialBlob(blob, `nouveaux-jeux/nouveaux-jeux-${horodatage}-${String(i + 1).padStart(2, '0')}.jpg`)
      if (!url) throw new Error('Image non enregistrée')
      adresses.push(url)
    })
    return adresses
  }

  const publier = async () => {
    if (choisis.length === 0 || !texte.trim() || !planAffiche || calcul) return
    setPublication('en-cours')
    setErreur('')
    try {
      // À la suite d'un aperçu en cours : une seule fabrication d'images à la fois
      const adresses = await aLaSuite(envoyerCarrousel)
      await publierSurReseaux({
        message: texte,
        imageUrls: adresses,
        extra: { jeux: choisis.map(j => j.name) },
      })
      await enregistrerStatuts(true)
      setPublication('ok')
      setTexteModifie(false)
      await charger()
    } catch (err) {
      console.error('Publication nouveaux jeux :', err)
      setErreur('La publication a échoué. Réessayez dans un instant.')
      setPublication('')
    }
  }

  const ecarterSansPublier = async () => {
    try {
      await enregistrerStatuts(false)
      await charger()
    } catch (err) {
      console.error('Écarter des jeux :', err)
      setErreur("Les jeux n'ont pas pu être écartés. Réessayez.")
    }
  }

  const nbDecoches = listeVisible.filter(j => !coches.has(j.id) && !ecartes.includes(j)).length
  const peutPublier = choisis.length > 0 && texte.trim() && planAffiche && apercu.length > 0 && !calcul && publication !== 'en-cours'

  return (
    <DataCard shadow="#f59e0b">
      <div className="flex items-center gap-3.5 border-b-2 border-[#0f172a] px-6 py-5">
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#fffbeb] text-[#f59e0b]">
          <Dice5 size={20} />
        </div>
        <div>
          <h2 className="font-display text-[19px] font-extrabold uppercase tracking-[-0.03em]">Nouveaux jeux</h2>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Annoncer sur Facebook &amp; Instagram les jeux qui viennent d'arriver</p>
        </div>
      </div>

      {chargement ? (
        <div className="flex items-center justify-center py-20 text-[#1a5f7a]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 p-6 md:p-8 lg:grid-cols-2">

          {/* Jeux à annoncer */}
          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">
                Jeux à annoncer ({choisis.length}/{listeVisible.length})
              </div>
              {ecartes.length > 0 && (
                <button type="button" onClick={() => setVoirEcartes(v => !v)}
                  className="text-[10px] font-bold text-slate-400 underline underline-offset-2 hover:text-[#1a5f7a]">
                  {voirEcartes ? 'Masquer les jeux écartés' : `Voir les jeux écartés (${ecartes.length})`}
                </button>
              )}
            </div>

            {listeVisible.length === 0 ? (
              <p className="rounded-[24px] border-2 border-dashed border-slate-300 bg-[#fdfaf6] p-8 text-center text-[12px] font-medium text-slate-500">
                Aucun nouveau jeu à annoncer pour l'instant. Les prochains jeux ajoutés au catalogue apparaîtront ici.
              </p>
            ) : (
              <>
                <p className="mb-3 text-[11px] font-medium text-slate-500">
                  Décochez les jeux dont vous ne voulez pas parler : ils ne seront plus proposés.
                </p>
                <div className="space-y-2">
                  {listeVisible.map(j => {
                    const coche = coches.has(j.id)
                    const ecarte = ecartes.includes(j)
                    return (
                      <label key={j.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-[18px] border-2 p-2.5 pr-4 transition-colors ${coche ? 'border-[#0f172a] bg-white' : 'border-slate-200 bg-[#fdfaf6] opacity-60'}`}>
                        <input type="checkbox" checked={coche} onChange={() => basculer(j.id)}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-[#1a5f7a]" />
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border-2 border-[#0f172a] bg-white">
                          {j.image_url && <img src={j.image_url} alt="" className="h-full w-full object-contain" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-extrabold text-[#0f172a]">{j.name}</p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            Ajouté le {new Date(j.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                            {ecarte && ' · écarté'}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {choisis.length > MAX_IMAGES_JEUX && (
                  <p className="mt-3 rounded-[14px] border-2 border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-[11px] font-semibold text-[#b45309]">
                    {choisis.length} jeux cochés : la couverture les compte tous, mais seuls les {MAX_IMAGES_JEUX} premiers ont
                    leur image (Instagram limite un carrousel à 10 images). Tous sont cités dans le texte.
                  </p>
                )}
                {nbDecoches > 0 && (
                  <button type="button" onClick={ecarterSansPublier}
                    className="mt-3 text-[10px] font-bold text-slate-400 underline underline-offset-2 hover:text-rose-500">
                    Écarter {nbDecoches > 1 ? `les ${nbDecoches} jeux décochés` : 'le jeu décoché'} sans rien publier
                  </button>
                )}
              </>
            )}
          </div>

          {/* Texte, aperçu, publication */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Message</div>
              {texteModifie && (
                <button type="button" onClick={() => setTexteModifie(false)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-[#1a5f7a]">
                  <RefreshCw size={11} /> Revenir au texte proposé
                </button>
              )}
            </div>
            <textarea
              rows={10}
              placeholder="Cochez au moins un jeu pour obtenir un texte."
              className="mb-5 w-full resize-y rounded-[24px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5 text-[13px] font-medium leading-relaxed text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white"
              value={texte}
              readOnly={publication === 'en-cours'}
              onChange={e => { setTexte(e.target.value); setTexteModifie(true); if (publication !== 'en-cours') setPublication('') }}
            />

            <div className="space-y-1">
              <SocialPostPreview text={texte} imageUrls={apercu} portrait />
              <p className="h-4 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                {calcul && <><Loader2 size={10} className="mr-1 inline animate-spin" /> Mise à jour de l'aperçu…</>}
              </p>
            </div>

            {erreur && (
              <p className="mt-4 rounded-[14px] border-2 border-rose-400 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-600">{erreur}</p>
            )}

            {publication === 'ok' ? (
              <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#0f172a] bg-[#10b981] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
                <CheckCircle2 size={16} /> Publié avec succès !
              </div>
            ) : (
              <button
                type="button"
                onClick={publier}
                disabled={!peutPublier}
                className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ${
                  peutPublier
                    ? 'bg-[#e38154] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]'
                    : 'cursor-not-allowed bg-slate-100 text-slate-300'
                }`}
              >
                {publication === 'en-cours'
                  ? <><Loader2 size={16} className="animate-spin" /> Publication...</>
                  : <><Share2 size={16} /> Publier {apercu.length > 0 && !calcul ? `(${apercu.length} image${apercu.length > 1 ? 's' : ''})` : ''}</>}
              </button>
            )}
          </div>
        </div>
      )}
    </DataCard>
  )
}
