import { NextResponse } from 'next/server';
import { changeOrderStatus, getOrderById } from '@/lib/orders';
import { requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { statusChangeSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  const { id } = await context.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: 'Identifiant de commande invalide.' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = statusChangeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  const result = changeOrderStatus(orderId, parsed.data.status, {
    note: parsed.data.note,
    amountPaidFcfa: parsed.data.amountPaidFcfa,
    trackingCode: parsed.data.trackingCode,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  const order = getOrderById(orderId);
  return NextResponse.json({
    ok: true,
    message: result.message,
    order: order
      ? {
          id: order.id,
          status: order.status,
          statusLabel: order.status_label,
          amountPaidFcfa: order.amount_paid_fcfa,
          trackingCode: order.tracking_code,
          updatedAt: order.updated_at,
        }
      : null,
  });
}
