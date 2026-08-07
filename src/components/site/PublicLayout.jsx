import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import Footer from '../Footer'

/**
 * Coquille commune à toutes les pages publiques : en-tête collant, pied de page,
 * et remontée en haut de page à chaque changement de route.
 */
export default function PublicLayout({ children, className = '' }) {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={`min-h-screen bg-[#fdfaf6] font-body text-[#0f172a] ${className}`}>
      <SiteHeader />
      {children}
      <Footer />
    </div>
  )
}
