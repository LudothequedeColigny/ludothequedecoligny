# 📘 Guide d'Utilisation - LudoVillage

## 🎯 Introduction

Ce guide explique comment utiliser les différents services et fonctionnalités de LudoVillage dans votre code.

---

## 🔐 Authentification

### Connexion d'un administrateur

```typescript
import { seConnecter } from '@services/api/supabase';

async function handleLogin(email: string, password: string) {
  try {
    const data = await seConnecter(email, password);
    console.log('✅ Connexion réussie');
    return data;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
  }
}
```

### Vérifier si l'utilisateur est connecté

```typescript
import { estAuthentifie } from '@services/api/supabase';

async function checkAuth() {
  const isAuth = await estAuthentifie();
  if (!isAuth) {
    // Rediriger vers la page de connexion
  }
}
```

---

## 👥 Gestion des Adhérents

### Vérifier si un adhérent peut emprunter

```typescript
import { AdherentService } from '@services/AdherentService';
import { compterPretsEnCours } from '@services/api/queries';

async function verifierAutorisation(adherent) {
  // Compter les prêts en cours
  const pretsEnCours = await compterPretsEnCours(adherent.id);
  
  // Vérifier l'autorisation (cotisation + limite de prêts)
  const resultat = AdherentService.peutEmprunter(adherent, pretsEnCours, 3);
  
  if (resultat.autorise) {
    console.log('✅ Adhérent autorisé à emprunter');
  } else {
    console.log(`❌ ${resultat.message}`);
    console.log(`Raison: ${resultat.raison}`);
  }
  
  return resultat;
}
```

### Vérifier la cotisation uniquement

```typescript
import { AdherentService } from '@services/AdherentService';

function afficherStatutCotisation(adherent) {
  const aJour = AdherentService.estCotisationAJour(adherent);
  
  if (aJour) {
    const joursRestants = AdherentService.calculerJoursRestants(
      adherent.date_expiration_cotisation
    );
    console.log(`✅ Cotisation valide (${joursRestants} jours restants)`);
  } else {
    const joursExpiration = AdherentService.calculerJoursDepuisExpiration(
      adherent.date_expiration_cotisation
    );
    console.log(`❌ Cotisation expirée depuis ${joursExpiration} jours`);
  }
}
```

### Créer un nouvel adhérent

```typescript
import { creerAdherent } from '@services/api/queries';
import { AdherentService } from '@services/AdherentService';

async function creerNouvelAdherent(data) {
  // Valider les données
  const validation = AdherentService.validerAdherent(data);
  
  if (!validation.valide) {
    console.error('❌ Erreurs de validation:', validation.erreurs);
    return;
  }
  
  // Générer un numéro d'adhérent unique
  const compteur = 123; // À récupérer de la base
  const numeroAdherent = AdherentService.genererNumeroAdherent(compteur);
  
  // Calculer la date d'expiration (12 mois par défaut)
  const dateExpiration = AdherentService.calculerNouvelleExpiration(
    new Date(),
    12
  );
  
  // Créer l'adhérent
  const adherent = await creerAdherent({
    ...data,
    numero_adherent: numeroAdherent,
    date_adhesion: new Date(),
    date_expiration_cotisation: dateExpiration,
    actif: true,
  });
  
  console.log('✅ Adhérent créé:', adherent.numero_adherent);
  return adherent;
}
```

### Renouveler une cotisation

```typescript
import { mettreAJourAdherent } from '@services/api/queries';
import { AdherentService } from '@services/AdherentService';

async function renouvelerCotisation(adherentId, adherent, dureeMois = 12) {
  // Calculer la nouvelle date d'expiration
  const nouvelleExpiration = AdherentService.calculerNouvelleExpiration(
    adherent.date_expiration_cotisation,
    dureeMois
  );
  
  // Mettre à jour dans la base
  const adherentMisAJour = await mettreAJourAdherent(adherentId, {
    date_expiration_cotisation: nouvelleExpiration,
  });
  
  console.log('✅ Cotisation renouvelée jusqu\'au', nouvelleExpiration.toLocaleDateString());
  return adherentMisAJour;
}
```

---

## 📦 Gestion des Prêts

### Créer un nouveau prêt

```typescript
import { creerPret, mettreAJourJeu } from '@services/api/queries';
import { PretService } from '@services/PretService';

async function creerNouveauPret(adherentId, jeuId, dureeJours = 14) {
  // Calculer les dates
  const datePret = new Date();
  const dateRetourPrevue = PretService.calculerDateRetourPrevue(datePret, dureeJours);
  
  // Valider
  const validation = PretService.validerPret(datePret, dateRetourPrevue);
  if (!validation.valide) {
    throw new Error(validation.erreurs.join(', '));
  }
  
  // Générer le numéro
  const compteur = 456; // À récupérer de la base
  const numeroPret = PretService.genererNumeroPret(compteur);
  
  // Créer le prêt
  const pret = await creerPret({
    numero_pret: numeroPret,
    adherent_id: adherentId,
    jeu_id: jeuId,
    date_pret: datePret,
    date_retour_prevue: dateRetourPrevue,
    duree_pret_jours: dureeJours,
    statut_pret: 'En cours',
  });
  
  // Mettre à jour le jeu (le trigger le fait automatiquement normalement)
  // Mais on peut le faire manuellement si nécessaire
  
  console.log('✅ Prêt créé:', numeroPret);
  return pret;
}
```

### Vérifier les retards

```typescript
import { PretService } from '@services/PretService';

function afficherStatutPret(pret) {
  const enRetard = PretService.estEnRetard(pret);
  const message = PretService.obtenirMessageStatut(pret);
  
  console.log(`Statut: ${message}`);
  
  if (enRetard) {
    const joursRetard = PretService.calculerJoursRetard(pret);
    console.log(`⚠️ Retard de ${joursRetard} jour(s)`);
  } else if (!pret.date_retour_effective) {
    const joursRestants = PretService.calculerJoursRestants(pret);
    console.log(`✅ ${joursRestants} jour(s) restant(s)`);
  }
}
```

### Retourner un jeu

```typescript
import { marquerPretRendu } from '@services/api/queries';
import { PretService } from '@services/PretService';

async function retournerJeu(pretId, pret) {
  // Marquer comme rendu
  const pretMisAJour = await marquerPretRendu(pretId);
  
  // Calculer si retard
  const joursRetard = PretService.calculerJoursRetard(pretMisAJour);
  
  if (joursRetard > 0) {
    console.log(`⚠️ Jeu retourné avec ${joursRetard} jour(s) de retard`);
    // Envoyer un email ou appliquer une pénalité si besoin
  } else {
    console.log('✅ Jeu retourné à temps');
  }
  
  return pretMisAJour;
}
```

### Obtenir tous les prêts en retard

```typescript
import { obtenirPretsEnRetard } from '@services/api/queries';
import { PretService } from '@services/PretService';

async function afficherPretsEnRetard() {
  const pretsEnRetard = await obtenirPretsEnRetard();
  
  // Trier par ordre de retard décroissant
  const pretsTries = PretService.trierParRetard(pretsEnRetard);
  
  console.log(`⚠️ ${pretsTries.length} prêt(s) en retard :`);
  
  pretsTries.forEach(pret => {
    const joursRetard = PretService.calculerJoursRetard(pret);
    console.log(
      `- ${pret.adherent_nom} ${pret.adherent_prenom}: ` +
      `${pret.jeu_titre} (${joursRetard} jours de retard)`
    );
  });
}
```

---

## 🎮 Gestion du Catalogue

### Afficher les jeux disponibles (catalogue public)

```typescript
import { obtenirJeuxDisponibles } from '@services/api/queries';
import { CatalogueService } from '@services/CatalogueService';

async function afficherCataloguePublic() {
  // Récupérer les jeux disponibles (utilise la vue SQL optimisée)
  const jeux = await obtenirJeuxDisponibles();
  
  // Filtrage supplémentaire côté client si besoin
  const jeuxDisponibles = CatalogueService.filtrerJeuxDisponibles(jeux);
  
  console.log(`📚 ${jeuxDisponibles.length} jeux disponibles`);
  return jeuxDisponibles;
}
```

### Rechercher dans le catalogue

```typescript
import { CatalogueService } from '@services/CatalogueService';

function rechercherJeux(jeux, terme) {
  const resultats = CatalogueService.rechercherJeux(jeux, terme);
  
  console.log(`🔍 Recherche "${terme}": ${resultats.length} résultat(s)`);
  return resultats;
}
```

### Filtres avancés

```typescript
import { CatalogueService } from '@services/CatalogueService';

function filtrerCatalogue(jeux, filtres) {
  // Exemple de filtres :
  // {
  //   recherche: 'catan',
  //   categorie: 'Stratégie',
  //   nombreJoueurs: 4,
  //   age: 10,
  //   dureeMax: 90,
  //   disponiblesUniquement: true
  // }
  
  const resultats = CatalogueService.appliquerFiltres(jeux, filtres);
  
  console.log(`🎯 ${resultats.length} jeu(x) correspond(ent) aux critères`);
  return resultats;
}
```

### Obtenir les jeux populaires

```typescript
import { CatalogueService } from '@services/CatalogueService';

function afficherJeuxPopulaires(jeux, limite = 10) {
  const populaires = CatalogueService.obtenirJeuxPopulaires(jeux, limite);
  
  console.log(`🏆 Top ${limite} des jeux les plus empruntés :`);
  populaires.forEach((jeu, index) => {
    console.log(`${index + 1}. ${jeu.titre} (${jeu.nombre_emprunts} emprunts)`);
  });
  
  return populaires;
}
```

### Obtenir les nouveaux jeux

```typescript
import { CatalogueService } from '@services/CatalogueService';

function afficherNouveauxJeux(jeux, joursRecents = 30) {
  const nouveaux = CatalogueService.obtenirNouveauxJeux(jeux, joursRecents);
  
  console.log(`🆕 ${nouveaux.length} jeu(x) ajouté(s) récemment`);
  return nouveaux;
}
```

### Statistiques du catalogue

```typescript
import { CatalogueService } from '@services/CatalogueService';

function afficherStatistiques(jeux) {
  const stats = CatalogueService.obtenirStatistiques(jeux);
  
  console.log('📊 Statistiques du catalogue :');
  console.log(`   Total de jeux : ${stats.total}`);
  console.log(`   Disponibles : ${stats.disponibles}`);
  console.log(`   Empruntés : ${stats.empruntes}`);
  console.log(`   En maintenance : ${stats.maintenance}`);
  console.log(`   Catégories : ${stats.categories}`);
  console.log(`   Emprunts totaux : ${stats.empruntsTotaux}`);
  
  return stats;
}
```

---

## 📊 Statistiques Globales

### Dashboard administrateur

```typescript
import { obtenirStatistiquesGlobales } from '@services/api/queries';

async function afficherDashboard() {
  const stats = await obtenirStatistiquesGlobales();
  
  console.log('📊 TABLEAU DE BORD');
  console.log('==================');
  console.log(`👥 Adhérents actifs : ${stats.nbAdherents}`);
  console.log(`🎮 Jeux au catalogue : ${stats.nbJeux}`);
  console.log(`✅ Jeux disponibles : ${stats.nbJeuxDisponibles}`);
  console.log(`📦 Prêts en cours : ${stats.nbPretsEnCours}`);
  console.log(`⚠️  Prêts en retard : ${stats.nbPretsEnRetard}`);
  
  return stats;
}
```

---

## 🎨 Composants React (Exemples)

### Carte de jeu avec statut

```typescript
import { CatalogueService } from '@services/CatalogueService';

function CarteJeu({ jeu }) {
  const estDisponible = CatalogueService.estDisponible(jeu);
  const messageStatut = CatalogueService.obtenirMessageStatut(jeu);
  
  return (
    <div className="bg-white rounded-lg shadow-card p-4">
      <img src={jeu.image_url} alt={jeu.titre} className="w-full h-48 object-cover" />
      <h3 className="text-lg font-bold mt-2">{jeu.titre}</h3>
      <p className="text-gray-600">{jeu.editeur}</p>
      
      <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm ${
        estDisponible 
          ? 'bg-success-100 text-success-600' 
          : 'bg-gray-100 text-gray-600'
      }`}>
        {messageStatut}
      </div>
      
      {estDisponible && (
        <button className="mt-4 w-full bg-primary-500 text-white py-2 rounded-lg">
          Emprunter
        </button>
      )}
    </div>
  );
}
```

### Badge de statut d'adhérent

```typescript
import { AdherentService } from '@services/AdherentService';

function BadgeCotisation({ adherent }) {
  const aJour = AdherentService.estCotisationAJour(adherent);
  const joursRestants = AdherentService.calculerJoursRestants(
    adherent.date_expiration_cotisation
  );
  
  if (aJour) {
    return (
      <span className="bg-success-100 text-success-600 px-3 py-1 rounded-full text-sm">
        ✅ À jour (expire dans {joursRestants} jours)
      </span>
    );
  }
  
  const joursExpiration = AdherentService.calculerJoursDepuisExpiration(
    adherent.date_expiration_cotisation
  );
  
  return (
    <span className="bg-danger-100 text-danger-600 px-3 py-1 rounded-full text-sm">
      ❌ Expirée depuis {joursExpiration} jours
    </span>
  );
}
```

### Badge de retard de prêt

```typescript
import { PretService } from '@services/PretService';

function BadgeRetard({ pret }) {
  const enRetard = PretService.estEnRetard(pret);
  const message = PretService.obtenirMessageStatut(pret);
  
  if (pret.date_retour_effective) {
    return (
      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
        {message}
      </span>
    );
  }
  
  if (enRetard) {
    const joursRetard = PretService.calculerJoursRetard(pret);
    return (
      <span className="bg-danger-100 text-danger-600 px-3 py-1 rounded-full text-sm">
        ⚠️ Retard : {joursRetard} jour(s)
      </span>
    );
  }
  
  const joursRestants = PretService.calculerJoursRestants(pret);
  const bientotDu = joursRestants <= 3;
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm ${
      bientotDu 
        ? 'bg-warning-100 text-warning-600' 
        : 'bg-success-100 text-success-600'
    }`}>
      {message}
    </span>
  );
}
```

---

## 🔧 Utilitaires et Helpers

### Formatage de dates

```typescript
import { format, formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formaterDate(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
}

export function formaterDateRelative(date: Date | string): string {
  return formatDistance(new Date(date), new Date(), {
    addSuffix: true,
    locale: fr,
  });
}
```

### Gestion des erreurs

```typescript
export function gererErreurAPI(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Une erreur inconnue est survenue';
}
```

---

## 📝 Bonnes Pratiques

### 1. Toujours valider avant de créer

```typescript
// ✅ BON
const validation = AdherentService.validerAdherent(data);
if (validation.valide) {
  await creerAdherent(data);
}

// ❌ MAUVAIS
await creerAdherent(data); // Pas de validation
```

### 2. Gérer les erreurs proprement

```typescript
// ✅ BON
try {
  const pret = await creerPret(data);
  console.log('Succès');
} catch (error) {
  console.error('Erreur:', gererErreurAPI(error));
  // Afficher un message à l'utilisateur
}
```

### 3. Utiliser les colonnes calculées de la base

```typescript
// ✅ BON - Utilise la colonne calculée
if (adherent.cotisation_a_jour) { ... }

// ⚠️ ACCEPTABLE - Calcul côté client (si nécessaire)
if (AdherentService.estCotisationAJour(adherent)) { ... }
```

### 4. Optimiser les requêtes

```typescript
// ✅ BON - Une seule requête avec jointure
const pretsAvecDetails = await obtenirPretsEnCours();

// ❌ MAUVAIS - N+1 queries
const prets = await obtenirPrets();
for (const pret of prets) {
  const adherent = await obtenirAdherent(pret.adherent_id);
  const jeu = await obtenirJeu(pret.jeu_id);
}
```

---

## 🚀 Pour Aller Plus Loin

- Consultez le README.md pour l'installation
- Examinez les exemples dans `/src/examples/`
- Lisez le schéma SQL dans `/database/schema.sql`
- Explorez les types dans `/src/types/index.ts`

---

**Bon développement ! 🎲**
