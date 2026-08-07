import MaskIcon from '../site/MaskIcon'

/**
 * En-tête commun aux écrans de gestion : pastille d'icône, titre en deux tons,
 * sur-titre en petites capitales, et à droite une zone libre pour les actions.
 *
 * Propriétés : `icon` (fichier de /public/icons, ex. 'ludo-pret.svg'), `title` (début du
 * titre, en encre), `accent` (fin du titre, en bleu canard), `eyebrow` (ligne orange).
 * Le contenu passé en enfant est placé à droite : c'est la zone des boutons d'action.
 */
export default function AdminPageHeader({
  icon,
  title,
  accent = '',
  eyebrow = '',
  iconSize = 34,
  tileBg = '#1a5f7a',
  tileShadow = '#e38154',
  accentColor = '#1a5f7a',
  children,
}) {
  return (
    <div className="anim-soft-in mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
      <div className="flex items-center gap-4">
        <div
          className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] border-2 border-[#0f172a] md:h-[58px] md:w-[58px] md:rounded-[20px]"
          style={{ background: tileBg, boxShadow: `4px 4px 0 ${tileShadow}` }}
        >
          <MaskIcon file={icon} size={iconSize} color="#ffffff" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-extrabold leading-none tracking-[-0.045em] md:text-[38px]">
            {title} {accent && <span style={{ color: accentColor }}>{accent}</span>}
          </h1>
          {eyebrow && (
            <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#e38154]">
              {eyebrow}
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
