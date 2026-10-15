import Link from 'next/link';
import { listOrders, countOrders } from '@/lib/orders';
import { formatFcfa, formatPhone, formatRelative } from '@/lib/format';
import { STATUS_COLORS, STATUS_LABELS, ORDER_STATUSES, isOrderStatus } from '@/lib/order-status';
import { OrderStatusButtons } from '@/components/admin/order-status-buttons';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { value: 'toutes', label: 'Toutes' },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = params.statut ?? 'toutes';
  const search = params.q?.trim() ?? '';

  const orders = listOrders({ status, search, limit: 200 });
  const total = countOrders({ status, search });

  const buildUrl = (nextStatus: string) => {
    const sp = new URLSearchParams();
    if (nextStatus !== 'toutes') sp.set('statut', nextStatus);
    if (search) sp.set('q', search);
    const qs = sp.toString();
    return qs ? `/admin/commandes?${qs}` : '/admin/commandes';
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Commandes</h1>
          <p className="mt-1 text-sm text-brand-gray">
            {total} commande{total > 1 ? 's' : ''} {status !== 'toutes' ? `en « ${STATUS_LABELS[status as never] ?? status} »` : ''}
          </p>
        </div>
        {/* Téléchargement de fichier : un lien brut est volontaire, <Link> ne
            gère pas l'attribut de téléchargement d'une route API. */}
        <a href="/api/admin/orders/export" download className="btn-outline !min-h-[40px] !py-2 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
          </svg>
          Export CSV
        </a>
      </header>

      {/* Filtres */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={buildUrl(filter.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              status === filter.value
                ? 'border-brand-red bg-brand-red text-white'
                : 'border-brand-line bg-white text-brand-ink hover:border-brand-red'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {/* Recherche */}
      <form method="get" action="/admin/commandes" className="flex gap-2">
        {status !== 'toutes' && <input type="hidden" name="statut" value={status} />}
        <input
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Rechercher un numéro, un nom, un téléphone…"
          className="input-wms !min-h-[42px]"
        />
        <button type="submit" className="btn-primary !min-h-[42px] !px-4">
          Ok
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="card-wms p-8 text-center text-brand-gray">
          Aucune commande ne correspond à ces critères.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {orders.map((order) => {
            const orderStatus = isOrderStatus(order.status) ? order.status : 'nouvelle';
            return (
              <li key={order.id} className="card-wms p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/commandes/${order.order_number}`}
                      className="font-mono text-sm font-extrabold text-brand-black hover:text-brand-red"
                    >
                      {order.order_number}
                    </Link>
                    <p className="mt-0.5 text-sm font-semibold text-brand-black">{order.customer_name}</p>
                    <p className="text-xs text-brand-gray">
                      {formatPhone(order.phone)} · {order.city ?? '—'} · {formatRelative(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge-wms ${STATUS_COLORS[orderStatus]}`}>{STATUS_LABELS[orderStatus]}</span>
                    <p className="mt-1 text-sm font-extrabold text-brand-black">
                      {order.total_fcfa === null ? 'À confirmer' : formatFcfa(order.total_fcfa)}
                    </p>
                    {order.price_pending === 1 && (
                      <p className="text-[10px] font-bold uppercase text-amber-700">prix à confirmer</p>
                    )}
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-xs text-brand-gray">
                  {order.items_list.map((item) => `${item.name} ×${item.quantity}`).join(' · ')}
                </p>

                <div className="mt-2.5">
                  <OrderStatusButtons orderId={order.id} currentStatus={order.status} compact />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
