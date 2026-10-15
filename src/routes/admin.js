'use strict';
/**
 * Administration privée WMS — accès strictement réservé à l'administrateur unique.
 * Toutes les actions sensibles sont vérifiées côté serveur et journalisées.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const db = require('../db');
const security = require('../security');
const { config } = require('../config');
const ordersSvc = require('../services/orders');
const productsSvc = require('../services/products');
const statsSvc = require('../services/stats');
const csvSvc = require('../services/csv');
const scriptsSvc = require('../services/scripts');
const settingsSvc = require('../services/settings');
const whatsapp = require('../services/whatsapp');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
});

// ---------- Garde d'authentification ----------
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

function requireCsrf(req, res, next) {
  if (!security.verifyCsrf(req)) {
    return res.status(403).render('admin/error', {
      title: 'Session expirée',
      error: 'Formulaire expiré ou invalide. Rechargez la page puis réessayez.',
    });
  }
  next();
}

// ---------- Connexion ----------
router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/admin');
  res.render('admin/login', {
    title: 'Connexion administrateur — WMS',
    error: null,
    next: String(req.query.next || '/admin').slice(0, 200),
  });
});

router.post('/login', loginLimiter, (req, res) => {
  const email = security.cleanText(req.body.email, { max: 120 }).toLowerCase();
  const password = String(req.body.password || '');
  const next = String(req.body.next || '/admin').slice(0, 200);
  const ipHash = security.ipHash(req);

  const renderError = (msg) => res.status(401).render('admin/login', {
    title: 'Connexion administrateur — WMS',
    error: msg,
    next,
  });

  if (security.isLoginBlocked(email)) {
    security.audit('login_blocked', 'admin_users', 1, `Trop de tentatives pour ${email}`, 'system');
    return renderError('Trop de tentatives échouées. Réessayez dans 15 minutes.');
  }

  const user = db.get('SELECT * FROM admin_users WHERE id = 1 AND email = ?', [email]);
  const ok = user && security.verifyPassword(password, user.password_hash);

  security.recordLoginAttempt(email, ipHash, ok);
  if (!ok) {
    security.audit('login_failed', 'admin_users', 1, `Échec pour ${email}`, 'system');
    return renderError('Adresse e-mail ou mot de passe incorrect.');
  }

  security.clearLoginAttempts(email);
  const session = security.createSession(user.id);
  security.setCookie(res, security.SESSION_COOKIE, session.token, { maxAgeMs: 12 * 60 * 60 * 1000 });
  db.run('UPDATE admin_users SET last_login_at = datetime(\'now\') WHERE id = 1');
  security.audit('login_success', 'admin_users', 1, `Connexion de ${email}`);
  const target = next.startsWith('/admin') ? next : '/admin';
  res.redirect(target);
});

router.post('/logout', requireCsrf, (req, res) => {
  security.destroySession(req.sessionToken);
  security.setCookie(res, security.SESSION_COOKIE, '', { maxAgeMs: 0 });
  security.audit('logout', 'admin_users', 1, 'Déconnexion');
  res.redirect('/admin/login');
});

// Toutes les routes suivantes exigent l'authentification.
router.use(requireAuth);

// Compteurs de commandes disponibles dans toutes les vues admin (badge de nouvelles commandes).
router.use((req, res, next) => {
  try {
    res.locals.counts = ordersSvc.statusCounts({ demo: 'hide' });
  } catch {
    res.locals.counts = null;
  }
  next();
});

// ---------- Tableau de bord ----------
router.get('/', (req, res) => {
  const demo = req.query.demo === 'show' ? 'all' : 'hide';
  const data = statsSvc.dashboardStats({ demo });
  const stale = ordersSvc.staleOrders(24);
  const lowStock = ordersSvc.lowStockProducts(3);
  const recent = ordersSvc.listOrders({ perPage: 8, demo }).rows;
  res.render('admin/dashboard', {
    title: 'Tableau de bord — Administration WMS',
    ...data,
    stale, lowStock, recent,
    demoMode: demo === 'all',
    statusLabels: ordersSvc.STATUS_LABELS,
    notice: req.query.purged === '1' ? 'purged' : undefined,
  });
});

// ---------- Commandes ----------
router.get('/commandes', (req, res) => {
  const status = ordersSvc.STATUSES.includes(req.query.statut) ? req.query.statut : '';
  const q = security.cleanText(req.query.q, { max: 80 });
  const demo = req.query.demo === 'show' ? 'all' : req.query.demo === 'only' ? 'only' : 'hide';
  const page = Number(req.query.page) || 1;
  const list = ordersSvc.listOrders({ status, q, page, perPage: 20, demo });
  const counts = ordersSvc.statusCounts({ demo: demo === 'only' ? 'all' : demo });
  res.render('admin/orders', {
    title: 'Commandes — Administration WMS',
    ...list,
    status, q, counts,
    demoMode: demo !== 'hide',
    demoFilter: demo,
    statusLabels: ordersSvc.STATUS_LABELS,
    statusList: ordersSvc.STATUSES,
  });
});

router.get('/commandes/export.csv', (req, res) => {
  const status = ordersSvc.STATUSES.includes(req.query.statut) ? req.query.statut : '';
  const from = security.cleanText(req.query.du, { max: 10 });
  const to = security.cleanText(req.query.au, { max: 10 });
  const csv = csvSvc.ordersCsv({ status, from, to, demo: req.query.demo === 'show' ? 'all' : 'hide' });
  security.audit('orders_export', 'orders', '', `Export CSV (statut=${status || 'tous'})`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="commandes-wms-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

router.get('/commandes/:id(\\d+)', (req, res) => {
  const order = ordersSvc.getOrder(Number(req.params.id));
  if (!order) return res.status(404).render('admin/error', { title: 'Introuvable', error: 'Commande introuvable.' });
  const transitions = ordersSvc.TRANSITIONS[order.status] || [];
  res.render('admin/order-detail', {
    title: `Commande ${order.order_number} — Administration WMS`,
    order,
    transitions,
    statusLabels: ordersSvc.STATUS_LABELS,
    waLink: whatsapp.linkToCustomer(order),
    waCustom: (text) => whatsapp.linkToCustomer(order, { custom: text }),
  });
});

router.post('/commandes/:id(\\d+)/statut', requireCsrf, (req, res) => {
  const id = Number(req.params.id);
  const toStatus = String(req.body.to_status || '');
  const note = security.cleanText(req.body.note, { max: 300 });
  const amountOverride = req.body.amount != null && String(req.body.amount).trim() !== ''
    ? Number(req.body.amount) : null;
  const amountCashed = req.body.amount_cashed != null && String(req.body.amount_cashed).trim() !== ''
    ? Number(req.body.amount_cashed) : null;

  const result = ordersSvc.changeStatus(id, toStatus, {
    note, actor: req.user.email, amountOverride, amountCashed,
  });
  if (!result.ok) {
    const order = ordersSvc.getOrder(id);
    return res.status(400).render('admin/order-detail', {
      title: `Commande ${order ? order.order_number : ''} — Administration WMS`,
      order, transitions: order ? ordersSvc.TRANSITIONS[order.status] : [],
      statusLabels: ordersSvc.STATUS_LABELS,
      waLink: order ? whatsapp.linkToCustomer(order) : '',
      waCustom: (text) => whatsapp.linkToCustomer(order, { custom: text }),
      error: result.error,
    });
  }
  res.redirect(`/admin/commandes/${id}#statut`);
});

router.post('/commandes/:id(\\d+)/encaissement', requireCsrf, (req, res) => {
  const id = Number(req.params.id);
  const amount = Number(req.body.amount_cashed);
  const result = ordersSvc.setAmountCashed(id, amount, req.user.email);
  if (!result.ok) return res.status(400).render('admin/error', { title: 'Erreur', error: result.error });
  res.redirect(`/admin/commandes/${id}#montants`);
});

// ---------- Produits ----------
router.get('/produits', (req, res) => {
  const products = productsSvc.listProducts({ includeInactive: true, includeDemo: true, q: security.cleanText(req.query.q, { max: 80 }) });
  const categories = productsSvc.listCategories();
  res.render('admin/products', {
    title: 'Produits — Administration WMS',
    products, categories,
    q: security.cleanText(req.query.q, { max: 80 }),
  });
});

router.get('/produits/nouveau', (req, res) => {
  res.render('admin/product-form', {
    title: 'Nouveau produit — Administration WMS',
    product: null,
    categories: productsSvc.listCategories(),
    error: null,
  });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(config.uploadDir, { recursive: true });
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const safeExt = allowed.includes(ext) ? ext : '.jpg';
    cb(null, `produit-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Format d’image non autorisé (JPG, PNG ou WebP uniquement).'), ok);
  },
});

/** Enroule multer pour convertir ses erreurs en réponse 400 propre. */
function withUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).render('admin/product-form', {
      title: 'Image invalide — Administration WMS',
      product: req.body || null,
      categories: productsSvc.listCategories(),
      error: err.message === 'Unexpected field' ? 'Image trop lourde (2 Mo maximum).' : String(err.message || 'Image invalide.'),
    });
  });
}

router.post('/produits', withUpload, requireCsrf, (req, res) => {
  const data = { ...req.body };
  if (req.file) data.image_url = `/uploads/${req.file.filename}`;
  const result = productsSvc.createProduct(data);
  if (!result.ok) {
    return res.status(400).render('admin/product-form', {
      title: 'Nouveau produit — Administration WMS',
      product: data,
      categories: productsSvc.listCategories(),
      error: result.error,
    });
  }
  res.redirect(`/admin/produits/${result.id}`);
});

router.get('/produits/:id(\\d+)', (req, res) => {
  const product = productsSvc.getProduct(Number(req.params.id));
  if (!product) return res.status(404).render('admin/error', { title: 'Introuvable', error: 'Produit introuvable.' });
  res.render('admin/product-form', {
    title: `Modifier : ${product.name} — Administration WMS`,
    product,
    categories: productsSvc.listCategories(),
    error: null,
    ok: req.query.ok === '1',
  });
});

router.post('/produits/:id(\\d+)', withUpload, requireCsrf, (req, res) => {
  const id = Number(req.params.id);
  const data = { ...req.body };
  if (req.file) data.image_url = `/uploads/${req.file.filename}`;
  const result = productsSvc.updateProduct(id, data);
  if (!result.ok) {
    return res.status(400).render('admin/product-form', {
      title: 'Modifier le produit — Administration WMS',
      product: { ...data, id },
      categories: productsSvc.listCategories(),
      error: result.error,
    });
  }
  res.redirect(`/admin/produits/${id}?ok=1`);
});

router.post('/produits/:id(\\d+)/supprimer', requireCsrf, (req, res) => {
  const result = productsSvc.deleteProduct(Number(req.params.id));
  if (!result.ok) return res.status(400).render('admin/error', { title: 'Erreur', error: result.error });
  res.redirect('/admin/produits?msg=' + encodeURIComponent(result.message || 'Produit supprimé.'));
});

// ---------- Statistiques ----------
router.get('/statistiques', (req, res) => {
  const now = new Date();
  const year = Number(req.query.annee) || now.getFullYear();
  const month = Number(req.query.mois) || now.getMonth() + 1;
  const monthStats = statsSvc.monthlyStats({ year, month, demo: 'hide' });
  const traffic = statsSvc.trafficSummary(30);
  res.render('admin/stats', {
    title: 'Statistiques — Administration WMS',
    monthStats,
    traffic,
    year, month,
    ga4Configured: Boolean(config.ga4MeasurementId),
  });
});

router.get('/statistiques/resume', (req, res) => {
  const now = new Date();
  const report = statsSvc.monthlySummaryReport(
    Number(req.query.annee) || now.getFullYear(),
    Number(req.query.mois) || now.getMonth() + 1
  );
  res.type('text/plain').send(
    `Résumé mensuel WMS — ${report.period}\n` +
    `Commandes : ${report.orders}\nConfirmées : ${report.confirmed}\nLivrées : ${report.delivered}\n` +
    `Annulées : ${report.cancelled}\nValeur commandée : ${report.amountOrdered} FCFA\n` +
    `Encaissé : ${report.amountCashed} FCFA\n` +
    `(Aucun envoi automatique : résumé à consulter ou à transmettre manuellement.)\n`
  );
});

// ---------- Scripts & contenus ----------
router.get('/scripts', (req, res) => {
  const q = security.cleanText(req.query.q, { max: 80 });
  const type = scriptsSvc.SCRIPT_TYPES.includes(req.query.type) ? req.query.type : '';
  const scripts = scriptsSvc.listScripts({ q, type });
  res.render('admin/scripts', {
    title: 'Scripts et contenus WMS — Administration',
    scripts, q, type,
    typeLabels: {
      script_video: 'Script vidéo', voix_off: 'Voix off', publication: 'Publication',
      dialogue: 'Dialogue commercial', accroche: 'Accroche', faq: 'FAQ', autre: 'Autre',
    },
  });
});

router.get('/scripts/nouveau', (req, res) => {
  res.render('admin/script-form', {
    title: 'Nouveau script — Administration WMS',
    script: null, error: null,
  });
});

router.post('/scripts', requireCsrf, (req, res) => {
  const result = scriptsSvc.createScript(req.body);
  if (!result.ok) {
    return res.status(400).render('admin/script-form', {
      title: 'Nouveau script — Administration WMS', script: req.body, error: result.error,
    });
  }
  res.redirect(`/admin/scripts/${result.id}`);
});

router.get('/scripts/:id(\\d+)', (req, res) => {
  const script = scriptsSvc.getScript(Number(req.params.id));
  if (!script) return res.status(404).render('admin/error', { title: 'Introuvable', error: 'Script introuvable.' });
  res.render('admin/script-form', {
    title: `Script : ${script.title} — Administration WMS`, script, error: null,
  });
});

router.post('/scripts/:id(\\d+)', requireCsrf, (req, res) => {
  const id = Number(req.params.id);
  const result = scriptsSvc.updateScript(id, req.body);
  if (!result.ok) {
    return res.status(400).render('admin/script-form', {
      title: 'Modifier le script — Administration WMS', script: { ...req.body, id }, error: result.error,
    });
  }
  res.redirect(`/admin/scripts/${id}?ok=1`);
});

router.post('/scripts/:id(\\d+)/dupliquer', requireCsrf, (req, res) => {
  const result = scriptsSvc.duplicateScript(Number(req.params.id));
  if (!result.ok) return res.status(400).render('admin/error', { title: 'Erreur', error: result.error });
  res.redirect(`/admin/scripts/${result.id}`);
});

router.post('/scripts/:id(\\d+)/supprimer', requireCsrf, (req, res) => {
  const result = scriptsSvc.deleteScript(Number(req.params.id));
  if (!result.ok) return res.status(400).render('admin/error', { title: 'Erreur', error: result.error });
  res.redirect('/admin/scripts');
});

router.get('/scripts/export.csv', (req, res) => {
  security.audit('scripts_export', 'scripts', '', 'Export CSV scripts');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="scripts-wms-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvSvc.scriptsCsv());
});

// ---------- Campagnes ----------
router.get('/campagnes', (req, res) => {
  const status = scriptsSvc.CAMPAIGN_STATUSES.includes(req.query.statut) ? req.query.statut : '';
  const campaigns = scriptsSvc.listCampaigns({ status });
  res.render('admin/campaigns', {
    title: 'Campagnes publicitaires — Administration WMS',
    campaigns,
    statusLabels: { brouillon: 'Brouillon', pret: 'Prêt', en_cours: 'En cours', termine: 'Terminé' },
  });
});

router.get('/campagnes/nouvelle', (req, res) => {
  res.render('admin/campaign-form', {
    title: 'Nouvelle campagne — Administration WMS',
    campaign: null, scripts: scriptsSvc.listScripts(), error: null,
  });
});

router.post('/campagnes', requireCsrf, (req, res) => {
  const result = scriptsSvc.createCampaign(req.body);
  if (!result.ok) {
    return res.status(400).render('admin/campaign-form', {
      title: 'Nouvelle campagne — Administration WMS',
      campaign: req.body, scripts: scriptsSvc.listScripts(), error: result.error,
    });
  }
  res.redirect('/admin/campagnes');
});

router.get('/campagnes/:id(\\d+)', (req, res) => {
  const campaign = scriptsSvc.getCampaign(Number(req.params.id));
  if (!campaign) return res.status(404).render('admin/error', { title: 'Introuvable', error: 'Campagne introuvable.' });
  res.render('admin/campaign-form', {
    title: `Campagne : ${campaign.name} — Administration WMS`,
    campaign, scripts: scriptsSvc.listScripts(), error: null,
  });
});

router.post('/campagnes/:id(\\d+)', requireCsrf, (req, res) => {
  const id = Number(req.params.id);
  const result = scriptsSvc.updateCampaign(id, req.body);
  if (!result.ok) {
    return res.status(400).render('admin/campaign-form', {
      title: 'Modifier la campagne — Administration WMS',
      campaign: { ...req.body, id }, scripts: scriptsSvc.listScripts(), error: result.error,
    });
  }
  res.redirect(`/admin/campagnes/${id}?ok=1`);
});

router.post('/campagnes/:id(\\d+)/supprimer', requireCsrf, (req, res) => {
  const result = scriptsSvc.deleteCampaign(Number(req.params.id));
  if (!result.ok) return res.status(400).render('admin/error', { title: 'Erreur', error: result.error });
  res.redirect('/admin/campagnes');
});

// ---------- Paramètres ----------
router.get('/parametres', (req, res) => {
  const zones = ordersSvc.readDeliveryZones();
  res.render('admin/settings', {
    title: 'Paramètres — Administration WMS',
    zones,
    error: null,
    success: null,
  });
});

router.post('/parametres/mot-de-passe', requireCsrf, (req, res) => {
  const current = String(req.body.current_password || '');
  const next = String(req.body.new_password || '');
  const confirm = String(req.body.confirm_password || '');
  const user = db.get('SELECT * FROM admin_users WHERE id = 1');
  const render = (error, success) => res.render('admin/settings', {
    title: 'Paramètres — Administration WMS',
    zones: ordersSvc.readDeliveryZones(),
    error, success,
  });

  if (!security.verifyPassword(current, user.password_hash)) {
    return render('Mot de passe actuel incorrect.', null);
  }
  if (next.length < 10) return render('Le nouveau mot de passe doit contenir au moins 10 caractères.', null);
  if (next !== confirm) return render('Les deux nouveaux mots de passe ne correspondent pas.', null);

  db.run('UPDATE admin_users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = 1',
    [security.hashPassword(next)]);
  security.audit('admin_password_changed', 'admin_users', 1, 'Mot de passe modifié');
  res.render('admin/settings', {
    title: 'Paramètres — Administration WMS',
    zones: ordersSvc.readDeliveryZones(),
    error: null,
    success: 'Mot de passe modifié avec succès.',
  });
});

router.post('/parametres/zones', requireCsrf, (req, res) => {
  const zones = {};
  const raw = String(req.body.zones_json || '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          const fee = Number(v);
          if (k.trim() && Number.isFinite(fee) && fee >= 0) zones[k.trim().slice(0, 80)] = Math.round(fee);
        }
      } else {
        throw new Error('format');
      }
    } catch {
      return res.render('admin/settings', {
        title: 'Paramètres — Administration WMS',
        zones: ordersSvc.readDeliveryZones(),
        error: 'JSON invalide. Format attendu : {"Zone": 500, "Autre zone": 1000}',
        success: null,
      });
    }
  }
  settingsSvc.setDeliveryZones(zones);
  security.audit('settings_delivery_zones', 'settings', 'delivery_zones', JSON.stringify(zones));
  res.render('admin/settings', {
    title: 'Paramètres — Administration WMS',
    zones,
    error: null,
    success: 'Frais de livraison mis à jour. Laisser une zone absente = « à confirmer ».',
  });
});

// ---------- Purge des données de démonstration ----------
router.post('/demo/purge', requireCsrf, (req, res) => {
  db.transaction(() => {
    db.run('DELETE FROM orders WHERE is_demo = 1');
    db.run('DELETE FROM products WHERE is_demo = 1');
    db.run('DELETE FROM scripts WHERE is_demo = 1');
    db.run('DELETE FROM campaigns WHERE is_demo = 1');
  });
  security.audit('demo_purge', 'demo', '', 'Données de démonstration supprimées');
  res.redirect('/admin?purged=1');
});

module.exports = router;
