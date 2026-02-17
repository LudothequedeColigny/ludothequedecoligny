// ============================================
// CONFIGURATION SUPABASE
// Connexion et client Supabase
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@types/supabase';

// Récupération des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification de la présence des variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies dans .env'
  );
}

/**
 * Client Supabase typé pour LudoVillage
 * Utilisez ce client pour toutes les interactions avec la base de données
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns true si authentifié, false sinon
 */
export async function estAuthentifie(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

/**
 * Obtient l'utilisateur actuellement connecté
 * @returns Données de l'utilisateur ou null
 */
export async function obtenirUtilisateurCourant() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Connexion d'un administrateur
 * @param email - Email de l'administrateur
 * @param motDePasse - Mot de passe
 * @returns Résultat de la connexion
 */
export async function seConnecter(email: string, motDePasse: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  });

  if (error) {
    throw new Error(`Erreur de connexion : ${error.message}`);
  }

  return data;
}

/**
 * Déconnexion de l'utilisateur courant
 */
export async function seDeconnecter() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`Erreur de déconnexion : ${error.message}`);
  }
}

/**
 * Réinitialisation du mot de passe
 * @param email - Email de l'administrateur
 */
export async function reinitialiserMotDePasse(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`,
  });

  if (error) {
    throw new Error(`Erreur lors de la réinitialisation : ${error.message}`);
  }
}
