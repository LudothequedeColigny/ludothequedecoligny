// ============================================
// REQUÊTES DE BASE DE DONNÉES
// Toutes les opérations CRUD pour LudoVillage
// ============================================

import { supabase } from './supabase';
import { 
  Adherent, 
  Jeu, 
  Pret, 
  Evenement,
  CreationAdherent,
  CreationJeu,
  CreationPret,
  CreationEvenement 
} from '@types';

// ============================================
// ADHÉRENTS
// ============================================

/**
 * Récupère tous les adhérents actifs
 */
export async function obtenirAdherents() {
  const { data, error } = await supabase
    .from('adherents')
    .select('*')
    .eq('actif', true)
    .order('nom', { ascending: true });

  if (error) throw error;
  return data as Adherent[];
}

/**
 * Récupère un adhérent par son ID
 */
export async function obtenirAdherentParId(id: string) {
  const { data, error } = await supabase
    .from('adherents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Adherent;
}

/**
 * Crée un nouvel adhérent
 */
export async function creerAdherent(adherent: CreationAdherent) {
  const { data, error } = await supabase
    .from('adherents')
    .insert(adherent)
    .select()
    .single();

  if (error) throw error;
  return data as Adherent;
}

/**
 * Met à jour un adhérent existant
 */
export async function mettreAJourAdherent(id: string, modifications: Partial<Adherent>) {
  const { data, error } = await supabase
    .from('adherents')
    .update(modifications)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Adherent;
}

/**
 * Désactive un adhérent (soft delete)
 */
export async function desactiverAdherent(id: string) {
  const { data, error } = await supabase
    .from('adherents')
    .update({ actif: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Adherent;
}

/**
 * Récupère les adhérents avec cotisation expirée
 */
export async function obtenirAdherentsCotisationExpiree() {
  const { data, error } = await supabase
    .from('adherents')
    .select('*')
    .eq('actif', true)
    .eq('cotisation_a_jour', false)
    .order('date_expiration_cotisation', { ascending: true });

  if (error) throw error;
  return data as Adherent[];
}

// ============================================
// JEUX
// ============================================

/**
 * Récupère tous les jeux du catalogue
 */
export async function obtenirJeux() {
  const { data, error } = await supabase
    .from('jeux')
    .select('*')
    .order('titre', { ascending: true });

  if (error) throw error;
  return data as Jeu[];
}

/**
 * Récupère les jeux disponibles pour le catalogue public
 */
export async function obtenirJeuxDisponibles() {
  const { data, error } = await supabase
    .from('catalogue_public')
    .select('*')
    .order('titre', { ascending: true });

  if (error) throw error;
  return data as Jeu[];
}

/**
 * Récupère un jeu par son ID
 */
export async function obtenirJeuParId(id: string) {
  const { data, error } = await supabase
    .from('jeux')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Jeu;
}

/**
 * Crée un nouveau jeu
 */
export async function creerJeu(jeu: CreationJeu) {
  const { data, error } = await supabase
    .from('jeux')
    .insert(jeu)
    .select()
    .single();

  if (error) throw error;
  return data as Jeu;
}

/**
 * Met à jour un jeu existant
 */
export async function mettreAJourJeu(id: string, modifications: Partial<Jeu>) {
  const { data, error } = await supabase
    .from('jeux')
    .update(modifications)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Jeu;
}

/**
 * Recherche de jeux par titre, éditeur ou auteur
 */
export async function rechercherJeux(termeRecherche: string) {
  const { data, error } = await supabase
    .from('jeux')
    .select('*')
    .or(`titre.ilike.%${termeRecherche}%,editeur.ilike.%${termeRecherche}%,auteur.ilike.%${termeRecherche}%`)
    .order('titre', { ascending: true });

  if (error) throw error;
  return data as Jeu[];
}

// ============================================
// PRÊTS
// ============================================

/**
 * Récupère tous les prêts en cours
 */
export async function obtenirPretsEnCours() {
  const { data, error } = await supabase
    .from('prets')
    .select(`
      *,
      adherent:adherents(*),
      jeu:jeux(*)
    `)
    .eq('statut_pret', 'En cours')
    .order('date_pret', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Récupère tous les prêts en retard
 */
export async function obtenirPretsEnRetard() {
  const { data, error } = await supabase
    .from('prets_en_retard')
    .select('*')
    .order('jours_retard', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Récupère les prêts d'un adhérent spécifique
 */
export async function obtenirPretsDunAdherent(adherentId: string) {
  const { data, error } = await supabase
    .from('prets')
    .select(`
      *,
      jeu:jeux(*)
    `)
    .eq('adherent_id', adherentId)
    .order('date_pret', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Compte le nombre de prêts en cours pour un adhérent
 */
export async function compterPretsEnCours(adherentId: string): Promise<number> {
  const { count, error } = await supabase
    .from('prets')
    .select('*', { count: 'exact', head: true })
    .eq('adherent_id', adherentId)
    .eq('statut_pret', 'En cours');

  if (error) throw error;
  return count || 0;
}

/**
 * Crée un nouveau prêt
 */
export async function creerPret(pret: CreationPret) {
  const { data, error } = await supabase
    .from('prets')
    .insert(pret)
    .select()
    .single();

  if (error) throw error;
  return data as Pret;
}

/**
 * Marque un prêt comme rendu
 */
export async function marquerPretRendu(pretId: string, dateRetour?: Date) {
  const { data, error } = await supabase
    .from('prets')
    .update({
      date_retour_effective: dateRetour || new Date(),
      statut_pret: 'Rendu'
    })
    .eq('id', pretId)
    .select()
    .single();

  if (error) throw error;
  return data as Pret;
}

/**
 * Récupère l'historique complet des prêts
 */
export async function obtenirHistoriqueComplet(limite: number = 100) {
  const { data, error } = await supabase
    .from('prets')
    .select(`
      *,
      adherent:adherents(nom, prenom, numero_adherent),
      jeu:jeux(titre, code_jeu)
    `)
    .order('date_pret', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return data;
}

// ============================================
// ÉVÉNEMENTS
// ============================================

/**
 * Récupère tous les événements publics à venir
 */
export async function obtenirEvenementsPublics() {
  const { data, error } = await supabase
    .from('evenements')
    .select('*')
    .eq('visible_public', true)
    .gte('date_debut', new Date().toISOString())
    .order('date_debut', { ascending: true });

  if (error) throw error;
  return data as Evenement[];
}

/**
 * Récupère tous les événements (administration)
 */
export async function obtenirTousLesEvenements() {
  const { data, error } = await supabase
    .from('evenements')
    .select('*')
    .order('date_debut', { ascending: false });

  if (error) throw error;
  return data as Evenement[];
}

/**
 * Récupère un événement par son ID
 */
export async function obtenirEvenementParId(id: string) {
  const { data, error } = await supabase
    .from('evenements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Evenement;
}

/**
 * Crée un nouvel événement
 */
export async function creerEvenement(evenement: CreationEvenement) {
  const { data, error } = await supabase
    .from('evenements')
    .insert(evenement)
    .select()
    .single();

  if (error) throw error;
  return data as Evenement;
}

/**
 * Met à jour un événement existant
 */
export async function mettreAJourEvenement(id: string, modifications: Partial<Evenement>) {
  const { data, error } = await supabase
    .from('evenements')
    .update(modifications)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Evenement;
}

/**
 * Supprime un événement
 */
export async function supprimerEvenement(id: string) {
  const { error } = await supabase
    .from('evenements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// STATISTIQUES
// ============================================

/**
 * Récupère les statistiques globales de la ludothèque
 */
export async function obtenirStatistiquesGlobales() {
  // Nombre total d'adhérents actifs
  const { count: nbAdherents } = await supabase
    .from('adherents')
    .select('*', { count: 'exact', head: true })
    .eq('actif', true);

  // Nombre total de jeux
  const { count: nbJeux } = await supabase
    .from('jeux')
    .select('*', { count: 'exact', head: true });

  // Nombre de jeux disponibles
  const { count: nbJeuxDisponibles } = await supabase
    .from('jeux')
    .select('*', { count: 'exact', head: true })
    .eq('statut', 'Disponible');

  // Nombre de prêts en cours
  const { count: nbPretsEnCours } = await supabase
    .from('prets')
    .select('*', { count: 'exact', head: true })
    .eq('statut_pret', 'En cours');

  // Nombre de prêts en retard
  const { count: nbPretsEnRetard } = await supabase
    .from('prets')
    .select('*', { count: 'exact', head: true })
    .eq('est_en_retard', true)
    .eq('statut_pret', 'En cours');

  return {
    nbAdherents: nbAdherents || 0,
    nbJeux: nbJeux || 0,
    nbJeuxDisponibles: nbJeuxDisponibles || 0,
    nbPretsEnCours: nbPretsEnCours || 0,
    nbPretsEnRetard: nbPretsEnRetard || 0,
  };
}
