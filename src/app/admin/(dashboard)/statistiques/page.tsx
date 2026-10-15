import {
  compareWithPreviousPeriod,
  dailySeries,
  monthlySeries,
  statusBreakdown,
  topProducts,
} from '@/lib/stats';
import { formatFcfa, formatMonth } from '@/lib/format';
import { STATUS_COLORS, STATUS_LABELS, ORDER_STATUSES, isOrderStatus } from '@/lib/order-status';
import { BarChart, DonutChart, LineChart } from '@/components/admin/charts';
import { StatCard } from '@/components/admin/stat-card';

export const dynamic = 'force-dynamic';

const STATUS_COLORS_HEX: Record<string, string> = {
  nouvelle: '#e30613',
  a_confirmer: '#f59e0b',
  confirmee: '#2563eb',
  en_preparation: '#7c3aed',
  en_livraison: '#0891b2',
  livree: '#059669',
  annulee: '#6b7280',
};

export default function AdminStatsPage() {
  const { current, previous } = compareWithPreviousPeriod(30);
  const monthly = monthlySeries(12);
  const daily = dailySeries(
    new Date(Date.now() - 29 * 86400000).toISOString(),
    new Date().toISOString(),
  );
  const breakdown = statusBreakdown();
  const top = topProducts(8);

  const delta = (now: number, before: number) => {
    if (before === 0) return now === 0 ? '—' : '+100 %';
    const change = Math.round(((now - before) / before) * 100);
    return `${change > 0 ? '+' : ''}${change} %`;
  };

  const donutData = ORDER_STATUSES.filter((status) => (breakdown[status] ?? 0) > 0).map((status) => ({
    label: STATUS_LABELS[status],
    value: breakdown[status] ?? 0,
    color: STATUS_COLORS_HEX[status],
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Statistiques</h1>
        <p className="mt-1 text-sm text-brand-gray">
          30 derniers jours comparés à la période précédente, et évolution sur 12 mois.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Commandes" value={current.total} hint={`${delta(current.total, previous.total)} vs période précédente`} tone="red" />
        <StatCard label="Confirmées" value={current.confirmed} hint={`${current.confirmationRate} % du total`} tone="blue" />
        <StatCard label="Livrées" value={current.delivered} hint={`${current.deliveryRate} % du total`} tone="green" />
        <StatCard label="Annulées" value={current.cancelled} hint={`${current.cancellationRate} % du total`} tone="gray" />
        <StatCard label="Valeur" value={current.orderValue ? formatFcfa(current.orderValue) : '—'} hint="commandes du période" tone="violet" />
        <StatCard label="Encaissé" value={current.collected ? formatFcfa(current.collected) : '—'} hint="montants réellement reçus" tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-wms p-4">
          <h2 className="text-base font-extrabold text-brand-black">Commandes par jour (30 j)</h2>
          <div className="mt-4">
            <BarChart data={daily.map((point) => ({ label: point.day, value: point.total }))} />
          </div>
        </section>

        <section className="card-wms p-4">
          <h2 className="text-base font-extrabold text-brand-black">Répartition des statuts</h2>
          <div className="mt-4">
            <DonutChart data={donutData} />
          </div>
        </section>
      </div>

      <section className="card-wms p-4">
        <h2 className="text-base font-extrabold text-brand-black">Évolution mensuelle (12 mois)</h2>
        <div className="mt-4">
          <LineChart
            data={monthly.map((point) => ({ label: formatMonth(point.month), value: point.total }))}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-brand-line text-left text-[11px] uppercase tracking-wide text-brand-gray">
                <th className="py-2 pr-3">Mois</th>
                <th className="py-2 pr-3 text-right">Commandes</th>
                <th className="py-2 pr-3 text-right">Confirmées</th>
                <th className="py-2 pr-3 text-right">Livrées</th>
                <th className="py-2 pr-3 text-right">Annulées</th>
                <th className="py-2 pr-3 text-right">Valeur</th>
                <th className="py-2 text-right">Encaissé</th>
              </tr>
            </thead>
            <tbody>
              {[...monthly].reverse().map((point) => (
                <tr key={point.month} className="border-b border-brand-line/60">
                  <td className="py-2 pr-3 font-semibold text-brand-black">{formatMonth(point.month)}</td>
                  <td className="py-2 pr-3 text-right">{point.total}</td>
                  <td className="py-2 pr-3 text-right">{point.confirmee}</td>
                  <td className="py-2 pr-3 text-right">{point.livree}</td>
                  <td className="py-2 pr-3 text-right">{point.annulee}</td>
                  <td className="py-2 pr-3 text-right font-semibold">
                    {point.value ? formatFcfa(point.value) : '—'}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {point.collected ? formatFcfa(point.collected) : '—'}
                  </td>
                </tr>
              ))}
              {monthly.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-brand-gray">
                    Aucune commande enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-wms p-4">
          <h2 className="text-base font-extrabold text-brand-black">Produits les plus commandés</h2>
          <div className="mt-4">
            <BarChart
              data={top.map((product) => ({ label: product.name, value: product.quantity }))}
              formatValue={(value) => `${value} vendu(s)`}
            />
          </div>
        </section>

        <section className="card-wms p-4">
          <h2 className="text-base font-extrabold text-brand-black">Taux sur la période</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { label: 'Taux de confirmation', value: current.confirmationRate, previous: previous.confirmationRate },
              { label: 'Taux de livraison', value: current.deliveryRate, previous: previous.deliveryRate },
              { label: "Taux d'annulation", value: current.cancellationRate, previous: previous.cancellationRate },
            ].map((item) => (
              <li key={item.label}>
                <div className="flex justify-between">
                  <span className="font-semibold text-brand-black">{item.label}</span>
                  <span className="font-bold text-brand-black">{item.value} %</span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-brand-light">
                  <div className="h-full rounded-full bg-brand-red" style={{ width: `${item.value}%` }} />
                </div>
                <p className="mt-1 text-xs text-brand-gray">
                  Période précédente : {item.previous} %
                </p>
              </li>
            ))}
            <li className="border-t border-brand-line pt-3 text-xs text-brand-gray">
              Panier moyen : {formatFcfa(current.averageBasket)} · {current.itemsSold} article(s) commandé(s) sur
              la période.
            </li>
          </ul>
        </section>
      </div>

      <section className="card-wms p-4">
        <h2 className="text-base font-extrabold text-brand-black">Rappel des statuts</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ORDER_STATUSES.filter((status) => isOrderStatus(status)).map((status) => (
            <li key={status} className="flex items-start gap-2 text-sm">
              <span className={`badge-wms shrink-0 ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
              <span className="text-brand-gray">
                {breakdown[status] ?? 0} commande(s) au total.
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
