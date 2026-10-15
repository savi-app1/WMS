'use strict';
/**
 * WhatsApp — liens wa.me avec message prérempli.
 * IMPORTANT : il s'agit de liens d'ouverture de discussion. Aucun message
 * n'est envoyé automatiquement par le serveur. L'API WhatsApp Business
 * officielle n'est pas configurée : toute notification reste manuelle.
 */
const { config } = require('../config');

function waLink(phoneDigits, text) {
  const num = String(phoneDigits || '').replace(/[^0-9]/g, '');
  const msg = encodeURIComponent(String(text || '').slice(0, 900));
  return `https://wa.me/${num}${msg ? `?text=${msg}` : ''}`;
}

/** Lien vers WMS (information) avec message prérempli. */
function linkToWms({ productName = '', productUrl = '', custom = '' } = {}) {
  let message;
  if (custom) {
    message = custom;
  } else if (productName) {
    message = `Bonjour WMS, je suis intéressé(e) par « ${productName} »${productUrl ? ` : ${productUrl}` : ''}. Pouvez-vous me donner plus d’informations ?`;
  } else {
    message = 'Bonjour WMS, je souhaite avoir des informations sur vos produits et services.';
  }
  return waLink(config.whatsappNumber, message);
}

/** Lien vers la conversation avec le client (depuis l'administration). */
function linkToCustomer(order, { custom = '' } = {}) {
  const message = custom || `Bonjour ${order.customer_name}, ici WMS (Wendmanegda Multiples Services) au sujet de votre commande ${order.order_number}.`;
  return waLink(order.customer_phone, message);
}

module.exports = { waLink, linkToWms, linkToCustomer };
