# Déploiement et exploitation — WMS

Ce document décrit **comment mettre l'application en ligne pour de bon**, comment la
sauvegarder et comment la mettre à jour. Il indique aussi clairement ce qui est déjà en
ligne et ce qui dépend d'une action du propriétaire.

---

## 1. Ce dont l'application a besoin

| Élément | Exigence | Pourquoi |
| --- | --- | --- |
| Node.js | **≥ 22.5** | base de données via `node:sqlite`, sans service externe |
| Disque | ~300 Mo (code + `node_modules`) + les images téléversées | — |
| Mémoire | 512 Mo suffisent | Next.js en mode production |
| Nom de domaine | facultatif mais recommandé | liens de partage et référencement |
| HTTPS | recommandé | cookies de session marqués `Secure` en production |

**Aucune base de données externe, aucun service payant n'est nécessaire.**
Les données vivent dans un fichier SQLite (`data/wms.db`) et les images dans
`data/uploads/` — la sauvegarde est donc une simple copie de dossier.

> Point d'attention : l'application n'est **pas** un site statique. GitHub Pages, Netlify
> « static » ou un simple dépôt de fichiers ne peuvent pas l'héberger : il faut un
> hébergement qui exécute Node.js (VPS, hébergement mutualisé Node, ou Docker).

---

## 2. Option A — Serveur Node + systemd (recommandé, le moins cher)

Exemple avec un VPS Linux (Ubuntu 22.04/24.04), utilisateur `wms`, domaine `wendmanegda.com`.

```bash
# 1. Installer Node.js 22 et l'outil de build
sudo apt update && sudo apt install -y curl build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Récupérer le projet
sudo mkdir -p /srv/wms && sudo chown $USER /srv/wms
git clone https://github.com/savi-app1/WMS.git /srv/wms
cd /srv/wms

# 3. Configurer l'environnement (le fichier .env n'est jamais versionné)
cp .env.example .env
nano .env          # NEXT_PUBLIC_SITE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, numéros WhatsApp

# 4. Installer, migrer, compiler
npm ci
npm run migrate    # crée la base + le compte administrateur
npm run seed       # catégories et familles de produits (sans prix inventés)
npm run build
```

Service systemd — `/etc/systemd/system/wms.service` :

```ini
[Unit]
Description=WMS — boutique et administration
After=network.target

[Service]
Type=simple
User=wms
WorkingDirectory=/srv/wms
EnvironmentFile=/srv/wms/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
# Durcissement simple
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wms
sudo systemctl status wms
```

Reverse proxy HTTPS avec Caddy (`/etc/caddy/Caddyfile`) — certificat automatique :

```
wendmanegda.com {
    reverse_proxy 127.0.0.1:3000
}
```

Puis, dans `.env`, mettre `NEXT_PUBLIC_SITE_URL=https://wendmanegda.com` et relancer
`npm run build && sudo systemctl restart wms`.

---

## 3. Option B — Docker

`Dockerfile` et `docker-compose.yml` sont fournis à la racine du projet.

```bash
cp .env.example .env      # renseigner les valeurs
docker compose up -d --build
docker compose logs -f
```

Les données sont conservées dans le volume `wms-data` (base + images).
> Ces fichiers de conteneur sont fournis **à titre d'aide** : ils n'ont pas pu être
> exécutés dans l'environnement de développement (Docker indisponible). Testez-les sur
> votre serveur avant la mise en production.

---

## 4. Sauvegarde et restauration

Tout tient dans un dossier : `data/`.

```bash
# Sauvegarde (à planifier chaque jour, par exemple via cron à 2 h du matin)
tar czf /var/sauvegardes/wms-$(date +%F).tar.gz -C /srv/wms data
```

Exemple de planification :

```cron
0 2 * * * tar czf /var/sauvegardes/wms-$(date +\%F).tar.gz -C /srv/wms data
```

Restauration :

```bash
sudo systemctl stop wms
cd /srv/wms && rm -rf data && tar xzf /var/sauvegardes/wms-2026-10-15.tar.gz
sudo systemctl start wms
```

Conseils : conservez au moins 30 sauvegardes, copiez régulièrement l'archive **hors du
serveur** (clé USB, disque externe, stockage en ligne) et vérifiez une restauration
complète au moins une fois par trimestre.

---

## 5. Mise à jour de l'application

```bash
cd /srv/wms
tar czf /var/sauvegardes/wms-avant-maj-$(date +%F).tar.gz -C /srv/wms data   # sécurité
git pull
npm ci
npm run migrate     # applique les migrations manquantes (idempotent)
npm run build
sudo systemctl restart wms
```

---

## 6. Après la mise en ligne — liste de contrôle

1. Se connecter sur `/admin` et **changer le mot de passe** si la valeur a circulé par
   un message ou un document.
2. Saisir les **prix réels**, les stocks et les frais de livraison des produits vendus :
   tant qu'ils sont vides, le site affiche « Prix à confirmer ».
3. Vérifier `/robots.txt` et le sitemap, puis déclarer le site à Google Search Console.
4. Tester une commande réelle de bout en bout depuis un téléphone (site → WhatsApp → admin).
5. Mettre en place la sauvegarde automatique (§4) **et la tester**.
6. Vérifier que `NEXT_PUBLIC_SITE_URL` correspond bien au domaine public (sinon les liens
   de partage WhatsApp pointent vers la mauvaise adresse).

---

## 7. Budget indicatif (transparence)

| Poste | Coût réaliste |
| --- | --- |
| Nom de domaine `.com` | ≈ 8 000 – 12 000 FCFA / an |
| VPS 1 vCPU / 1 Go (Hetzner, OVH, Contabo…) | ≈ 3 500 – 6 000 FCFA / mois |
| Certificat HTTPS | 0 FCFA (Let's Encrypt via Caddy) |
| Base de données | 0 FCFA (SQLite intégré) |
| Envoi WhatsApp automatique | **non utilisé** (liens `wa.me` gratuits) |

Aucun service payant n'a été souscrit pendant le développement.
