/**
 * Cotisation ludothèque du mois, lue dans les Paramètres (pages Adhérer et Accueil).
 * Mode « dégressif » : le prix baisse chaque mois jusqu'au minimum, l'adhésion court
 * jusqu'au 31 décembre ; sinon prix fixe, pour un an de date à date.
 */
export const cotisationDuMois = (prix, degressivite, minimum, mode, date = new Date()) => mode === 'degressif'
  ? Math.max((Number(prix) || 0) - date.getMonth() * (Number(degressivite) || 0), Number(minimum) || 0)
  : Number(prix) || 0

export const dureeAdhesion = mode => mode === 'degressif' ? "jusqu'au 31 décembre" : 'pour un an'
