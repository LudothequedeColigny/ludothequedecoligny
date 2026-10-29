import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Facebook, Instagram } from 'lucide-react'
import TitrePactes from './TitrePactes'
import ContactModal from './ContactModal'

const RESEAUX = [
  { label: 'Facebook', href: 'https://www.facebook.com/groups/ludothequedecoligny?locale=fr_FR', Icon: Facebook },
  { label: 'Instagram', href: 'https://www.instagram.com/ludothequedecoligny/', Icon: Instagram },
]

const NAV_LINKS = [
  { label: 'Accueil', to: '/' },
  { label: 'Catalogue', to: '/catalogue' },
  { label: 'Comment emprunter', to: '/comment-emprunter' },
  { label: 'La vie de la ludothèque', to: '/vie-association' },
]

export default function Footer() {
  const [showContact, setShowContact] = useState(false)

  return (
    <footer className="border-t-2 border-[#0f172a] bg-white px-4 pb-7 pt-10 font-body md:px-10 md:pt-14">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-9 text-center md:grid-cols-3 md:text-left">
        {/* Identité */}
        <div className="flex flex-col items-center gap-3.5 md:items-start">
          <img src="/logo-feuille.svg" alt="Ludothèque de Coligny" className="h-14" />
          <span className="font-display text-[17px] font-extrabold tracking-[-0.03em] text-[#0f172a]">
            Ludothèque de Coligny
          </span>
        </div>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            Navigation
          </span>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-[13.5px] font-medium text-slate-500 transition-colors hover:text-[#1a5f7a]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Contact & association */}
        <div className="flex flex-col items-center gap-3.5 md:items-end">
          <button
            onClick={() => setShowContact(true)}
            className="flex items-center gap-2 rounded-full border-2 border-[#0f172a] bg-[#fdfaf6] px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1a5f7a] transition-colors hover:bg-slate-100"
          >
            <Mail size={14} />
            Nous contacter
          </button>
          <img src="/logo-pactes.svg" alt="Logo association PACTES" className="h-14" />
          <TitrePactes className="text-sm" />
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Nous suivre
            {RESEAUX.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Nous suivre sur ${label}`}
                title={label}
                className="transition-colors hover:text-[#1a5f7a]"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-9 max-w-[1180px] border-t border-slate-200 pt-5 text-center">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} Association PACTES — Ludothèque de Coligny</p>
        <p className="mt-2 flex justify-center gap-4 text-xs text-slate-400">
          <Link to="/mentions-legales" className="underline-offset-2 transition-colors hover:text-[#1a5f7a] hover:underline">Mentions légales</Link>
          <Link to="/confidentialite" className="underline-offset-2 transition-colors hover:text-[#1a5f7a] hover:underline">Confidentialité</Link>
        </p>
      </div>

      <ContactModal open={showContact} onClose={() => setShowContact(false)} />
    </footer>
  )
}
