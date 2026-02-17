// ============================================
// TYPES TYPESCRIPT - LUDOVILLAGE
// Définitions de types pour toute l'application
// ============================================

/**
 * Type pour les adhérents de la ludothèque
 */
export interface Adherent {
  id: string;
  numero_adherent: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  date_naissance?: Date;
  date_adhesion: Date;
  date_expiration_cotisation: Date;
  cotisation_a_jour: boolean; // Calculé automatiquement
  notes?: string;
  actif: boolean;
  date_creation: Date;
  date_modification: Date;
}

/**
 * Type pour les jeux du catalogue
 */
export interface Jeu {
  id: string;
  code_jeu: string;
  titre: string;
  editeur?: string;
  auteur?: string;
  annee_publication?: number;
  age_minimum?: number;
  age_maximum?: number;
  nombre_joueurs_min?: number;
  nombre_joueurs_max?: number;
  duree_partie_min?: number; // en minutes
  duree_partie_max?: number; // en minutes
  categorie?: string;
  description?: string;
  regles_url?: string;
  image_url?: string;
  etat: EtatJeu;
  statut: StatutJeu;
  emplacement?: string;
  date_acquisition?: Date;
  prix_acquisition?: number;
  visible_catalogue_public: boolean;
  nombre_emprunts: number;
  date_creation: Date;
  date_modification: Date;
}

/**
 * États possibles d'un jeu
 */
export type EtatJeu = 'Neuf' | 'Bon' | 'Acceptable' | 'Usé' | 'Hors service';

/**
 * Statuts possibles d'un jeu
 */
export type StatutJeu = 'Disponible' | 'Emprunté' | 'Réservé' | 'Maintenance' | 'Retiré';

/**
 * Type pour les prêts
 */
export interface Pret {
  id: string;
  numero_pret: string;
  adherent_id: string;
  jeu_id: string;
  date_pret: Date;
  date_retour_prevue: Date;
  date_retour_effective?: Date;
  duree_pret_jours: number;
  est_en_retard: boolean; // Calculé automatiquement
  jours_retard: number; // Calculé automatiquement
  statut_pret: StatutPret;
  notes?: string;
  createur_id?: string;
  date_creation: Date;
  date_modification: Date;
}

/**
 * Statuts possibles d'un prêt
 */
export type StatutPret = 'En cours' | 'Rendu' | 'En retard' | 'Annulé';

/**
 * Type pour les événements
 */
export interface Evenement {
  id: string;
  titre: string;
  description?: string;
  type_evenement?: string;
  date_debut: Date;
  date_fin: Date;
  lieu?: string;
  adresse?: string;
  capacite_max?: number;
  nombre_inscrits: number;
  complet: boolean; // Calculé automatiquement
  image_url?: string;
  lien_inscription?: string;
  visible_public: boolean;
  statut: StatutEvenement;
  organisateur_id?: string;
  date_creation: Date;
  date_modification: Date;
}

/**
 * Statuts possibles d'un événement
 */
export type StatutEvenement = 'Planifié' | 'En cours' | 'Terminé' | 'Annulé';

/**
 * Type pour les administrateurs
 */
export interface Administrateur {
  id: string;
  email: string;
  mot_de_passe_hash: string;
  nom: string;
  prenom: string;
  role: RoleAdmin;
  actif: boolean;
  date_creation: Date;
  derniere_connexion?: Date;
}

/**
 * Rôles possibles des administrateurs
 */
export type RoleAdmin = 'admin' | 'super_admin';

/**
 * Type pour les prêts avec informations complètes (jointures)
 */
export interface PretComplet extends Pret {
  adherent: Adherent;
  jeu: Jeu;
}

/**
 * Type pour les filtres du catalogue
 */
export interface FiltresCatalogue {
  recherche?: string;
  categorie?: string;
  nombreJoueurs?: number;
  age?: number;
  dureeMax?: number;
  disponiblesUniquement?: boolean;
}

/**
 * Type pour les critères de tri
 */
export type CritereTri = 'titre' | 'popularite' | 'date_ajout' | 'age' | 'duree';

/**
 * Type pour l'ordre de tri
 */
export type OrdreTri = 'asc' | 'desc';

/**
 * Type pour les statistiques du catalogue
 */
export interface StatistiquesCatalogue {
  total: number;
  disponibles: number;
  empruntes: number;
  maintenance: number;
  categories: number;
  empruntsTotaux: number;
}

/**
 * Type pour le résultat de validation
 */
export interface ResultatValidation {
  valide: boolean;
  erreurs: string[];
}

/**
 * Type pour le résultat d'autorisation d'emprunt
 */
export interface ResultatAutorisation {
  autorise: boolean;
  message: string;
  raison?: string;
}

/**
 * Type pour les données de création d'adhérent
 */
export type CreationAdherent = Omit<
  Adherent, 
  'id' | 'numero_adherent' | 'cotisation_a_jour' | 'date_creation' | 'date_modification'
>;

/**
 * Type pour les données de création de jeu
 */
export type CreationJeu = Omit<
  Jeu, 
  'id' | 'code_jeu' | 'nombre_emprunts' | 'date_creation' | 'date_modification'
>;

/**
 * Type pour les données de création de prêt
 */
export type CreationPret = Omit<
  Pret, 
  'id' | 'numero_pret' | 'est_en_retard' | 'jours_retard' | 'date_creation' | 'date_modification'
>;

/**
 * Type pour les données de création d'événement
 */
export type CreationEvenement = Omit<
  Evenement, 
  'id' | 'nombre_inscrits' | 'complet' | 'date_creation' | 'date_modification'
>;
