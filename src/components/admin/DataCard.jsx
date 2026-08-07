/**
 * Le grand cadre blanc qui contient une liste : contour encre, ombre pleine décalée,
 * coins très arrondis, et son contenu rogné aux coins.
 */
export function DataCard({ shadow = '#1a5f7a', className = '', children }) {
  return (
    <div
      className={`overflow-hidden rounded-[34px] border-2 border-[#0f172a] bg-white ${className}`}
      style={{ boxShadow: `6px 6px 0 ${shadow}` }}
    >
      {children}
    </div>
  )
}

/**
 * La ligne de titres de colonnes, sur fond crème.
 * Masquée sur téléphone quand la liste s'y affiche en cartes.
 */
export function DataHeader({ columns, className = '', children }) {
  return (
    <div
      className={`grid border-b-2 border-[#0f172a] bg-[#fdfaf6] px-5 py-4 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400 ${className}`}
      style={{ gridTemplateColumns: columns }}
    >
      {children}
    </div>
  )
}

/** Une ligne de liste sur ordinateur : grille alignée sur l'en-tête. */
export function DataRow({ columns, className = '', style = undefined, children, ...rest }) {
  return (
    <div
      className={`grid items-center border-b border-slate-100 px-5 py-4 last:border-b-0 ${className}`}
      style={{ gridTemplateColumns: columns, ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}

/** Message affiché quand la liste est vide. */
export function DataEmpty({ icon, children }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon}
      <p className="text-sm italic text-slate-400">{children}</p>
    </div>
  )
}
