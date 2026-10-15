import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { queryOne, run, nowIso } from '@/lib/db';
import {
  createSession,
  ensureCsrfToken,
  getClientIp,
  hashIp,
  isLoginBlocked,
  recordLoginAttempt,
  SESSION_COOKIE,
  verifyPassword,
} from '@/lib/auth';
import { loginSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  const ipHash = hashIp(await getClientIp());
  const block = isLoginBlocked(parsed.data.email, ipHash);
  if (block.blocked) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Patientez 15 minutes avant de réessayer.' },
      { status: 429 },
    );
  }

  const user = queryOne<{ id: number; email: string; name: string; role: string; password_hash: string; active: number }>(
    'SELECT * FROM users WHERE email = ?',
    [parsed.data.email],
  );

  const valid = user ? verifyPassword(parsed.data.password, user.password_hash) : false;
  recordLoginAttempt(parsed.data.email, ipHash, Boolean(valid));

  if (!user || !valid || user.active !== 1) {
    // Message volontairement identique dans les deux cas (pas d'énumération de comptes)
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
  run('UPDATE users SET last_login_at = ? WHERE id = ?', [nowIso(), user.id]);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiresAt),
  });

  // Initialise le jeton anti-CSRF (double soumission) dès la connexion.
  const csrfToken = await ensureCsrfToken();

  return NextResponse.json({
    ok: true,
    csrfToken,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
