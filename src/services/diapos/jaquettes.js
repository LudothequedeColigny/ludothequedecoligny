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

const normaliser = s => (s || '').trim().toLowerCase()

/** Jaquette à dessiner pour chaque jeu joué (catalogue d'abord, sinon copie locale). */
export async function jaquettesDuBilan(jeux) {
  const resultat = new Map()
  const auCatalogue = jeux.filter(j => j.in_catalogue)
  if (auCatalogue.length) {
    const { data } = await supabase.from('games').select('name, image_url')
      .in('name', auCatalogue.map(j => j.name))
    const parNom = new Map((data || []).filter(g => g.image_url).map(g => [normaliser(g.name), g.image_url]))
    auCatalogue.forEach(j => { if (parNom.has(normaliser(j.name))) resultat.set(j.id, parNom.get(normaliser(j.name))) })
  }
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
