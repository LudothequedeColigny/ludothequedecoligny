import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Facebook } from 'lucide-react'
import TitrePactes from './TitrePactes'
import ContactModal from './ContactModal'

const FACEBOOK_URL = 'https://www.facebook.com/groups/ludothequedecoligny?locale=fr_FR'

const NAV_LINKS = [
  { label: 'Accueil', to: '/' },
  { label: 'Catalogue', to: '/catalogue' },
  { label: 'Comment emprunter', to: '/comment-emprunter' },
  { label: 'La vie de la ludothèque', to: '/vie-association' },
]

export default function Footer() {
  const [showContact, setShowContact] = useState(false)

  return (
    <footer className="bg-slate-50 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left">
          {/* Logo et identité */}
          <div className="flex flex-col justify-between h-full items-center md:items-start">
            <img src="/logo-feuille.svg" alt="Ludothèque de Coligny" className="h-16" />
            <span className="font-black text-slate-800">Ludothèque de Coligny</span>
          </div>

          {/* Navigation */}
          <div className="flex flex-col justify-between h-full items-center text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navigation</p>
            <div className="flex flex-col items-center gap-3">
              {NAV_LINKS.map(link => (
                <Link key={link.to} to={link.to}
                  className="text-sm text-slate-500 hover:text-[#1a5f7a] transition-colors font-medium">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col justify-between h-full items-center md:items-end gap-4 text-center md:text-right">
            <button onClick={() => setShowContact(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest text-[#1a5f7a]">
              <Mail size={14} />
              Nous contacter
            </button>
            <div className="flex flex-col items-center md:items-end gap-1">
              <img src="/logo-pactes.svg" alt="Logo association PACTES" className="h-16" />
              <TitrePactes className="text-sm" />
            </div>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-400 hover:text-[#1a5f7a] transition-colors text-xs font-bold uppercase tracking-widest">
              <Facebook size={16} /> Nous suivre sur Facebook
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">© 2025 Association PACTES — Ludothèque de Coligny</p>
          <p className="text-xs text-slate-400">Tous droits réservés</p>
        </div>
      </div>

      <ContactModal open={showContact} onClose={() => setShowContact(false)} />
    </footer>
  )
}
