import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderByNumber, listOrderEvents } from '@/lib/orders';
import { formatDate, formatFcfa, formatPhone, formatRelative } from '@/lib/format';
import { STATUS_COLORS, STATUS_LABELS, isOrderStatus } from '@/lib/order-status';
import { OrderStatusButtons } from '@/components/admin/order-status-buttons';
import { OrderAdminFields } from '@/components/admin/order-admin-fields';
import { WHATSAPP_NUMBER } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = getOrderByNumber(decodeURIComponent(orderNumber).toUpperCase());
  if (!order) notFound();

  const events = listOrderEvents(order.id);
  const status = isOrderStatus(order.status) ? order.status : 'nouvelle';

  const clientMessage = encodeURIComponent(
    `Bonjour ${order.customer_name}, suite à votre commande ${order.order_number} chez Wendmanegda Multiples Services. ${
      order.status === 'livree' ? 'Votre colis a été remis. Merci de votre confiance !' : 'Pouvons-nous confirmer les détails de votre commande ?'
    }`,
  );

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/commandes" className="text-xs font-bold text-brand-gray hover:text-brand-red">
          ← Retour aux commandes
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-extrabold text-brand-black">{order.order_number}</h1>
          <span className={`badge-wms ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
          {order.is_test === 1 && (
            <span className="badge-wms border-brand-line bg-brand-light text-brand-gray">commande de test</span>
          )}
        </div>
        <p className="mt-1 text-xs text-brand-gray">Reçue le {formatDate(order.created_at)}</p>
      </div>

      {/* Actions rapides */}
      <section className="card-wms p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-brand-gray">Changer le statut</h2>
        <p className="mt-1 text-xs text-brand-gray">
          Aucune commande n&apos;est confirmée ni livrée automatiquement : chaque changement est une action
          manuelle, historisée.
        </p>
        <div className="mt-3">
          <OrderStatusButtons orderId={order.id} currentStatus={order.status} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Client */}
        <section className="card-wms p-4">
          <h2 className="text-base font-extrabold text-brand-black">Client</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-brand-gray">Nom</dt>
              <dd className="text-right font-semibold text-brand-black">{order.customer_name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-brand-gray">Téléphone</dt>
              <dd className="text-right font-semibold text-brand-black">{formatPhone(order.phone)}</dd>
            </div>
            {order.email && (
              <div className="flex justify-between gap-3">
                <dt className="text-brand-gray">E-mail</dt>
                <dd className="text-right font-semibold text-brand-black">{order.email}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-brand-gray">Ville</dt>
              <dd className="text-right font-semibold text-brand-black">{order.city ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-brand-gray">Adresse</dt>
              <dd className="text-right font-semibold text-brand-black">{order.address ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-brand-gray">Zone</dt>
              <dd className="text-right font-semibold text-brand-black">{order.delivery_zone ?? 'À définir'}</dd>
            </div>
            {order.tracking_code && (
              <div className="flex justify-between gap-3">
                <dt className="text-brand-gray">Code de suivi</dt>
                <dd className="text-right font-mono font-semibold text-brand-black">{order.tracking_code}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={`https://wa.me/${order.phone.replace(/\D/g, '')}?text=${clientMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary !bg-[#25D366] flex-1 !min-h-[42px] !py-2 text-sm"
            >
              Écrire au client sur WhatsApp
            </a>
            <a
              href={`tel:${order.phone.replace(/\s/g, '')}`}
              className="btn-outline flex-1 !min-h-[42px] !py-2 text-sm"
            >
              Appeler
            </a>
          </div>

          {order.note && (
            <div className="mt-4 rounded-lg bg-brand-light p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-gray">Note du client</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-brand-ink">{order.note}</p>
            </div>
          )}
        </section>

        {/* Contenu de la commande */}
        <section className="card-wms p-4">
          <h2 className="text-base font-extrabold text-brand-black">Contenu de la commande</h2>
          <ul className="mt-3 divide-y divide-brand-line">
            {order.items_list.map((item, index) => (
              <li key={`${item.productId}-${index}`} className="flex justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <Link href={`/boutique/${item.slug}`} className="font-semibold text-brand-black hover:text-brand-red">
                    {item.name}
                  </Link>
                  <span className="text-brand-gray"> × {item.quantity}</span>
                </span>
                <span className="shrink-0 font-semibold text-brand-black">
                  {item.lineTotalFcfa === null ? 'Prix à confirmer' : formatFcfa(item.lineTotalFcfa)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1.5 border-t border-brand-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-brand-gray">Sous-total</dt>
              <dd className="font-semibold text-brand-black">
                {order.subtotal_fcfa === null ? 'À confirmer' : formatFcfa(order.subtotal_fcfa)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-gray">Frais de livraison</dt>
              <dd className="font-semibold text-brand-black">
                {order.delivery_fee_fcfa === null || order.delivery_fee_fcfa === undefined
                  ? 'À confirmer'
                  : order.delivery_fee_fcfa === 0
                    ? 'Offerts'
                    : formatFcfa(order.delivery_fee_fcfa)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-brand-line pt-2 text-base">
              <dt className="font-bold text-brand-black">Total</dt>
              <dd className="font-extrabold text-brand-red">
                {order.total_fcfa === null ? 'À confirmer' : formatFcfa(order.total_fcfa)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-gray">Encaissé</dt>
              <dd className="font-semibold text-brand-black">
                {order.amount_paid_fcfa === null || order.amount_paid_fcfa === undefined
                  ? 'Non renseigné'
                  : formatFcfa(order.amount_paid_fcfa)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-brand-gray">
            Moyen de paiement demandé : {order.payment_method.replace(/_/g, ' ')}
          </p>
        </section>
      </div>

      {/* Champs administrateur */}
      <OrderAdminFields
        orderId={order.id}
        initialNote={order.admin_note ?? ''}
        initialAmountPaid={order.amount_paid_fcfa}
        initialTrackingCode={order.tracking_code ?? ''}
      />

      {/* Historique */}
      <section className="card-wms p-4">
        <h2 className="text-base font-extrabold text-brand-black">Historique</h2>
        <ol className="mt-3 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-red" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-black">
                  {event.from_status ? `${STATUS_LABELS[event.from_status as never] ?? event.from_status} → ` : ''}
                  {STATUS_LABELS[event.to_status as never] ?? event.to_status}
                </p>
                <p className="text-xs text-brand-gray">
                  {formatRelative(event.created_at)} · {formatDate(event.created_at)} · par {event.actor}
                </p>
                {event.note && <p className="mt-0.5 text-xs text-brand-ink">{event.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="pb-4 text-xs text-brand-gray">
        Besoin de joindre WMS sur WhatsApp ({WHATSAPP_NUMBER}) pour tout autre sujet.
      </p>
    </div>
  );
}
