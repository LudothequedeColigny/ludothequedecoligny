import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { compterVisite } from '../services/visites'
import { usePageMeta } from '../services/seo'
import PublicLayout from '../components/site/PublicLayout'
import FloatingIcons from '../components/site/FloatingIcons'
import Reveal from '../components/site/Reveal'
import MediaLightbox from '../components/site/MediaLightbox'
import RecevoirDates from '../components/site/RecevoirDates'
import { BTN_SECONDARY, EYEBROW } from '../components/site/styles'
import ChiffresCles from '../components/site/vie/ChiffresCles'
import GraphiqueFrequentation from '../components/site/vie/GraphiqueFrequentation'
import FiltresEvenements from '../components/site/vie/FiltresEvenements'
import CarteEvenement from '../components/site/vie/CarteEvenement'
import CartePermanence from '../components/site/vie/CartePermanence'
import ProchainRendezVous from '../components/site/vie/ProchainRendezVous'
import {
  cartesEvenements, chiffresCles, serieFrequentation, filtrer, compteurs, parMois,
} from '../services/vieLudotheque'
import { prochainRendezVous } from '../services/diapos/regles'
import { jourComplet } from '../services/diapos/permanence-regles'

/**
 * Page publique « La vie de la ludothèque » (/vie-association), dans le style des
 * bilans publiés sur les réseaux : chiffres clés, fréquentation, puis les rendez-vous
 * passés (soirées, après-midi en famille, permanences), regroupés par mois.
 * Conception : docs/superpowers/plans/2026-10-26-vie-ludotheque.md
 * Les jeux empruntés aux permanences viennent de la fonction jeux_empruntes_permanences()
 * (le visiteur ne peut pas lire les prêts) ; si elle manque, pas de carte de permanence
 * ni de chiffre d'emprunts, sans message d'erreur.
 */

// Cartes affichées d'abord, puis à chaque « Voir les événements plus anciens »
const PAR_PAGE = 6

/** Les permanences qui se suivent dans un mois se rangent côte à côte (sur ordinateur). */
function blocs(cartes) {
  const liste = []
  for (const c of cartes) {
    const dernier = liste[liste.length - 1]
    if (c.type === 'permanence' && dernier?.permanences) dernier.cartes.push(c)
    else liste.push({ permanences: c.type === 'permanence', cartes: [c] })
  }
  return liste
}

/** Fin de la page affichée : une paire de permanences du même mois n'est pas coupée en deux. */
function finDePage(cartes, n) {
  let fin = Math.min(n, cartes.length)
  const memeMois = (a, b) => a.date.getFullYear() === b.date.getFullYear() && a.date.getMonth() === b.date.getMonth()
  while (fin < cartes.length && cartes[fin - 1].type === 'permanence' && cartes[fin].type === 'permanence'
    && memeMois(cartes[fin - 1], cartes[fin])) fin++
  return fin
}

/** « Octobre 2026 » → Octobre + 2026 en orange */
function TitreMois({ titre }) {
  const i = titre.lastIndexOf(' ')
  return (
    <div className="mb-[26px] flex items-center gap-3.5 after:h-0.5 after:flex-1 after:rounded-[2px] after:bg-[#0f172a]/15 after:content-['']">
      <h3 className="whitespace-nowrap font-display text-[26px] font-extrabold tracking-[-0.045em] md:text-[34px]">
        {titre.slice(0, i)} <span className="text-[#e38154]">{titre.slice(i + 1)}</span>
      </h3>
    </div>
  )
}

export default function VieAssociation() {
  usePageMeta({
    title: 'La vie de la ludothèque',
    description: "Soirées jeux, après-midi en famille et permanences de la ludothèque de Coligny (Ain) : photos, chiffres et jeux joués lors de nos rendez-vous.",
    path: '/vie-association',
  })

  const [donnees, setDonnees] = useState(null)
  const [filtre, setFiltre] = useState('tout')
  const [nbAffiches, setNbAffiches] = useState(PAR_PAGE)
  // { items, index } — photos d'un événement dans la visionneuse
  const [galerie, setGalerie] = useState(null)

  useEffect(() => {
    let actif = true
    Promise.all([
      supabase.from('events').select('*'),
      supabase.from('event_photos').select('id, event_id, url'),
      supabase.from('event_games_played').select('id, event_id, name, image_url, in_catalogue'),
      supabase.from('settings').select('*').eq('id', 'adresse_rue'),
      supabase.rpc('jeux_empruntes_permanences'),
    ]).then(([evenements, photos, jeux, reglages, emprunts]) => {
      if (!actif) return
      setDonnees({
        evenements: evenements.data || [],
        photos: photos.data || [],
        jeux: jeux.data || [],
        adresse: (reglages.data?.[0]?.value || '').trim(),
        // Fonction absente ou en erreur : aucune carte de permanence, chiffre masqué
        emprunts: emprunts.error ? null : (emprunts.data || []),
      })
    }).catch(() => {
      if (actif) setDonnees({ evenements: [], photos: [], jeux: [], adresse: '', emprunts: null })
    })
    return () => { actif = false }
  }, [])

  // Comptage des visites (src/services/visites.js)
  useEffect(() => { compterVisite('vie-association') }, [])

  const vue = useMemo(() => {
    if (!donnees) return null
    const maintenant = new Date()
    const cartes = cartesEvenements({ ...donnees, maintenant })
    return {
      cartes,
      chiffres: chiffresCles({ cartes }),
      serie: serieFrequentation(cartes),
      compteurs: compteurs(cartes),
      prochain: prochainRendezVous(donnees.evenements.filter(e => !e.archived_at), maintenant),
    }
  }, [donnees])

  const choisirFiltre = f => {
    setFiltre(f)
    setNbAffiches(PAR_PAGE)
  }

  const filtrees = vue ? filtrer(vue.cartes, filtre) : []
  const limite = finDePage(filtrees, nbAffiches)
  const mois = parMois(filtrees.slice(0, limite))

  const ouvrirPhotos = (carte, index) => {
    const legende = `${carte.etiquette.replace(/\s*!$/, '')} · ${jourComplet(carte.date)}`
    setGalerie({ index, items: carte.photos.map((src, i) => ({ id: `${carte.id}-${i}`, src, title: legende })) })
  }

  return (
    <PublicLayout>
      <main>
        {/* ---------- EN-TÊTE ---------- */}
        <section className="relative overflow-hidden px-4 pb-[30px] pt-11 text-center md:px-10 md:pb-11 md:pt-[70px]">
          <FloatingIcons />
          <div className="relative z-10 mx-auto max-w-[1180px]">
            <h1 className="anim-soft-in font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.045em] md:text-[62px]">
              La vie de<br />
              <span className="mt-1 inline-block -rotate-[1.5deg] rounded-[16px] bg-[#e38154] px-[0.16em] text-white">
                la ludothèque
              </span>
            </h1>
            <p
              className="anim-soft-in mx-auto mt-[18px] max-w-[34em] text-[15px] font-medium leading-[1.65] text-slate-500 md:text-[18px]"
              style={{ animationDelay: '0.15s' }}
            >
              Nos soirées jeux, nos après-midi en famille et nos permanences, en photos et en chiffres.
            </p>
            {vue && vue.cartes.length > 0 && <ChiffresCles chiffres={vue.chiffres} />}
          </div>
        </section>

        {!vue && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#1a5f7a]" size={40} />
          </div>
        )}

        {/* ---------- FRÉQUENTATION ---------- */}
        {vue && vue.serie.length > 0 && (
          <section className="border-y-2 border-[#0f172a] bg-white px-4 pb-[60px] pt-14 md:px-10 md:pb-20 md:pt-[76px]">
            <div className="mx-auto max-w-[1100px]">
              <Reveal className="mb-[30px] text-center">
                <div className={EYEBROW}>Fréquentation</div>
                <h2 className="mt-2.5 font-display text-[28px] font-extrabold tracking-[-0.045em] md:text-[42px]">
                  Combien étions-nous ?
                </h2>
                <p className="mt-2 text-[13px] font-semibold text-slate-500">
                  Nombre de participants à chaque soirée jeux et après-midi en famille
                </p>
              </Reveal>
              <GraphiqueFrequentation serie={vue.serie} />
            </div>
          </section>
        )}

        {/* ---------- SOUVENIRS ---------- */}
        {vue && (
          <section className="px-4 pb-5 pt-[60px] md:px-10">
            <div className="mx-auto max-w-[1100px]">
              <Reveal className="mb-6 text-center">
                <div className={EYEBROW}>Souvenirs</div>
                <h2 className="mt-2.5 font-display text-[28px] font-extrabold tracking-[-0.045em] md:text-[42px]">
                  Nos derniers rendez-vous
                </h2>
              </Reveal>

              {vue.cartes.length === 0 ? (
                <div className="rounded-[30px] border-2 border-dashed border-[#0f172a]/30 bg-white py-12 text-center">
                  <p className="italic text-slate-400">Aucun souvenir enregistré pour le moment.</p>
                </div>
              ) : (
                <>
                  <FiltresEvenements filtre={filtre} compteurs={vue.compteurs} onChange={choisirFiltre} />

                  {mois.map(m => (
                    <div key={m.cle} className="mt-[46px]">
                      <TitreMois titre={m.titre} />
                      <div className="flex flex-col gap-[34px]">
                        {blocs(m.cartes).map(b => (
                          <Fragment key={b.cartes[0].id}>
                            {b.permanences ? (
                              <div className="grid grid-cols-1 gap-7 min-[860px]:grid-cols-2">
                                {b.cartes.map(c => (
                                  <Reveal key={c.id}>
                                    <CartePermanence carte={c} adresse={donnees.adresse} />
                                  </Reveal>
                                ))}
                              </div>
                            ) : (
                              <Reveal>
                                <CarteEvenement carte={b.cartes[0]} onPhotos={i => ouvrirPhotos(b.cartes[0], i)} />
                              </Reveal>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  ))}

                  {filtrees.length > limite && (
                    <div className="mb-2.5 mt-[50px] flex justify-center">
                      <button type="button" onClick={() => setNbAffiches(limite + PAR_PAGE)} className={BTN_SECONDARY}>
                        Voir les événements plus anciens
                        <ChevronDown size={16} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ---------- PROCHAIN RENDEZ-VOUS ---------- */}
        {vue?.prochain && <ProchainRendezVous evenement={vue.prochain} />}

        <div className="pb-16 md:pb-20">
          <RecevoirDates />
        </div>
      </main>

      {galerie && galerie.items.length > 0 && (
        <MediaLightbox
          items={galerie.items}
          index={galerie.index}
          fit="cover"
          onIndex={i => setGalerie(g => ({ ...g, index: i }))}
          onClose={() => setGalerie(null)}
        />
      )}
    </PublicLayout>
  )
}
