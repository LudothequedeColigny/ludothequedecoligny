import { supabase } from './supabaseClient'
import { fabriquerAutocollant } from '../hooks/useAutocollant'
import { oublierImage } from './diapos/dessin.js'

/**
 * Autocollants des boîtes préparés à l'avance, pour le bandeau « Tout juste arrivés »
 * de l'accueil : le téléphone du visiteur n'a plus à détourer les boîtes en direct (on les
 * voyait se transformer en défilant). Fabriqués sans ombre : l'accueil pose la sienne,
 * orange ou bleue, par un filtre (même rendu que l'ombre pleine du papier découpé).
 *
 * Fabrication : par l'écran Jeux (bénévole connecté), en arrière-plan, un jeu à la fois,
 * les plus récents d'abord. Rangement : stockage game-images, dossier autocollants/,
 * adresse dans games.autocollant_url. Si l'image d'un jeu change, la base vide cette
 * adresse (supabase/migrations/20261102_autocollants_jeux.sql) et l'autocollant est refait.
 */

const HEBERGEE = '%supabase.co/storage/%'
const pause = ms => new Promise(r => setTimeout(r, ms))

/** Fabrique, range et note l'autocollant d'un jeu. Renvoie true si c'est fait. */
export async function preparerAutocollant(jeu) {
  // L'écran Jeux peut être ouvert à deux endroits : un autocollant déjà fait ailleurs n'est pas refait
  const { data: actuel } = await supabase.from('games').select('autocollant_url').eq('id', jeu.id).maybeSingle()
  if (actuel?.autocollant_url) return true
  const blob = await fabriquerAutocollant(jeu.image_url, { ombre: 0, type: 'image/webp', qualite: 0.86 })
  oublierImage(jeu.image_url)
  if (!blob) return false
  const ext = blob.type === 'image/webp' ? 'webp' : 'png'
  // Nom nouveau à chaque fabrication : un ancien autocollant resté en cache ne revient pas
  const chemin = `autocollants/${jeu.id}-${Date.now()}.${ext}`
  const { error: errDepot } = await supabase.storage.from('game-images')
    .upload(chemin, blob, { contentType: blob.type, cacheControl: '31536000' })
  if (errDepot) throw errDepot
  const { data: { publicUrl } } = supabase.storage.from('game-images').getPublicUrl(chemin)
  const { error } = await supabase.from('games').update({ autocollant_url: publicUrl }).eq('id', jeu.id)
  if (error) throw error
  return true
}

/**
 * Rattrape les autocollants manquants, un à la fois, jusqu'au bout ou jusqu'à `arret.stop`.
 * `onProgres({ faits, total })` permet d'afficher l'avancement.
 */
export async function rattraperAutocollants({ arret = {}, onProgres = () => {} } = {}) {
  const { data: manquants, error } = await supabase.from('games')
    .select('id, image_url')
    .is('autocollant_url', null)
    .like('image_url', HEBERGEE)
    .order('created_at', { ascending: false })
  if (error || !manquants?.length) { onProgres({ faits: 0, total: 0 }); return }
  let faits = 0
  onProgres({ faits, total: manquants.length })
  for (const jeu of manquants) {
    if (arret.stop) return
    try {
      await preparerAutocollant(jeu)
    } catch (e) {
      console.warn('Autocollant non préparé pour le jeu', jeu.id, e?.message)
    }
    faits++
    onProgres({ faits, total: manquants.length })
    await pause(150) // laisse l'écran respirer entre deux boîtes
  }
}
