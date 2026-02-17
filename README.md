# 🎲 LudoVillage - Gestion de Ludothèque Associative

Application web moderne de gestion de ludothèque avec interface publique et zone d'administration sécurisée.

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Technologies](#technologies)
- [Structure du projet](#structure-du-projet)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Base de données](#base-de-données)
- [Services métier](#services-métier)

## ✨ Fonctionnalités

### Zone Publique (Sans authentification)
- 📚 **Catalogue de jeux** : Consultation des jeux disponibles avec filtres avancés
- 🎉 **Événements** : Visualisation des événements à venir
- 🔍 **Recherche** : Moteur de recherche multi-critères

### Zone Privée (Authentification requise)
- 👥 **Gestion des adhérents** : CRUD complet avec suivi des cotisations
- 🎮 **Gestion des jeux** : Catalogue complet avec statuts et états
- 📦 **Gestion des prêts** : Création, suivi et retours avec calcul automatique des retards
- 📅 **Gestion des événements** : Organisation et suivi des événements
- 📊 **Statistiques** : Tableaux de bord et rapports

## 🛠️ Technologies

- **Frontend** : React 18 + TypeScript
- **Build Tool** : Vite
- **Styling** : Tailwind CSS
- **Base de données** : Supabase (PostgreSQL) ou Firebase
- **Authentification** : Supabase Auth / Firebase Auth
- **Validation** : Zod
- **Routing** : React Router v6
- **State Management** : Context API / Zustand
- **Formulaires** : React Hook Form

## 📁 Structure du projet

```
ludovillage/
├── database/
│   ├── schema.sql              # Schéma complet de la base de données
│   └── migrations/             # Migrations de la base
│
├── src/
│   ├── components/
│   │   ├── common/            # Composants réutilisables
│   │   ├── adherents/         # Composants liés aux adhérents
│   │   ├── jeux/              # Composants du catalogue
│   │   ├── prets/             # Composants de gestion des prêts
│   │   └── evenements/        # Composants des événements
│   │
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Catalogue.tsx
│   │   │   └── Evenements.tsx
│   │   └── admin/
│   │       ├── Dashboard.tsx
│   │       ├── Adherents.tsx
│   │       ├── Jeux.tsx
│   │       └── Prets.tsx
│   │
│   ├── services/
│   │   ├── AdherentService.ts    # Logique métier adhérents
│   │   ├── PretService.ts        # Logique métier prêts
│   │   ├── CatalogueService.ts   # Logique métier catalogue
│   │   └── api/
│   │       ├── supabase.ts       # Configuration Supabase
│   │       └── queries.ts        # Requêtes DB
│   │
│   ├── types/
│   │   └── index.ts              # Types TypeScript
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAdherents.ts
│   │   └── usePrets.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts         # Formatage dates, nombres
│   │   └── validators.ts         # Validations
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── public/
│   └── assets/
│
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Supabase ou Firebase

### Étapes

1. **Cloner le projet**
```bash
git clone https://github.com/votre-org/ludovillage.git
cd ludovillage
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
```

Modifier `.env` avec vos clés API :
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_publique
```

4. **Créer la base de données**
- Ouvrir le SQL Editor de Supabase
- Copier le contenu de `database/schema.sql`
- Exécuter le script

5. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible à : `http://localhost:5173`

## ⚙️ Configuration

### Variables d'environnement

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Configuration de l'application
VITE_DUREE_PRET_DEFAUT=14           # Durée par défaut d'un prêt (jours)
VITE_LIMITE_PRETS_SIMULTANES=3      # Nombre max de prêts par adhérent
VITE_DUREE_COTISATION_MOIS=12       # Durée de cotisation (mois)
```

### Configuration Tailwind

Le projet utilise Tailwind CSS avec une configuration personnalisée pour le design de LudoVillage.

## 📊 Base de données

### Tables principales

- **adherents** : Membres de la ludothèque
- **jeux** : Catalogue de jeux
- **prets** : Historique et suivi des emprunts
- **evenements** : Événements publics
- **administrateurs** : Comptes d'administration

### Colonnes calculées automatiquement

- `adherents.cotisation_a_jour` : Vérifie si la cotisation est valide
- `prets.est_en_retard` : Détecte automatiquement les retards
- `prets.jours_retard` : Calcule le nombre de jours de retard
- `evenements.complet` : Indique si l'événement est complet

### Triggers automatiques

- Mise à jour de `date_modification` sur UPDATE
- Changement de statut du jeu lors d'un prêt
- Calcul automatique de `date_retour_prevue`

## 🧩 Services métier

### AdherentService

```typescript
// Vérifier si un adhérent peut emprunter
const resultat = AdherentService.peutEmprunter(adherent, pretsEnCours);
if (resultat.autorise) {
  // Créer le prêt
}

// Calculer les jours restants de cotisation
const joursRestants = AdherentService.calculerJoursRestants(
  adherent.date_expiration_cotisation
);
```

### PretService

```typescript
// Vérifier si un prêt est en retard
const enRetard = PretService.estEnRetard(pret);

// Calculer les jours de retard
const joursRetard = PretService.calculerJoursRetard(pret);

// Obtenir un message de statut
const message = PretService.obtenirMessageStatut(pret);
```

### CatalogueService

```typescript
// Filtrer les jeux disponibles pour le public
const jeuxDisponibles = CatalogueService.filtrerJeuxDisponibles(tousLesJeux);

// Appliquer des filtres multiples
const resultats = CatalogueService.appliquerFiltres(jeux, {
  recherche: 'catan',
  nombreJoueurs: 4,
  age: 10,
  disponiblesUniquement: true
});

// Obtenir les statistiques
const stats = CatalogueService.obtenirStatistiques(jeux);
```

## 🔒 Sécurité

### Row Level Security (RLS) Supabase

Les politiques RLS sont configurées pour :
- Zone publique : Lecture seule sur catalogue et événements
- Zone privée : Accès complet pour administrateurs authentifiés

### Authentification

L'authentification est gérée via Supabase Auth :
```typescript
// Connexion
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@ludovillage.fr',
  password: 'motdepasse'
});

// Déconnexion
await supabase.auth.signOut();
```

## 📝 Scripts disponibles

```bash
npm run dev          # Lancer le serveur de développement
npm run build        # Build de production
npm run preview      # Prévisualiser le build
npm run lint         # Vérifier le code
npm run type-check   # Vérifier les types TypeScript
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Merci de :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 🎯 Roadmap

- [ ] Système de réservation de jeux
- [ ] Notifications par email (rappels de retour)
- [ ] Export PDF des prêts et statistiques
- [ ] Application mobile (React Native)
- [ ] API REST publique
- [ ] Intégration avec BoardGameGeek

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@ludovillage.fr
- 🐛 Issues : [GitHub Issues](https://github.com/votre-org/ludovillage/issues)

---

Développé avec ❤️ par l'équipe LudoVillage
