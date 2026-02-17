import { createClient } from '@supabase/supabase-js'

// Ces lignes vont chercher les clés que tu as mises dans ton fichier .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// On crée le "messager" qui fera les allers-retours avec ta base de données
export const supabase = createClient(supabaseUrl, supabaseAnonKey)