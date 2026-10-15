import { NextResponse } from 'next/server';
import { deleteScript, getScript, updateScript } from '@/lib/scripts';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { scriptSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;
  const { id } = await context.params;
  const script = getScript(Number(id));
  if (!script) return NextResponse.json({ error: 'Script introuvable.' }, { status: 404 });
  return NextResponse.json({ script });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  const { id } = await context.params;
  const scriptId = Number(id);
  if (!getScript(scriptId)) {
    return NextResponse.json({ error: 'Script introuvable.' }, { status: 404 });
  }

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

  updateScript(scriptId, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;
  const { id } = await context.params;
  const deleted = deleteScript(Number(id));
  if (!deleted) return NextResponse.json({ error: 'Script introuvable.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
