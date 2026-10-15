import { NextResponse } from 'next/server';
import { listOrders, toCsv } from '@/lib/orders';
import { requireAdmin, isGuardError } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

/** Export CSV des commandes (administrateur uniquement). */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  const orders = listOrders({ status, search, limit: 500 });

  const rows = orders.map((order) => ({
    numero: order.order_number,
    date: order.created_at,
    statut: order.status_label,
    client: order.customer_name,
    telephone: order.phone,
    email: order.email ?? '',
    ville: order.city ?? '',
    adresse: order.address ?? '',
    zone_livraison: order.delivery_zone ?? '',
    articles: order.items_list.map((i) => `${i.name} x${i.quantity}`).join(' | '),
    quantite_totale: order.total_quantity,
    sous_total_fcfa: order.subtotal_fcfa ?? '',
    frais_livraison_fcfa: order.delivery_fee_fcfa ?? '',
    total_fcfa: order.total_fcfa ?? '',
    prix_a_confirmer: order.price_pending === 1 ? 'oui' : 'non',
    moyen_paiement: order.payment_method,
    montant_encaisse_fcfa: order.amount_paid_fcfa ?? '',
    code_suivi: order.tracking_code ?? '',
    note_client: order.note ?? '',
    note_interne: order.admin_note ?? '',
  }));

  const csv = toCsv(rows);
  const filename = `wms-commandes-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
