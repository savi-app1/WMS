import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/constants';

/**
 * Contrôle rapide d'accès aux pages d'administration.
 *
 * Ce middleware ne fait qu'un contrôle de *présence* du cookie de session
 * (rapide, sans accès base de données). La vérification réelle du jeton et des
 * droits est effectuée côté serveur dans le layout `/admin` et dans chaque
 * route API protégée : le contrôle d'accès ne repose jamais sur ce middleware.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // La page de connexion est toujours accessible : la rediriger vers
  // elle-même créerait une boucle infinie.
  const isLoginPage = pathname === '/admin/connexion' || pathname.startsWith('/admin/connexion/');

  if (!hasSessionCookie && !isLoginPage) {
    const loginUrl = new URL('/admin/connexion', request.url);
    loginUrl.searchParams.set('suite', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
