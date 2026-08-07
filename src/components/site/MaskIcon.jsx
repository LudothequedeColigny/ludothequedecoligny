/**
 * Affiche une icône de /public/icons colorée via mask-image,
 * pour qu'elle prenne la couleur de la charte plutôt que celle du fichier.
 */
export default function MaskIcon({ file, size = 26, color = '#1a5f7a', className = '', style = {} }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        width: size,
        height: size,
        backgroundColor: color,
        maskImage: `url(/icons/${file})`,
        WebkitMaskImage: `url(/icons/${file})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        ...style,
      }}
    />
  )
}
