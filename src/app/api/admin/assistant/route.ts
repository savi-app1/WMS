import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { buildProductDraft, buildResearchDraft, detectProvider } from '@/lib/assistant';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  action: z.enum(['product_draft', 'research_plan', 'provider_status']),
  productId: z.number().int().positive().optional(),
  query: z.string().trim().max(300).optional(),
});

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  const provider = detectProvider();
  return NextResponse.json({
    localMode: true,
    provider: provider.provider,
    providerConfigured: provider.configured,
    note: provider.configured
      ? 'Un connecteur IA est configuré, mais les appels externes sont désactivés par défaut dans cette version.'
      : 'Aucun connecteur IA n’est configuré : seules les fonctions locales (brouillons à partir des données du catalogue) sont actives.',
  });
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

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
  }

  if (parsed.data.action === 'provider_status') {
    const provider = detectProvider();
    return NextResponse.json({
      provider: provider.provider,
      configured: provider.configured,
      localMode: true,
    });
  }

  if (parsed.data.action === 'product_draft') {
    if (!parsed.data.productId) {
      return NextResponse.json({ error: 'Produit manquant.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, draft: buildProductDraft(parsed.data.productId) });
  }

  if (!parsed.data.query) {
    return NextResponse.json({ error: 'Sujet de recherche manquant.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, draft: buildResearchDraft(parsed.data.query) });
}
