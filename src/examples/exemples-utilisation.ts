// ============================================
// EXEMPLE D'UTILISATION DES SERVICES
// Scénario complet : Création d'un prêt
// ============================================

import { AdherentService } from '@services/AdherentService';
import { PretService } from '@services/PretService';
import { CatalogueService } from '@services/CatalogueService';
import {
  obtenirAdherentParId,
  obtenirJeuParId,
  compterPretsEnCours,
  creerPret,
  mettreAJourJeu,
} from '@services/api/queries';

/**
 * Exemple complet : Processus de création d'un prêt
 * 
 * Cette fonction montre comment utiliser tous les services
 * pour créer un prêt en respectant toutes les règles métier
 */
export async function exemplePretComplet(
  adherentId: string,
  jeuId: string,
  dureeJours: number = 14
) {
  try {
    console.log('🎲 Démarrage du processus de prêt...');
    
    // ========================================
    // ÉTAPE 1 : Récupérer l'adhérent
    // ========================================
    console.log('📋 Récupération des informations de l\'adhérent...');
    const adherent = await obtenirAdherentParId(adherentId);
    
    console.log(`✅ Adhérent trouvé : ${adherent.prenom} ${adherent.nom}`);
    
    // ========================================
    // ÉTAPE 2 : Vérifier la cotisation
    // ========================================
    console.log('🔍 Vérification de la cotisation...');
    
    const cotisationOk = AdherentService.estCotisationAJour(adherent);
    
    if (!cotisationOk) {
      const joursExpiration = AdherentService.calculerJoursDepuisExpiration(
        adherent.date_expiration_cotisation
      );
      throw new Error(
        `❌ La cotisation a expiré il y a ${joursExpiration} jour(s). ` +
        `Impossible de créer un prêt.`
      );
    }
    
    console.log('✅ Cotisation à jour');
    
    // ========================================
    // ÉTAPE 3 : Vérifier le nombre de prêts
    // ========================================
    console.log('🔍 Vérification du nombre de prêts en cours...');
    
    const nombrePretsEnCours = await compterPretsEnCours(adherentId);
    const limitePretsSimultanes = 3; // Configurable
    
    const autorisationEmprunt = AdherentService.peutEmprunter(
      adherent,
      nombrePretsEnCours,
      limitePretsSimultanes
    );
    
    if (!autorisationEmprunt.autorise) {
      throw new Error(`❌ ${autorisationEmprunt.message}`);
    }
    
    console.log(`✅ Nombre de prêts : ${nombrePretsEnCours}/${limitePretsSimultanes}`);
    
    // ========================================
    // ÉTAPE 4 : Récupérer et vérifier le jeu
    // ========================================
    console.log('🎮 Récupération des informations du jeu...');
    
    const jeu = await obtenirJeuParId(jeuId);
    console.log(`✅ Jeu trouvé : ${jeu.titre}`);
    
    // Vérifier la disponibilité
    const estDisponible = CatalogueService.estDisponible(jeu);
    
    if (!estDisponible) {
      const messageStatut = CatalogueService.obtenirMessageStatut(jeu);
      throw new Error(`❌ Le jeu n'est pas disponible. Statut : ${messageStatut}`);
    }
    
    console.log('✅ Jeu disponible pour emprunt');
    
    // ========================================
    // ÉTAPE 5 : Calculer les dates du prêt
    // ========================================
    console.log('📅 Calcul des dates du prêt...');
    
    const datePret = new Date();
    const dateRetourPrevue = PretService.calculerDateRetourPrevue(datePret, dureeJours);
    
    // Valider les dates
    const validationDates = PretService.validerPret(datePret, dateRetourPrevue);
    if (!validationDates.valide) {
      throw new Error(`❌ Dates invalides : ${validationDates.erreurs.join(', ')}`);
    }
    
    console.log(`✅ Date de prêt : ${datePret.toLocaleDateString()}`);
    console.log(`✅ Date de retour prévue : ${dateRetourPrevue.toLocaleDateString()}`);
    
    // ========================================
    // ÉTAPE 6 : Générer le numéro de prêt
    // ========================================
    const compteur = Math.floor(Math.random() * 9999); // En production, utiliser un vrai compteur
    const numeroPret = PretService.genererNumeroPret(compteur);
    
    console.log(`📝 Numéro de prêt généré : ${numeroPret}`);
    
    // ========================================
    // ÉTAPE 7 : Créer le prêt dans la base
    // ========================================
    console.log('💾 Création du prêt dans la base de données...');
    
    const nouveauPret = await creerPret({
      numero_pret: numeroPret,
      adherent_id: adherentId,
      jeu_id: jeuId,
      date_pret: datePret,
      date_retour_prevue: dateRetourPrevue,
      duree_pret_jours: dureeJours,
      statut_pret: 'En cours',
    });
    
    console.log('✅ Prêt créé avec succès !');
    
    // ========================================
    // ÉTAPE 8 : Mettre à jour le statut du jeu
    // ========================================
    console.log('🔄 Mise à jour du statut du jeu...');
    
    await mettreAJourJeu(jeuId, {
      statut: 'Emprunté',
      nombre_emprunts: jeu.nombre_emprunts + 1,
    });
    
    console.log('✅ Statut du jeu mis à jour');
    
    // ========================================
    // RÉSUMÉ FINAL
    // ========================================
    console.log('\n🎉 PRÊT CRÉÉ AVEC SUCCÈS !');
    console.log('================================');
    console.log(`📋 Numéro : ${numeroPret}`);
    console.log(`👤 Adhérent : ${adherent.prenom} ${adherent.nom}`);
    console.log(`🎮 Jeu : ${jeu.titre}`);
    console.log(`📅 Date de prêt : ${datePret.toLocaleDateString()}`);
    console.log(`📅 À retourner le : ${dateRetourPrevue.toLocaleDateString()}`);
    console.log(`⏱️  Durée : ${dureeJours} jours`);
    console.log('================================\n');
    
    return {
      succes: true,
      pret: nouveauPret,
      message: 'Prêt créé avec succès',
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du prêt :', error);
    
    return {
      succes: false,
      pret: null,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Exemple : Vérifier les prêts en retard d'un adhérent
 */
export async function exempleVerificationRetards(adherentId: string) {
  try {
    console.log('🔍 Vérification des retards pour l\'adhérent...');
    
    // Récupérer tous les prêts de l'adhérent
    const { obtenirPretsDunAdherent } = await import('@services/api/queries');
    const prets = await obtenirPretsDunAdherent(adherentId);
    
    // Filtrer les prêts en retard
    const pretsEnRetard = PretService.filtrerPretsEnRetard(prets);
    
    if (pretsEnRetard.length === 0) {
      console.log('✅ Aucun prêt en retard');
      return { retards: false, nombre: 0 };
    }
    
    console.log(`⚠️  ${pretsEnRetard.length} prêt(s) en retard`);
    
    // Afficher les détails
    pretsEnRetard.forEach((pret) => {
      const joursRetard = PretService.calculerJoursRetard(pret);
      const message = PretService.obtenirMessageStatut(pret);
      
      console.log(`  - ${pret.jeu.titre} : ${message} (${joursRetard} jours)`);
    });
    
    return {
      retards: true,
      nombre: pretsEnRetard.length,
      details: pretsEnRetard,
    };
    
  } catch (error) {
    console.error('❌ Erreur :', error);
    throw error;
  }
}

/**
 * Exemple : Filtrer le catalogue pour un groupe spécifique
 */
export async function exempleFiltrageCatalogue() {
  try {
    console.log('🎯 Exemple de filtrage du catalogue...\n');
    
    const { obtenirJeuxDisponibles } = await import('@services/api/queries');
    const tousLesJeux = await obtenirJeuxDisponibles();
    
    console.log(`📊 Total de jeux disponibles : ${tousLesJeux.length}`);
    
    // ========================================
    // Scénario 1 : Jeux pour enfants de 8 ans
    // ========================================
    console.log('\n🧒 Scénario 1 : Jeux adaptés pour un enfant de 8 ans');
    const jeuxPourEnfants = CatalogueService.filtrerParAge(tousLesJeux, 8);
    console.log(`   Résultats : ${jeuxPourEnfants.length} jeux`);
    
    // ========================================
    // Scénario 2 : Jeux pour 4 joueurs
    // ========================================
    console.log('\n👥 Scénario 2 : Jeux pour 4 joueurs');
    const jeuxPour4 = CatalogueService.filtrerParNombreJoueurs(tousLesJeux, 4);
    console.log(`   Résultats : ${jeuxPour4.length} jeux`);
    
    // ========================================
    // Scénario 3 : Jeux de stratégie courts
    // ========================================
    console.log('\n⚡ Scénario 3 : Jeux de stratégie de moins de 60 minutes');
    const jeuxStrategieRapides = CatalogueService.appliquerFiltres(tousLesJeux, {
      categorie: 'Stratégie',
      dureeMax: 60,
      disponiblesUniquement: true,
    });
    console.log(`   Résultats : ${jeuxStrategieRapides.length} jeux`);
    
    // ========================================
    // Scénario 4 : Recherche textuelle
    // ========================================
    console.log('\n🔍 Scénario 4 : Recherche "catan"');
    const resultatRecherche = CatalogueService.rechercherJeux(tousLesJeux, 'catan');
    console.log(`   Résultats : ${resultatRecherche.length} jeux`);
    
    // ========================================
    // Statistiques générales
    // ========================================
    console.log('\n📈 Statistiques du catalogue :');
    const stats = CatalogueService.obtenirStatistiques(tousLesJeux);
    console.log(`   Total : ${stats.total}`);
    console.log(`   Disponibles : ${stats.disponibles}`);
    console.log(`   Empruntés : ${stats.empruntes}`);
    console.log(`   Catégories : ${stats.categories}`);
    console.log(`   Emprunts totaux : ${stats.empruntsTotaux}`);
    
    return stats;
    
  } catch (error) {
    console.error('❌ Erreur :', error);
    throw error;
  }
}
