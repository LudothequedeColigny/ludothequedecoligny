// Compteur de visites du site public, sans cookie ni service extérieur.
//
// Chaque navigateur reçoit un numéro tiré au hasard, gardé dans le navigateur
// lui-même : il permet de compter les visiteurs différents, et pas seulement
// les pages vues. Il ne contient rien sur la personne et n'est jamais transmis
// à un tiers.
//
// Conditions de la CNIL pour se passer de l'accord du visiteur (mesure
// d'audience) : usage limité aux statistiques du site, numéro gardé 13 mois
// au plus (il n'est pas prolongé à chaque visite), information dans la
// politique de confidentialité, et possibilité de refuser d'être compté.

import { supabase } from './supabaseClient'

const CLE = 'ludo_visiteur'
const CLE_REFUS = 'ludo_visiteur_refus'
const DUREE_MAX_MS = 395 * 24 * 60 * 60 * 1000   // 13 mois

function nouveauNumero() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/** Numéro du navigateur, créé à la première visite et renouvelé après 13 mois. */
function numeroVisiteur() {
  try {
    const garde = JSON.parse(localStorage.getItem(CLE) || 'null')
    if (garde?.id && Date.now() - garde.depuis < DUREE_MAX_MS) return garde.id
    const id = nouveauNumero()
    localStorage.setItem(CLE, JSON.stringify({ id, depuis: Date.now() }))
    return id
  } catch {
    return null   // navigation privée ou stockage bloqué : la page vue compte quand même
  }
}

/** Le visiteur a-t-il refusé d'être compté (politique de confidentialité) ? */
export function refusComptage() {
  try { return localStorage.getItem(CLE_REFUS) === '1' } catch { return false }
}

/** Refuser ou accepter d'être compté ; le refus efface aussi le numéro. */
export function choisirComptage(accepte) {
  try {
    if (accepte) localStorage.removeItem(CLE_REFUS)
    else { localStorage.setItem(CLE_REFUS, '1'); localStorage.removeItem(CLE) }
  } catch { /* stockage bloqué : rien n'est gardé de toute façon */ }
}

/** Enregistre l'affichage d'une page publique (accueil, catalogue…). */
export function compterVisite(page) {
  if (refusComptage()) return
  supabase.from('page_views').insert({
    page,
    user_agent: navigator.userAgent,
    referrer: document.referrer || null,
    visitor_id: numeroVisiteur(),
  }).then(({ error }) => {
    if (error) console.error('Erreur comptage des visites :', error.message)
  })
}
