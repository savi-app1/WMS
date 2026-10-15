'use strict';
/**
 * Application Express WMS — boutique publique + administration privée.
 */
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const security = require('./security');
const { config } = require('./config');
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');

function createApp() {
  const app = express();

  app.set('trust proxy', 1); // proxy de prévisualisation / reverse-proxy HTTPS
  app.set('view engine', 'ejs');
  app.set('views', path.join(config.root, 'views'));
  app.disable('x-powered-by');

  // --- Sécurité des en-têtes ---
  app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(compression());

  // --- Analytique légère : capture UTM dès l'entrée ---
  app.use((req, res, next) => {
    res.locals.utm = {
      utm_source: String(req.query.utm_source || '').slice(0, 60),
      utm_medium: String(req.query.utm_medium || '').slice(0, 60),
      utm_campaign: String(req.query.utm_campaign || '').slice(0, 60),
    };
    next();
  });

  // --- Limitation de débit générale ---
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { ok: false, error: 'Trop de requêtes. Réessayez plus tard.' },
  }));

  app.use(express.urlencoded({ extended: false, limit: '200kb' }));
  app.use(express.json({ limit: '200kb' }));

  // --- Statique (cache long pour les assets) ---
  app.use('/static', express.static(path.join(config.root, 'public'), {
    maxAge: config.isProd ? '7d' : 0,
    etag: true,
  }));
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d' }));

  // --- Contexte commun aux vues ---
  app.use((req, res, next) => {
    res.locals.config = config;
    res.locals.currentPath = req.path;
    res.locals.user = null;
    res.locals.flash = null;
    res.locals.formatFcfa = (n) => {
      if (n == null) return null;
      return `${Number(n).toLocaleString('fr-FR')} FCFA`;
    };
    res.locals.year = new Date().getFullYear();
    res.locals.security = security;
    next();
  });

  // --- Session administrateur ---
  app.use((req, res, next) => {
    const cookies = security.parseCookies(req);
    req.sessionToken = cookies[security.SESSION_COOKIE] || null;
    req.user = security.getSessionUser(req.sessionToken);
    res.locals.user = req.user;
    next();
  });

  // --- Jeton CSRF disponible dans toutes les vues ---
  app.use((req, res, next) => {
    res.locals.csrfToken = security.ensureCsrfCookie(req, res);
    next();
  });

  // --- Routes ---
  app.use('/', shopRoutes);
  app.use('/admin', adminRoutes);

  // --- PWA manifest & service worker (racine, requis par les navigateurs) ---
  app.get('/manifest.webmanifest', (req, res) => {
    res.type('application/manifest+json');
    res.sendFile(path.join(config.root, 'public', 'manifest.webmanifest'));
  });
  app.get('/sw.js', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(config.root, 'public', 'sw.js'));
  });

  // --- 404 ---
  app.use((req, res) => {
    res.status(404);
    res.render('shop/404', {
      title: 'Page introuvable — WMS',
      meta: { description: 'Page introuvable sur le site WMS.' },
    });
  });

  // --- Gestion des erreurs ---
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[wms] erreur:', err.message);
    if (res.headersSent) return;
    const code = err.status || 500;
    res.status(code);
    if (req.path.startsWith('/admin') && req.user) {
      return res.render('admin/error', {
        title: 'Erreur',
        error: config.isProd ? 'Une erreur interne est survenue.' : err.message,
      });
    }
    res.render('shop/error', {
      title: 'Erreur — WMS',
      meta: { description: 'Une erreur est survenue.' },
      error: config.isProd ? 'Une erreur interne est survenue.' : err.message,
    });
  });

  return app;
}

module.exports = { createApp };
