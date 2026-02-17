// ============================================
// SERVICE DE CATALOGUE
// Filtrage et affichage des jeux disponibles
// ============================================

import { Jeu, StatutJeu, EtatJeu } from '../types';

/**
 * Service pour gérer le catalogue de jeux
 */
export class CatalogueService {
  
  /**
   * Filtre les jeux disponibles pour le catalogue public
   * Ne retourne que les jeux qui peuvent être empruntés
   * @param jeux - Liste complète des jeux
   * @returns Liste des jeux disponibles pour emprunt
   */
  static filtrerJeuxDisponibles(jeux: Jeu[]): Jeu[] {
    return jeux.filter(jeu => 
      jeu.statut === 'Disponible' &&
      jeu.visible_catalogue_public === true &&
      jeu.etat !== 'Hors service' &&
      jeu.etat !== 'Retiré'
    );
  }

  /**
   * Vérifie si un jeu spécifique est disponible pour emprunt
   * @param jeu - Le jeu à vérifier
   * @returns true si le jeu est disponible, false sinon
   */
  static estDisponible(jeu: Jeu): boolean {
    return jeu.statut === 'Disponible' &&
           jeu.visible_catalogue_public === true &&
           jeu.etat !== 'Hors service' &&
           jeu.etat !== 'Retiré';
  }

  /**
   * Obtient un message descriptif du statut d'un jeu
   * @param jeu - Le jeu à décrire
   * @returns Message lisible pour l'utilisateur
   */
  static obtenirMessageStatut(jeu: Jeu): string {
    switch (jeu.statut) {
      case 'Disponible':
        return 'Disponible maintenant';
      case 'Emprunté':
        return 'Actuellement emprunté';
      case 'Réservé':
        return 'Réservé';
      case 'Maintenance':
        return 'En maintenance';
      case 'Retiré':
        return 'Retiré du catalogue';
      default:
        return 'Statut inconnu';
    }
  }

  /**
   * Filtre les jeux par catégorie
   * @param jeux - Liste de jeux
   * @param categorie - Catégorie recherchée
   * @returns Jeux de la catégorie spécifiée
   */
  static filtrerParCategorie(jeux: Jeu[], categorie: string): Jeu[] {
    return jeux.filter(jeu => 
      jeu.categorie?.toLowerCase() === categorie.toLowerCase()
    );
  }

  /**
   * Filtre les jeux par nombre de joueurs
   * @param jeux - Liste de jeux
   * @param nombreJoueurs - Nombre de joueurs souhaité
   * @returns Jeux compatibles avec ce nombre de joueurs
   */
  static filtrerParNombreJoueurs(jeux: Jeu[], nombreJoueurs: number): Jeu[] {
    return jeux.filter(jeu => {
      const min = jeu.nombre_joueurs_min || 1;
      const max = jeu.nombre_joueurs_max || 999;
      return nombreJoueurs >= min && nombreJoueurs <= max;
    });
  }

  /**
   * Filtre les jeux par âge
   * @param jeux - Liste de jeux
   * @param age - Âge du joueur
   * @returns Jeux adaptés à cet âge
   */
  static filtrerParAge(jeux: Jeu[], age: number): Jeu[] {
    return jeux.filter(jeu => {
      const ageMin = jeu.age_minimum || 0;
      const ageMax = jeu.age_maximum || 999;
      return age >= ageMin && age <= ageMax;
    });
  }

  /**
   * Filtre les jeux par durée de partie
   * @param jeux - Liste de jeux
   * @param dureeMaxSouhaitee - Durée maximale souhaitée en minutes
   * @returns Jeux dont la durée est compatible
   */
  static filtrerParDuree(jeux: Jeu[], dureeMaxSouhaitee: number): Jeu[] {
    return jeux.filter(jeu => {
      // Si pas de durée max définie, on l'inclut
      if (!jeu.duree_partie_max) return true;
      return jeu.duree_partie_max <= dureeMaxSouhaitee;
    });
  }

  /**
   * Recherche des jeux par titre ou éditeur
   * @param jeux - Liste de jeux
   * @param recherche - Terme de recherche
   * @returns Jeux correspondant à la recherche
   */
  static rechercherJeux(jeux: Jeu[], recherche: string): Jeu[] {
    const termeLowerCase = recherche.toLowerCase().trim();
    
    if (!termeLowerCase) return jeux;

    return jeux.filter(jeu =>
      jeu.titre.toLowerCase().includes(termeLowerCase) ||
      jeu.editeur?.toLowerCase().includes(termeLowerCase) ||
      jeu.auteur?.toLowerCase().includes(termeLowerCase) ||
      jeu.description?.toLowerCase().includes(termeLowerCase)
    );
  }

  /**
   * Obtient les catégories uniques d'une liste de jeux
   * @param jeux - Liste de jeux
   * @returns Liste des catégories uniques, triées alphabétiquement
   */
  static obtenirCategories(jeux: Jeu[]): string[] {
    const categories = new Set(
      jeux
        .filter(jeu => jeu.categorie)
        .map(jeu => jeu.categorie!)
    );
    
    return Array.from(categories).sort();
  }

  /**
   * Obtient les jeux les plus empruntés
   * @param jeux - Liste de jeux
   * @param limite - Nombre de jeux à retourner (défaut: 10)
   * @returns Les jeux les plus populaires
   */
  static obtenirJeuxPopulaires(jeux: Jeu[], limite: number = 10): Jeu[] {
    return [...jeux]
      .sort((a, b) => (b.nombre_emprunts || 0) - (a.nombre_emprunts || 0))
      .slice(0, limite);
  }

  /**
   * Obtient les nouveaux jeux (ajoutés récemment)
   * @param jeux - Liste de jeux
   * @param joursRecents - Nombre de jours pour considérer un jeu comme récent (défaut: 30)
   * @param limite - Nombre de jeux à retourner (défaut: 10)
   * @returns Les jeux récemment ajoutés
   */
  static obtenirNouveauxJeux(
    jeux: Jeu[], 
    joursRecents: number = 30,
    limite: number = 10
  ): Jeu[] {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - joursRecents);

    return jeux
      .filter(jeu => {
        if (!jeu.date_creation) return false;
        const dateCreation = new Date(jeu.date_creation);
        return dateCreation >= dateLimit;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date_creation!).getTime();
        const dateB = new Date(b.date_creation!).getTime();
        return dateB - dateA; // Plus récents en premier
      })
      .slice(0, limite);
  }

  /**
   * Applique plusieurs filtres simultanément
   * @param jeux - Liste de jeux
   * @param filtres - Objet contenant les critères de filtrage
   * @returns Jeux correspondant à tous les critères
   */
  static appliquerFiltres(
    jeux: Jeu[],
    filtres: {
      recherche?: string;
      categorie?: string;
      nombreJoueurs?: number;
      age?: number;
      dureeMax?: number;
      disponiblesUniquement?: boolean;
    }
  ): Jeu[] {
    let resultat = [...jeux];

    // Filtre : Disponibilité
    if (filtres.disponiblesUniquement) {
      resultat = this.filtrerJeuxDisponibles(resultat);
    }

    // Filtre : Recherche textuelle
    if (filtres.recherche) {
      resultat = this.rechercherJeux(resultat, filtres.recherche);
    }

    // Filtre : Catégorie
    if (filtres.categorie) {
      resultat = this.filtrerParCategorie(resultat, filtres.categorie);
    }

    // Filtre : Nombre de joueurs
    if (filtres.nombreJoueurs) {
      resultat = this.filtrerParNombreJoueurs(resultat, filtres.nombreJoueurs);
    }

    // Filtre : Âge
    if (filtres.age) {
      resultat = this.filtrerParAge(resultat, filtres.age);
    }

    // Filtre : Durée
    if (filtres.dureeMax) {
      resultat = this.filtrerParDuree(resultat, filtres.dureeMax);
    }

    return resultat;
  }

  /**
   * Trie les jeux selon différents critères
   * @param jeux - Liste de jeux
   * @param critere - Critère de tri
   * @param ordre - Ordre du tri ('asc' ou 'desc')
   * @returns Liste triée
   */
  static trierJeux(
    jeux: Jeu[],
    critere: 'titre' | 'popularite' | 'date_ajout' | 'age' | 'duree',
    ordre: 'asc' | 'desc' = 'asc'
  ): Jeu[] {
    const multiplier = ordre === 'asc' ? 1 : -1;

    return [...jeux].sort((a, b) => {
      switch (critere) {
        case 'titre':
          return multiplier * a.titre.localeCompare(b.titre);
        
        case 'popularite':
          return multiplier * ((b.nombre_emprunts || 0) - (a.nombre_emprunts || 0));
        
        case 'date_ajout':
          const dateA = a.date_creation ? new Date(a.date_creation).getTime() : 0;
          const dateB = b.date_creation ? new Date(b.date_creation).getTime() : 0;
          return multiplier * (dateB - dateA);
        
        case 'age':
          return multiplier * ((a.age_minimum || 0) - (b.age_minimum || 0));
        
        case 'duree':
          return multiplier * ((a.duree_partie_min || 0) - (b.duree_partie_min || 0));
        
        default:
          return 0;
      }
    });
  }

  /**
   * Obtient des statistiques sur le catalogue
   * @param jeux - Liste de jeux
   * @returns Objet contenant diverses statistiques
   */
  static obtenirStatistiques(jeux: Jeu[]): {
    total: number;
    disponibles: number;
    empruntes: number;
    maintenance: number;
    categories: number;
    empruntsTotaux: number;
  } {
    return {
      total: jeux.length,
      disponibles: jeux.filter(j => j.statut === 'Disponible').length,
      empruntes: jeux.filter(j => j.statut === 'Emprunté').length,
      maintenance: jeux.filter(j => j.statut === 'Maintenance').length,
      categories: this.obtenirCategories(jeux).length,
      empruntsTotaux: jeux.reduce((total, jeu) => total + (jeu.nombre_emprunts || 0), 0)
    };
  }
}
