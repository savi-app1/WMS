import { NextResponse } from 'next/server';
import { getOrderByNumber, hashPublicToken } from '@/lib/orders';
import { matchesPhoneTail } from '@/lib/format';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp, hashIp } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Suivi public d'une commande : le client doit connaître son numéro de
 * commande ET son numéro de téléphone (derniers chiffres acceptés) — aucune
 * donnée personnelle n'est renvoyée sans cette double vérification.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = (searchParams.get('number') || '').trim().toUpperCase();
  const phone = (searchParams.get('phone') || '').trim();
  const token = (searchParams.get('token') || '').trim();

  if (!orderNumber) {
    return NextResponse.json({ error: 'Numéro de commande manquant.' }, { status: 400 });
  }

  const ipHash = hashIp(await getClientIp());
  const limit = checkRateLimit(`track:${ipHash}`, 30, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Trop de recherches. Réessayez plus tard.' }, { status: 429 });
  }

  const order = getOrderByNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
  }

  let authorized = false;
  if (token) {
    authorized = order.public_token === hashPublicToken(token);
  }
  if (!authorized && phone) {
    authorized = matchesPhoneTail(phone, order.phone);
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Numéro de commande ou téléphone incorrect.' }, { status: 403 });
  }

  return NextResponse.json({
    orderNumber: order.order_number,
    status: order.status,
    statusLabel: order.status_label,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    deliveredAt: order.delivered_at,
    totalFcfa: order.total_fcfa,
    pricePending: order.price_pending === 1,
    items: order.items_list.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceFcfa: item.unitPriceFcfa,
    })),
  });
}
