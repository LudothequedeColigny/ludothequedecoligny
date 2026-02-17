// ============================================
// SERVICE DE GESTION DES PRÊTS
// Calcul automatique des retards et règles métier
// ============================================

import { Pret, StatutPret } from '../types';

/**
 * Service pour gérer les prêts de jeux
 */
export class PretService {
  
  /**
   * Vérifie si un prêt est en retard
   * @param pret - Le prêt à vérifier
   * @returns true si le prêt est en retard, false sinon
   */
  static estEnRetard(pret: Pret): boolean {
    // Un prêt rendu ou annulé n'est jamais considéré en retard
    if (pret.statut_pret === 'Rendu' || pret.statut_pret === 'Annulé') {
      return false;
    }

    // Si le prêt est déjà rendu
    if (pret.date_retour_effective) {
      return false;
    }

    const dateRetourPrevue = new Date(pret.date_retour_prevue);
    const aujourdhui = new Date();
    
    // Normalise les dates à minuit pour comparaison exacte
    aujourdhui.setHours(0, 0, 0, 0);
    dateRetourPrevue.setHours(0, 0, 0, 0);
    
    return aujourdhui > dateRetourPrevue;
  }

  /**
   * Calcule le nombre de jours de retard d'un prêt
   * @param pret - Le prêt à analyser
   * @returns Nombre de jours de retard (0 si pas de retard)
   */
  static calculerJoursRetard(pret: Pret): number {
    const dateRetourPrevue = new Date(pret.date_retour_prevue);
    let dateComparaison: Date;

    // Si le jeu a été rendu, on compare avec la date de retour effective
    // Sinon, on compare avec aujourd'hui
    if (pret.date_retour_effective) {
      dateComparaison = new Date(pret.date_retour_effective);
    } else {
      dateComparaison = new Date();
    }

    dateRetourPrevue.setHours(0, 0, 0, 0);
    dateComparaison.setHours(0, 0, 0, 0);

    const differenceMs = dateComparaison.getTime() - dateRetourPrevue.getTime();
    const joursRetard = Math.floor(differenceMs / (1000 * 60 * 60 * 24));
    
    // Retourne 0 si négatif (pas de retard)
    return Math.max(0, joursRetard);
  }

  /**
   * Calcule le nombre de jours restants avant la date de retour prévue
   * @param pret - Le prêt à analyser
   * @returns Nombre de jours restants (négatif si en retard)
   */
  static calculerJoursRestants(pret: Pret): number {
    // Si déjà rendu, retourne 0
    if (pret.date_retour_effective) {
      return 0;
    }

    const dateRetourPrevue = new Date(pret.date_retour_prevue);
    const aujourdhui = new Date();
    
    aujourdhui.setHours(0, 0, 0, 0);
    dateRetourPrevue.setHours(0, 0, 0, 0);

    const differenceMs = dateRetourPrevue.getTime() - aujourdhui.getTime();
    return Math.floor(differenceMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Détermine le statut approprié d'un prêt en fonction de son état
   * @param pret - Le prêt à analyser
   * @returns Le statut calculé
   */
  static determinerStatut(pret: Pret): StatutPret {
    if (pret.date_retour_effective) {
      return 'Rendu';
    }
    
    if (this.estEnRetard(pret)) {
      return 'En retard';
    }
    
    return 'En cours';
  }

  /**
   * Génère un numéro de prêt unique
   * Format : PRET-YYYYMMDD-XXXX (où XXXX est un compteur)
   * @param compteur - Numéro séquentiel
   * @returns Numéro de prêt formaté
   */
  static genererNumeroPret(compteur: number): string {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    const numero = String(compteur).padStart(4, '0');
    
    return `PRET-${annee}${mois}${jour}-${numero}`;
  }

  /**
   * Calcule la date de retour prévue en fonction de la date de prêt
   * @param datePret - Date du prêt
   * @param dureePretJours - Durée du prêt en jours (défaut: 14)
   * @returns Date de retour prévue
   */
  static calculerDateRetourPrevue(
    datePret: Date | string, 
    dureePretJours: number = 14
  ): Date {
    const date = new Date(datePret);
    date.setDate(date.getDate() + dureePretJours);
    return date;
  }

  /**
   * Valide qu'un prêt peut être créé
   * @param datePret - Date du prêt
   * @param dateRetourPrevue - Date de retour prévue
   * @returns Objet avec le résultat de la validation et les erreurs éventuelles
   */
  static validerPret(
    datePret: Date | string,
    dateRetourPrevue: Date | string
  ): { valide: boolean; erreurs: string[] } {
    const erreurs: string[] = [];

    const pret = new Date(datePret);
    const retour = new Date(dateRetourPrevue);
    const aujourdhui = new Date();

    aujourdhui.setHours(0, 0, 0, 0);
    pret.setHours(0, 0, 0, 0);
    retour.setHours(0, 0, 0, 0);

    // Vérification 1 : La date de prêt ne peut pas être dans le futur
    if (pret > aujourdhui) {
      erreurs.push("La date de prêt ne peut pas être dans le futur.");
    }

    // Vérification 2 : La date de retour doit être après la date de prêt
    if (retour <= pret) {
      erreurs.push("La date de retour prévue doit être postérieure à la date de prêt.");
    }

    // Vérification 3 : La durée du prêt ne doit pas dépasser un maximum (ex: 90 jours)
    const dureeMs = retour.getTime() - pret.getTime();
    const dureeJours = Math.floor(dureeMs / (1000 * 60 * 60 * 24));
    
    if (dureeJours > 90) {
      erreurs.push("La durée du prêt ne peut pas dépasser 90 jours.");
    }

    return {
      valide: erreurs.length === 0,
      erreurs
    };
  }

  /**
   * Marque un prêt comme rendu et calcule les informations de retour
   * @param pret - Le prêt à retourner
   * @param dateRetourEffective - Date de retour (par défaut: aujourd'hui)
   * @returns Prêt mis à jour avec les informations de retour
   */
  static marquerCommeRendu(
    pret: Pret, 
    dateRetourEffective?: Date | string
  ): Pret {
    const dateRetour = dateRetourEffective ? new Date(dateRetourEffective) : new Date();
    
    const pretMisAJour: Pret = {
      ...pret,
      date_retour_effective: dateRetour,
      statut_pret: 'Rendu'
    };

    return pretMisAJour;
  }

  /**
   * Obtient un message descriptif du statut d'un prêt
   * @param pret - Le prêt à décrire
   * @returns Message descriptif
   */
  static obtenirMessageStatut(pret: Pret): string {
    if (pret.date_retour_effective) {
      const joursRetard = this.calculerJoursRetard(pret);
      if (joursRetard > 0) {
        return `Rendu avec ${joursRetard} jour(s) de retard`;
      }
      return 'Rendu à temps';
    }

    if (this.estEnRetard(pret)) {
      const joursRetard = this.calculerJoursRetard(pret);
      return `En retard de ${joursRetard} jour(s)`;
    }

    const joursRestants = this.calculerJoursRestants(pret);
    if (joursRestants === 0) {
      return 'À retourner aujourd\'hui';
    } else if (joursRestants === 1) {
      return 'À retourner demain';
    } else if (joursRestants <= 3) {
      return `À retourner dans ${joursRestants} jours (bientôt !)`;
    } else {
      return `À retourner dans ${joursRestants} jours`;
    }
  }

  /**
   * Filtre les prêts en retard d'une liste
   * @param prets - Liste de prêts à filtrer
   * @returns Liste des prêts en retard uniquement
   */
  static filtrerPretsEnRetard(prets: Pret[]): Pret[] {
    return prets.filter(pret => this.estEnRetard(pret));
  }

  /**
   * Trie les prêts par nombre de jours de retard (décroissant)
   * @param prets - Liste de prêts à trier
   * @returns Liste triée
   */
  static trierParRetard(prets: Pret[]): Pret[] {
    return [...prets].sort((a, b) => {
      const retardA = this.calculerJoursRetard(a);
      const retardB = this.calculerJoursRetard(b);
      return retardB - retardA; // Ordre décroissant
    });
  }

  /**
   * Vérifie si un adhérent a des prêts en retard
   * @param prets - Liste des prêts de l'adhérent
   * @returns true si au moins un prêt est en retard
   */
  static aDesPretsEnRetard(prets: Pret[]): boolean {
    return prets.some(pret => this.estEnRetard(pret));
  }
}
