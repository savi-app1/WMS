/**
 * Constantes d'authentification utilisables côté client et côté middleware
 * (runtime Edge) : ce module n'importe rien.
 */

export const SESSION_COOKIE = 'wms_session';
export const CSRF_COOKIE = 'wms_csrf';

export const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MINUTES = 15;
