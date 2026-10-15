import { NextResponse } from 'next/server';
import { listOrders, countOrders } from '@/lib/orders';
import { requireAdmin, isGuardError } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  const { searchParams } = new URL(request.url);
  const filters = {
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    limit: Number(searchParams.get('limit') || 100),
    offset: Number(searchParams.get('offset') || 0),
  };

  const orders = listOrders(filters);
  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      phone: order.phone,
      city: order.city,
      address: order.address,
      status: order.status,
      statusLabel: order.status_label,
      totalFcfa: order.total_fcfa,
      pricePending: order.price_pending === 1,
      amountPaidFcfa: order.amount_paid_fcfa,
      paymentMethod: order.payment_method,
      itemCount: order.total_quantity,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    })),
    total: countOrders(filters),
  });
}
