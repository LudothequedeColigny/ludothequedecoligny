/**
 * Enregistrement différé « un minuteur par clé » : la dernière valeur proposée est écrite
 * une seule fois, après `delai` ms de calme, ou tout de suite si on appelle `vider`.
 * Sert au sélecteur de couleur des catégories (glissement dans la palette = nombreux
 * changements, une seule écriture en base). Sans dépendance : testable avec de faux minuteurs.
 */
export function creerEnregistrementDiffere({ delai = 400, ecrire, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const valeurs = new Map()
  const minuteurs = new Map()

  function arreter(cle) {
    if (minuteurs.has(cle)) { clearTimer(minuteurs.get(cle)); minuteurs.delete(cle) }
  }
  function vider(cle) {
    if (!valeurs.has(cle)) return
    const v = valeurs.get(cle)
    valeurs.delete(cle)
    arreter(cle)
    ecrire(cle, v)
  }
  return {
    // Mémorise la valeur et (re)lance le minuteur de cette clé
    planifier(cle, valeur) {
      valeurs.set(cle, valeur)
      arreter(cle)
      minuteurs.set(cle, setTimer(() => { minuteurs.delete(cle); vider(cle) }, delai))
    },
    // Écrit tout de suite la valeur en attente de cette clé (rien s'il n'y en a pas)
    vider,
    // Écrit tout de suite toutes les valeurs en attente
    viderTout() { for (const cle of [...valeurs.keys()]) vider(cle) },
    // Abandonne l'attente de cette clé sans rien écrire
    annuler(cle) { valeurs.delete(cle); arreter(cle) },
    enAttente(cle) { return valeurs.has(cle) },
  }
}
