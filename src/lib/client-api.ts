'use client';

/** Helpers d'appel API côté navigateur (avec jeton CSRF double soumission). */

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)wms_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Récupère le jeton anti-CSRF, en le demandant au serveur si le cookie a
 * expiré ou a été effacé (réparation automatique, sans action de l'utilisateur).
 */
async function resolveCsrfToken(): Promise<string> {
  let token = getCsrfToken();
  if (token) return token;
  try {
    await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
  } catch {
    /* réseau indisponible : l'appel de mutation renverra l'erreur 403 */
  }
  token = getCsrfToken();
  return token;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...rest } = options;
  const headers = new Headers(rest.headers);
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  if (rest.method && !['GET', 'HEAD'].includes(rest.method.toUpperCase())) {
    headers.set('x-csrf-token', await resolveCsrfToken());
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: 'same-origin',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Erreur ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}
