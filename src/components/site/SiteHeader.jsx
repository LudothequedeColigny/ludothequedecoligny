import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import TitrePactes from '../TitrePactes'

const NAV_LINKS = [
  { label: 'Accueil', to: '/' },
  { label: 'Catalogue', to: '/catalogue' },
  { label: 'Emprunter', to: '/comment-emprunter' },
  { label: 'La vie de la ludo', to: '/vie-association' },
]

// Padding volontairement absent : chaque usage le fixe lui-même, pour qu'aucune
// classe de padding ne soit en concurrence avec une autre sur le même élément.
const PILL = 'rounded-full text-[10px] font-extrabold uppercase tracking-[0.14em]'

export default function SiteHeader() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // La navigation inline demande ~900px : en dessous, tout passe dans le menu déroulant.
  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <header className="sticky top-0 z-50 bg-[#fdfaf6]/90 backdrop-blur-[14px]">
      <div className="mx-auto max-w-[1180px] px-3 py-3 md:px-8 md:py-3.5">
        <div className="rounded-[2rem] border-2 border-[#0f172a] bg-white shadow-[4px_4px_0_#1a5f7a] lg:rounded-full">
          <div className="flex items-center justify-between gap-3 p-2.5 pl-4">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <img
                data-app-logo="header"
                src="/logo-feuille.svg"
                alt="Ludothèque de Coligny"
                className="h-9 shrink-0"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-display text-[15px] font-extrabold leading-none tracking-[-0.03em] text-[#0f172a] xl:text-[19px]">
                  Ludothèque de Coligny
                </span>
                <span className="hidden truncate text-[9px] font-bold uppercase leading-none tracking-[0.16em] text-[#e38154] sm:block">
                  Un service de l'association <TitrePactes className="text-[9px]" />
                </span>
              </span>
            </Link>

            {/* Navigation complète — écrans larges uniquement */}
            <nav className="hidden shrink-0 items-center gap-1.5 lg:flex">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    aria-current={active ? 'page' : undefined}
                    className={`${PILL} px-3.5 py-2.5 transition-colors ${
                      active
                        ? 'bg-[#0f172a] text-white'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-[#0f172a]'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <Link
                to="/login"
                className={`${PILL} border-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-3 text-[#0f172a] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#1a5f7a] hover:text-white`}
              >
                Espace Bénévole
              </Link>
            </nav>

            {/* Bouton menu — écrans étroits */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#0f172a] transition-colors hover:bg-[#1a5f7a] hover:text-white lg:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Menu déroulant — écrans étroits */}
          {menuOpen && (
            <div id="menu-mobile" className="border-t-2 border-[#0f172a] p-3 lg:hidden">
              <nav className="flex flex-col gap-1.5">
                {NAV_LINKS.map((link) => {
                  const active = pathname === link.to
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`rounded-[16px] px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-colors ${
                        active ? 'bg-[#0f172a] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-[#0f172a]'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-2.5 flex w-full items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#1a5f7a] px-4 py-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#0f172a] transition-[transform,box-shadow] duration-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0f172a]"
              >
                Espace Bénévole
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
