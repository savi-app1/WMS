import { NextResponse } from 'next/server';
import { createDeliveryZone, listDeliveryZones } from '@/lib/delivery';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { deliveryZoneSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;
  return NextResponse.json({ zones: listDeliveryZones(true) });
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

  const parsed = deliveryZoneSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    const id = createDeliveryZone({
      name: parsed.data.name,
      feeFcfa: parsed.data.feeFcfa ?? null,
      active: parsed.data.active,
      note: parsed.data.note,
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Zone invalide.' },
      { status: 400 },
    );
  }
}
