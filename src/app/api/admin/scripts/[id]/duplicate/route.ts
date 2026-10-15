import { NextResponse } from 'next/server';
import { duplicateScript } from '@/lib/scripts';
import { requireAdminMutation, isGuardError } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;
  const { id } = await context.params;
  const newId = duplicateScript(Number(id));
  if (!newId) return NextResponse.json({ error: 'Script introuvable.' }, { status: 404 });
  return NextResponse.json({ ok: true, id: newId }, { status: 201 });
}
