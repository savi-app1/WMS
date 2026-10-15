import { NextResponse } from 'next/server';
import { createScript, listScripts } from '@/lib/scripts';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { scriptSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;
  const { searchParams } = new URL(request.url);
  return NextResponse.json({ scripts: listScripts(searchParams.get('search') || undefined) });
}

export async function POST(request: Request) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = scriptSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  const id = createScript(parsed.data);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
