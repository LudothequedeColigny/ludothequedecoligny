import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Dice5, Loader2, RefreshCw, Share2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { DataCard } from './DataCard'
import { chargerJeuxAAnnoncer } from '../../services/nouveauxJeux'
import SocialPostPreview from './SocialPostPreview'
import {
  MAX_SOCIAL_PHOTOS, publierSurReseaux, uploadSocialBlob, uploadSquareVersion,
} from '../../services/reseauxSociaux'

/**
 * Onglet « Nouveaux jeux » de l'écran Communication : annoncer sur Facebook et
 * Instagram les jeux qui viennent d'entrer dans la collection.
 *
 * Chaque jeu ajouté depuis le 1er septembre 2026 est proposé une fois, coché d'office.
 * À la publication, les cochés sont notés « annonce », les décochés « ecarte »
 * (table annonces_jeux, réservée aux bénévoles) : ils ne reviennent plus.
 *
 * Carrousel publié : une couverture « Nouveaux jeux » dessinée ici (mosaïque des
 * jaquettes, charte papier découpé), puis une jaquette mise au carré par jeu.
 */

// La couverture occupe la première place du carrousel
const MAX_JAQUETTES = MAX_SOCIAL_PHOTOS - 1

// ─── Texte proposé ───────────────────────────────────────────────────────────

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const heure = h => (h || '').slice(0, 5).replace(':00', 'h').replace(':', 'h')

// Date du n-ième jour de la semaine d'un mois (rang 5 = le dernier)
function nIemeJour(annee, mois, jourSemaine, rang) {
  if (rang === 5) {
    const d = new Date(annee, mois + 1, 0)
    while (d.getDay() !== jourSemaine) d.setDate(d.getDate() - 1)
    return d
  }
  const d = new Date(annee, mois, 1)
  while (d.getDay() !== jourSemaine) d.setDate(d.getDate() + 1)
  d.setDate(d.getDate() + (rang - 1) * 7)
  return d.getMonth() === mois ? d : null
}

/** Prochaine permanence d'après les Paramètres (« samedi 7 novembre, de 10h à 12h »). */
function prochainePermanence(s, maintenant = new Date()) {
  const creneaux = [1, ...(s.horaire_2_actif === 'true' ? [2] : [])].map(n => ({
    jour: JOURS.indexOf((s[`horaire_${n}_jour`] || 'Samedi').toLowerCase()),
    rang: Number(s[`horaire_${n}_rang`]) || 1,
    debut: s[`horaire_${n}_debut`] || '',
    fin: s[`horaire_${n}_fin`] || '',
  })).filter(c => c.jour >= 0)

  const candidats = []
  for (let m = 0; m < 3; m++) {
    const ref = new Date(maintenant.getFullYear(), maintenant.getMonth() + m, 1)
    for (const c of creneaux) {
      const d = nIemeJour(ref.getFullYear(), ref.getMonth(), c.jour, c.rang)
      if (!d) continue
      const [hh, mm] = (c.fin || '23:59').split(':').map(Number)
      d.setHours(hh || 23, mm || 0)
      if (d > maintenant) candidats.push({ date: d, c })
    }
  }
  candidats.sort((a, b) => a.date - b.date)
  const p = candidats[0]
  if (!p) return null
  const jour = p.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${jour}, de ${heure(p.c.debut)} à ${heure(p.c.fin)}`
}

// « 2 à 4 joueurs, dès 8 ans » — seulement les chiffres cohérents
function detailsJeu(j) {
  const parts = []
  const min = Number(j.min_players) || 0
  const max = Number(j.max_players) || 0
  if (min && max && max >= min) parts.push(min === max ? `${min} joueur${min > 1 ? 's' : ''}` : `${min} à ${max} joueurs`)
  if (Number(j.min_age) > 0) parts.push(`dès ${j.min_age} ans`)
  return parts.length ? ` (${parts.join(', ')})` : ''
}

function construireTexte(jeux, reglages) {
  const n = jeux.length
  const permanence = prochainePermanence(reglages)
  const adresse = [reglages.adresse_rue, reglages.adresse_ville].filter(Boolean).join(' à ')
  return `🎲 Du nouveau à la ludothèque ! ${n > 1 ? `${n} jeux rejoignent` : 'Un jeu rejoint'} notre collection :

${jeux.map(j => `• ${(j.name || "").trim()}${detailsJeu(j)}`).join('\n')}

${permanence ? `À emprunter dès la prochaine permanence : ${permanence}${adresse ? `, au ${adresse}` : ''}.` : 'À emprunter dès la prochaine permanence.'}

Pas encore adhérent ? Toutes les infos sur ludothequedecoligny.fr/adherer`
}

// ─── Couverture « Nouveaux jeux » ────────────────────────────────────────────

const TAILLE = 1080
const ENCRE = '#0f172a'
const ORANGE = '#e38154'
const BLEU = '#1a5f7a'

const chargerImage = url => new Promise(resolve => {
  const img = new window.Image()
  img.crossOrigin = 'anonymous'   // jaquettes hébergées chez Supabase, qui l'autorise
  img.onload = () => resolve(img)
  img.onerror = () => resolve(null)
  img.src = url
})

function rectangleArrondi(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

/** Dessine la couverture et renvoie le canvas (ou null si aucune jaquette lisible). */
async function dessinerCouverture(jeux) {
  await Promise.all([
    document.fonts.load(`800 120px "Bricolage Grotesque"`),
    document.fonts.load(`600 30px "Poppins"`),
    document.fonts.load(`800 30px "Poppins"`),
  ]).catch(() => {})
  const images = (await Promise.all(jeux.map(j => (j.image_url ? chargerImage(j.image_url) : null)))).filter(Boolean)

  const canvas = document.createElement('canvas')
  canvas.width = TAILLE
  canvas.height = TAILLE
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#fdfaf6'
  ctx.fillRect(0, 0, TAILLE, TAILLE)

  // En-tête : « LUDOTHÈQUE DE COLIGNY », puis « Nouveaux jeux » en deux tons
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = BLEU
  ctx.font = `800 30px "Poppins", sans-serif`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px'
  ctx.fillText('LUDOTHÈQUE DE COLIGNY', 72, 112)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '-3px'
  ctx.font = `800 128px "Bricolage Grotesque", sans-serif`
  ctx.fillStyle = ENCRE
  ctx.fillText('Nouveaux', 66, 236)
  const largeur = ctx.measureText('Nouveaux ').width
  ctx.fillStyle = ORANGE
  ctx.fillText('jeux', 66 + largeur, 236)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  // Soulignement orange, comme sous le titre de l'espace de gestion
  ctx.fillStyle = ORANGE
  rectangleArrondi(ctx, 72, 262, 120, 12, 6)
  ctx.fill()

  // Mosaïque des jaquettes : cases blanches contourées, ombre pleine décalée
  const n = Math.max(1, images.length)
  const cols = n === 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4
  const lignes = Math.ceil(n / cols)
  const zone = { x: 72, y: 318, w: TAILLE - 144, h: 620 }
  const ecart = 34
  const ombre = 14
  const cote = Math.min(
    (zone.w - ecart * (cols - 1) - ombre) / cols,
    (zone.h - ecart * (lignes - 1) - ombre) / lignes,
  )
  const largeurGrille = cols * cote + (cols - 1) * ecart
  const hauteurGrille = lignes * cote + (lignes - 1) * ecart
  const x0 = zone.x + (zone.w - largeurGrille - ombre) / 2
  const y0 = zone.y + (zone.h - hauteurGrille - ombre) / 2

  images.forEach((img, i) => {
    const ligne = Math.floor(i / cols)
    // Dernière ligne incomplète : centrée
    const dansLigne = ligne === lignes - 1 ? n - ligne * cols : cols
    const decalage = ((cols - dansLigne) * (cote + ecart)) / 2
    const x = x0 + decalage + (i % cols) * (cote + ecart)
    const y = y0 + ligne * (cote + ecart)
    const rayon = Math.round(cote * 0.09)

    ctx.fillStyle = i % 2 === 0 ? BLEU : ORANGE
    rectangleArrondi(ctx, x + ombre, y + ombre, cote, cote, rayon)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    rectangleArrondi(ctx, x, y, cote, cote, rayon)
    ctx.fill()

    // Jaquette entière (« contain ») avec une marge intérieure
    const marge = cote * 0.07
    const place = cote - 2 * marge
    const echelle = Math.min(place / img.width, place / img.height)
    const w = img.width * echelle
    const h = img.height * echelle
    ctx.save()
    rectangleArrondi(ctx, x, y, cote, cote, rayon)
    ctx.clip()
    ctx.drawImage(img, x + (cote - w) / 2, y + (cote - h) / 2, w, h)
    ctx.restore()

    ctx.lineWidth = 6
    ctx.strokeStyle = ENCRE
    rectangleArrondi(ctx, x, y, cote, cote, rayon)
    ctx.stroke()
  })

  // Pied : le mois à gauche, le site à droite
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  ctx.font = `800 30px "Poppins", sans-serif`
  ctx.fillStyle = ORANGE
  ctx.textAlign = 'left'
  ctx.fillText(mois.charAt(0).toUpperCase() + mois.slice(1), 72, 1012)
  ctx.font = `600 30px "Poppins", sans-serif`
  ctx.fillStyle = BLEU
  ctx.textAlign = 'right'
  ctx.fillText('ludothequedecoligny.fr', TAILLE - 72, 1012)
  ctx.textAlign = 'left'

  return images.length > 0 ? canvas : null
}

const versBlob = canvas => new Promise(resolve => {
  try { canvas.toBlob(b => resolve(b), 'image/jpeg', 0.9) } catch { resolve(null) }
})

// ─── Onglet ──────────────────────────────────────────────────────────────────

export default function NouveauxJeux({ onCountChange }) {
  const [chargement, setChargement] = useState(true)
  const [aAnnoncer, setAAnnoncer] = useState([])
  const [ecartes, setEcartes] = useState([])
  const [voirEcartes, setVoirEcartes] = useState(false)
  const [coches, setCoches] = useState(new Set())
  const [reglages, setReglages] = useState({})
  const [texte, setTexte] = useState('')
  const [texteModifie, setTexteModifie] = useState(false)
  const [couverture, setCouverture] = useState(null) // { canvas, url } pour l'aperçu
  const [publication, setPublication] = useState('') // '' | 'en-cours' | 'ok'
  const [erreur, setErreur] = useState('')
  const dessinEnCours = useRef(0)

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const [{ aAnnoncer: a, ecartes: e }, { data: s }] = await Promise.all([
        chargerJeuxAAnnoncer(),
        supabase.from('settings').select('*'),
      ])
      const obj = {}
      ;(s || []).forEach(r => { obj[r.id] = r.value })
      setReglages(obj)
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
    if (!texteModifie) setTexte(choisis.length ? construireTexte(choisis, reglages) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleChoix, reglages, texteModifie])

  // Couverture redessinée à chaque changement de sélection
  useEffect(() => {
    if (choisis.length === 0) { setCouverture(null); return }
    const numero = ++dessinEnCours.current
    dessinerCouverture(choisis).then(canvas => {
      if (numero !== dessinEnCours.current) return
      setCouverture(canvas ? { canvas, url: canvas.toDataURL('image/jpeg', 0.85) } : null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleChoix])

  const basculer = id => {
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

  const publier = async () => {
    if (choisis.length === 0 || !texte.trim() || !couverture) return
    setPublication('en-cours')
    setErreur('')
    try {
      const horodatage = Date.now()
      const blob = await versBlob(couverture.canvas)
      const urlCouverture = blob && await uploadSocialBlob(blob, `nouveaux-jeux/couverture-${horodatage}.jpg`)
      if (!urlCouverture) throw new Error('Couverture non enregistrée')

      // Une jaquette à la fois : plusieurs grandes images décodées en même
      // temps saturent la mémoire des téléphones
      const jaquettes = []
      for (const j of choisis.slice(0, MAX_JAQUETTES)) {
        if (!j.image_url) continue
        const url = await uploadSquareVersion(j.image_url, `nouveaux-jeux/jeu-${j.id}-social.jpg`, { encadre: true })
        if (url) jaquettes.push(url)
      }

      await publierSurReseaux({
        message: texte,
        imageUrls: [urlCouverture, ...jaquettes],
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
  const peutPublier = choisis.length > 0 && texte.trim() && couverture && publication !== 'en-cours'

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
                {choisis.length > MAX_JAQUETTES && (
                  <p className="mt-3 rounded-[14px] border-2 border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-[11px] font-semibold text-[#b45309]">
                    {choisis.length} jeux cochés : la couverture les montre tous, mais le carrousel ne peut contenir que
                    les {MAX_JAQUETTES} premières jaquettes (Instagram limite à 10 images).
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
              onChange={e => { setTexte(e.target.value); setTexteModifie(true); setPublication('') }}
            />

            <SocialPostPreview
              text={texte}
              imageUrls={couverture ? [couverture.url, ...choisis.slice(0, MAX_JAQUETTES).map(j => j.image_url).filter(Boolean)] : []}
            />

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
                  : <><Share2 size={16} /> Publier {choisis.length > 0 ? `(${Math.min(choisis.length, MAX_JAQUETTES) + 1} images)` : ''}</>}
              </button>
            )}
          </div>
        </div>
      )}
    </DataCard>
  )
}
