import { supabase } from './supabaseClient'

/**
 * En-têtes pour appeler une fonction Supabase réservée aux bénévoles connectés.
 * La clé publique seule ne suffit plus : on transmet le jeton de la session.
 */
export async function volunteerHeaders() {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const { data: { session } } = await supabase.auth.getSession()
  return { apikey: anonKey, Authorization: `Bearer ${session?.access_token || anonKey}` }
}
