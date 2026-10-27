/**
 * Page ouverte avant une mise en ligne : les morceaux de code chargés à la demande
 * (pages, fabrication du PDF…) ont changé de nom sur le serveur et l'ancienne page
 * ne les trouve plus. On recharge alors la page, une fois, pour prendre la nouvelle
 * version. Testé par `npm test`.
 */

// Messages des navigateurs quand un morceau de code chargé à la demande est introuvable
const PERIME = /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i

export const estFichierPerime = erreur => PERIME.test(String(erreur?.message ?? erreur ?? ''))

const CLE = 'rechargement-nouvelle-version'
const DELAI = 30000 // pas plus d'un rechargement automatique toutes les 30 s (évite une boucle)

/** Recharge la page si aucun rechargement automatique n'a eu lieu récemment. Renvoie true si la page se recharge. */
export function rechargerPourNouvelleVersion(maintenant = Date.now()) {
  try {
    const dernier = Number(sessionStorage.getItem(CLE)) || 0
    if (maintenant - dernier < DELAI) return false
    sessionStorage.setItem(CLE, String(maintenant))
  } catch { /* stockage indisponible : on recharge quand même, une fois */ }
  window.location.reload()
  return true
}
