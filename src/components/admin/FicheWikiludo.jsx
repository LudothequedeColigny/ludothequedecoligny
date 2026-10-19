import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react'
import Modal from '../site/Modal'
import { volunteerHeaders } from '../../services/functionHeaders'

/**
 * Fenêtre « Fiche pour Wikiludo » : pour un jeu absent de Wikiludo, présente chaque
 * champ de la grille de catalogage Wikiludo, dans l'ordre de la grille (guide de
 * catalogage, pages 7 à 13), avec un bouton « Copier » à côté de chacun. Le bénévole
 * colle ainsi chaque information directement dans la bonne case.
 *
 * Sources : la fiche du catalogue telle qu'elle est à l'écran (corrections comprises),
 * complétée par MyLudo (auteurs, éditeur, inventaire, dimensions…). Seul le code
 * ESAR n'est disponible nulle part : il reste à déterminer par le bénévole.
 *
 * Utilisée sur ordinateur seulement (la saisie dans Wikiludo est trop fastidieuse
 * sur téléphone).
 */

const MYLUDO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`
const WIKILUDO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wikiludo`

// ── ESAR, facette A (types de jeux) — annexe 2 du guide de catalogage Wikiludo ──
const FACETTE_A = {
  A101: 'Jeu sensoriel sonore', A102: 'Jeu sensoriel visuel', A103: 'Jeu sensoriel tactile',
  A104: 'Jeu sensoriel olfactif', A105: 'Jeu sensoriel gustatif', A106: 'Jeu moteur',
  A107: 'Jeu de manipulation', A108: "Jeu d'action-réaction virtuel",
  A201: 'Jeu de rôle', A202: 'Jeu de mise en scène', A203: 'Jeu de production graphique à deux dimensions',
  A204: 'Jeu de production à trois dimensions', A205: 'Jeu de simulation virtuel',
  A301: 'Jeu de construction à trois dimensions', A302: "Jeu d'agencement à deux dimensions",
  A303: 'Jeu de montage scientifique', A304: 'Jeu de montage virtuel',
  A401: "Jeu d'association", A402: 'Jeu de séquence', A403: 'Jeu de circuit et de parcours',
  A404: "Jeu d'adresse", A405: 'Jeu sportif et moteur', A406: 'Jeu de stratégie', A407: 'Jeu de hasard',
  A408: 'Jeu questionnaire', A409: 'Jeu mathématique', A410: "Jeu de langage et d'expression",
  A411: "Jeu d'énigme", A412: 'Jeu de règles virtuel',
}
const avecLibelle = code => FACETTE_A[code] ? `${code} – ${FACETTE_A[code]}` : code

// Suggestion de facette A d'après les mécanismes et thèmes MyLudo et la catégorie du
// catalogue. Simple correspondance de mots : une SUGGESTION, que le bénévole vérifie.
// « =mot » : le mécanisme entier doit être ce mot (« Dés », et non « placement des cartes »).
const INDICES_FACETTE_A = [
  ['A411', ['enigme', 'deduction', 'casse-tete', 'logique', 'escape', 'enquete', 'mystere']],
  ['A408', ['quiz', 'question', 'culture generale', 'connaissance']],
  ['A410', ['=mots', 'lettre', 'vocabulaire', 'langage', 'narration', 'mime', 'dessin', 'communication']],
  ['A409', ['calcul', 'chiffre', 'nombre', 'mathemat']],
  ['A404', ['adresse', 'dexterite', 'pichenette', 'equilibre', 'empilement', 'rapidite', 'reflexe', 'vitesse']],
  ['A405', ['sport', 'motricite', 'exterieur']],
  ['A403', ['parcours', 'course', 'circuit', 'roll and move', 'deplacement']],
  ['A402', ['sequence', 'domino']],
  ['A401', ['association', 'memory', 'memoire', 'collection', 'jeu de familles', 'paire', 'observation']],
  ['A407', ['hasard', '=des', 'lancer de des', 'pari', 'stop ou encore', 'loto', 'bataille', 'bluff']],
  ['A406', ['strategie', 'majorite', 'placement', 'ouvrier', 'gestion', 'deck', 'draft', 'controle', 'territoire', 'tuile', 'enchere', 'negociation', 'combinaison', 'programmation']],
  ['A301', ['construction', 'assemblage']],
  ['A302', ['puzzle']],
]
const sansAccent = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function suggestionFacetteA(mots) {
  const scores = {}
  const raisons = {}
  for (const mot of mots.filter(Boolean)) {
    const m = sansAccent(mot).trim()
    for (const [code, indices] of INDICES_FACETTE_A) {
      if (indices.some(i => i.startsWith('=') ? m === i.slice(1) : m.includes(i))) {
        scores[code] = (scores[code] || 0) + 1
        ;(raisons[code] ||= []).push(mot)
      }
    }
  }
  const meilleur = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return meilleur ? { code: meilleur[0], raisons: [...new Set(raisons[meilleur[0]])] } : null
}

// Durée en minutes → catégories de Wikiludo (guide : court 0-20 min, moyen 20-60, long au-delà)
const categorieDuree = minutes => !minutes ? '' : minutes <= 20 ? 'Jeu court' : minutes <= 60 ? 'Jeu moyen' : 'Jeu long'
const liste = valeurs => (valeurs || []).filter(Boolean).join(', ')

function sections(jeu, ml, sudoc) {
  const m = ml || {}
  const suggestion = suggestionFacetteA([...(m.mechanisms || []), ...(m.themes || []), ...(jeu.category || '').split(',')])
  const sudocCodes = sudoc?.codes || []
  const sudocTexte = sudocCodes.length || sudoc?.libelles?.length
    ? [sudocCodes.map(avecLibelle).join(' ; '), sudoc.libelles?.length ? `(libellé : ${sudoc.libelles.join(', ')})` : ''].filter(Boolean).join(' ')
    : ''
  const minutes = parseInt(jeu.duration) || m.durationMax || m.duration || 0
  const image = /^https?:/.test(jeu.image_url || '') ? jeu.image_url : m.image
  return [
    { titre: 'Code', champs: [
      { label: 'EAN / ISBN du document', valeur: jeu.barcode },
    ] },
    { titre: 'Expression', champs: [
      { label: "Langue de l'expression", valeur: liste(m.languages) },
      { label: 'Langue originale', valeur: '', aide: 'Non disponible : langue d’origine du jeu' },
    ] },
    { titre: 'Description', champs: [
      { label: 'Titre', valeur: m.name || jeu.name },
      { label: 'Complément (sous-titre)', valeur: m.subtitle },
      { label: 'Auteurs (niveau principal)', valeur: liste(m.authors) },
      { label: 'Illustrateurs (niveau secondaire)', valeur: liste(m.illustrators) },
      { label: 'Éditeur', valeur: liste(m.publishers) },
      { label: "Année d'édition", valeur: m.year },
      { label: 'Diffuseur ou distributeur', valeur: liste(m.distributors) },
      { label: 'Importance matérielle', valeur: '', aide: 'À choisir dans la liste Wikiludo (ex. « 1 boite en carton »)' },
      { label: 'Format (L x l x h, en cm)', valeur: m.format },
      { label: 'Prix public', valeur: m.price ? `${Number(m.price).toFixed(2).replace('.', ',')} EUR` : '' },
    ] },
    { titre: 'Classifications et indexations', champs: [
      {
        label: 'ESAR – trouvé dans le Sudoc',
        valeur: sudocTexte,
        copie: sudocCodes.join(', ') || sudoc?.libelles?.join(', '),
        aide: sudoc === undefined ? 'Recherche dans le Sudoc…' : 'Absent du Sudoc (catalogue des bibliothèques universitaires)',
        note: 'À vérifier : les classifications varient d’une bibliothèque à l’autre.',
      },
      {
        label: 'ESAR – suggestion facette A',
        valeur: suggestion ? `${avecLibelle(suggestion.code)} (d’après : ${suggestion.raisons.join(', ')})` : '',
        copie: suggestion?.code,
        aide: 'Pas de suggestion : à déterminer (facette A obligatoire, voir l’annexe 2 du guide)',
        note: 'Suggestion automatique, à vérifier avant de la reporter dans Wikiludo.',
      },
      { label: 'Durée de partie', valeur: categorieDuree(minutes) },
      { label: 'Âge minimum conseillé', valeur: jeu.min_age ? `A partir de ${jeu.min_age} ans` : '' },
      { label: 'Nombre de joueurs minimum', valeur: jeu.min_players ? String(jeu.min_players) : '' },
      { label: 'Nombre de joueurs maximum', valeur: jeu.max_players ? String(jeu.max_players) : '' },
      { label: 'Mécanismes de jeu', valeur: liste(m.mechanisms) },
      { label: 'Indexations matières (mots-clés)', valeur: liste(m.themes) },
    ] },
    { titre: 'Analyse', champs: [
      { label: 'Lien externe : image (vignette)', valeur: image },
      { label: 'Lien externe : vidéo-règle', valeur: jeu.youtube_url },
      { label: 'Résumé', valeur: jeu.description || m.description, long: true },
      { label: 'Note sur la description matérielle (inventaire)', valeur: m.contents, long: true },
      { label: 'Note sur les récompenses', valeur: (m.awards || []).join(' ; ') },
    ] },
  ]
}

export default function FicheWikiludo({ open, onClose, jeu }) {
  const [myludo, setMyludo] = useState(null)
  const [etat, setEtat] = useState('attente')   // attente | ok | absent | erreur
  const [copie, setCopie] = useState('')
  const [sudoc, setSudoc] = useState(undefined)   // undefined = en cours, null = indisponible

  // À l'ouverture : la fiche MyLudo du même code-barres, pour les champs que le
  // catalogue de la ludothèque ne contient pas
  useEffect(() => {
    if (!open) return
    const ean = (jeu?.barcode || '').trim()
    setMyludo(null)
    if (!ean) { setEtat('absent'); return }
    setEtat('attente')
    let annule = false
    ;(async () => {
      try {
        const qs = new URLSearchParams({ endpoint: 'search-by-barcode', barcode: ean }).toString()
        const res = await fetch(`${MYLUDO_URL}?${qs}`, { headers: await volunteerHeaders(), signal: AbortSignal.timeout(15000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const fiche = await res.json()
        if (annule) return
        setMyludo(fiche)
        setEtat(fiche ? 'ok' : 'absent')
      } catch (e) {
        console.warn('Fiche Wikiludo – MyLudo :', e)
        if (!annule) setEtat('erreur')
      }
    })()
    return () => { annule = true }
  }, [open, jeu?.barcode])

  // À l'ouverture : la classification ESAR éventuellement donnée par le Sudoc
  useEffect(() => {
    if (!open) return
    const ean = (jeu?.barcode || '').trim()
    setSudoc(undefined)
    if (!/^\d{8,14}$/.test(ean)) { setSudoc(null); return }
    let annule = false
    ;(async () => {
      try {
        const res = await fetch(`${WIKILUDO_URL}?source=sudoc&ean=${encodeURIComponent(ean)}`, { headers: await volunteerHeaders(), signal: AbortSignal.timeout(25000) })
        const r = res.ok ? await res.json() : null
        if (!annule) setSudoc(r)
      } catch (e) {
        console.warn('Fiche Wikiludo – Sudoc :', e)
        if (!annule) setSudoc(null)
      }
    })()
    return () => { annule = true }
  }, [open, jeu?.barcode])

  const copier = async (cle, valeur) => {
    try {
      await navigator.clipboard.writeText(valeur)
      setCopie(cle)
      setTimeout(() => setCopie(c => (c === cle ? '' : c)), 1500)
    } catch { /* presse-papiers refusé par le navigateur */ }
  }

  if (!jeu) return null

  return (
    <Modal open={open} onClose={onClose} title="Fiche pour Wikiludo" maxWidth={780} scroll backdrop="ink" panelClassName="p-7 md:p-9">
      <div className="mb-6 pr-14">
        <h2 className="font-display text-[24px] font-extrabold uppercase tracking-[-0.04em]">
          Fiche pour <span className="text-[#1a5f7a]">Wikiludo</span>
        </h2>
        <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-500">
          Dans Wikiludo : <strong>Catalogues → Ajouter → Document → Jeu / Jouet</strong>. Les champs ci-dessous suivent
          l'ordre de la grille : copiez-les un par un dans la case correspondante.
        </p>
        <a
          href="https://sigb01.decalog.net"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-[12px] border-2 border-[#0f172a] bg-[#1a5f7a] px-4 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#0f172a]"
        >
          <ExternalLink size={13} /> Ouvrir Wikiludo
        </a>
      </div>

      {etat === 'attente' && (
        <p className="mb-5 flex items-center gap-2 text-[11px] font-extrabold text-[#1a5f7a]">
          <Loader2 size={13} className="animate-spin" /> Recherche des informations complémentaires sur MyLudo…
        </p>
      )}
      {(etat === 'absent' || etat === 'erreur') && (
        <p className="mb-5 rounded-[14px] border-2 border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-[11px] font-semibold text-[#b45309]">
          {etat === 'absent'
            ? 'Ce jeu est inconnu de MyLudo : seules les informations de votre catalogue sont proposées.'
            : "MyLudo n'a pas répondu : seules les informations de votre catalogue sont proposées."}
        </p>
      )}

      <div className="space-y-6">
        {sections(jeu, myludo, sudoc).map(section => (
          <section key={section.titre}>
            <h3 className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e38154]">{section.titre}</h3>
            <div className="overflow-hidden rounded-[18px] border-2 border-[#0f172a]">
              {section.champs.map((champ, i) => {
                const cle = `${section.titre}-${champ.label}`
                const valeur = (champ.valeur || '').toString().trim()
                const aCopier = (champ.copie || valeur).toString().trim()
                return (
                  <div key={cle} className={`flex items-start gap-4 px-4 py-3 ${i > 0 ? 'border-t border-slate-200' : ''} ${valeur ? 'bg-white' : 'bg-[#fdfaf6]'}`}>
                    <div className="w-[190px] shrink-0 pt-0.5 text-[9.5px] font-extrabold uppercase leading-snug tracking-[0.1em] text-slate-400">
                      {champ.label}
                    </div>
                    <div className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${champ.long ? 'max-h-28 overflow-y-auto' : ''}`}>
                      {valeur
                        ? <span className="break-words font-semibold text-[#0f172a]">{valeur}</span>
                        : <span className="italic text-slate-400">{champ.aide || 'Non trouvé'}</span>}
                      {valeur && champ.note && <span className="mt-1 block text-[10.5px] italic text-[#b45309]">{champ.note}</span>}
                    </div>
                    {valeur && (
                      <button
                        type="button"
                        onClick={() => copier(cle, aCopier)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-[10px] border-2 border-[#0f172a] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] transition-colors ${
                          copie === cle ? 'bg-[#10b981] text-white' : 'bg-white text-[#1a5f7a] hover:bg-[#1a5f7a] hover:text-white'
                        }`}
                      >
                        {copie === cle ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  )
}
