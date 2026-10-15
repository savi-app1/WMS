/**
 * Constantes partagées (client et serveur).
 * Ce module ne doit importer AUCUN module Node : il est utilisé par les
 * composants clients, par le middleware (runtime Edge) et par le serveur.
 */

/** URL publique du site (utilisée pour les liens de partage et les UTM). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Numéro WhatsApp d'information (format international, sans « + »). */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '22656592557').replace(/\D/g, '');

/** Second numéro de contact (affiché sur le site, non utilisé pour les liens). */
export const CONTACT_PHONE_SECONDARY = process.env.NEXT_PUBLIC_CONTACT_PHONE_SECONDARY || '+226 79 00 13 17';

export const CONTACT_PHONE_PRIMARY = process.env.NEXT_PUBLIC_CONTACT_PHONE_PRIMARY || '+226 56 59 25 57';

export const BRAND_NAME = 'Wendmanegda Multiples Services';
export const BRAND_SHORT = 'WMS';
export const BRAND_TAGLINE = 'Engagés pour satisfaire, motivés pour faire grandir';
export const BRAND_CITY = 'Ouagadougou, Burkina Faso';
export const BRAND_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@wendmanegda.com';
