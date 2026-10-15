# WMS — Boutique en ligne et gestion des commandes

![CI](https://github.com/savi-app1/WMS/actions/workflows/ci.yml/badge.svg)

Application web de **Wendmanegda Multiples Services (WMS)** — Ouagadougou, Burkina Faso.
Slogan : « Engagés pour satisfaire, motivés pour faire grandir ».

Le projet comprend **deux espaces** :

1. **La boutique publique** — vitrine des produits et services, fiche produit partageable,
   panier, formulaire de commande, suivi de commande par numéro + téléphone, contact WhatsApp.
2. **L'espace d'administration privé** (un seul compte) — commandes, statuts, produits et
   stocks, statistiques, export CSV, scripts marketing, campagnes, recherche, trafic web.

> **Honnêteté des données.** Aucun prix, stock, délai ou caractéristique n'est inventé.
> Tant qu'une information n'a pas été saisie par le propriétaire, l'interface affiche
> « Prix à confirmer » et les totaux restent vides. Aucune commande n'est confirmée
> automatiquement : chaque changement d'état est une action manuelle de l'administrateur.

---

## 1. Fonctionnalités

### Boutique publique

| Fonction | Détail |
| --- | --- |
| Catalogue | 10 catégories, recherche, filtres, tri, pagination |
| Fiche produit | Description, caractéristiques, partage WhatsApp / copie de lien |
| Panier | Conservé dans le navigateur (localStorage), quantités modifiables |
| Commande | Formulaire (nom, téléphone, ville, adresse, zone, note), prix **recalculés côté serveur** |
| Numéro de commande | Format `WMS-AAAAMMJJ-NNNNN` + jeton de suivi privé de 128 bits |
| Suivi | `/suivi` : numéro de commande + 4 derniers chiffres du téléphone (ou jeton) |
| WhatsApp | Liens `wa.me` prêts à l'emploi, aucun envoi automatique simulé |
| Sécurité | Limitation de débit (5 commandes/heure/IP), champ anti-robot, validation stricte |

### Administration privée

| Module | Détail |
| --- | --- |
| Connexion | Mot de passe haché (scrypt), session en base, verrouillage après 5 échecs |
| Tableau de bord | Commandes du jour, à traiter, anciennes sans traitement, chiffre d'affaires |
| Commandes | Liste filtrable, fiche détaillée, historique complet, note interne |
| Statuts | `nouvelle → a_confirmer → confirmee → en_preparation → en_livraison → livree` (+ `annulee`), transitions contrôlées |
| Montants | Commande, confirmé, livré et **encaissé** suivis séparément |
| Export CSV | Séparateur `;`, encodage UTF-8 avec BOM (ouverture directe dans Excel) |
| Produits | Création, modification, prix, stock, publication, image, caractéristiques |
| Statistiques | Séries journalières/mensuelles, taux de confirmation et de livraison, meilleurs produits |
| Contenus | Scripts marketing, campagnes (UTM), notes de recherche |
| Trafic | Événements internes (sans cookie publicitaire) + GA4 optionnel |

---

## 2. Démarrage local

Prérequis : **Node.js ≥ 22.5** (le projet utilise le module natif `node:sqlite`).

```bash
npm ci                 # installation des dépendances
cp .env.example .env   # puis renseigner les valeurs
node scripts/generate-env.mjs   # (facultatif) génère un mot de passe admin aléatoire
npm run setup          # migrations + données de départ (catégories, familles de produits)
npm run dev            # http://localhost:3000
```

L'espace d'administration est sur **`/admin`**. Le compte est celui défini par
`ADMIN_EMAIL` / `ADMIN_PASSWORD` dans `.env` (créé par `npm run migrate`).
**Le mot de passe n'est jamais enregistré en clair** : seule son empreinte scrypt l'est.

### Variables d'environnement principales

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL publique (liens de partage, sitemap, WhatsApp) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Administrateur unique |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Numéro WhatsApp (chiffres uniquement) |
| `WMS_DATA_DIR` | Dossier des données (base SQLite + images) — défaut `data/` |
| `NEXT_PUBLIC_GA_ID` | (facultatif) identifiant Google Analytics 4 |
| `SESSION_TTL_HOURS` | Durée d'une session d'administration |

`.env` n'est **jamais** versionné ; `.env.example` sert de modèle.

---

## 3. Vérifications automatisées

```bash
npm run typecheck      # TypeScript strict
npm run lint           # ESLint 9 (règles Next.js)
npm test               # tests unitaires + intégration + bout en bout
npm run test:coverage  # idem avec rapport de couverture (coverage/)
npm run build          # compilation de production
npm run ci             # enchaîne les quatre
```

Les tests de bout en bout démarrent un vrai serveur de production sur le port `3987`,
avec une base isolée (`data/test-e2e`) : connexion administrateur, création d'une commande,
suivi public, transitions de statut jusqu'à la livraison, export CSV et contrôle des accès.

---

## 4. Déploiement

Voir **[docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md)** (serveur Node/systemd, Docker, sauvegardes,
restauration, mise à jour). Le fichier **[docs/RESULTATS.md](docs/RESULTATS.md)** décrit
l'état réel de livraison : ce qui a été testé, déployé, et ce qui dépend du propriétaire.

---

## 5. Structure du projet

```
src/
  app/               pages publiques (boutique, commande, suivi…) et /admin
    api/             routes serveur : commandes, suivi, médias, administration
  components/        interface (boutique + administration)
  lib/               données, règles de gestion, sécurité, formatage
scripts/             migrations, données de départ, images de marque
tests/               unitaires, intégration, bout en bout
public/              logo officiel, bannières, icônes, service worker
docs/                déploiement et résultats
data/                base SQLite et images téléversées (non versionnées)
```

---

## 6. Règles de gestion appliquées

- **Prix** : recalculés côté serveur à partir de la base, jamais depuis le navigateur.
  Un produit sans prix officiel rend la commande « prix à confirmer » (totaux vides).
- **Statuts** : seules les transitions autorisées sont acceptées ; un état final
  (`livree`, `annulee`) n'accepte plus aucun changement.
- **Montants** : montant commandé, confirmé, livré et encaissé sont distincts.
- **WhatsApp** : les liens ouvrent une conversation ; l'application n'envoie rien toutefois
  seule et ne prétend jamais qu'un message a été délivré.
- **Données clientes** : aucune donnée personnelle n'est exposée sans numéro de commande
  **et** vérification du téléphone (ou du jeton de suivi).
- **Accessibilité et transparence** : aucune donnée de démonstration trompeuse, aucun
  faux bouton, aucun paiement en ligne simulé.

---

## 7. Contact

- WhatsApp / téléphone : **+226 56 59 25 57**
- Second numéro : +226 79 00 13 17
- Ouagadougou, Burkina Faso
