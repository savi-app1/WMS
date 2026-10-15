import { NextResponse } from 'next/server';
import { deleteResearchNote, updateResearchNote } from '@/lib/scripts';
import { requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { researchNoteSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = researchNoteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  const updated = updateResearchNote(Number(id), parsed.data);
  if (!updated) return NextResponse.json({ error: 'Note introuvable.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;
  const { id } = await context.params;
  const deleted = deleteResearchNote(Number(id));
  if (!deleted) return NextResponse.json({ error: 'Note introuvable.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
