import { supabase } from './supabaseClient'
import { fileJeuSemaine } from './jeuSemaine'

/**
 * Données de l'onglet « Jeu de la semaine » (écran Communication) : liste du
 * dossier Drive (fonction serveur jeu-semaine), table jeux_semaine et catalogue.
 */

/** Erreur dont le message est écrit pour le bénévole et peut être affiché tel quel. */
export class MessageBenevole extends Error {}

const COLONNES_JEU = 'id, name, image_url, description, min_players, max_players, duration, min_age, is_available'
const ERREUR_DRIVE = "Le dossier Drive n'a pas pu être lu. Réessayez dans un instant."

// Message renvoyé par la fonction serveur (« La clé Google est absente… »), sinon message général
async function messageDe(error, defaut) {
  try {
    const corps = await error?.context?.json()
    if (corps?.error) return corps.error
  } catch { /* réponse illisible */ }
  return defaut
}

/** File d'attente (plus ancienne d'abord), vidéos publiées, et jeux du catalogue (pour le choix manuel). */
export async function chargerFileJeuSemaine() {
  const [liste, lignes, jeux] = await Promise.all([
    supabase.functions.invoke('jeu-semaine', { body: { action: 'liste' } }),
    supabase.from('jeux_semaine').select('drive_id, nom_fichier, game_id, legende, publie_le'),
    supabase.from('games').select(COLONNES_JEU).order('name'),
  ])
  if (liste.error) throw new MessageBenevole(await messageDe(liste.error, ERREUR_DRIVE))
  if (lignes.error) throw lignes.error
  if (jeux.error) throw jeux.error
  return {
    ...fileJeuSemaine({ fichiers: liste.data?.fichiers ?? [], lignes: lignes.data ?? [], jeux: jeux.data ?? [] }),
    jeux: jeux.data ?? [],
  }
}

/** Jeu choisi, légende retouchée ou publication d'une vidéo : seules les colonnes données sont écrites. */
export async function enregistrerVideo(video, champs) {
  const { error } = await supabase.from('jeux_semaine').upsert({
    drive_id: video.driveId, nom_fichier: video.nomFichier, ...champs, modifie_le: new Date().toISOString(),
  }, { onConflict: 'drive_id' })
  if (error) throw error
}

/** Copie la vidéo du Drive dans notre stockage (le temps de la publication) et renvoie son adresse. */
export async function preparerVideo(video) {
  const { data, error } = await supabase.functions.invoke('jeu-semaine', {
    body: { action: 'preparer', drive_id: video.driveId, nom_fichier: video.nomFichier },
  })
  if (error) throw new MessageBenevole(await messageDe(error, "La vidéo n'a pas pu être préparée. Réessayez dans un instant."))
  if (!data?.url) throw new MessageBenevole("La vidéo n'a pas pu être préparée. Réessayez dans un instant.")
  return data.url
}
