import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// AJOUTEZ CES DEUX LIGNES POUR LE TEST :
console.log("DEBUG - URL reçue :", supabaseUrl);
console.log("DEBUG - Type de URL :", typeof supabaseUrl);

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error("ERREUR : L'URL Supabase n'est pas chargée correctement !");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)