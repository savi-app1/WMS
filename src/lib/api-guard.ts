/**
 * Garde d'accès pour les routes d'administration.
 * Le contrôle est TOUJOURS effectué côté serveur : l'interface ne fait
 * jamais foi. Le middleware Next ne fait qu'un contrôle rapide (présence du
 * cookie) pour éviter un rendu inutile.
 */
import { NextResponse } from 'next/server';
import { getCurrentAdmin, isValidCsrf, type AdminUser } from './auth';

export interface GuardResult {
  user: AdminUser;
}

export async function requireAdmin(_request: Request): Promise<GuardResult | NextResponse> {
  const user = await getCurrentAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }
  return { user };
}

export async function requireAdminMutation(request: Request): Promise<GuardResult | NextResponse> {
  const user = await getCurrentAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (!(await isValidCsrf(request))) {
      return NextResponse.json(
        { error: 'Jeton de sécurité invalide. Rechargez la page et réessayez.' },
        { status: 403 },
      );
    }
  }
  return { user };
}

export function isGuardError(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
