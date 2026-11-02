import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { grilleMois, NOMS_MOIS, JOURS_COURTS } from '../../services/calendrier'
import { ACTIONS_PUBLICATION, BILAN, reglagesPublication, actionsParJour, etatAction } from '../../services/calendrierPublications'

/**
 * Onglet « Calendrier » de Communication : les actions de publication de chaque événement
 * (mail mairies, annonce, mail adhérents, stories, bilan) sur une grille du mois.
 * Délais réglés dans les Paramètres (carte « Calendrier des publications »).
 * Conception : docs/superpowers/specs/2026-11-02-calendrier-publications-design.md
 */
const INFOS = Object.fromEntries([...ACTIONS_PUBLICATION, BILAN].map(a => [a.cle, a]))
const auJour = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const ETATS = { fait: 'Fait', a_faire: 'À faire', en_retard: 'En retard' }
const jourCourt = jour => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const jourLisible = jour => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function CalendrierPublications({ evenements, jourInitial, onMail, onAnnonce, onBilan, onMarquer }) {
  const aujourdhui = auJour(new Date())
  const depart = jourInitial || aujourdhui
  const [mois, setMois] = useState({ annee: Number(depart.slice(0, 4)), mois: Number(depart.slice(5, 7)) - 1 })
  const [jourChoisi, setJourChoisi] = useState(jourInitial || null)
  const [reglages, setReglages] = useState(() => reglagesPublication({}))

  useEffect(() => {
    supabase.from('settings').select('id, value').like('id', 'publication_%').then(({ data }) => {
      setReglages(reglagesPublication(Object.fromEntries((data || []).map(l => [l.id, l.value]))))
    })
  }, [])

  const parJour = useMemo(() => actionsParJour(evenements, reglages), [evenements, reglages])
  const semaines = useMemo(() => grilleMois(mois.annee, mois.mois), [mois])
  const prefixe = `${mois.annee}-${String(mois.mois + 1).padStart(2, '0')}`
  const joursDuMois = Object.keys(parJour).filter(j => j.startsWith(prefixe)).sort()
  const joursEvenement = useMemo(() => new Set(evenements.filter(e => !e.archived_at && e.date).map(e => String(e.date).slice(0, 10))), [evenements])

  const changerMois = n => {
    setJourChoisi(null)
    setMois(m => { const k = m.annee * 12 + m.mois + n; return { annee: Math.floor(k / 12), mois: k % 12 } })
  }

  const bouton = a => {
    const ev = a.evenement
    if (a.cle === 'mail_collectivites') return { texte: 'Envoyer', agir: () => onMail(ev, 'collectivites') }
    if (a.cle === 'mail_adherents') return { texte: 'Envoyer', agir: () => onMail(ev, 'adherents') }
    if (a.cle === 'annonce' || a.cle === 'story_jour') return { texte: a.cle === 'annonce' ? 'Publier' : 'Story', agir: () => onAnnonce(ev) }
    if (a.cle === 'bilan') return { texte: 'Bilan', agir: () => onBilan(ev) }
    return null
  }

  const ligne = a => {
    const info = INFOS[a.cle]
    const etat = etatAction(a, aujourdhui)
    const b = bouton(a)
    const marquable = a.cle === 'story_veille' || a.cle === 'story_jour'
    return (
      <li key={`${a.cle}-${a.evenementId}`} className="flex flex-col gap-3 rounded-[18px] border-2 border-[#0f172a] bg-white p-3.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-[#0f172a]" style={{ background: info.couleur }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-display text-[15px] font-extrabold leading-tight">{info.libelle}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.08em] ${etat === 'fait' ? 'bg-emerald-50 text-emerald-700' : etat === 'en_retard' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                {ETATS[etat]}
              </span>
            </div>
            <div className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              {!jourChoisi && <span className="font-bold text-slate-700">{jourCourt(a.jour)} · </span>}
              {a.evenement.title} ({jourCourt(String(a.evenement.date).slice(0, 10))})
            </div>
          </div>
        </div>
        {(b && etat !== 'fait') || marquable ? (
          <div className="flex flex-wrap gap-2 pl-6 sm:shrink-0 sm:pl-0">
            {b && etat !== 'fait' && (
              <button type="button" onClick={b.agir} className="rounded-[12px] border-2 border-[#0f172a] bg-[#e38154] px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white shadow-[3px_3px_0_#0f172a] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#0f172a]">
                {b.texte}
              </button>
            )}
            {marquable && (
              <button type="button" onClick={() => onMarquer(a.evenement, info.faitLe, a.faitLe ? null : new Date().toISOString())}
                className="rounded-[12px] border-2 border-[#0f172a] bg-white px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1a5f7a] shadow-[3px_3px_0_#1a5f7a]">
                {a.faitLe ? 'Annuler' : "C'est fait"}
              </button>
            )}
          </div>
        ) : null}
      </li>
    )
  }

  const etiquette = a => {
    const info = INFOS[a.cle]
    const etat = etatAction(a, aujourdhui)
    return (
      <span key={`${a.cle}-${a.evenementId}`} title={`${info.libelle} — ${a.evenement.title}`}
        className={`flex items-center gap-1 truncate rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-bold leading-tight text-white ${etat === 'fait' ? 'line-through opacity-50' : ''}`}
        style={{ background: etat === 'en_retard' ? '#e11d48' : info.couleur }}>
        {etat === 'fait' && <Check size={10} className="shrink-0" />}{info.court}
      </span>
    )
  }

  // Mois en cours : les actions restées en retard des mois précédents passent en tête
  const enRetardAvant = prefixe === aujourdhui.slice(0, 7)
    ? Object.keys(parJour).filter(j => j < `${prefixe}-01`).sort().flatMap(j => parJour[j]).filter(a => etatAction(a, aujourdhui) === 'en_retard')
    : []
  const liste = jourChoisi ? (parJour[jourChoisi] || []) : [...enRetardAvant, ...joursDuMois.flatMap(j => parJour[j])]

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border-2 border-[#0f172a] bg-white p-4 shadow-[5px_5px_0_#1a5f7a] md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => changerMois(-1)} aria-label="Mois précédent" className="flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6]"><ChevronLeft size={20} /></button>
          <h2 className="font-display text-[22px] font-extrabold tracking-[-0.03em] md:text-[26px]">{NOMS_MOIS[mois.mois]} {mois.annee}</h2>
          <button type="button" onClick={() => changerMois(1)} aria-label="Mois suivant" className="flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-[#0f172a] bg-[#fdfaf6]"><ChevronRight size={20} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
          {JOURS_COURTS.map(j => <div key={j} className="py-1">{j}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {semaines.flat().map(c => {
            const actions = parJour[c.cle] || []
            const choisi = jourChoisi === c.cle
            return (
              <button key={c.cle} type="button" onClick={() => setJourChoisi(choisi ? null : c.cle)}
                className={`flex min-h-[54px] flex-col gap-1 rounded-[10px] border-2 p-1 text-left md:min-h-[96px] ${choisi ? 'border-[#0f172a] bg-[#fdf1ea]' : 'border-transparent hover:border-slate-200'} ${c.dansLeMois ? '' : 'opacity-35'}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-extrabold ${c.cle === aujourdhui ? 'border-2 border-[#0f172a]' : ''} ${joursEvenement.has(c.cle) ? 'bg-[#0f172a] text-white' : ''}`}>{c.jour}</span>
                {/* Ordinateur : étiquettes ; téléphone : pastilles */}
                <span className="hidden flex-col gap-0.5 md:flex">{actions.slice(0, 3).map(etiquette)}{actions.length > 3 && <span className="text-[10px] font-bold text-slate-500">+{actions.length - 3}</span>}</span>
                <span className="flex flex-wrap gap-0.5 md:hidden">
                  {actions.map(a => <span key={`${a.cle}-${a.evenementId}`} className="h-2 w-2 rounded-full" style={{ background: etatAction(a, aujourdhui) === 'en_retard' ? '#e11d48' : INFOS[a.cle].couleur, opacity: a.faitLe ? 0.35 : 1 }} />)}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] font-semibold text-slate-600">
          {[...ACTIONS_PUBLICATION, BILAN].map(a => (
            <span key={a.cle} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: a.couleur }} />{a.court}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#e11d48]" />En retard</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-display text-[18px] font-extrabold tracking-[-0.02em]">
          {jourChoisi ? jourLisible(jourChoisi) : `Toutes les actions de ${NOMS_MOIS[mois.mois].toLowerCase()}`}
        </h3>
        {liste.length === 0
          ? <p className="rounded-[18px] border-2 border-dashed border-slate-300 bg-white p-5 text-[14px] text-slate-500">Rien à publier {jourChoisi ? 'ce jour-là' : 'ce mois-ci'}.</p>
          : <ul className="space-y-2.5">{liste.map(ligne)}</ul>}
      </div>
    </div>
  )
}
