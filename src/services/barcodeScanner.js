// Réglages communs aux deux scanners de code-barres de l'application
// (« Scan rapide » des prêts et « Ajouter par scan » des jeux), utilisés par
// la brique src/components/admin/BarcodeCamera.jsx.
//
// Définition : sans consigne, le téléphone ouvre sa caméra dans sa définition
// par défaut, souvent 640 × 480. À cette taille, une barre d'un code-barres
// EAN-13 filmé à 20 cm mesure moins d'un pixel. Mesuré sur un vrai code du
// catalogue (Ligretto rouge) :
//   640 × 480   → 11 lectures réussies sur 27
//   1280 × 720  → 24 / 27
//   1920 × 1080 → 27 / 27
//
// Distance : l'objectif principal des téléphones récents (iPhone Pro, Samsung,
// Pixel…) ne sait pas faire la mise au point à moins de 15-20 cm. Approcher le
// téléphone d'un petit code-barres donne donc une image floue ; sur iPhone, le
// téléphone bascule en plus d'un objectif à l'autre, et l'image clignote.
// Parade : zoomer (×2 par défaut) et tenir le téléphone à 20-30 cm, là où
// tous les objectifs sont nets. C'est la méthode recommandée par Apple.

/** Contraintes de caméra ; `deviceId` pour imposer un objectif précis. */
export function buildConstraints(deviceId) {
  return {
    audio: false,
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
      // « ideal » et non « exact » : si la caméra ne sait pas faire, elle propose
      // le plus proche au lieu de refuser de s'ouvrir.
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      advanced: [{ focusMode: 'continuous' }],
    },
  }
}

// Formats utiles à la ludothèque, par ordre d'importance.
const FORMATS_SOUHAITES = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']

/**
 * Lecteur natif du téléphone (Android, et Chrome sur Mac côté bureau).
 * Renvoie null si le téléphone ne sait pas lire les codes-barres, ou s'il ne
 * gère aucun des formats utiles : on bascule alors sur zxing.
 *
 * Les formats sont filtrés selon ce que le téléphone déclare savoir lire :
 * demander un format non géré fait échouer la création du lecteur.
 */
async function createNativeDecoder() {
  if (!('BarcodeDetector' in window)) return null
  try {
    const supportes = await window.BarcodeDetector.getSupportedFormats()
    const formats = FORMATS_SOUHAITES.filter(f => supportes.includes(f))
    if (!formats.includes('ean_13')) return null   // sans EAN-13, inutile
    const detector = new window.BarcodeDetector({ formats })
    return async video => {
      const codes = await detector.detect(video)
      return codes[0]?.rawValue || null
    }
  } catch (err) {
    console.warn('Lecteur de codes-barres natif indisponible :', err)
    return null
  }
}

/**
 * Lecteur de secours (iPhone, Firefox…) : la bibliothèque zxing analyse une
 * copie de l'image. `zone` est la partie de l'image visible à l'écran : on
 * n'analyse que celle-là, ce qui va plus vite et correspond à ce que vise
 * le bénévole.
 */
async function createZxingDecoder() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE,
  ])
  // Cherche plus longtemps, et essaie aussi l'image tournée d'un quart de tour
  // (code-barres imprimé à la verticale sur la boîte).
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new BrowserMultiFormatReader(hints)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  return async (video, zone) => {
    const { x, y, w, h } = zone
    if (!w || !h) return null
    canvas.width = w
    canvas.height = h
    ctx.drawImage(video, x, y, w, h, 0, 0, w, h)
    try {
      return reader.decodeFromCanvas(canvas).getText()
    } catch {
      return null   // pas de code-barres dans cette image : on réessaie à la suivante
    }
  }
}

/** Le meilleur lecteur disponible sur cet appareil. */
export async function createDecoder() {
  return (await createNativeDecoder()) || (await createZxingDecoder())
}

/** Ce que la caméra a réellement accordé — utile pour diagnostiquer. */
export function logCameraSettings(track) {
  if (!track?.getSettings) return
  const s = track.getSettings()
  console.log(`📷 Caméra : ${s.width}×${s.height}`, s.facingMode || '', s.focusMode || '', s.zoom ? `zoom ${s.zoom}` : '')
}
