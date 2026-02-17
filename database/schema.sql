-- ============================================
-- SCHÉMA DE BASE DE DONNÉES - LUDOVILLAGE
-- Application de gestion de ludothèque associative
-- ============================================

-- Table des Administrateurs
-- Gère les comptes d'accès à l'interface d'administration
CREATE TABLE administrateurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  actif BOOLEAN DEFAULT true,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  derniere_connexion TIMESTAMP,
  
  CONSTRAINT email_valide CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Index pour optimiser les recherches par email
CREATE INDEX idx_administrateurs_email ON administrateurs(email);
CREATE INDEX idx_administrateurs_actif ON administrateurs(actif);


-- Table des Adhérents
-- Stocke les informations des membres de la ludothèque
CREATE TABLE adherents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_adherent VARCHAR(20) UNIQUE NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telephone VARCHAR(20),
  adresse TEXT,
  code_postal VARCHAR(10),
  ville VARCHAR(100),
  date_naissance DATE,
  date_adhesion DATE NOT NULL DEFAULT CURRENT_DATE,
  date_expiration_cotisation DATE NOT NULL,
  cotisation_a_jour BOOLEAN GENERATED ALWAYS AS (date_expiration_cotisation >= CURRENT_DATE) STORED,
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_adherent_valide CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT date_expiration_valide CHECK (date_expiration_cotisation >= date_adhesion)
);

-- Index pour optimiser les recherches fréquentes
CREATE INDEX idx_adherents_numero ON adherents(numero_adherent);
CREATE INDEX idx_adherents_email ON adherents(email);
CREATE INDEX idx_adherents_cotisation ON adherents(cotisation_a_jour);
CREATE INDEX idx_adherents_actif ON adherents(actif);
CREATE INDEX idx_adherents_nom_prenom ON adherents(nom, prenom);


-- Table des Jeux
-- Catalogue complet des jeux de la ludothèque
CREATE TABLE jeux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_jeu VARCHAR(20) UNIQUE NOT NULL,
  titre VARCHAR(255) NOT NULL,
  editeur VARCHAR(150),
  auteur VARCHAR(150),
  annee_publication INTEGER,
  age_minimum INTEGER,
  age_maximum INTEGER,
  nombre_joueurs_min INTEGER,
  nombre_joueurs_max INTEGER,
  duree_partie_min INTEGER, -- en minutes
  duree_partie_max INTEGER, -- en minutes
  categorie VARCHAR(100), -- ex: Stratégie, Ambiance, Famille, Enfants
  description TEXT,
  regles_url VARCHAR(500),
  image_url VARCHAR(500),
  etat VARCHAR(50) DEFAULT 'Bon' CHECK (etat IN ('Neuf', 'Bon', 'Acceptable', 'Usé', 'Hors service')),
  statut VARCHAR(50) DEFAULT 'Disponible' CHECK (statut IN ('Disponible', 'Emprunté', 'Réservé', 'Maintenance', 'Retiré')),
  emplacement VARCHAR(100), -- Localisation physique dans la ludothèque
  date_acquisition DATE,
  prix_acquisition DECIMAL(10, 2),
  visible_catalogue_public BOOLEAN DEFAULT true,
  nombre_emprunts INTEGER DEFAULT 0,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT duree_partie_valide CHECK (duree_partie_max IS NULL OR duree_partie_min IS NULL OR duree_partie_max >= duree_partie_min),
  CONSTRAINT joueurs_valide CHECK (nombre_joueurs_max IS NULL OR nombre_joueurs_min IS NULL OR nombre_joueurs_max >= nombre_joueurs_min),
  CONSTRAINT age_valide CHECK (age_maximum IS NULL OR age_minimum IS NULL OR age_maximum >= age_minimum)
);

-- Index pour optimiser les recherches et filtres
CREATE INDEX idx_jeux_code ON jeux(code_jeu);
CREATE INDEX idx_jeux_statut ON jeux(statut);
CREATE INDEX idx_jeux_categorie ON jeux(categorie);
CREATE INDEX idx_jeux_titre ON jeux(titre);
CREATE INDEX idx_jeux_visible_public ON jeux(visible_catalogue_public);
CREATE INDEX idx_jeux_statut_visible ON jeux(statut, visible_catalogue_public) WHERE statut = 'Disponible';


-- Table des Prêts
-- Historique et suivi des emprunts de jeux
CREATE TABLE prets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pret VARCHAR(20) UNIQUE NOT NULL,
  adherent_id UUID NOT NULL REFERENCES adherents(id) ON DELETE RESTRICT,
  jeu_id UUID NOT NULL REFERENCES jeux(id) ON DELETE RESTRICT,
  date_pret DATE NOT NULL DEFAULT CURRENT_DATE,
  date_retour_prevue DATE NOT NULL,
  date_retour_effective DATE,
  duree_pret_jours INTEGER DEFAULT 14, -- Durée par défaut : 14 jours
  est_en_retard BOOLEAN GENERATED ALWAYS AS (
    date_retour_effective IS NULL AND date_retour_prevue < CURRENT_DATE
  ) STORED,
  jours_retard INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN date_retour_effective IS NULL AND date_retour_prevue < CURRENT_DATE 
      THEN CURRENT_DATE - date_retour_prevue
      WHEN date_retour_effective IS NOT NULL AND date_retour_effective > date_retour_prevue
      THEN date_retour_effective - date_retour_prevue
      ELSE 0
    END
  ) STORED,
  statut_pret VARCHAR(50) DEFAULT 'En cours' CHECK (statut_pret IN ('En cours', 'Rendu', 'En retard', 'Annulé')),
  notes TEXT,
  createur_id UUID REFERENCES administrateurs(id),
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT date_retour_valide CHECK (date_retour_prevue >= date_pret),
  CONSTRAINT date_retour_effective_valide CHECK (date_retour_effective IS NULL OR date_retour_effective >= date_pret)
);

-- Index pour optimiser les recherches de prêts
CREATE INDEX idx_prets_numero ON prets(numero_pret);
CREATE INDEX idx_prets_adherent ON prets(adherent_id);
CREATE INDEX idx_prets_jeu ON prets(jeu_id);
CREATE INDEX idx_prets_statut ON prets(statut_pret);
CREATE INDEX idx_prets_retard ON prets(est_en_retard);
CREATE INDEX idx_prets_en_cours ON prets(statut_pret) WHERE statut_pret = 'En cours';
CREATE INDEX idx_prets_date_retour_prevue ON prets(date_retour_prevue) WHERE date_retour_effective IS NULL;


-- Table des Événements
-- Gestion des événements publics de la ludothèque
CREATE TABLE evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  type_evenement VARCHAR(100), -- ex: Soirée jeux, Tournoi, Découverte, Atelier
  date_debut TIMESTAMP NOT NULL,
  date_fin TIMESTAMP NOT NULL,
  lieu VARCHAR(255),
  adresse TEXT,
  capacite_max INTEGER,
  nombre_inscrits INTEGER DEFAULT 0,
  complet BOOLEAN GENERATED ALWAYS AS (nombre_inscrits >= capacite_max) STORED,
  image_url VARCHAR(500),
  lien_inscription VARCHAR(500),
  visible_public BOOLEAN DEFAULT true,
  statut VARCHAR(50) DEFAULT 'Planifié' CHECK (statut IN ('Planifié', 'En cours', 'Terminé', 'Annulé')),
  organisateur_id UUID REFERENCES administrateurs(id),
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT date_evenement_valide CHECK (date_fin >= date_debut),
  CONSTRAINT capacite_valide CHECK (capacite_max IS NULL OR capacite_max > 0)
);

-- Index pour optimiser l'affichage des événements publics
CREATE INDEX idx_evenements_date_debut ON evenements(date_debut);
CREATE INDEX idx_evenements_visible_public ON evenements(visible_public);
CREATE INDEX idx_evenements_statut ON evenements(statut);
CREATE INDEX idx_evenements_type ON evenements(type_evenement);
CREATE INDEX idx_evenements_publics_a_venir ON evenements(date_debut, visible_public) 
  WHERE visible_public = true AND statut = 'Planifié';


-- ============================================
-- TRIGGERS POUR AUTOMATISATION
-- ============================================

-- Trigger pour mettre à jour automatiquement date_modification
CREATE OR REPLACE FUNCTION update_date_modification()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_modification = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_adherents_modification
  BEFORE UPDATE ON adherents
  FOR EACH ROW
  EXECUTE FUNCTION update_date_modification();

CREATE TRIGGER trigger_jeux_modification
  BEFORE UPDATE ON jeux
  FOR EACH ROW
  EXECUTE FUNCTION update_date_modification();

CREATE TRIGGER trigger_prets_modification
  BEFORE UPDATE ON prets
  FOR EACH ROW
  EXECUTE FUNCTION update_date_modification();

CREATE TRIGGER trigger_evenements_modification
  BEFORE UPDATE ON evenements
  FOR EACH ROW
  EXECUTE FUNCTION update_date_modification();


-- Trigger pour mettre à jour le statut du jeu lors d'un prêt
CREATE OR REPLACE FUNCTION update_jeu_statut_on_pret()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.statut_pret = 'En cours' THEN
    UPDATE jeux SET statut = 'Emprunté', nombre_emprunts = nombre_emprunts + 1
    WHERE id = NEW.jeu_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.statut_pret = 'Rendu' AND OLD.statut_pret = 'En cours' THEN
    UPDATE jeux SET statut = 'Disponible'
    WHERE id = NEW.jeu_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pret_change_jeu_statut
  AFTER INSERT OR UPDATE ON prets
  FOR EACH ROW
  EXECUTE FUNCTION update_jeu_statut_on_pret();


-- Trigger pour calculer automatiquement date_retour_prevue
CREATE OR REPLACE FUNCTION set_date_retour_prevue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_retour_prevue IS NULL THEN
    NEW.date_retour_prevue := NEW.date_pret + (NEW.duree_pret_jours || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pret_set_date_retour
  BEFORE INSERT ON prets
  FOR EACH ROW
  EXECUTE FUNCTION set_date_retour_prevue();


-- ============================================
-- VUES UTILES
-- ============================================

-- Vue des jeux disponibles pour le catalogue public
CREATE OR REPLACE VIEW catalogue_public AS
SELECT 
  id,
  code_jeu,
  titre,
  editeur,
  auteur,
  annee_publication,
  age_minimum,
  age_maximum,
  nombre_joueurs_min,
  nombre_joueurs_max,
  duree_partie_min,
  duree_partie_max,
  categorie,
  description,
  regles_url,
  image_url,
  etat
FROM jeux
WHERE statut = 'Disponible' 
  AND visible_catalogue_public = true
  AND etat NOT IN ('Hors service', 'Retiré');


-- Vue des prêts en retard
CREATE OR REPLACE VIEW prets_en_retard AS
SELECT 
  p.id,
  p.numero_pret,
  p.date_pret,
  p.date_retour_prevue,
  p.jours_retard,
  a.nom AS adherent_nom,
  a.prenom AS adherent_prenom,
  a.email AS adherent_email,
  a.telephone AS adherent_telephone,
  j.titre AS jeu_titre,
  j.code_jeu
FROM prets p
JOIN adherents a ON p.adherent_id = a.id
JOIN jeux j ON p.jeu_id = j.id
WHERE p.est_en_retard = true
  AND p.statut_pret = 'En cours'
ORDER BY p.jours_retard DESC;


-- Vue des adhérents avec cotisation expirée
CREATE OR REPLACE VIEW adherents_cotisation_expiree AS
SELECT 
  id,
  numero_adherent,
  nom,
  prenom,
  email,
  telephone,
  date_adhesion,
  date_expiration_cotisation,
  CURRENT_DATE - date_expiration_cotisation AS jours_depuis_expiration
FROM adherents
WHERE cotisation_a_jour = false
  AND actif = true
ORDER BY date_expiration_cotisation ASC;


-- ============================================
-- DONNÉES DE TEST (OPTIONNEL)
-- ============================================

-- Insertion d'un administrateur par défaut (mot de passe: Admin123!)
-- IMPORTANT : Changer ce mot de passe en production !
INSERT INTO administrateurs (email, mot_de_passe_hash, nom, prenom, role)
VALUES ('admin@ludovillage.fr', '$2a$10$example_hash_to_replace', 'Admin', 'Principal', 'super_admin');

-- Commentaires pour la documentation
COMMENT ON TABLE jeux IS 'Catalogue complet des jeux de la ludothèque';
COMMENT ON TABLE adherents IS 'Membres de la ludothèque avec suivi des cotisations';
COMMENT ON TABLE prets IS 'Historique et gestion des emprunts de jeux';
COMMENT ON TABLE evenements IS 'Événements publics organisés par la ludothèque';
COMMENT ON TABLE administrateurs IS 'Comptes d''accès à l''interface d''administration';

COMMENT ON COLUMN adherents.cotisation_a_jour IS 'Calculé automatiquement : true si date_expiration_cotisation >= date du jour';
COMMENT ON COLUMN prets.est_en_retard IS 'Calculé automatiquement : true si le prêt n''est pas rendu et dépasse la date de retour prévue';
COMMENT ON COLUMN prets.jours_retard IS 'Nombre de jours de retard calculé automatiquement';
