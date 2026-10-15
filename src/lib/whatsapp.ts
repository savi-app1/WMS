/**
 * Liens WhatsApp.
 *
 * IMPORTANT — honnêteté technique :
 * Un lien `wa.me` ouvre une conversation WhatsApp pré-remplie chez le client.
 * Ce n'est PAS une notification envoyée par le serveur : l'envoi reste une
 * action manuelle de WMS. L'API WhatsApp Business (notifications automatiques)
 * n'est pas activée : elle nécessite un compte marchand, un numéro vérifié et
 * une clé d'API que le propriétaire doit fournir (cf. docs/RESULTS.md).
 */
import { WHATSAPP_NUMBER } from './paths';

export function whatsappLink(message: string, phone: string = WHATSAPP_NUMBER): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function productWhatsappMessage(product: { name: string; slug: string; price?: number | null }): string {
  const pricePart =
    product.price && product.price > 0 ? ` (${product.price.toLocaleString('fr-FR')} FCFA)` : ' (prix à confirmer)';
  return `Bonjour WMS, je souhaite des informations sur « ${product.name} »${pricePart}.\nLien : ${siteUrl(`/boutique/${product.slug}`)}`;
}

export function orderWhatsappMessage(order: {
  order_number: string;
  customer_name: string;
  items: unknown;
  total_fcfa: number | null;
}): string {
  const lines = Array.isArray(order.items) ? order.items : [];
  const detail = lines
    .map((item) => {
      const it = item as { name?: string; quantity?: number };
      return `• ${it.name ?? 'Article'} x${it.quantity ?? 1}`;
    })
    .join('\n');
  const total =
    order.total_fcfa && order.total_fcfa > 0
      ? `Total : ${order.total_fcfa.toLocaleString('fr-FR')} FCFA`
      : 'Montant total : à confirmer par WMS';
  return `Bonjour WMS, je souhaite en savoir plus sur ma commande ${order.order_number}.\n${detail}\n${total}\nClient : ${order.customer_name}`;
}

export function siteUrl(pathname: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
