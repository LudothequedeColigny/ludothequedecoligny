import { useState } from 'react'
import { Mail, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import IconButton from './IconButton'

/**
 * Écran Adhérents : personnes non adhérentes qui ont demandé à recevoir les
 * prochaines dates (encart de l'accueil ou case du formulaire d'adhésion).
 * Elles reçoivent le message « adhérents » de l'écran Communication.
 * Repliée par défaut ; rien ne s'affiche tant que la liste est vide.
 */
export default function InscritsActualites({ liste, onSupprimer }) {
  const [ouvert, setOuvert] = useState(false)
  if (!liste.length) return null

  const SOURCES = { accueil: "encart de l'accueil", preinscription: "formulaire d'adhésion" }
  const date = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <section
      className="mb-7 overflow-hidden rounded-[30px] border-2 border-[#0f172a] bg-white"
      style={{ boxShadow: '6px 6px 0 #1a5f7a' }}
    >
      <button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-expanded={ouvert}
        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#fdfaf6] ${ouvert ? 'border-b-2 border-[#0f172a]' : ''}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border-2 border-[#0f172a] bg-[#1a5f7a] text-white">
          <Mail size={18} />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[18px] font-extrabold uppercase tracking-[-0.03em]">
            Inscrits <span className="text-[#1a5f7a]">aux actualités</span>
          </span>
          <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
            Non adhérents · reçoivent les mails de Communication
          </span>
        </span>
        <span className="ml-auto rounded-full bg-[#0f172a] px-3 py-1 text-[11px] font-extrabold text-white">{liste.length}</span>
        {ouvert ? <ChevronUp size={18} className="shrink-0 text-slate-400" /> : <ChevronDown size={18} className="shrink-0 text-slate-400" />}
      </button>

      {ouvert && (
        <ul>
          {liste.map(a => (
            <li key={a.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-[#0f172a]">{a.email}</div>
                <div className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                  Inscrit le {date(a.created_at)} · {SOURCES[a.source] || a.source}
                </div>
              </div>
              <IconButton tone="danger" title="Retirer de la liste" onClick={() => onSupprimer(a)}>
                <Trash2 size={17} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
