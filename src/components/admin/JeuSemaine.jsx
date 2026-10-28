import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, Share2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { DataCard } from './DataCard'
import ConfirmModal from './ConfirmModal'
import SuccessModal from '../site/SuccessModal'
import MaskIcon from '../site/MaskIcon'
import { chargerFileJeuSemaine, enregistrerVideo, preparerVideo } from '../../services/jeuSemaineFile'
import { publierVideoSurReseaux } from '../../services/reseauxSociaux'
import { prochaineVideo, legendeProposee, nomDuFichier, LIEN_DOSSIER_DRIVE } from '../../services/jeuSemaine'
import { prochainePermanence } from '../../services/diapos/permanence-regles'

/**
 * Onglet « Jeu de la semaine » de l'écran Communication : les vidéos (Reels) que
 * Victor dépose dans le dossier Drive, publiées une par semaine en Reel sur
 * Instagram et Facebook (rappel le jeudi à 17 h).
 *
 * Proposée : la plus ancienne vidéo pas encore publiée dont le jeu est disponible
 * (règles : services/jeuSemaine.js). La vidéo est copiée le temps de la publication
 * dans notre stockage (Instagram ne lit pas Google Drive), effacée 7 jours après.
 * Conception : docs/superpowers/specs/2026-10-28-jeu-de-la-semaine-design.md
 */

const VIOLET = '#8b5cf6'
const dateCourte = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

function Pastille({ jeu }) {
  if (!jeu) return <span className="rounded-full border-2 border-[#f59e0b] bg-[#fffbeb] px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#b45309]">Jeu à choisir</span>
  return jeu.is_available === false
    ? <span className="rounded-full border-2 border-rose-400 bg-rose-50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-rose-600">En prêt</span>
    : <span className="rounded-full border-2 border-[#10b981] bg-[#ecfdf5] px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#047857]">Disponible</span>
}

function Jaquette({ jeu, taille = 'h-12 w-12' }) {
  return (
    <div className={`flex ${taille} shrink-0 items-center justify-center overflow-hidden rounded-[12px] border-2 border-[#0f172a] bg-white`}>
      {jeu?.image_url
        ? <img src={jeu.image_url} alt="" className="h-full w-full object-contain" />
        : <MaskIcon file="ludo-video.svg" size={22} color="#94a3b8" />}
    </div>
  )
}

export default function JeuSemaine({ onCountChange }) {
  const [chargement, setChargement] = useState(true)
  const [erreurChargement, setErreurChargement] = useState('')
  const [file, setFile] = useState({ attente: [], publiees: [], jeux: [] })
  const [permanence, setPermanence] = useState(null)
  const [choixId, setChoixId] = useState(null)        // « Choisir celle-ci » (non mémorisé)
  const [legende, setLegende] = useState('')
  const [legendeModifiee, setLegendeModifiee] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    setChargement(true)
    setErreurChargement('')
    try {
      const [donnees, reglages, evs] = await Promise.all([
        chargerFileJeuSemaine(),
        supabase.from('settings').select('id, value').or('id.like.horaire_%,id.like.adresse_%'),
        supabase.from('events').select('title, date, end_time, location, archived_at')
          .ilike('title', '%permanence%').is('archived_at', null).order('date'),
      ])
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
      setPermanence(suivante)
      setFile(donnees)
      onCountChange?.(donnees.attente.length)
    } catch (err) {
      console.error('Jeu de la semaine :', err)
      setErreurChargement(err?.message || "Le dossier Drive n'a pas pu être lu. Réessayez dans un instant.")
    } finally {
      setChargement(false)
    }
  }, [onCountChange])

  useEffect(() => { charger() }, [charger])

  const proposition = prochaineVideo(file.attente)
  const video = file.attente.find(v => v.driveId === choixId) ?? proposition?.video ?? null
  const jeu = video?.jeu ?? null
  const sautee = video && video === proposition?.video ? proposition.sautee : null

  // Légende : celle enregistrée pour cette vidéo, sinon le modèle
  useEffect(() => {
    setLegende(video?.legende ?? (jeu ? legendeProposee(jeu, permanence) : ''))
    setLegendeModifiee(!!video?.legende)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.driveId, jeu?.id, permanence])

  // Met à jour une vidéo de la file sans relire le Drive
  const majLocale = (driveId, champs) => setFile(f => ({ ...f, attente: f.attente.map(v => (v.driveId === driveId ? { ...v, ...champs } : v)) }))

  const enregistrerLegende = async () => {
    if (!video || !legendeModifiee || legende === video.legende) return
    try {
      await enregistrerVideo(video, { legende })
      majLocale(video.driveId, { legende })
    } catch (err) {
      console.error('Légende non enregistrée :', err)
      setErreur("La légende n'a pas pu être enregistrée. Vérifiez la connexion.")
    }
  }

  const revenirAuModele = async () => {
    try {
      await enregistrerVideo(video, { legende: null })
      majLocale(video.driveId, { legende: null })
      setLegende(legendeProposee(jeu, permanence))
      setLegendeModifiee(false)
    } catch (err) {
      console.error('Légende non remise :', err)
      setErreur("La légende n'a pas pu être remise. Vérifiez la connexion.")
    }
  }

  const choisirJeu = async (gameId) => {
    const choisi = file.jeux.find(j => String(j.id) === String(gameId))
    if (!choisi || !video) return
    try {
      await enregistrerVideo(video, { game_id: choisi.id })
      majLocale(video.driveId, { jeu: choisi })
    } catch (err) {
      console.error('Jeu non enregistré :', err)
      setErreur("Le jeu n'a pas pu être enregistré. Vérifiez la connexion.")
    }
  }

  const publier = async () => {
    if (!video || !jeu || !legende.trim()) return
    setEnvoi(true)
    setErreur('')
    try {
      const url = await preparerVideo(video)
      await publierVideoSurReseaux({ message: legende, videoUrl: url, extra: { jeu: jeu.name } })
      await enregistrerVideo(video, { game_id: jeu.id, legende, publie_le: new Date().toISOString() })
      setConfirmation(false)
      setSucces(true)
      setChoixId(null)
      await charger()
    } catch (err) {
      console.error('Publication jeu de la semaine :', err)
      setConfirmation(false)
      setErreur(err?.message?.startsWith('Erreur Make') ? 'La publication a échoué. Réessayez dans un instant.' : (err?.message || 'La publication a échoué. Réessayez dans un instant.'))
    } finally {
      setEnvoi(false)
    }
  }

  const peutPublier = !!video && !!jeu && !!legende.trim() && !envoi

  return (
    <DataCard shadow={VIOLET}>
      <div className="flex flex-wrap items-center gap-3.5 border-b-2 border-[#0f172a] px-6 py-5">
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#f5f3ff]">
          <MaskIcon file="ludo-video.svg" size={30} color={VIOLET} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[19px] font-extrabold uppercase tracking-[-0.03em]">Jeu de la semaine</h2>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Une vidéo par semaine en Reel sur Facebook &amp; Instagram — rappel le jeudi à 17 h</p>
        </div>
        <a href={LIEN_DOSSIER_DRIVE} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 rounded-[14px] border-2 border-[#0f172a] bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0f172a] shadow-[3px_3px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#0f172a]">
          <ExternalLink size={13} /> Ouvrir le dossier Drive
        </a>
      </div>

      {chargement ? (
        <div className="flex items-center justify-center py-20 text-[#1a5f7a]"><Loader2 className="animate-spin" size={28} /></div>
      ) : erreurChargement ? (
        <div className="p-8 text-center">
          <p className="mx-auto mb-4 max-w-md rounded-[14px] border-2 border-rose-400 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-600">{erreurChargement}</p>
          <button type="button" onClick={charger} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1a5f7a] underline underline-offset-2">
            <RefreshCw size={12} /> Réessayer
          </button>
        </div>
      ) : (
        <div className="p-6 md:p-8">
          {!video ? (
            <p className="rounded-[24px] border-2 border-dashed border-slate-300 bg-[#fdfaf6] p-8 text-center text-[12px] font-medium text-slate-500">
              Plus de vidéo en réserve : ajoutez-en une dans le dossier Drive, elle apparaîtra ici.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Prochaine vidéo */}
              <div>
                <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Prochaine vidéo</div>
                <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[28px] border-2 border-[#0f172a] bg-[#0f172a] shadow-[5px_5px_0_#8b5cf6]">
                  <iframe
                    key={video.driveId}
                    title={`Vidéo ${jeu?.name || nomDuFichier(video.nomFichier)}`}
                    src={`https://drive.google.com/file/d/${video.driveId}/preview`}
                    className="aspect-[9/16] w-full"
                    allow="autoplay"
                  />
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-[18px] border-2 border-[#0f172a] bg-white p-2.5 pr-4">
                  <Jaquette jeu={jeu} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-extrabold text-[#0f172a]">{jeu?.name || nomDuFichier(video.nomFichier)}</p>
                    <p className="truncate text-[10px] font-semibold text-slate-400">{video.nomFichier}</p>
                  </div>
                  <Pastille jeu={jeu} />
                </div>
                {sautee && (
                  <p className="mt-3 rounded-[14px] border-2 border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-[11px] font-semibold text-[#b45309]">
                    {sautee.jeu.name} est en prêt : vidéo suivante proposée.
                  </p>
                )}
                {!jeu && (
                  <label className="mt-3 block rounded-[14px] border-2 border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-[11px] font-semibold text-[#b45309]">
                    Jeu non trouvé dans le catalogue : choisissez-le.
                    <select defaultValue="" onChange={e => choisirJeu(e.target.value)}
                      className="mt-2 block w-full rounded-[12px] border-2 border-[#0f172a] bg-white px-3 py-2 text-[12px] font-bold text-[#0f172a]">
                      <option value="" disabled>Choisir un jeu…</option>
                      {file.jeux.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </select>
                  </label>
                )}
              </div>

              {/* Légende et publication */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Légende</div>
                  {legendeModifiee && jeu && (
                    <button type="button" onClick={revenirAuModele}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-[#1a5f7a]">
                      <RefreshCw size={11} /> Revenir au texte proposé
                    </button>
                  )}
                </div>
                <textarea
                  rows={12}
                  placeholder="Choisissez le jeu pour obtenir une légende."
                  className="w-full resize-y rounded-[24px] border-2 border-[#0f172a] bg-[#fdfaf6] p-5 text-[13px] font-medium leading-relaxed text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white"
                  value={legende}
                  readOnly={envoi}
                  onChange={e => { setLegende(e.target.value); setLegendeModifiee(true) }}
                  onBlur={enregistrerLegende}
                />
                <p className="mt-2 text-[10px] font-semibold text-slate-400">
                  Publiée telle quelle sous la vidéo, sur Instagram et sur Facebook. La vidéo n'a pas de son.
                </p>
                {erreur && (
                  <p className="mt-4 rounded-[14px] border-2 border-rose-400 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-600">{erreur}</p>
                )}
                <button
                  type="button"
                  data-action="publier-jeu-semaine"
                  onClick={() => setConfirmation(true)}
                  disabled={!peutPublier}
                  className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ${
                    peutPublier
                      ? 'bg-[#e38154] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]'
                      : 'cursor-not-allowed bg-slate-100 text-slate-300'
                  }`}
                >
                  <Share2 size={16} /> Publier sur Facebook &amp; Instagram
                </button>
              </div>
            </div>
          )}

          {/* File d'attente */}
          {file.attente.length > 0 && (
            <div className="mt-10">
              <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">File d'attente ({file.attente.length})</div>
              <div className="space-y-2">
                {file.attente.map(v => (
                  <div key={v.driveId} className={`flex flex-wrap items-center gap-3 rounded-[18px] border-2 p-2.5 pr-4 ${v === video ? 'border-[#8b5cf6] bg-[#f5f3ff]' : 'border-[#0f172a] bg-white'}`}>
                    <Jaquette jeu={v.jeu} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-extrabold text-[#0f172a]">{v.jeu?.name || nomDuFichier(v.nomFichier)}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{v.creeLe ? `Ajoutée le ${dateCourte(v.creeLe)}` : v.nomFichier}</p>
                    </div>
                    <Pastille jeu={v.jeu} />
                    {v === video
                      ? <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8b5cf6]">Proposée</span>
                      : <button type="button" onClick={() => { setChoixId(v.driveId); setErreur('') }}
                          className="text-[10px] font-bold text-[#1a5f7a] underline underline-offset-2">Choisir celle-ci</button>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] font-semibold text-slate-400">Pour retirer une vidéo de la file, supprimez-la du dossier Drive.</p>
            </div>
          )}

          {/* Déjà publiées */}
          {file.publiees.length > 0 && (
            <div className="mt-10">
              <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Déjà publiées ({file.publiees.length})</div>
              <div className="space-y-2">
                {file.publiees.map(v => (
                  <div key={v.driveId} className="flex items-center gap-3 rounded-[18px] border-2 border-slate-200 bg-[#fdfaf6] p-2.5 pr-4">
                    <Jaquette jeu={v.jeu} />
                    <p className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold text-slate-500">{v.jeu?.name || nomDuFichier(v.nomFichier)}</p>
                    <p className="text-[10px] font-semibold text-slate-400">Publiée le {dateCourte(v.publieLe)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmation}
        onClose={() => { if (!envoi) setConfirmation(false) }}
        onConfirm={publier}
        busy={envoi}
        icon={envoi ? <Loader2 className="animate-spin" size={30} /> : <Share2 size={30} />}
        title="Publier la vidéo ?"
        message={jeu ? `La vidéo de ${jeu.name} va être publiée en Reel sur la page Facebook et le compte Instagram de la ludothèque.` : ''}
        confirmLabel={envoi ? 'Envoi en cours…' : 'Publier'}
      />
      <SuccessModal
        open={succes}
        onClose={() => setSucces(false)}
        title="Vidéo envoyée !"
        message="Elle apparaîtra sur la page Facebook et le compte Instagram d'ici quelques minutes, le temps que les deux réseaux la traitent."
      />
    </DataCard>
  )
}
