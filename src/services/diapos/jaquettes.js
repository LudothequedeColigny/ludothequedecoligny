import { supabase } from '../supabaseClient'
import { volunteerHeaders } from '../functionHeaders'

/**
 * MyLudo n'autorise pas la réutilisation de ses images dans un canvas (pas
 * d'en-tête CORS) : les jaquettes des jeux joués sont copiées dans notre
 * stockage par la fonction bgg-proxy (même mécanisme que l'écran Jeux).
 */
const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`

export const estChezNous = url => !!url && url.startsWith(import.meta.env.VITE_SUPABASE_URL)

export async function copierJaquette(url) {
  if (!url || estChezNous(url)) return url
  try {
    const qs = new URLSearchParams({ endpoint: 'upload-image', imageUrl: url }).toString()
    const res = await fetch(`${PROXY}?${qs}`, { headers: await volunteerHeaders(), signal: AbortSignal.timeout(20000) })
    if (!res.ok) return url
    const { url: copie } = await res.json()
    return copie || url
  } catch {
    return url
  }
}

/** Jaquette à dessiner pour chaque jeu joué (catalogue d'abord, sinon copie locale). */
export async function jaquettesDuBilan(jeux) {
  const resultat = new Map()
  // Même comparaison que l'ajout du jeu (insensible à la casse)
  await Promise.all(jeux.filter(j => j.in_catalogue).map(async j => {
    const motif = (j.name || '').trim().replace(/[\\%_]/g, '\\$&')
    const { data } = await supabase.from('games').select('image_url')
      .ilike('name', motif).not('image_url', 'is', null).limit(1)
    if (data?.[0]?.image_url) resultat.set(j.id, data[0].image_url)
  }))
  for (const j of jeux) {
    if (resultat.has(j.id)) continue
    if (estChezNous(j.image_url)) { resultat.set(j.id, j.image_url); continue }
    const copie = await copierJaquette(j.image_url)
    if (copie !== j.image_url && estChezNous(copie)) {
      await supabase.from('event_games_played').update({ image_url: copie }).eq('id', j.id)
    }
    resultat.set(j.id, copie)
  }
  return resultat
}
