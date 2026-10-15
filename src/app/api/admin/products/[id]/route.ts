import { NextResponse } from 'next/server';
import { deleteProduct, getProductById, updateProduct } from '@/lib/products';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { productSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  const { id } = await context.params;
  const product = getProductById(Number(id));
  if (!product) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  const { id } = await context.params;
  const productId = Number(id);
  if (!getProductById(productId)) {
    return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  const product = updateProduct(productId, parsed.data);
  return NextResponse.json({ ok: true, product });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  const { id } = await context.params;
  const deleted = deleteProduct(Number(id));
  if (!deleted) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
