/**
 * Enregistrement des stories (fenêtres Bilan et Annonce) : téléchargement direct des images
 * (ordinateur, Android), et sur iPhone, en plus, « Enregistrer dans Photos » par la feuille de
 * partage (Instagram et Facebook n'y choisissent une image que dans Photos).
 */

const sansAccents = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Nom de fichier lisible : « story-apres-midi-jeux-en-famille-2026-10-24-1.jpg ». */
export function nomFichierStory(titre, date, numero) {
  const nom = sansAccents(titre).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'evenement'
  const jour = String(date || '').slice(0, 10)
  return `story-${nom}${jour ? `-${jour}` : ''}-${numero}.jpg`
}

/**
 * Télécharge les fichiers un par un (dossier Téléchargements de l'appareil). Le premier part
 * tout de suite (dans le geste) ; les suivants à 300 ms d'intervalle, sans quoi le navigateur
 * n'en garde qu'un. La première fois, il peut demander d'autoriser plusieurs téléchargements.
 */
export function telecharger(fichiers) {
  fichiers.forEach((f, i) => {
    const lancer = () => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(f)
      a.download = f.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    }
    if (i === 0) lancer()
    else setTimeout(lancer, i * 300)
  })
}

/** iPhone ou iPad (y compris les iPad qui se présentent comme un Mac). */
export function estAppareilApple() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** Le lien « Enregistrer dans Photos » n'est proposé que sur iPhone/iPad sachant partager des fichiers. */
export function peutEnregistrerDansPhotos(fichiers) {
  if (!estAppareilApple() || !fichiers?.length) return false
  try { return !!navigator.canShare?.({ files: fichiers }) } catch { return false }
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
