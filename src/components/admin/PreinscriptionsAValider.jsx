import { Trash2, Mail, Phone, MapPin, Building2 } from 'lucide-react'
import MaskIcon from '../site/MaskIcon'
import IconButton from './IconButton'
import { BTN_ORANGE } from './buttons'

/**
 * Écran Adhérents : demandes faites sur la page publique /adherer, en attente
 * du passage de la personne à une permanence. « Valider » ouvre la fiche
 * adhérent pré-remplie ; la demande disparaît une fois la fiche enregistrée.
 * Rien ne s'affiche quand il n'y a aucune demande.
 */
export default function PreinscriptionsAValider({ liste, onValider, onSupprimer }) {
  if (!liste.length) return null

  const ilYa = (date) => {
    const jours = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    return jours === 0 ? "aujourd'hui" : jours === 1 ? 'hier' : `il y a ${jours} jours`
  }

  return (
    <section
      className="mb-7 overflow-hidden rounded-[30px] border-2 border-[#0f172a] bg-[#fdf1ea]"
      style={{ boxShadow: '6px 6px 0 #e38154' }}
    >
      <div className="flex items-center gap-3 border-b-2 border-[#0f172a] bg-white px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#e38154] text-white">
          <MaskIcon file="ludo-preinscription.svg" size={26} color="currentColor" />
        </span>
        <h2 className="font-display text-[18px] font-extrabold uppercase tracking-[-0.03em]">
          Pré-inscriptions <span className="text-[#e38154]">à valider</span>
        </h2>
        <span className="ml-auto rounded-full bg-[#0f172a] px-3 py-1 text-[11px] font-extrabold text-white">{liste.length}</span>
      </div>

      <ul>
        {liste.map(p => (
          <li key={p.id} className="flex flex-col gap-3 border-b border-[#0f172a]/10 px-5 py-4 last:border-b-0 md:flex-row md:items-center md:gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-extrabold uppercase">
                {p.type === 'Association' && <Building2 size={14} className="shrink-0 text-slate-400" />}
                <span className="truncate">{p.nom} {p.prenom || ''}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-semibold text-slate-500">
                <span className="flex min-w-0 items-center gap-1.5"><Mail size={13} className="shrink-0" /> <span className="truncate">{p.email}</span></span>
                {p.telephone && <span className="flex items-center gap-1.5"><Phone size={13} /> {p.telephone}</span>}
                {p.commune && <span className="flex items-center gap-1.5"><MapPin size={13} /> {p.commune}</span>}
              </div>
              <div className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                Reçue {ilYa(p.created_at)}
                {p.origine && <> · Nous a connus : {p.origine}</>}
                {p.foyer && <> · Foyer : {p.foyer}</>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => onValider(p)} className={`${BTN_ORANGE} flex-1 py-3 md:flex-none`}>
                Valider l'adhésion
              </button>
              <IconButton tone="danger" title="Supprimer la demande" onClick={() => onSupprimer(p)}>
                <Trash2 size={17} />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
