import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, Mail } from 'lucide-react'
import FormModal from './FormModal'
import MaskIcon from '../site/MaskIcon'
import { supabase } from '../../services/supabaseClient'

/**
 * Fenêtre « Modèles de messages » de l'écran Communication : deux textes de
 * présentation de la ludothèque, l'un pour la presse (proposer un article),
 * l'autre pour les écoles (informer les familles, proposer un temps de jeu).
 *
 * Horaires, adresse, tarifs et contact sont lus dans les Paramètres (jamais en
 * dur), le nombre de jeux dans le catalogue. Chaque texte reste modifiable avant
 * d'être copié ou ouvert dans la messagerie du bénévole.
 */

const RANGS = { '1': '1ers', '2': '2es', '3': '3es', '4': '4es', '5': 'derniers' }
const heure = h => (h || '').slice(0, 5).replace(':00', 'h').replace(':', 'h')

// « les 1ers samedis du mois de 10h à 12h et les 3es samedis de 14h à 16h »
function permanences(s) {
  const creneau = (n, avecMois) => {
    const jour = (s[`horaire_${n}_jour`] || 'Samedi').toLowerCase()
    return `les ${RANGS[s[`horaire_${n}_rang`]] || ''} ${jour}s${avecMois ? ' du mois' : ''} de ${heure(s[`horaire_${n}_debut`])} à ${heure(s[`horaire_${n}_fin`])}`
  }
  return s.horaire_2_actif === 'true' ? `${creneau(1, true)} et ${creneau(2, false)}` : creneau(1, true)
}

// « plus de 300 jeux » : arrondi à la cinquantaine inférieure, pour ne pas
// avoir à corriger le texte à chaque nouveau jeu
function nombreJeux(n) {
  return n >= 50 ? `plus de ${Math.floor(n / 50) * 50} jeux` : `${n} jeux`
}

function tarif(s) {
  const prix = Number(s.prix_particulier) || 0
  const pactes = Number(s.cotisation_pactes) || 0
  const base = s.mode_adhesion_particulier === 'degressif'
    ? `${prix} € pour l'année civile (moins en cours d'année)`
    : `${prix} € par an`
  return pactes > 0 ? `${base}, plus ${pactes} € d'adhésion à l'association PACTES` : base
}

function construireModeles(s, jeux) {
  const adresse = [s.adresse_rue, s.adresse_ville].filter(Boolean).join(' à ')
  const signature = `${s.contact_nom || ''}
Ludothèque de Coligny – association PACTES
${s.contact_tel || ''}`
  const ouverture = `La ludothèque est ouverte ${permanences(s)}${adresse ? `, au ${adresse}` : ''}.`

  return {
    presse: {
      objet: 'La ludothèque de Coligny : proposition d’article',
      texte: `Bonjour,

Je me permets de vous présenter la ludothèque de Coligny, portée par l'association PACTES.

Nous prêtons ${nombreJeux(jeux)} de société aux familles, aux enfants et aux adultes de Coligny et des communes voisines (Saint-Amour, Marboz, Beaupont, Pirajoux…). ${ouverture} Nous organisons aussi régulièrement des soirées et des après-midi jeux, ouverts à tous.

L'adhésion se fait par foyer : ${tarif(s)}. Chaque foyer peut ensuite emprunter ${s.quota_particulier || 3} jeux pour un mois.

Un article ou une brève dans vos pages nous aiderait beaucoup à nous faire connaître. Nous serions ravis de vous accueillir lors d'une permanence ou d'une soirée jeux, et je peux vous transmettre des photos.

Toutes les informations sont sur notre site : https://www.ludothequedecoligny.fr

Bien cordialement,

${signature}`,
    },
    ecole: {
      objet: 'Ludothèque de Coligny : des jeux à emprunter pour les familles',
      texte: `Bonjour,

Je me permets de vous présenter la ludothèque de Coligny, portée par l'association PACTES.

Nous prêtons ${nombreJeux(jeux)} de société, pour tous les âges. Chaque foyer adhérent peut emprunter ${s.quota_particulier || 3} jeux pour un mois. ${ouverture}

Pourriez-vous transmettre cette information aux familles de l'école (cahier de liaison, panneau d'affichage ou messagerie de l'école) ? Nous pouvons vous fournir une affiche.

Nous serions aussi heureux d'imaginer avec vous un temps de jeu avec les élèves, à l'école ou à la ludothèque, si cela peut s'inscrire dans vos projets.

Toutes les informations sont sur notre site : https://www.ludothequedecoligny.fr

Bien cordialement,

${signature}`,
    },
  }
}

const ONGLETS = [
  { id: 'presse', label: 'Presse', icon: 'ludo-presse.svg', aide: 'Proposer un article sur la ludothèque' },
  { id: 'ecole', label: 'École', icon: 'ludo-ecole.svg', aide: 'Informer les familles, proposer un temps de jeu' },
]

const CHAMP = 'w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-[13px] font-medium text-[#0f172a] outline-none focus:bg-white'
const BOUTON = 'flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[#0f172a] px-3.5 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.1em] transition-colors'

export default function ModelesMessages({ open, onClose }) {
  const [modeles, setModeles] = useState(null)
  const [onglet, setOnglet] = useState('presse')
  const [copie, setCopie] = useState('')

  // À chaque ouverture : textes reconstruits avec les Paramètres du moment
  useEffect(() => {
    if (!open) return
    let annule = false
    setModeles(null)
    ;(async () => {
      const [{ data: reglages }, { count }] = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('games').select('*', { count: 'exact', head: true }),
      ])
      const s = {}
      ;(reglages || []).forEach(r => { s[r.id] = r.value })
      if (!annule) setModeles(construireModeles(s, count || 0))
    })()
    return () => { annule = true }
  }, [open])

  const copier = async (cle, valeur) => {
    try {
      await navigator.clipboard.writeText(valeur)
      setCopie(cle)
      setTimeout(() => setCopie(c => (c === cle ? '' : c)), 1500)
    } catch { /* presse-papiers refusé par le navigateur */ }
  }

  const modifier = (champ, valeur) =>
    setModeles(m => ({ ...m, [onglet]: { ...m[onglet], [champ]: valeur } }))

  const actuel = modeles?.[onglet]

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Modèles de"
      titleAccent="messages"
      subtitle="Présenter la ludothèque — à copier dans votre messagerie"
      maxWidth={720}
    >
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-[18px] border-2 border-[#0f172a] bg-slate-100 p-1.5 sm:flex sm:w-fit">
        {ONGLETS.map(o => {
                    return (
            <button
              key={o.id}
              type="button"
              onClick={() => setOnglet(o.id)}
              className={'flex items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] transition-colors ' +
                (onglet === o.id ? 'bg-white text-[#1a5f7a] shadow-sm' : 'text-slate-400 hover:text-slate-600')}
            >
              <MaskIcon file={o.icon} size={18} color="currentColor" /> {o.label}
            </button>
          )
        })}
      </div>
      <p className="mb-4 ml-1 text-[10.5px] font-medium text-slate-500">
        {ONGLETS.find(o => o.id === onglet)?.aide}. Horaires, adresse et tarifs viennent des Paramètres ;
        le texte reste modifiable avant de le copier.
      </p>

      {!actuel ? (
        <div className="flex items-center justify-center py-16 text-[#1a5f7a]">
          <Loader2 className="animate-spin" size={26} />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Objet</label>
              <button type="button" onClick={() => copier('objet', actuel.objet)}
                className={`${BOUTON} ${copie === 'objet' ? 'bg-[#10b981] text-white' : 'bg-white text-[#1a5f7a] hover:bg-[#1a5f7a] hover:text-white'}`}>
                {copie === 'objet' ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
              </button>
            </div>
            <input className={`${CHAMP} font-bold`} value={actuel.objet} onChange={e => modifier('objet', e.target.value)} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]">Message</label>
              <button type="button" onClick={() => copier('texte', actuel.texte)}
                className={`${BOUTON} ${copie === 'texte' ? 'bg-[#10b981] text-white' : 'bg-white text-[#1a5f7a] hover:bg-[#1a5f7a] hover:text-white'}`}>
                {copie === 'texte' ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
              </button>
            </div>
            <textarea rows={14} className={`${CHAMP} resize-y leading-relaxed`} value={actuel.texte} onChange={e => modifier('texte', e.target.value)} />
          </div>

          <a
            href={`mailto:?subject=${encodeURIComponent(actuel.objet)}&body=${encodeURIComponent(actuel.texte)}`}
            className={`${BOUTON} w-full bg-[#1a5f7a] py-3.5 text-white hover:bg-[#0f172a]`}
          >
            <Mail size={13} /> Ouvrir dans ma messagerie
          </a>
        </div>
      )}
    </FormModal>
  )
}
