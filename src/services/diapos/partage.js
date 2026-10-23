/**
 * Enregistrement des stories sur le téléphone (fenêtres Bilan et Annonce) :
 * feuille de partage du téléphone, ou à défaut téléchargement des fichiers.
 */

/** Télécharge les fichiers (ordinateur, ou téléphone sans partage de fichiers). */
export function telecharger(fichiers) {
  for (const f of fichiers) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f)
    a.download = f.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
}

/**
 * Partage des fichiers déjà prêts ; sans partage possible (ou en cas d'échec), téléchargement.
 * À appeler directement depuis le toucher, sans aucune attente avant : iPhone n'autorise
 * le partage que tout de suite après le geste. Ici non plus, rien n'est attendu avant
 * `navigator.share` (une fonction async s'exécute d'un trait jusqu'à son premier await).
 * Renvoie 'partage', 'telecharge' ou 'annule' (partage fermé par l'utilisateur).
 */
export async function partagerFichiers(fichiers, titre) {
  let partageable = false
  try { partageable = !!navigator.canShare?.({ files: fichiers }) } catch { partageable = false }
  if (!partageable) {
    telecharger(fichiers)
    return 'telecharge'
  }
  try {
    await navigator.share({ files: fichiers, title: titre })
    return 'partage'
  } catch (e) {
    // Annulé par l'utilisateur : rien à signaler
    if (e?.name === 'AbortError') return 'annule'
    console.warn('Partage de la story :', e)
    telecharger(fichiers)
    return 'telecharge'
  }
}
