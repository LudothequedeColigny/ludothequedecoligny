# 🚀 LudoVillage - Aide-Mémoire Rapide

## ⚡ Actions Courantes

### Créer un Prêt

```typescript
// 1. Vérifier l'adhérent
const pretsEnCours = await compterPretsEnCours(adherentId);
const autorisation = AdherentService.peutEmprunter(adherent, pretsEnCours);

// 2. Vérifier le jeu
const estDispo = CatalogueService.estDisponible(jeu);

// 3. Créer le prêt
const pret = await creerPret({
  adherent_id: adherentId,
  jeu_id: jeuId,
  date_pret: new Date(),
  date_retour_prevue: PretService.calculerDateRetourPrevue(new Date(), 14),
  duree_pret_jours: 14,
  statut_pret: 'En cours',
});
```

### Retourner un Jeu

```typescript
const pretRendu = await marquerPretRendu(pretId);
const joursRetard = PretService.calculerJoursRetard(pretRendu);
```

### Rechercher dans le Catalogue

```typescript
const resultats = CatalogueService.appliquerFiltres(jeux, {
  recherche: 'catan',
  nombreJoueurs: 4,
  age: 10,
  disponiblesUniquement: true,
});
```

### Vérifier la Cotisation

```typescript
const aJour = AdherentService.estCotisationAJour(adherent);
const joursRestants = AdherentService.calculerJoursRestants(adherent.date_expiration_cotisation);
```

---

## 📦 Imports Essentiels

```typescript
// Services
import { AdherentService } from '@services/AdherentService';
import { PretService } from '@services/PretService';
import { CatalogueService } from '@services/CatalogueService';

// API
import {
  obtenirAdherents,
  obtenirJeux,
  obtenirPretsEnCours,
  creerPret,
  marquerPretRendu,
} from '@services/api/queries';

// Types
import type { Adherent, Jeu, Pret, Evenement } from '@types';
```

---

## 🎯 Méthodes Clés

### AdherentService

| Méthode | Description |
|---------|-------------|
| `estCotisationAJour(adherent)` | Vérifie si cotisation valide |
| `peutEmprunter(adherent, pretsEnCours)` | Vérifie autorisation d'emprunt |
| `calculerJoursRestants(dateExp)` | Jours avant expiration |
| `genererNumeroAdherent(compteur)` | Format : ADH-YYYYMMDD-XXXX |
| `validerAdherent(data)` | Valide email, nom, téléphone |

### PretService

| Méthode | Description |
|---------|-------------|
| `estEnRetard(pret)` | Vérifie si prêt en retard |
| `calculerJoursRetard(pret)` | Nombre de jours de retard |
| `calculerJoursRestants(pret)` | Jours avant retour prévu |
| `obtenirMessageStatut(pret)` | Message lisible du statut |
| `filtrerPretsEnRetard(prets)` | Filtre les prêts en retard |
| `genererNumeroPret(compteur)` | Format : PRET-YYYYMMDD-XXXX |

### CatalogueService

| Méthode | Description |
|---------|-------------|
| `filtrerJeuxDisponibles(jeux)` | Jeux disponibles pour emprunt |
| `estDisponible(jeu)` | Vérifie si jeu disponible |
| `rechercherJeux(jeux, terme)` | Recherche dans titre/éditeur |
| `appliquerFiltres(jeux, filtres)` | Filtre multi-critères |
| `obtenirJeuxPopulaires(jeux, limite)` | Top jeux empruntés |
| `obtenirStatistiques(jeux)` | Stats du catalogue |

---

## 🔍 Requêtes DB Principales

### Adhérents

```typescript
obtenirAdherents()                      // Tous les adhérents actifs
obtenirAdherentParId(id)                // Un adhérent
creerAdherent(data)                     // Créer
mettreAJourAdherent(id, data)          // Mettre à jour
obtenirAdherentsCotisationExpiree()    // Cotisations expirées
```

### Jeux

```typescript
obtenirJeux()                           // Tous les jeux
obtenirJeuxDisponibles()                // Vue catalogue_public
obtenirJeuParId(id)                     // Un jeu
creerJeu(data)                          // Créer
mettreAJourJeu(id, data)               // Mettre à jour
rechercherJeux(terme)                   // Recherche
```

### Prêts

```typescript
obtenirPretsEnCours()                   // Prêts actuels
obtenirPretsEnRetard()                  // Vue prets_en_retard
obtenirPretsDunAdherent(adherentId)    // Prêts d'un adhérent
compterPretsEnCours(adherentId)        // Nombre de prêts
creerPret(data)                         // Créer
marquerPretRendu(id, date?)            // Retour
```

### Événements

```typescript
obtenirEvenementsPublics()             // Événements à venir
obtenirTousLesEvenements()             // Tous (admin)
creerEvenement(data)                    // Créer
mettreAJourEvenement(id, data)         // Mettre à jour
```

---

## 💡 Colonnes Calculées Auto (SQL)

Ces colonnes sont calculées automatiquement par PostgreSQL :

- `adherents.cotisation_a_jour` : `date_expiration >= TODAY`
- `prets.est_en_retard` : `date_retour_effective IS NULL AND date_retour_prevue < TODAY`
- `prets.jours_retard` : Nombre de jours de retard
- `evenements.complet` : `nombre_inscrits >= capacite_max`

---

## 🎨 Composants React Exemples

### Badge Cotisation

```tsx
<span className={adherent.cotisation_a_jour 
  ? 'bg-success-100 text-success-600' 
  : 'bg-danger-100 text-danger-600'}>
  {AdherentService.estCotisationAJour(adherent) ? '✅' : '❌'}
</span>
```

### Badge Retard

```tsx
{PretService.estEnRetard(pret) && (
  <span className="bg-danger-100 text-danger-600">
    ⚠️ {PretService.calculerJoursRetard(pret)} jour(s)
  </span>
)}
```

### Bouton Emprunter

```tsx
<button
  disabled={!CatalogueService.estDisponible(jeu)}
  className={jeu.statut === 'Disponible'
    ? 'bg-primary-500 text-white'
    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}>
  {CatalogueService.obtenirMessageStatut(jeu)}
</button>
```

---

## 📋 Configuration Rapide

### Variables `.env`

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_DUREE_PRET_DEFAUT=14
VITE_LIMITE_PRETS_SIMULTANES=3
VITE_DUREE_COTISATION_MOIS=12
```

### Structure Dossiers

```
src/
├── components/     # Composants React
├── pages/         # Pages/Routes
├── services/      # Logique métier
├── types/         # Types TypeScript
├── hooks/         # Hooks personnalisés
└── utils/         # Utilitaires
```

---

## ⚠️ Points d'Attention

1. **Toujours valider** avant création/mise à jour
2. **Gérer les erreurs** avec try/catch
3. **Utiliser les vues SQL** pour optimiser (catalogue_public, prets_en_retard)
4. **Ne pas dupliquer la logique** : colonnes calculées > calculs manuels
5. **Penser mobile** : design responsive avec Tailwind

---

## 🔗 Liens Utiles

- [README.md](./README.md) - Installation et présentation
- [GUIDE_UTILISATION.md](./GUIDE_UTILISATION.md) - Guide détaillé
- [schema.sql](./database/schema.sql) - Schéma complet de la DB
- [Supabase Docs](https://supabase.com/docs)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**🎲 Bon code !**
