# Résultats — application WMS

État réel de la livraison au **15 octobre 2026**. Ce document ne décrit que ce qui a
été construit, exécuté et vérifié.

---

## 1. Ce qui est en ligne

| Élément | État | Adresse |
| --- | --- | --- |
| Application complète (boutique + administration) | **En ligne**, testée de bout en bout | Prévisualisation de l'environnement de développement : `https://3000-ilpq53tmnn6oavj5if7zc.e2b.app` |
| Code source | **Publié** sur `main` | https://github.com/savi-app1/WMS — demande de tirage n° 1 fusionnée le 15 octobre 2026 (CI verte avant et après fusion) |
| Intégration continue | **Verte** | https://github.com/savi-app1/WMS/actions |

L'instance en ligne exécute une compilation **de production** (`next start`), avec une base
SQLite persistante et le compte administrateur réel. Elle vit dans l'environnement de
développement fourni : **l'adresse de prévisualisation s'arrête lorsque cet environnement
est libéré**. Pour une adresse permanente, un hébergement Node.js est nécessaire — toute la
procédure est décrite dans [DEPLOIEMENT.md](DEPLOIEMENT.md) (≈ 3 500 – 6 000 FCFA par mois).

> GitHub Pages, Netlify « statique » ou un simple dépôt de fichiers **ne peuvent pas**
> héberger cette application : les commandes, l'administration et la base de données
> exigent un serveur Node.js. Aucun service payant n'a été souscrit.

---

## 2. Vérifications exécutées

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Types TypeScript (mode strict) | `npm run typecheck` | ✔ 0 erreur |
| Analyse statique | `npm run lint` | ✔ 0 erreur, 0 avertissement |
| Tests automatisés | `npm test` | ✔ **74 tests sur 74** |
| Compilation de production | `npm run build` | ✔ toutes les routes compilées |
| Parcours réel sur l'instance en ligne | vérification manuelle scriptée | ✔ commande créée, suivi client, connexion administrateur, page des commandes, export CSV |

### Répartition des tests

- **Unitaires (31)** : formatage des montants FCFA et des numéros, slugs, messages WhatsApp,
  machine à états des commandes (transitions autorisées et interdites), correspondance des
  numéros de téléphone.
- **Intégration (13)** : création de commande (prix recalculés côté serveur, prix ignoré du
  client, prix à confirmer), unicité des numéros, historique des statuts, annulation,
  statistiques (montants commandé / encaissé séparés), filtres de liste.
- **Bout en bout (30)** : un serveur de production réel est démarré sur le port 3987 avec une
  base isolée, puis : pages publiques, sitemap/robots/manifeste, page produit sans prix inventé,
  refus des accès non authentifiés (401), boucle de redirection corrigée, connexion
  administrateur (401 puis 200), refus des mutations sans jeton CSRF (403), création de
  commande, refus du piège à robots, suivi client autorisé/refusé, rendu des **9 pages
  d'administration**, progression des statuts jusqu'à la livraison, blocage des transitions
  depuis un état final, export CSV, statistiques, déconnexion ; administration du catalogue :
  téléversement d'un visuel (re-encodé en webp, servi par `/api/media`), refus d'un fichier
  qui n'est pas une image et d'une traversée de chemin, création d'un produit avec prix,
  affichage public du prix, commande de ce produit avec un prix client falsifié ignoré par
  le serveur, puis suppression du produit.

---

## 3. Anomalies trouvées par les tests et corrigées

Les tests n'ont pas servi qu'à confirmer : ils ont mis au jour **six défauts réels**, tous corrigés.

1. **Enregistrement des commandes impossible** — l'instruction SQL d'insertion comportait
   25 valeurs pour 24 colonnes : toute commande échouait. L'insertion est désormais construite
   à partir d'un tableau de colonnes (plus de désynchronisation possible).
2. **Boucle de redirection infinie sur `/admin/connexion`** — la page de connexion était
   enveloppée par le gabarit protégé de l'administration, qui la renvoyait vers elle-même.
   Le gabarit protégé est maintenant isolé dans un groupe de routes dédié.
3. **Jeton anti-CSRF jamais créé** — aucune mutation d'administration (changement de statut,
   édition de produit, réglages) n'était possible. Le jeton est créé à la connexion, et le
   client le régénère automatiquement s'il l'a perdu.
4. **Suivi impossible pour les numéros finissant par `0000`** — la comparaison passait par la
   normalisation téléphonique, qui interprétait `0000` comme un indicatif international.
   La comparaison porte désormais sur les chiffres bruts (règle isolée et testée).
5. **Jeton de suivi trop court** — 12 caractères hexadécimaux (48 bits) pour un lien de
   consultation de commande. Porté à **128 bits** (`randomBytes(16)`).
6. **Export CSV inadapté au tableur** — séparateur virgule alors qu'Excel en français attend
   le point-virgule. Corrigé (séparateur `;`, encodage UTF-8 avec BOM, accents corrects).

Trois défauts d'exploitation ont également été corrigés : un serveur de test obsolète pouvait
faire tester du code périmé (garde-fou ajouté), l'arrêt du serveur de test ne tuait pas le
processus Next.js enfant (arrêt du groupe de processus), et ESLint n'était pas configuré pour
la version 9 (`eslint.config.mjs` ajouté, `next lint` déprécié abandonné).

---

## 4. Sécurité en place

- Mot de passe administrateur haché avec **scrypt** (N = 16384), sel aléatoire par compte,
  aucune trace en clair ; **5 tentatives échouées = 15 minutes de blocage**.
- Sessions opaques stockées en base, **jeton haché en SHA-256** côté serveur, cookie
  `HttpOnly` + `SameSite=Lax` + `Secure` en production.
- **Double soumission CSRF** (cookie lisible + en-tête `x-csrf-token`) obligatoire pour
  toutes les mutations d'administration ; vérification systématiquement **côté serveur**.
- Limitation de débit : 5 commandes/heure/IP, 30 recherches de suivi/heure/IP, 240 événements
  d'audience/heure/IP ; champ piège anti-robot sur le formulaire de commande.
- Suivi de commande protégé par numéro **et** téléphone (ou jeton privé) ; aucune donnée
  personnelle exposée autrement.
- Secrets uniquement dans `.env` (jamais versionné) ; `.env.example` sert de modèle.
- En-têtes de sécurité (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`), aucune image distante autorisée, `robots.txt` interdisant
  l'indexation de l'administration.

---

## 5. Ce qui n'est pas fait — et pourquoi

| Sujet | Situation |
| --- | --- |
| Hébergement permanent | Non souscrit : cela nécessite un paiement ou un compte d'hébergeur (**décision du propriétaire**). Procédure complète fournie. |
| `Dockerfile` / `docker-compose.yml` | Fournis mais **non exécutés** (Docker indisponible ici). À valider sur le serveur avant production. |
| Prix, stocks, frais de livraison | **Volontairement vides** : aucune donnée inventée. Le site affiche « Prix à confirmer » jusqu'à la saisie par le propriétaire. |
| Paiement en ligne | Non intégré : aucun prestataire payant n'a été activé. Les moyens proposés sont le paiement à la livraison, le mobile money ou « à confirmer ». |
| Notifications WhatsApp automatiques | Non implémentées : l'API WhatsApp Business est payante et exige une validation Meta. Les liens `wa.me` ouvrent la conversation pré-remplie, mais **l'envoi reste une action manuelle**. |
| Assistant IA connecté | Volontairement hors ligne : génération de brouillons localement, sans appel à un service externe payant ni envoi de données clientes. |
| Réseaux sociaux | Les pages Facebook/TikTok du propriétaire n'ont **pas** été utilisées ni modifiées ; aucun budget publicitaire n'a été engagé. |
| Limitation de débit | 5 commandes par heure et par adresse IP (protection anti-spam). Pendant les essais, ce plafond est vite atteint ; il se règle dans `src/app/api/orders/route.ts`. |

---

## 6. Actions qui reviennent au propriétaire

1. **Choisir un hébergement Node.js** (VPS) et mettre le site en ligne — `docs/DEPLOIEMENT.md` §2.
   Puis renseigner `NEXT_PUBLIC_SITE_URL` avec le domaine définitif.
2. **Changer le mot de passe administrateur** s'il a circulé autrement que par le fichier
   `.env` (celui-ci n'est jamais publié). Le mot de passe actuel est dans `/home/user/WMS/.env`.
3. **Saisir les prix, stocks et frais de livraison** réels dans `/admin/produits` et
   `/admin/parametres` : tant que ces champs sont vides, rien n'est affiché au client.
4. **Vérifier les 14 familles de produits** issues de la bannière officielle, renommer ou
   supprimer celles qui ne sont pas vendues, ajouter les photos réelles.
5. **Mettre en place la sauvegarde automatique** (§4 du guide) et tester une restauration.
6. **Déclarer le site** à Google Search Console après la mise en ligne du domaine.
7. Communiquer les scripts et campagnes préparés dans `/admin/scripts` et `/admin/campagnes`
   (rédigés, à relire avant publication).

---

## 7. Budget

Aucun frais engagé pendant le développement. Coûts à prévoir pour l'exploitation :
domaine ≈ 8 000 – 12 000 FCFA/an, hébergement ≈ 3 500 – 6 000 FCFA/mois, HTTPS gratuit
(Let's Encrypt), base de données intégrée (0 FCFA), WhatsApp par liens gratuits.
