# WMS — Boutique en ligne & gestion des commandes

**Wendmanegda Multiples Services (WMS)** — Ouagadougou, Burkina Faso.
« Engagés pour satisfaire, motivés pour faire grandir. »

Application web complète : **boutique publique** (commande sans compte, paiement à la livraison) +
**administration privée** (gestion des commandes mobile-first, statistiques, export CSV, bibliothèque de scripts, préparation de campagnes).

---

## 1. Prérequis

- **Node.js ≥ 22.5** (utilise `node:sqlite` natif — aucune base de données externe à installer)
- npm ≥ 10

## 2. Installation locale

```bash
git clone <votre-repo>
cd WMS
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # SESSION_SECRET
# Éditer .env : SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (mot de passe fort)
npm start          # production
npm run dev        # développement avec rechargement
```

Le serveur écoute sur `http://0.0.0.0:3000` (ou `PORT`). Au premier démarrage :
- la base SQLite `data/wms.sqlite` est créée avec toutes les migrations,
- le compte administrateur **unique** est créé à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

**⚠️ Changez ce mot de passe à la première connexion** (Administration → Paramètres).

## 3. Démo (données de test clairement identifiées)

```bash
npm run seed
```

Crée des produits et commandes marqués **[DÉMO] / is_demo** :
- **invisibles sur la boutique publique** (pages + catalogue),
- **exclus des statistiques réelles**,
- visibles dans le tableau de bord via « Afficher les données de test »,
- supprimables depuis Administration → Paramètres → « Purger les données de démonstration ».

## 4. Utilisation

### Boutique publique (`/`)
- Accueil, catalogue avec recherche et filtres par catégorie : `/produits`
- Fiches produits partageables (Open Graph / Twitter Cards) : `/produit/:slug`
- **Formulaire de commande sur chaque fiche** : nom, téléphone, quantité, adresse, zone, notes
- Vérification avant validation + confirmation avec **numéro de commande** `WMS-AAMMJJ-XXXX`
- Suivi public masqué (données personnelles protégées) : `/suivi/:numero`
- Boutons WhatsApp avec message prérempli vers **+226 56 59 25 57**
- PWA installable (manifest + service worker)

### Administration privée (`/admin`)
Accessible uniquement par connexion (aucune inscription publique) :

| Section | Contenu |
|---|---|
| Tableau de bord | Compteurs par statut, rappels (commandes > 24 h sans traitement), alertes de stock faible, résumé du mois |
| Commandes | Liste filtrée/recherchable, fiche client, **WhatsApp** (messages préremplis), changement de statut manuel avec transitions contrôlées |
| Produits | CRUD complet, prix FCFA (ou « à confirmer »), stock optionnel décrémenté à la livraison, images JPG/PNG/WebP ≤ 2 Mo |
| Statistiques | Journalier/mensuel, taux de confirmation/livraison, montants commandés/confirmés/livrés/**encaissés** (séparés), top produits, trafic interne + UTM |
| Scripts | Bibliothèque « Scripts et contenus WMS » : vidéos, voix off, publications, dialogues, FAQ — classer, modifier, dupliquer, exporter CSV |
| Campagnes | Préparation (objectif, texte, script, plateforme, lien, UTM, budget, dates, statut) — **jamais de publication automatique** |
| Paramètres | Changement de mot de passe, frais de livraison par zone (JSON), purge des données de test, état des intégrations |

### Statuts des commandes — cycle manuel strict

```
nouvelle → a_confirmer → confirmee → en_preparation → en_livraison → livree
                                                                 annulee (avant livraison uniquement)
```
- Aucune confirmation automatique à l'envoi du formulaire.
- « Livrée » uniquement sur action explicite (bouton « Colis livré »).
- **Encaissé ≠ livré** : le montant encaissé se saisit manuellement après remise du colis.
- Historique complet des changements (qui, quand, note).

## 5. Tests

```bash
npm test         # ~50 tests : unitaires + intégration HTTP
npm run lint     # syntaxe + détection de secrets en dur
```

Couverture : auth, refus d'accès, CRUD produits, commande valide/invalide, calcul des montants côté serveur (le prix du client est **toujours ignoré**), persistance, unicité du numéro, cycle des statuts, blocage des transitions interdites, statistiques sur données de test, export CSV, liens WhatsApp, masquage des données personnelles du suivi public, injection SQL basique, CSRF, honeypot antispam.

## 6. Sécurité

- Mots de passe **hachés (scrypt)** avec sel aléatoire
- Sessions serveur (jeton 256 bits **haché** en base), expiration 12 h
- **Limitation des tentatives de connexion** (8 échecs / 15 min, persistante)
- CSRF sur tous les formulaires, limitation de débit sur commandes/login/API
- Honeypot antispam sur le formulaire de commande
- En-têtes de sécurité (helmet, CSP avec nonce, nosniff, frame guarding)
- Validation stricte côté serveur ; prix lus depuis la base, jamais depuis le client
- **PII masquées** sur le suivi public (nom, téléphone, adresse tronqués)
- Journal d'audit des actions sensibles ; secrets uniquement en variables d'environnement
- Base SQLite en WAL ; aucune donnée personnelle versionnée (voir `.gitignore`)

## 7. Sauvegarde

```bash
node scripts/backup.js       # copie horodatée dans backups/ (rotation 30 jours)
```

Tâche cron recommandée : `15 3 * * * cd /opt/wms && node scripts/backup.js`

**Restauration :** arrêter le serveur, remplacer `data/wms.sqlite` par la sauvegarde, redémarrer.

## 8. Déploiement (tout hébergeur Node ≥ 22)

```bash
npm ci --omit=dev
# variables d'environnement : voir .env.example (SESSION_SECRET, ADMIN_* obligatoires)
PUBLIC_URL=https://votre-domaine npm start
```

Derrière un reverse-proxy HTTPS, chaque en-tête `X-Forwarded-*` est traité (`trust proxy`).
Mettre `COOKIE_SECURE=true` (ou le laisser par défaut) en production HTTPS.

## 9. Variables d'environnement

Voir [`.env.example`](.env.example) : application, base, admin, WhatsApp, zones de livraison, GA4 (optionnel).

## 10. Intégrations préparées mais volontairement **non activées**

| Intégration | État | Activation |
|---|---|---|
| Paiement en ligne (Orange Money, Moov, Telecel…) | Architecture prête, **aucun paiement fictif** | Comptes marchands + clés fournis par le propriétaire |
| WhatsApp Business API | Liens `wa.me` préremplis (action manuelle) | Validation Meta nécessaire |
| Google Analytics 4 | Champ `GA4_MEASUREMENT_ID` prêt | Renseigner l'identifiant |
| Facebook/TikTok pages existantes | **Non connectées** (restriction explicite) | Uniquement sur autorisation du propriétaire |

Le trafic interne (vues produits, clics WhatsApp, débuts/fins de commande, recherches, UTM) est **déjà mesuré réellement** — aucun chiffre inventé.

## 11. Structure

```
server.js            Démarrage
src/config.js        Configuration (.env)
src/schema.sql       Schéma SQLite (migrations idempotentes)
src/db.js            Couche données (node:sqlite)
src/security.js      Auth, sessions, CSRF, validation, téléphones, audit
src/bootstrap.js     Admin unique + catégories
src/app.js           Express (sécurité, nonce CSP, sessions)
src/routes/shop.js   Boutique publique
src/routes/admin.js  Administration privée
src/services/*       Commandes, Produits, Statistiques, CSV, Scripts, WhatsApp, Paramètres
views/               EJS (boutique + admin, mobile-first)
public/              CSS/JS/images, manifest PWA, service worker
scripts/seed.js      Données de test identifiées
scripts/backup.js    Sauvegarde + rotation
scripts/lint.js      Vérifications
tests/               Suites node:test
```

## 12. Remise / reprise du projet

L'ensemble du code et des accès est dans ce dépôt. Pour transférer : partager le dépôt, regénérer `SESSION_SECRET` et recréer le compte admin sur le nouvel hébergement, transférer `data/wms.sqlite` (ou une sauvegarde) pour conserver l'historique.

---

© Wendmanegda Multiples Services — Ouagadougou, Burkina Faso.
