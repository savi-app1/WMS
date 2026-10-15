import { NextResponse } from 'next/server';
import { createCampaign, listCampaigns } from '@/lib/scripts';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { campaignSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;
  return NextResponse.json({ campaigns: listCampaigns() });
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

  const parsed = campaignSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  const id = createCampaign(parsed.data);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
