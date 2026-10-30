import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import MaskIcon from './MaskIcon'
import { BTN_PRIMARY, BTN_SECONDARY } from './styles'
import {
  CATEGORIES, JOURS_COURTS, MOIS_COURTS, NOMS_MOIS, categorie, evenementsDuMois, grilleMois,
  horaire, jourLong, moisDisponibles, nomFichierMois, parJour,
} from '../../services/calendrier'
import { telecharger } from '../../services/diapos/partage'

const cleMois = m => `${m.annee}-${m.mois}`

// Image d'un rendez-vous en fond : le centre de l'affiche (le titre, en haut, reste hors cadre)
const fondImage = url => `url(${JSON.stringify(url)})`
const CADRAGE = 'center 45%'

/**
 * Fenêtre « Calendrier » de l'accueil : tous les rendez-vous à venir, mois par mois,
 * et export des mois choisis en images (publications) ou en PDF A4.
 * `evenements` : les événements non archivés ; `onChoisir(event)` ouvre sa fiche.
 */
export default function CalendrierEvenements({ open, onClose, evenements, onChoisir }) {
  const maintenant = useMemo(() => new Date(), [])
  const aujourdhui = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}-${String(maintenant.getDate()).padStart(2, '0')}`
  const listeMois = useMemo(() => moisDisponibles(evenements, maintenant), [evenements, maintenant])
  const [indexMois, setIndexMois] = useState(0)
  const [jourChoisi, setJourChoisi] = useState(null)
  const [exportOuvert, setExportOuvert] = useState(false)
  const [coches, setCoches] = useState(() => new Set())
  const [format, setFormat] = useState('image')
  const [etat, setEtat] = useState('pret')

  const mois = listeMois[Math.min(indexMois, listeMois.length - 1)]
  const semaines = useMemo(() => grilleMois(mois.annee, mois.mois), [mois])
  const duMois = useMemo(() => evenementsDuMois(evenements, mois.annee, mois.mois), [evenements, mois])
  const jours = useMemo(() => parJour(duMois), [duMois])
  const presentes = useMemo(() => [...new Set(evenements.map(categorie))], [evenements])
  const affiches = jourChoisi ? (jours[jourChoisi] || []) : duMois

  // À l'ouverture : mois en cours, rien de choisi
  useEffect(() => {
    if (!open) return
    setIndexMois(0)
    setJourChoisi(null)
    setExportOuvert(false)
    setEtat('pret')
  }, [open])

  // Changer de mois : on repart du mois entier
  useEffect(() => { setJourChoisi(null) }, [mois])

  // Ouvrir l'export : le mois affiché est coché d'office
  const ouvrirExport = () => {
    setCoches(new Set([cleMois(mois)]))
    setEtat('pret')
    setExportOuvert(true)
  }

  const basculer = m => setCoches(c => {
    const s = new Set(c)
    if (s.has(cleMois(m))) s.delete(cleMois(m)); else s.add(cleMois(m))
    return s
  })

  const exporter = async () => {
    const choisis = listeMois.filter(m => coches.has(cleMois(m)))
    if (!choisis.length) return
    setEtat('calcul')
    try {
      const { exporterMois } = await import('../../services/diapos/calendrier-mois')
      const fichiers = await exporterMois(choisis, evenements, format, nomFichierMois)
      if (!fichiers.length) throw new Error('aucun fichier')
      telecharger(fichiers)
      setEtat('fait')
    } catch (e) {
      console.warn('Export du calendrier :', e)
      setEtat('erreur')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Calendrier des rendez-vous" maxWidth={880} scroll closeTone="cream" panelClassName="p-5 sm:p-8">
      <div className="pr-12">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#e38154]">Calendrier</div>
        <h2 className="mt-1.5 font-display text-[26px] font-extrabold leading-none tracking-[-0.04em] sm:text-[32px]">
          Tous nos <span className="text-[#1a5f7a]">rendez-vous</span>
        </h2>
      </div>

      {/* Mois affiché et flèches */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndexMois(i => Math.max(0, i - 1))}
          disabled={indexMois === 0}
          aria-label="Mois précédent"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-white text-[18px] font-extrabold text-[#1a5f7a] shadow-[3px_3px_0_#1a5f7a] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#1a5f7a] disabled:pointer-events-none disabled:opacity-30"
        >
          ←
        </button>
        <div className="text-center font-display text-[24px] font-extrabold tracking-[-0.03em] sm:text-[30px]">
          {NOMS_MOIS[mois.mois]} <span className="text-[#e38154]">{mois.annee}</span>
        </div>
        <button
          type="button"
          onClick={() => setIndexMois(i => Math.min(listeMois.length - 1, i + 1))}
          disabled={indexMois >= listeMois.length - 1}
          aria-label="Mois suivant"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-white text-[18px] font-extrabold text-[#1a5f7a] shadow-[3px_3px_0_#1a5f7a] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#1a5f7a] disabled:pointer-events-none disabled:opacity-30"
        >
          →
        </button>
      </div>

      {/* Légende */}
      {presentes.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {presentes.map(k => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORIES[k].couleur }} />
              {CATEGORIES[k].libelle}
            </span>
          ))}
        </div>
      )}

      {/* Grille du mois */}
      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5">
        {JOURS_COURTS.map(j => (
          <div key={j} className="pb-1 text-center text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-400 sm:text-[10px]">
            <span className="sm:hidden">{j[0]}</span><span className="hidden sm:inline">{j}</span>
          </div>
        ))}
        {semaines.flat().map(c => {
          if (!c.dansLeMois) return <div key={c.cle} className="h-[46px] sm:h-[92px]" />
          const liste = jours[c.cle] || []
          const passe = c.cle < aujourdhui
          const choisi = jourChoisi === c.cle
          const cat = liste.length ? CATEGORIES[categorie(liste[0])] : null
          const image = liste.find(e => e.image_url)?.image_url
          return (
            <button
              key={c.cle}
              type="button"
              disabled={!liste.length}
              onClick={() => setJourChoisi(choisi ? null : c.cle)}
              className={`relative flex h-[46px] flex-col items-start overflow-hidden rounded-[12px] border-2 p-1 text-left transition-[transform,box-shadow] sm:h-[92px] sm:rounded-[16px] sm:p-1.5 ${
                liste.length ? 'border-[#0f172a] hover:-translate-y-[1px]' : 'border-slate-200'
              } ${passe ? 'opacity-45' : ''}`}
              style={{
                background: cat ? cat.fond : '#ffffff',
                boxShadow: choisi ? '0 0 0 3px #e38154' : liste.length ? '3px 3px 0 #0f172a' : 'none',
              }}
            >
              {image && (
                <>
                  <span aria-hidden className="absolute inset-0 bg-cover" style={{ backgroundImage: fondImage(image), backgroundPosition: CADRAGE }} />
                  {/* bandeau de la couleur du rendez-vous en haut, pour lire le jour et l'heure */}
                  <span aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${cat.fond} 0%, ${cat.fond} 26%, transparent 70%)` }} />
                </>
              )}
              <span className={`relative font-display text-[13px] font-extrabold leading-none sm:text-[15px] ${
                c.cle === aujourdhui ? 'rounded-full bg-[#e38154] px-1.5 py-0.5 text-white' : liste.length ? 'text-[#0f172a]' : 'text-slate-400'
              }`}>
                {c.jour}
              </span>
              {/* Téléphone : une pastille par rendez-vous */}
              <span className="relative mt-auto flex gap-1 sm:hidden">
                {liste.slice(0, 3).map(e => (
                  <span key={e.id} className="h-2.5 w-2.5 rounded-full border-[1.5px] border-white" style={{ background: CATEGORIES[categorie(e)].couleur }} />
                ))}
              </span>
              {/* Ordinateur : l'heure et le titre */}
              <span className="relative mt-1 hidden w-full flex-col gap-1 sm:flex">
                {liste.slice(0, 2).map(e => (
                  <span
                    key={e.id}
                    className="block w-full truncate rounded-full px-2 py-[3px] text-[10px] font-extrabold leading-tight text-white"
                    style={{ background: CATEGORIES[categorie(e)].couleur }}
                  >
                    {horaire(e).split(' ')[0]} · {e.title}
                  </span>
                ))}
                {liste.length > 2 && <span className="w-fit rounded-full bg-white px-1.5 text-[10px] font-extrabold text-slate-500">+{liste.length - 2}</span>}
              </span>
            </button>
          )
        })}
      </div>

      {/* Rendez-vous du mois ou du jour choisi */}
      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-[19px] font-extrabold tracking-[-0.03em]">
            {jourChoisi ? jourLong({ date: `${jourChoisi}T00:00:00` }) : 'Au programme ce mois-ci'}
          </h3>
          {jourChoisi && (
            <button type="button" onClick={() => setJourChoisi(null)} className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] underline underline-offset-4">
              Tout le mois
            </button>
          )}
        </div>
        {affiches.length === 0 ? (
          <p className="rounded-[20px] border-2 border-dashed border-slate-200 bg-[#fdfaf6] px-5 py-6 text-center text-[13.5px] italic text-slate-400">
            Pas encore de rendez-vous prévu ce mois-ci.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {affiches.map(e => {
              const cat = CATEGORIES[categorie(e)]
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onChoisir(e)}
                  className="relative flex items-center gap-3.5 overflow-hidden rounded-[20px] border-2 border-[#0f172a] bg-white p-3 text-left shadow-[4px_4px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]"
                >
                  {e.image_url && (
                    // l'affiche à droite, fondue vers le texte
                    <span
                      aria-hidden
                      className="absolute inset-y-0 right-0 w-[28%] bg-[length:190%_auto] bg-[center_62%] sm:w-[45%] sm:bg-cover sm:bg-[center_60%]"
                      style={{
                        backgroundImage: fondImage(e.image_url),
                        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 70%)',
                        maskImage: 'linear-gradient(90deg, transparent 0%, #000 70%)',
                      }}
                    />
                  )}
                  <span className="relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px] border-2 border-[#0f172a] text-white" style={{ background: cat.couleur }}>
                    <span className="font-display text-[18px] font-extrabold leading-none">{Number(String(e.date).slice(8, 10))}</span>
                    <span className="text-[8.5px] font-extrabold uppercase tracking-[0.06em]">{MOIS_COURTS[Number(String(e.date).slice(5, 7)) - 1]}</span>
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: cat.couleur }}>
                      {jourLong(e)} · {horaire(e)}
                    </span>
                    {/* sur téléphone, le titre et le lieu s'arrêtent avant l'image */}
                    <span className={`block truncate font-display text-[16px] font-extrabold tracking-[-0.02em] ${e.image_url ? 'pr-[18%] sm:pr-0' : ''}`}>{e.title}</span>
                    {e.location && <span className={`block truncate text-[12px] text-slate-500 ${e.image_url ? 'pr-[18%] sm:pr-0' : ''}`}>{e.location}</span>}
                  </span>
                  <span className="relative hidden shrink-0 rounded-full border-2 border-[#0f172a] bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] sm:block">Détails →</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="mt-7 border-t-2 border-slate-100 pt-6">
        {!exportOuvert ? (
          <button type="button" onClick={ouvrirExport} className={`${BTN_SECONDARY} w-full sm:w-auto`}>
            <MaskIcon file="ludo-calendrier.svg" size={22} color="currentColor" /> Exporter le calendrier
          </button>
        ) : (
          <div className="rounded-[24px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 sm:p-5">
            <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1a5f7a]">Mois à exporter</div>
            <div className="flex flex-wrap gap-2">
              {listeMois.map(m => {
                const actif = coches.has(cleMois(m))
                return (
                  <button
                    key={cleMois(m)}
                    type="button"
                    onClick={() => basculer(m)}
                    aria-pressed={actif}
                    className={`rounded-full border-2 border-[#0f172a] px-3.5 py-2 text-[11px] font-extrabold transition-colors ${actif ? 'bg-[#1a5f7a] text-white' : 'bg-white text-slate-500 hover:text-[#1a5f7a]'}`}
                  >
                    {actif ? '✓ ' : ''}{NOMS_MOIS[m.mois]} {m.annee}
                  </button>
                )
              })}
            </div>

            <div className="mb-2 mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1a5f7a]">Format</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { id: 'image', titre: 'Image', aide: 'Une image par mois, prête à publier ou à imprimer' },
                { id: 'pdf', titre: 'PDF', aide: 'Un seul fichier A4, une page par mois' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  aria-pressed={format === f.id}
                  className={`rounded-[16px] border-2 border-[#0f172a] px-4 py-3 text-left transition-colors ${format === f.id ? 'bg-white shadow-[3px_3px_0_#e38154]' : 'bg-transparent opacity-60 hover:opacity-100'}`}
                >
                  <span className="block text-[13px] font-extrabold">{format === f.id ? '● ' : '○ '}{f.titre}</span>
                  <span className="block text-[11.5px] text-slate-500">{f.aide}</span>
                </button>
              ))}
            </div>

            <button type="button" onClick={exporter} disabled={!coches.size || etat === 'calcul'} className={`${BTN_PRIMARY} mt-5 w-full`}>
              {etat === 'calcul'
                ? <><Loader2 size={16} className="animate-spin" /> Préparation…</>
                : `Télécharger ${format === 'pdf' ? 'le PDF' : coches.size > 1 ? `les ${coches.size} images` : "l'image"}`}
            </button>
            {etat === 'fait' && <p className="mt-3 text-center text-[12px] font-bold text-emerald-600">C'est prêt : regardez dans vos téléchargements.</p>}
            {etat === 'erreur' && <p className="mt-3 text-center text-[12px] font-bold text-rose-500">L'export n'a pas fonctionné. Réessayez.</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
