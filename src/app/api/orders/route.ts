import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders';
import { orderSchema, firstErrorMessage } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp, hashIp } from '@/lib/auth';
import { trackEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/**
 * Création d'une commande (espace public).
 *
 * Sécurité :
 *  - validation stricte côté serveur (zod) ;
 *  - limitation de débit par IP (5 commandes / heure) ;
 *  - champ honeypot anti-bot ;
 *  - les prix sont recalculés côté serveur (jamais acceptés du client).
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  // Piège à robots : le champ est masqué en CSS et doit rester vide.
  if (parsed.data.website) {
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 400 });
  }

  const ipHash = hashIp(await getClientIp());
  const limit = checkRateLimit(`order:${ipHash}`, 5, 3600);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Trop de commandes envoyées depuis cet appareil. Réessayez dans une heure ou contactez-nous sur WhatsApp.' },
      { status: 429 },
    );
  }

  try {
    const { order, pricePending, publicToken } = createOrder({
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      city: parsed.data.city,
      address: parsed.data.address,
      deliveryZone: parsed.data.deliveryZone,
      deliveryFeeFcfa: parsed.data.deliveryFeeFcfa,
      items: parsed.data.items,
      note: parsed.data.note,
      paymentMethod: parsed.data.paymentMethod,
      utm: parsed.data.utm,
    });

    trackEvent({
      type: 'order_created',
      path: '/api/orders',
      orderId: order.id,
      productId: order.items_list[0]?.productId,
      utm: parsed.data.utm,
    });

    return NextResponse.json(
      {
        ok: true,
        orderNumber: order.order_number,
        publicToken,
        status: order.status,
        pricePending,
        totalFcfa: order.total_fcfa,
        deliveryFeeFcfa: order.delivery_fee_fcfa,
        subtotalFcfa: order.subtotal_fcfa,
        message: pricePending
          ? 'Commande enregistrée. Un prix reste à confirmer par WMS.'
          : 'Commande enregistrée. WMS va la vérifier et la confirmer.',
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l’enregistrement de la commande.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
