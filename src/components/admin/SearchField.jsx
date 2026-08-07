import { Search } from 'lucide-react'

/**
 * Barre de recherche des écrans de gestion : contour encre et ombre pleine décalée.
 * `shadow` permet d'accorder l'ombre à la couleur dominante de l'écran.
 */
export default function SearchField({ shadow = '#1a5f7a', className = '', ...rest }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-300" />
      <input
        type="text"
        className="w-full rounded-[20px] border-2 border-[#0f172a] bg-white py-4 pl-[52px] pr-5 text-sm font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300"
        style={{ boxShadow: `4px 4px 0 ${shadow}` }}
        {...rest}
      />
    </div>
  )
}
