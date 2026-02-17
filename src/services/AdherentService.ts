// ============================================
// SERVICE DE GESTION DES ADHÉRENTS
// Vérification de cotisation et règles métier
// ============================================

import { Adherent } from '../types';

/**
 * Service pour gérer les adhérents de la ludothèque
 */
export class AdherentService {
  
  /**
   * Vérifie si un adhérent est à jour de sa cotisation
   * @param adherent - L'adhérent à vérifier
   * @returns true si la cotisation est à jour, false sinon
   */
  static estCotisationAJour(adherent: Adherent): boolean {
    if (!adherent.actif) {
      return false;
    }

    const dateExpiration = new Date(adherent.date_expiration_cotisation);
    const aujourdhui = new Date();
    
    // Normalise les dates à minuit pour comparaison exacte
    aujourdhui.setHours(0, 0, 0, 0);
    dateExpiration.setHours(0, 0, 0, 0);
    
    return dateExpiration >= aujourdhui;
  }

  /**
   * Vérifie si un adhérent peut emprunter un jeu
   * @param adherent - L'adhérent qui souhaite emprunter
   * @param pretsEnCours - Nombre de prêts actuellement en cours pour cet adhérent
   * @param limitePretsSimultanes - Nombre maximum de prêts autorisés en même temps (défaut: 3)
   * @returns Objet avec le résultat de la vérification et un message explicatif
   */
  static peutEmprunter(
    adherent: Adherent, 
    pretsEnCours: number = 0,
    limitePretsSimultanes: number = 3
  ): { autorise: boolean; message: string; raison?: string } {
    
    // Vérification 1 : Adhérent actif
    if (!adherent.actif) {
      return {
        autorise: false,
        message: "L'adhérent n'est plus actif dans le système.",
        raison: 'ADHERENT_INACTIF'
      };
    }

    // Vérification 2 : Cotisation à jour
    if (!this.estCotisationAJour(adherent)) {
      const joursExpiration = this.calculerJoursDepuisExpiration(adherent.date_expiration_cotisation);
      return {
        autorise: false,
        message: `La cotisation a expiré il y a ${joursExpiration} jour(s). Merci de renouveler l'adhésion.`,
        raison: 'COTISATION_EXPIREE'
      };
    }

    // Vérification 3 : Limite de prêts simultanés
    if (pretsEnCours >= limitePretsSimultanes) {
      return {
        autorise: false,
        message: `La limite de ${limitePretsSimultanes} prêt(s) simultané(s) est atteinte. Veuillez retourner un jeu avant d'emprunter.`,
        raison: 'LIMITE_PRETS_ATTEINTE'
      };
    }

    // Toutes les vérifications sont OK
    return {
      autorise: true,
      message: "L'adhérent peut emprunter un jeu."
    };
  }

  /**
   * Calcule le nombre de jours depuis l'expiration de la cotisation
   * @param dateExpiration - Date d'expiration de la cotisation
   * @returns Nombre de jours depuis l'expiration (positif si expiré, négatif si encore valide)
   */
  static calculerJoursDepuisExpiration(dateExpiration: Date | string): number {
    const expiration = new Date(dateExpiration);
    const aujourdhui = new Date();
    
    expiration.setHours(0, 0, 0, 0);
    aujourdhui.setHours(0, 0, 0, 0);
    
    const differenceMs = aujourdhui.getTime() - expiration.getTime();
    return Math.floor(differenceMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcule le nombre de jours restants avant expiration de la cotisation
   * @param dateExpiration - Date d'expiration de la cotisation
   * @returns Nombre de jours restants (0 si déjà expiré)
   */
  static calculerJoursRestants(dateExpiration: Date | string): number {
    const jours = -this.calculerJoursDepuisExpiration(dateExpiration);
    return Math.max(0, jours);
  }

  /**
   * Génère un numéro d'adhérent unique
   * Format : ADH-YYYYMMDD-XXXX (où XXXX est un compteur)
   * @param compteur - Numéro séquentiel
   * @returns Numéro d'adhérent formaté
   */
  static genererNumeroAdherent(compteur: number): string {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    const numero = String(compteur).padStart(4, '0');
    
    return `ADH-${annee}${mois}${jour}-${numero}`;
  }

  /**
   * Calcule la nouvelle date d'expiration pour le renouvellement
   * @param dateActuelle - Date d'expiration actuelle
   * @param dureeEnMois - Durée de la nouvelle cotisation en mois (défaut: 12)
   * @returns Nouvelle date d'expiration
   */
  static calculerNouvelleExpiration(
    dateActuelle: Date | string, 
    dureeEnMois: number = 12
  ): Date {
    const expiration = new Date(dateActuelle);
    const aujourdhui = new Date();
    
    // Si la cotisation est encore valide, on part de la date d'expiration actuelle
    // Sinon, on part d'aujourd'hui
    const dateBase = expiration > aujourdhui ? expiration : aujourdhui;
    
    const nouvelleDate = new Date(dateBase);
    nouvelleDate.setMonth(nouvelleDate.getMonth() + dureeEnMois);
    
    return nouvelleDate;
  }

  /**
   * Valide les données d'un adhérent avant insertion/mise à jour
   * @param adherent - Données de l'adhérent à valider
   * @returns Objet avec le résultat de la validation et les erreurs éventuelles
   */
  static validerAdherent(adherent: Partial<Adherent>): { valide: boolean; erreurs: string[] } {
    const erreurs: string[] = [];

    // Validation email
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (adherent.email && !emailRegex.test(adherent.email)) {
      erreurs.push("Format d'email invalide.");
    }

    // Validation nom et prénom
    if (adherent.nom && adherent.nom.trim().length < 2) {
      erreurs.push("Le nom doit contenir au moins 2 caractères.");
    }
    if (adherent.prenom && adherent.prenom.trim().length < 2) {
      erreurs.push("Le prénom doit contenir au moins 2 caractères.");
    }

    // Validation téléphone (format basique)
    if (adherent.telephone) {
      const telRegex = /^[\d\s\+\-\(\)\.]+$/;
      if (!telRegex.test(adherent.telephone)) {
        erreurs.push("Format de téléphone invalide.");
      }
    }

    // Validation dates
    if (adherent.date_adhesion && adherent.date_expiration_cotisation) {
      const adhesion = new Date(adherent.date_adhesion);
      const expiration = new Date(adherent.date_expiration_cotisation);
      
      if (expiration < adhesion) {
        erreurs.push("La date d'expiration ne peut pas être antérieure à la date d'adhésion.");
      }
    }

    return {
      valide: erreurs.length === 0,
      erreurs
    };
  }
}
