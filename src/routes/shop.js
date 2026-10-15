'use strict';
/**
 * Routes publiques — boutique WMS (aucun compte client requis).
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const security = require('../security');
const productsSvc = require('../services/products');
const ordersSvc = require('../services/orders');
const whatsapp = require('../services/whatsapp');
const statsSvc = require('../services/stats');
const { config } = require('../config');

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Trop de commandes envoyées depuis cette adresse. Réessayez plus tard.' },
});

const eventLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

function track(req, type, extra = {}) {
  try {
    statsSvc.trackEvent({
      type,
      path: req.path,
      productId: extra.productId ?? null,
      detail: extra.detail || '',
      utm: res_utm(req),
      referrer: String(req.headers.referer || ''),
      ipHash: security.ipHash(req),
    });
  } catch (err) {
    console.error('[events]', err.message);
  }
}

function res_utm(req) {
  return {
    utm_source: req.utmSource ?? String(req.query.utm_source || req.body?.utm_source || '').slice(0, 60),
    utm_medium: req.utmMedium ?? String(req.query.utm_medium || req.body?.utm_medium || '').slice(0, 60),
    utm_campaign: req.utmCampaign ?? String(req.query.utm_campaign || req.body?.utm_campaign || '').slice(0, 60),
  };
}

function absoluteUrl(pathname) {
  const base = config.publicUrl || '';
  return base ? `${base}${pathname}` : pathname;
}

// ---------- Accueil ----------
router.get('/', (req, res) => {
  track(req, 'page_view', { detail: 'home' });
  const categories = productsSvc.listCategories();
  const products = productsSvc.listProducts({ includeDemo: false }).slice(0, 12);
  res.render('shop/home', {
    title: 'WMS — Wendmanegda Multiples Services | Ouagadougou',
    meta: {
      description: 'Wendmanegda Multiples Services (WMS) : smartphones, accessoires, électronique, produits numériques, formations et services digitaux à Ouagadougou. Commandez en ligne, paiement à la livraison.',
      image: '/static/img/wms-banner.jpeg',
      url: absoluteUrl('/'),
    },
    categories,
    products,
    deliveryZones: ordersSvc.readDeliveryZones(),
  });
});

// ---------- Catalogue ----------
router.get('/produits', (req, res) => {
  const q = security.cleanText(req.query.q, { max: 100 });
  const category = security.cleanText(req.query.categorie, { max: 60 });
  if (q) track(req, 'search', { detail: q });
  else track(req, 'page_view', { detail: 'catalog' });
  const categories = productsSvc.listCategories();
  const products = productsSvc.listProducts({ category, q, includeDemo: false });
  res.render('shop/catalog', {
    title: q ? `Recherche : ${q} — WMS` : 'Nos produits et services — WMS',
    meta: {
      description: 'Catalogue WMS : smartphones, accessoires, audio Bluetooth, montres connectées, électronique, produits numériques, formations et services digitaux à Ouagadougou.',
      url: absoluteUrl('/produits'),
    },
    categories, products, q, category,
  });
});

// ---------- Fiche produit (partageable) ----------
router.get('/produit/:slug', (req, res) => {
  const product = productsSvc.getProductBySlug(req.params.slug);
  // Les produits inactifs ou de démonstration ne sont jamais exposés au public.
  if (!product || !product.active || (product.is_demo && !req.user)) {
    return res.status(404).render('shop/404', {
      title: 'Produit introuvable — WMS',
      meta: { description: 'Produit introuvable.' },
    });
  }
  track(req, 'product_view', { productId: product.id, detail: product.name });
  const related = productsSvc.listProducts({ category: product.category, includeDemo: false })
    .filter((p) => p.id !== product.id).slice(0, 4);
  const categoryName = (productsSvc.listCategories().find((c) => c.slug === product.category) || {}).name || product.category;
  res.render('shop/product', {
    title: `${product.name} — WMS`,
    meta: {
      description: product.short_description || `${product.name} — disponible chez Wendmanegda Multiples Services, Ouagadougou.`,
      image: product.image_url || '/static/img/wms-banner.jpeg',
      url: absoluteUrl(`/produit/${product.slug}`),
    },
    product, related, categoryName,
    waLink: whatsapp.linkToWms({ productName: product.name, productUrl: absoluteUrl(`/produit/${product.slug}`) }),
    deliveryZones: ordersSvc.readDeliveryZones(),
  });
});

// ---------- Enregistrement d'événements (analytics internes) ----------
router.post('/api/events', eventLimiter, (req, res) => {
  const type = String(req.body.type || '');
  const allowed = ['product_view', 'whatsapp_click', 'order_start', 'order_placed', 'search'];
  if (!allowed.includes(type)) {
    return res.status(400).json({ ok: false, error: 'Type d’événement inconnu.' });
  }
  track(req, type, { productId: req.body.productId, detail: req.body.detail });
  res.json({ ok: true });
});

// ---------- Commande ----------
router.post('/commander', orderLimiter, (req, res) => {
  const fail = (errors, input = {}) => res.status(400).render('shop/order-error', {
    title: 'Commande incomplète — WMS',
    meta: { description: 'Veuillez corriger le formulaire de commande.' },
    errors, input,
  });

  if (!security.verifyCsrf(req)) {
    return fail(['Session expirée ou formulaire invalide. Veuillez recharger la page et réessayer.'], req.body);
  }

  const honeypot = String(req.body.website || '');
  if (honeypot.trim() !== '') {
    // Champ invisible rempli → probable robot. On simule un succès sans rien enregistrer.
    return res.status(200).render('shop/order-confirmation', {
      title: 'Commande enregistrée — WMS',
      meta: { description: 'Confirmation de commande.' },
      order: null, demoBlock: true,
    });
  }

  track(req, 'order_placed', { detail: String(req.body.productId || '') });

  const result = ordersSvc.createOrder({
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
    customerAddress: req.body.customerAddress,
    customerZone: req.body.customerZone,
    customerNotes: req.body.customerNotes,
    items: [{ productId: req.body.productId, quantity: req.body.quantity }],
    utmSource: req.body.utm_source,
    utmMedium: req.body.utm_medium,
    utmCampaign: req.body.utm_campaign,
  });

  if (!result.ok) return fail(result.errors, req.body);

  const order = ordersSvc.getOrder(result.orderId);
  const items = order.items.map((i) => `${i.product_name} x${i.quantity}`).join(', ');
  const waMessage = `Bonjour WMS, je viens de passer la commande ${order.order_number} (${items}). Merci de me confirmer la disponibilité.`;

  res.render('shop/order-confirmation', {
    title: `Commande ${order.order_number} enregistrée — WMS`,
    meta: { description: `Votre commande ${order.order_number} a bien été enregistrée chez WMS.` },
    order,
    waLink: whatsapp.waLink(config.whatsappNumber, waMessage),
    waCustomerLink: whatsapp.waLink(order.customer_phone, waMessage),
    demoBlock: false,
  });
});

// ---------- Confirmation par numéro → redirige vers le suivi masqué ----------
router.get('/commande/:orderNumber', (req, res) => {
  // La page de confirmation complète n'est affichée que juste après la commande
  // (POST). Par souci de confidentialité, l'accès direct par numéro renvoie
  // vers le suivi public dont les données personnelles sont masquées.
  res.redirect(302, '/suivi/' + encodeURIComponent(String(req.params.orderNumber).toUpperCase().trim()));
});

// ---------- Suivi de commande (public, données masquées) ----------
router.get('/suivi', (req, res) => {
  res.render('shop/track', {
    title: 'Suivre ma commande — WMS',
    meta: { description: 'Suivez l’état de votre commande WMS avec votre numéro de commande.' },
    order: null,
    notFound: false,
  });
});

// Limite anti-énumération : les numéros de commande ne doivent pas pouvoir
// être devinés en série pour extraire des statuts de commandes.
const trackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Trop de recherches de suivi. Réessayez dans une heure.',
});

router.get('/suivi/:orderNumber', trackLimiter, (req, res) => {
  const order = ordersSvc.getOrderNumber(String(req.params.orderNumber).toUpperCase().trim());
  if (!order) {
    return res.status(404).render('shop/track', {
      title: 'Suivre ma commande — WMS',
      meta: { description: 'Suivi de commande WMS.' },
      order: null,
      notFound: true,
    });
  }
  res.render('shop/track', {
    title: `Suivi ${order.order_number} — WMS`,
    meta: { description: `Suivi de la commande ${order.order_number}.` },
    order: {
      ...order,
      customer_name: maskName(order.customer_name),
      customer_phone: maskPhone(order.customer_phone),
      customer_address: maskAddress(order.customer_address),
      items: order.items,
      history: order.history,
    },
    notFound: false,
  });
});

function maskName(name) {
  const parts = String(name).split(' ');
  return parts.map((p) => (p.length <= 2 ? p[0] + '*' : p[0] + '*'.repeat(Math.min(p.length - 1, 6)))).join(' ');
}
function maskPhone(phone) {
  const d = String(phone).replace(/[^0-9]/g, '');
  return d.length >= 6 ? `+${d.slice(0, 3)} ** ** ${d.slice(-2)}` : '**';
}
function maskAddress(addr) {
  const s = String(addr);
  return s.length <= 6 ? '***' : `${s.slice(0, 4)}…`;
}

// ---------- Pages d'information ----------
router.get('/services', (req, res) => {
  track(req, 'page_view', { detail: 'services' });
  res.render('shop/services', {
    title: 'Services WMS — Création graphique, digital et formations',
    meta: {
      description: 'Services WMS : logos, affiches, flyers, contenus publicitaires, accompagnement e-commerce, gestion de pages, campagnes publicitaires et formations WMS Academy.',
      url: absoluteUrl('/services'),
    },
  });
});

router.get('/contact', (req, res) => {
  track(req, 'page_view', { detail: 'contact' });
  res.render('shop/contact', {
    title: 'Contactez WMS — Ouagadougou',
    meta: {
      description: 'Contactez Wendmanegda Multiples Services à Ouagadougou : WhatsApp, téléphone. Livraison rapide à Ouagadougou et environs.',
      url: absoluteUrl('/contact'),
    },
    waLink: whatsapp.linkToWms({}),
  });
});

router.get('/confidentialite', (req, res) => {
  res.render('shop/confidentialite', {
    title: 'Politique de confidentialité — WMS',
    meta: { description: 'Protection des données personnelles chez WMS.' },
  });
});

router.get('/mentions', (req, res) => {
  res.render('shop/mentions', {
    title: 'Mentions légales — WMS',
    meta: { description: 'Mentions légales du site WMS.' },
  });
});

// ---------- Robots & sitemap ----------
router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  const base = config.publicUrl || '';
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`);
});

router.get('/sitemap.xml', (req, res) => {
  const products = productsSvc.listProducts({ includeDemo: false });
  const urls = ['/', '/produits', '/services', '/contact']
    .concat(products.map((p) => `/produit/${p.slug}`));
  const base = config.publicUrl || '';
  const body = urls.map((u) => `  <url><loc>${base || ''}${u}</loc></url>`).join('\n');
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

module.exports = router;
