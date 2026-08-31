// Réglages communs aux deux scanners de code-barres de l'application
// (« Scan rapide » des prêts et « Ajouter par scan » des jeux).
//
// Pourquoi ce fichier : sans consigne, le téléphone ouvre sa caméra dans sa
// définition par défaut, souvent 640 × 480. À cette taille, une barre d'un
// code-barres EAN-13 filmé à 20 cm mesure moins d'un pixel : la lecture échoue
// une fois sur deux. Mesuré sur un vrai code du catalogue (Ligretto rouge) :
//   640 × 480   → 11 lectures réussies sur 27
//   1280 × 720  → 24 / 27
//   1920 × 1080 → 27 / 27
// On demande donc la plus haute définition possible, et la mise au point
// continue pour que la boîte reste nette quand on l'approche.

export const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: { ideal: 'environment' },
    // « ideal » et non « exact » : si la caméra ne sait pas faire, elle propose
    // le plus proche au lieu de refuser de s'ouvrir.
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    advanced: [{ focusMode: 'continuous' }],
  },
}

// Formats utiles à la ludothèque, par ordre d'importance.
const FORMATS_SOUHAITES = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']

/**
 * Prépare le lecteur natif du téléphone (Android, et macOS côté bureau).
 * Renvoie null si le téléphone ne sait pas lire les codes-barres, ou s'il ne
 * gère aucun des formats utiles : l'appelant bascule alors sur zxing.
 *
 * Les formats sont filtrés selon ce que le téléphone déclare savoir lire :
 * demander un format non géré fait échouer la création du lecteur, et le
 * scanner restait alors figé sur une image noire.
 */
export async function createNativeDetector() {
  if (!('BarcodeDetector' in window)) return null
  try {
    const supportes = await window.BarcodeDetector.getSupportedFormats()
    const formats = FORMATS_SOUHAITES.filter(f => supportes.includes(f))
    if (!formats.includes('ean_13')) return null   // sans EAN-13, inutile
    return new window.BarcodeDetector({ formats })
  } catch (err) {
    console.warn('Lecteur de codes-barres natif indisponible :', err)
    return null
  }
}

/** Ce que la caméra a réellement accordé — utile pour diagnostiquer. */
export function logCameraSettings(stream) {
  const track = stream?.getVideoTracks?.()[0]
  if (!track?.getSettings) return
  const s = track.getSettings()
  console.log(`📷 Caméra : ${s.width}×${s.height}`, s.facingMode || '', s.focusMode || '')
}
