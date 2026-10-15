import { NextResponse } from 'next/server';
import { getOrderById, listOrderEvents, updateOrderNote } from '@/lib/orders';
import { setOrderAmountPaid } from '@/lib/orders';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { run, nowIso } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  note: z.string().max(1000).optional(),
  amountPaidFcfa: z.number().int().min(0).max(100_000_000).nullable().optional(),
  trackingCode: z.string().max(120).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  const { id } = await context.params;
  const orderId = Number(id);
  const order = Number.isInteger(orderId) ? getOrderById(orderId) : undefined;
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      ...order,
      items: order.items_list,
      total_quantity: order.total_quantity,
    },
    events: listOrderEvents(orderId),
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  const { id } = await context.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || !getOrderById(orderId)) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  if (parsed.data.note !== undefined) {
    updateOrderNote(orderId, parsed.data.note);
  }
  if (parsed.data.amountPaidFcfa !== undefined) {
    setOrderAmountPaid(orderId, parsed.data.amountPaidFcfa);
    run(
      `INSERT INTO order_events (order_id, from_status, to_status, action, note, actor, created_at)
       VALUES (?, (SELECT status FROM orders WHERE id = ?), (SELECT status FROM orders WHERE id = ?), 'encaissement', ?, 'admin', ?)`,
      [
        orderId,
        orderId,
        orderId,
        parsed.data.amountPaidFcfa === null
          ? 'Montant encaissé effacé'
          : `Montant encaissé : ${parsed.data.amountPaidFcfa} FCFA`,
        nowIso(),
      ],
    );
  }
  if (parsed.data.trackingCode !== undefined) {
    run('UPDATE orders SET tracking_code = ?, updated_at = ? WHERE id = ?', [
      parsed.data.trackingCode || null,
      nowIso(),
      orderId,
    ]);
  }

  const order = getOrderById(orderId);
  return NextResponse.json({ ok: true, order });
}
