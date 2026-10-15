/**
 * Données de départ WMS.
 *
 * Principe : on ne publie que ce qui est vérifiable.
 *  - Les catégories proviennent de la liste de travail validée par le propriétaire.
 *  - Les produits sont des FAMILLES de produits réellement commercialisées par WMS
 *    (d'après la bannière officielle). Aucun prix, stock, garantie ou
 *    caractéristique n'est inventé : les prix restent "à confirmer" jusqu'à ce
 *    que le propriétaire les renseigne dans l'administration.
 *  - Les zones de livraison sont créées sans frais : le tarif est à confirmer.
 *
 * Usage : npm run seed  (idempotent)
 */
import { getDb, query, run, nowIso } from '../src/lib/db';
import { slugify } from '../src/lib/format';

// Chargement du fichier .env local (variables non déjà définies)
try {
  process.loadEnvFile();
} catch {
  // pas de fichier .env : les variables d'environnement du shell sont utilisées
}

const CATEGORIES = [
  {
    slug: 'smartphones-et-accessoires',
    name: 'Smartphones et accessoires',
    description: 'Smartphones 128 Go / 64 Go / 8 Go RAM, étuis, coques et protections.',
  },
  {
    slug: 'audio-bluetooth',
    name: 'Écouteurs, casques et appareils Bluetooth',
    description: 'Audio et appareils Bluetooth. Modèles et disponibilité confirmés par WMS.',
  },
  {
    slug: 'montres-connectees',
    name: 'Montres connectées et bracelets',
    description: 'Montres connectées et bracelets connectés.',
  },
  {
    slug: 'chargeurs-cables-batteries',
    name: 'Chargeurs, câbles et batteries externes',
    description: 'Chargeurs, câbles et batteries externes 6000 mAh.',
  },
  {
    slug: 'stockage-usb',
    name: 'Clés USB et cartes mémoire',
    description: 'Clés USB, cartes mémoire et supports de stockage.',
  },
  {
    slug: 'televiseurs-electronique',
    name: 'Téléviseurs et appareils électroniques',
    description: 'Téléviseurs, webcams et appareils électroniques.',
  },
  {
    slug: 'accessoires-divers',
    name: 'Accessoires et objets divers',
    description: 'Tous les accessoires du quotidien.',
  },
  {
    slug: 'produits-numeriques-et-livres-pdf',
    name: 'Produits numériques et livres PDF',
    description: 'Droits PDF, contenus audio et ressources numériques.',
  },
  {
    slug: 'formations-et-services-digitaux',
    name: 'Formations et services digitaux',
    description: 'WMS Academy, e-commerce, marketing digital et créations graphiques.',
  },
  {
    slug: 'autres-produits',
    name: 'Autres produits',
    description: 'Produits à la demande, selon disponibilité.',
  },
];

const PRODUCTS = [
  {
    category: 'smartphones-et-accessoires',
    name: 'Smartphone',
    short: 'Smartphones 128 Go / 64 Go / 8 Go RAM.',
    description:
      'Smartphones proposés par WMS en capacité 128 Go ou 64 Go avec 8 Go de RAM. Le modèle exact, le prix et la disponibilité sont confirmés par WMS avant validation de votre commande.',
    service: false,
    digital: false,
  },
  {
    category: 'smartphones-et-accessoires',
    name: 'Étui et coque de protection',
    short: 'Étuis, coques et transparents pour smartphone.',
    description:
      'Étuis, coques et protections transparentes pour smartphone. Le modèle exact et le prix sont communiqués par WMS lors de la confirmation.',
    service: false,
    digital: false,
  },
  {
    category: 'chargeurs-cables-batteries',
    name: 'Batterie externe 6000 mAh',
    short: 'Batteries externes 6000 mAh.',
    description:
      'Batterie externe de 6000 mAh pour smartphone. Prix et disponibilité confirmés par WMS avant validation.',
    service: false,
    digital: false,
  },
  {
    category: 'chargeurs-cables-batteries',
    name: 'Chargeur et câble de recharge',
    short: 'Chargeurs et câbles de recharge.',
    description:
      'Chargeurs et câbles de recharge. La référence (type de connecteur, puissance) et le tarif sont confirmés par WMS lors de votre commande.',
    service: false,
    digital: false,
  },
  {
    category: 'audio-bluetooth',
    name: 'Écouteurs et casques Bluetooth',
    short: 'Écouteurs et casques sans fil Bluetooth.',
    description:
      'Écouteurs et casques Bluetooth. Gamme, autonomie et prix précis confirmés par WMS avant validation de la commande.',
    service: false,
    digital: false,
  },
  {
    category: 'montres-connectees',
    name: 'Montre connectée et bracelet connecté',
    short: 'Montres connectées et bracelets.',
    description:
      'Montres connectées et bracelets connectés. Fonctions disponibles, garantie et tarif sont communiqués par WMS lors de la confirmation.',
    service: false,
    digital: false,
  },
  {
    category: 'stockage-usb',
    name: 'Clé USB et carte mémoire',
    short: 'Clés USB et cartes mémoire.',
    description:
      'Clés USB et cartes mémoire pour le stockage et le transfert de données. Capacité et prix confirmés par WMS.',
    service: false,
    digital: false,
  },
  {
    category: 'televiseurs-electronique',
    name: 'Téléviseur',
    short: 'Téléviseurs proposés par WMS.',
    description:
      'Téléviseurs proposés par WMS. Taille d\'écran, type d\'écran et prix sont confirmés par WMS avant validation.',
    service: false,
    digital: false,
  },
  {
    category: 'televiseurs-electronique',
    name: 'Webcam',
    short: 'Webcam pour visioconférence et streaming.',
    description:
      'Webcam pour visioconférence, cours en ligne et streaming. Résolution et prix confirmés par WMS lors de la confirmation.',
    service: false,
    digital: false,
  },
  {
    category: 'produits-numeriques-et-livres-pdf',
    name: 'Produits numériques (droits PDF et audio)',
    short: 'Droits PDF, contenus audio et ressources numériques.',
    description:
      'Produits numériques : droits d\'accès à des contenus PDF et audio, ainsi que des ressources téléchargeables. Le contenu précis et le prix sont communiqués par WMS avant validation.',
    service: false,
    digital: true,
  },
  {
    category: 'formations-et-services-digitaux',
    name: 'Formations WMS Academy',
    short: 'Formations en ligne et e-learning (WMS Academy).',
    description:
      'Formations en ligne et e-learning de WMS Academy : parcours sur le numérique, le marketing et le commerce, accessibles depuis un smartphone. Programme, durée et tarif précisés par WMS lors de la confirmation.',
    service: true,
    digital: true,
  },
  {
    category: 'formations-et-services-digitaux',
    name: 'Création graphique, logo et affiches',
    short: 'Logos, affiches, flyers et visuels pour vos supports.',
    description:
      'Prestation de création graphique : logo, affiches, flyers et visuels pour réseaux sociaux et supports imprimés. Le devis est établi après échange sur vos besoins.',
    service: true,
    digital: false,
  },
  {
    category: 'formations-et-services-digitaux',
    name: 'Accompagnement e-commerce et gestion de page',
    short: 'Mise en ligne de boutique, gestion de page, fiches produits.',
    description:
      'Accompagnement e-commerce : mise en ligne de votre boutique, fiches produits, gestion de page et organisation du suivi des commandes. Périmètre et devis définis après échange.',
    service: true,
    digital: false,
  },
  {
    category: 'formations-et-services-digitaux',
    name: 'Campagnes publicitaires et contenus',
    short: 'Scripts vidéo, voix off, textes de publication, campagnes.',
    description:
      'Préparation de campagnes : scripts vidéo, voix off, textes de publication et paramètres de suivi (UTM). Les contenus restent des brouillons tant qu\'ils ne sont pas validés.',
    service: true,
    digital: false,
  },
];

const ZONES = [
  { name: 'Ouagadougou', note: 'Zone principale. Frais de livraison à confirmer par WMS.' },
  { name: 'Ouagadougou — environs', note: 'Communes limitrophes. Délai et frais confirmés par WMS.' },
  { name: 'Autres villes du Burkina Faso', note: 'Livraison possible selon disponibilité. À confirmer.' },
];

const SCRIPTS = [
  {
    title: 'Argumentaire de vente WhatsApp — boutique WMS',
    type: 'dialogue_commercial',
    channel: 'whatsapp',
    body: `Objectif : transformer une demande d'information en commande confirmée.

Message d'accueil :
« Bonjour WMS 👋 Merci pour votre message. Que souhaitez-vous commander aujourd'hui ? Je vous confirme la disponibilité et le prix de chaque article. »

Sur demande de prix :
« Le [produit] est disponible. Le prix est de [montant] FCFA. La livraison à [zone] est de [frais] FCFA (ou "frais à confirmer"). Souhaitez-vous que je vous prépare la commande ? »

Si le prix n'est pas encore défini :
« Le prix de ce produit doit être vérifié par notre équipe. Je vous le confirme dans un court délai. Pour ne pas vous faire attendre, voici une alternative disponible immédiatement : [alternative]. »

Relance (client silencieux, 24-48 h) :
« Bonjour [Prénom], nous avons bien reçu votre demande pour [produit]. Souhaitez-vous que nous préparions la commande ? Le montant total est de [montant] FCFA. »

Clôture :
« Parfait, votre commande est enregistrée sous le numéro [NUMÉRO]. Nous vous appelons pour confirmer avant l'expédition. »`,
    notes:
      'Règle importante : ne jamais annoncer un prix qui n\'a pas été vérifié. Le message est envoyé par le commercial, depuis son téléphone — ce n\'est pas une notification automatique.',
    tags: ['whatsapp', 'vente', 'argumentaire'],
    source: 'Bannière officielle WMS (arguments « Commande facilement sur WhatsApp », « Paiement à la livraison »)',
    sourceDate: '2026-10-15',
  },
  {
    title: 'Script vidéo court — promotion boutique (30 s)',
    type: 'script_video',
    channel: 'facebook',
    body: `PLAN 1 — Accroche (0-3 s)
« Vous achetez des accessoires à Ouagadougou ? Ne partez plus sans votre prix. »

PLAN 2 — Preuve (3-12 s)
Plan sur les produits (smartphone, écouteurs, batterie 6000 mAh) et sur le logo WMS.
Voix off : « Wendmanegda Multiples Services : smartphones, accessoires, électronique et formations. »

PLAN 3 — Offre (12-22 s)
« Commande en ligne, paiement à la livraison, livraison rapide à Ouagadougou et environs. »

PLAN 4 — Appel à l'action (22-30 s)
« Écrivez-nous sur WhatsApp : le lien est dans la description. On vous confirme la disponibilité et le prix. »

Mention permanente à l'écran : logo WMS + WhatsApp +226 56 59 25 57.`,
    notes:
      'Format vertical 9:16, sous-titres obligatoires (lecture en mode silencieux), musique libre de droits. Le prix n\'apparaît pas tant qu\'il n\'est pas vérifié.',
    tags: ['video', 'facebook', 'promotion'],
    source: 'Bannière officielle WMS (promesses « Livraison rapide », « Paiement à la livraison »)',
    sourceDate: '2026-10-15',
  },
  {
    title: 'Texte de publication — ouverture de la boutique en ligne',
    type: 'texte_pub',
    channel: 'facebook',
    body: `📦 La boutique en ligne Wendmanegda Multiples Services est en ligne.

• Smartphones, étuis et coques
• Batterie externe 6000 mAh, chargeurs et câbles
• Écouteurs, montres connectées, clés USB, cartes mémoire
• Téléviseurs et webcams
• Produits numériques, formations WMS Academy et services digitaux

✅ Commande en ligne, simple et rapide
✅ Paiement à la livraison
✅ Livraison à Ouagadougou et environs
✅ Un interlocuteur joignable sur WhatsApp

👉 Commandez sur le site ou écrivez-nous : +226 56 59 25 57

Nous confirmons chaque commande manuellement avant l'expédition.`,
    notes:
      'À publier manuellement par le propriétaire. Ne jamais publier sans validation du prix et de la disponibilité affichés sur le site.',
    tags: ['publication', 'facebook', 'boutique'],
    source: 'Bannière officielle WMS (catégories de produits et services)',
    sourceDate: '2026-10-15',
  },
  {
    title: 'Voix off — présentation WMS Academy',
    type: 'voix_off',
    channel: 'radio',
    body: `« WMS Academy, les formations en ligne de Wendmanegda Multiples Services.

Comprendre le numérique, apprendre le marketing, développer son activité : nos modules sont conçus pour être suivis depuis un smartphone, à votre rythme, à Ouagadougou comme partout ailleurs.

Formations, e-commerce, créations graphiques : WMS vous accompagne au-delà de la boutique.

Retrouvez le programme et les modalités sur notre site, ou écrivez-nous sur WhatsApp. »`,
    notes: 'Durée cible 30 à 40 secondes. Voix calme et claire, fond musical discret.',
    tags: ['voix-off', 'academy', 'radio'],
    source: 'Bannière officielle WMS (WMS Academy — formations en ligne & e-learning)',
    sourceDate: '2026-10-15',
  },
  {
    title: 'FAQ — objections courantes',
    type: 'faq',
    channel: 'whatsapp',
    body: `« Le prix affiché est-il le vrai ? »
→ Oui, les prix affichés sur le site sont ceux enregistrés par WMS. Lorsqu'une fiche indique « Prix à confirmer », nous vous communiquons le tarif exact avant toute facturation.

« Je peux payer maintenant ? »
→ La commande est payée à la livraison. Le Mobile Money est possible selon les modalités convenues lors de la confirmation.

« Combien de temps pour livrer ? »
→ Le délai vous est confirmé lors de la validation, selon votre zone et la disponibilité du produit.

« Le produit n'est pas disponible ? »
→ Nous vous proposons une alternative disponible ou une commande spéciale avec un délai annoncé.

« Puis-je annuler ? »
→ Oui, tant que le colis n'a pas été remis. Donnez-nous votre numéro de commande.`,
    notes: 'À conserver hors ligne dans l\'application WhatsApp du commercial.',
    tags: ['faq', 'objections', 'vente'],
    source: 'Composition WMS à partir des conditions de vente du site',
    sourceDate: '2026-10-15',
  },
];

function main() {
  getDb();

  // Catégories
  for (const [index, category] of CATEGORIES.entries()) {
    const existing = query<{ id: number }>('SELECT id FROM categories WHERE slug = ?', [category.slug]);
    if (existing.length === 0) {
      run(
        'INSERT INTO categories (slug, name, description, position, active) VALUES (?,?,?,?,1)',
        [category.slug, category.name, category.description, index],
      );
    }
  }

  // Produits
  for (const [index, product] of PRODUCTS.entries()) {
    const slug = slugify(product.name);
    const existing = query<{ id: number }>('SELECT id FROM products WHERE slug = ?', [slug]);
    if (existing.length > 0) continue;
    const category = query<{ id: number }>('SELECT id FROM categories WHERE slug = ?', [product.category])[0];
    const now = nowIso();
    run(
      `INSERT INTO products (slug, name, category_id, short_description, description, price_fcfa, price_type,
        compare_price_fcfa, stock, track_stock, sku, images, specs, is_digital, is_service, is_published,
        featured, position, created_at, updated_at)
       VALUES (?,?,?,?,?,NULL,'unique',NULL,NULL,0,NULL,'[]','{}',?,?,1,?,?,?,?)`,
      [
        slug,
        product.name,
        category?.id ?? null,
        product.short,
        product.description,
        product.digital ? 1 : 0,
        product.service ? 1 : 0,
        index % 4 === 0 ? 1 : 0,
        index,
        now,
        now,
      ],
    );
  }

  // Zones de livraison (frais non définis : à confirmer)
  for (const zone of ZONES) {
    const existing = query<{ id: number }>('SELECT id FROM delivery_zones WHERE name = ?', [zone.name]);
    if (existing.length === 0) {
      run('INSERT INTO delivery_zones (name, fee_fcfa, active, note) VALUES (?, NULL, 1, ?)', [
        zone.name,
        zone.note,
      ]);
    }
  }

  // Bibliothèque de scripts
  for (const script of SCRIPTS) {
    const existing = query<{ id: number }>('SELECT id FROM scripts WHERE title = ?', [script.title]);
    if (existing.length > 0) continue;
    const now = nowIso();
    run(
      `INSERT INTO scripts (title, type, channel, body, notes, tags, source, source_url, source_date, status, product_id, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?, 'brouillon', NULL, ?, ?)`,
      [
        script.title,
        script.type,
        script.channel,
        script.body,
        script.notes ?? null,
        JSON.stringify(script.tags),
        script.source,
        null,
        script.sourceDate,
        now,
        now,
      ],
    );
  }

  const counts = {
    categories: query<{ c: number }>('SELECT COUNT(*) AS c FROM categories')[0]?.c,
    products: query<{ c: number }>('SELECT COUNT(*) AS c FROM products')[0]?.c,
    zones: query<{ c: number }>('SELECT COUNT(*) AS c FROM delivery_zones')[0]?.c,
    scripts: query<{ c: number }>('SELECT COUNT(*) AS c FROM scripts')[0]?.c,
  };
  console.log('Données de départ installées :', JSON.stringify(counts));
}

main();
