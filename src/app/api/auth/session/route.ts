import { NextResponse } from 'next/server';
import { ensureCsrfToken, getCurrentAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * État de session de l'administrateur.
 *
 * Effet de bord volontaire : ce point d'entrée garantit l'existence du cookie
 * anti-CSRF (double soumission) utilisé par toutes les requêtes de mutation.
 * Il sert aussi au client pour se « réparer » si le cookie a expiré.
 */
export async function GET() {
  const user = await getCurrentAdmin();
  const csrfToken = user ? await ensureCsrfToken() : null;
  return NextResponse.json({ authenticated: Boolean(user), user: user ?? null, csrfToken });
}
