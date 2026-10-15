import Link from 'next/link';
import { listOrders } from '@/lib/orders';
import {
  dailySeries,
  monthlySeries,
  newOrderCount,
  staleOrders,
  statusBreakdown,
  topProducts,
} from '@/lib/stats';
import { listLowStockProducts } from '@/lib/products';
import { formatFcfa, formatRelative } from '@/lib/format';
import { STATUS_COLORS, STATUS_LABELS, isOrderStatus } from '@/lib/order-status';
import { OrderStatusButtons } from '@/components/admin/order-status-buttons';
import { StatCard } from '@/components/admin/stat-card';
import { MiniBarChart } from '@/components/admin/charts';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const recent = listOrders({ limit: 8 });
  const pending = newOrderCount();
  const breakdown = statusBreakdown();
  const stale = staleOrders(24);
  const lowStock = listLowStockProducts(3);
  const monthly = monthlySeries(6);
  const daily = dailySeries(new Date(Date.now() - 29 * 86400000).toISOString(), new Date().toISOString());
  const top = topProducts(5);

  const monthKey = new Date().toISOString().slice(0, 7);
  const currentMonth = monthly.find((point) => point.month === monthKey);
  const collected = currentMonth?.collected ?? 0;
  const monthValue = currentMonth?.value ?? 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Tableau de bord</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Commandes reçues, statuts à traiter et activité du mois en cours.
        </p>
      </header>

      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="À traiter" value={pending} hint="nouvelles + à confirmer" tone="red" href="/admin/commandes?statut=a_confirmer" />
        <StatCard label="Confirmées" value={breakdown.confirmee ?? 0} hint="toutes périodes" tone="blue" href="/admin/commandes?statut=confirmee" />
        <StatCard label="En préparation" value={breakdown.en_preparation ?? 0} hint="colis en cours" tone="violet" href="/admin/commandes?statut=en_preparation" />
        <StatCard label="En livraison" value={breakdown.en_livraison ?? 0} hint="en cours de route" tone="cyan" href="/admin/commandes?statut=en_livraison" />
        <StatCard label="Livrées" value={breakdown.livree ?? 0} hint="toutes périodes" tone="green" href="/admin/commandes?statut=livree" />
        <StatCard label="Annulées" value={breakdown.annulee ?? 0} hint="toutes périodes" tone="gray" href="/admin/commandes?statut=annulee" />
      </div>

      {/* Alertes */}
      {(stale.length > 0 || lowStock.length > 0) && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {stale.length > 0 && (
            <div className="card-wms border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                {stale.length} commande{stale.length > 1 ? 's' : ''} sans traitement depuis plus de 24 h
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-900">
                {stale.slice(0, 3).map((order) => (
                  <li key={order.order_number}>
                    <Link href={`/admin/commandes/${order.order_number}`} className="font-semibold underline">
                      {order.order_number}
                    </Link>{' '}
                    — {order.customer_name} ({formatRelative(order.created_at)})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="card-wms border-red-300 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-900">Stock faible sur {lowStock.length} produit(s)</p>
              <ul className="mt-2 space-y-1 text-xs text-red-900">
                {lowStock.slice(0, 4).map((product) => (
                  <li key={product.id}>
                    <Link href="/admin/produits" className="font-semibold underline">
                      {product.name}
                    </Link>{' '}
                    — {product.stock} restant(s)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activité 30 jours */}
        <section className="card-wms p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-brand-black">Commandes (30 derniers jours)</h2>
            <Link href="/admin/statistiques" className="text-xs font-bold text-brand-red">
              Statistiques →
            </Link>
          </div>
          <div className="mt-4">
            <MiniBarChart data={daily.map((point) => ({ label: point.day.slice(5), value: point.total }))} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-brand-line pt-3 text-center">
            <div>
              <p className="text-lg font-extrabold text-brand-black">{currentMonth?.total ?? 0}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray">Commandes ce mois</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-brand-black">{monthValue ? formatFcfa(monthValue) : '—'}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray">Valeur du mois</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-brand-black">{collected ? formatFcfa(collected) : '—'}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray">Encaissé (mois)</p>
            </div>
          </div>
        </section>

        {/* Top produits */}
        <section className="card-wms p-4">
          <h2 className="text-base font-extrabold text-brand-black">Produits les plus commandés</h2>
          {top.length === 0 ? (
            <p className="mt-3 text-sm text-brand-gray">Aucune commande enregistrée pour le moment.</p>
          ) : (
            <ol className="mt-3 space-y-2.5">
              {top.map((product, index) => (
                <li key={`${product.slug}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand-gray">
                      {index + 1}
                    </span>
                    <span className="truncate font-semibold text-brand-black">{product.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-brand-gray">× {product.quantity}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Dernières commandes */}
      <section className="card-wms p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-brand-black">Dernières commandes</h2>
          <Link href="/admin/commandes" className="text-xs font-bold text-brand-red">
            Tout voir →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-brand-line p-6 text-center text-sm text-brand-gray">
            Aucune commande reçue pour le moment. Les commandes du site apparaîtront ici automatiquement.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-line">
            {recent.map((order) => {
              const status = isOrderStatus(order.status) ? order.status : 'nouvelle';
              return (
                <li key={order.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/admin/commandes/${order.order_number}`}
                      className="font-mono text-sm font-bold text-brand-black hover:text-brand-red"
                    >
                      {order.order_number}
                    </Link>
                    <span className={`badge-wms ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
                  </div>
                  <p className="mt-1 text-sm text-brand-gray">
                    {order.customer_name} · {order.phone} · {formatRelative(order.created_at)}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-brand-black">
                    {order.total_fcfa === null ? 'Montant à confirmer' : formatFcfa(order.total_fcfa)}
                    {order.price_pending === 1 && (
                      <span className="ml-2 text-xs font-semibold text-amber-700">prix à confirmer</span>
                    )}
                  </p>
                  <div className="mt-2">
                    <OrderStatusButtons orderId={order.id} currentStatus={order.status} compact />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
