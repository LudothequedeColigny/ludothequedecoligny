import { supabase } from './supabaseClient'

/**
 * Jeux à annoncer sur les réseaux (onglet « Nouveaux jeux » de l'écran
 * Communication, et pastille de l'onglet).
 */

// Point de départ : les 295 jeux de 2024 ne sont pas des nouveautés
const ANNONCES_DEPUIS = '2026-09-01'

/** Jeux ajoutés depuis ANNONCES_DEPUIS, répartis en « à annoncer » et « écartés ». */
export async function chargerJeuxAAnnoncer() {
  const [{ data: jeux, error }, { data: annonces }] = await Promise.all([
    supabase.from('games')
      .select('id, name, image_url, min_players, max_players, min_age, created_at')
      .gte('created_at', ANNONCES_DEPUIS)
      .order('created_at', { ascending: false }),
    supabase.from('annonces_jeux').select('game_id, statut'),
  ])
  if (error) throw error
  const statut = new Map((annonces || []).map(a => [a.game_id, a.statut]))
  return {
    aAnnoncer: (jeux || []).filter(j => !statut.has(j.id)),
    ecartes: (jeux || []).filter(j => statut.get(j.id) === 'ecarte'),
  }
}
