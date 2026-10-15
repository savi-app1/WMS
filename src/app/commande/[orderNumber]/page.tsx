import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrderByNumber, hashPublicToken } from '@/lib/orders';
import { formatFcfa, formatDate } from '@/lib/format';
import { STATUS_COLORS, STATUS_LABELS, isOrderStatus } from '@/lib/order-status';
import { OrderTracker } from '@/components/order-tracker';
import { BRAND_NAME, CONTACT_PHONE_PRIMARY, WHATSAPP_NUMBER } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Commande enregistrée',
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { orderNumber } = await params;
  const { token } = await searchParams;

  const order = getOrderByNumber(decodeURIComponent(orderNumber).toUpperCase());
  if (!order) notFound();

  const authorized = Boolean(token) && order.public_token === hashPublicToken(token as string);
  const status = isOrderStatus(order.status) ? order.status : 'nouvelle';

  return (
    <div className="container-wms max-w-3xl py-8 sm:py-12">
      <div className="card-wms p-5 sm:p-8">
        <span className="badge-wms border-emerald-200 bg-emerald-50 text-emerald-800">Commande enregistrée</span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-black sm:text-3xl">
          Merci, votre commande est bien enregistrée
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-brand-gray">
          WMS vérifie maintenant la disponibilité et le prix final, puis vous recontacte par téléphone ou
          WhatsApp pour la confirmer. <strong className="text-brand-black">Aucune commande n&apos;est
          confirmée automatiquement.</strong>
        </p>

        <div className="mt-5 rounded-xl border border-brand-line bg-brand-light p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-gray">Numéro de commande</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-brand-red">
            {order.order_number}
          </p>
          <p className="mt-1 text-xs text-brand-gray">
            Conservez ce numéro : il vous permet de suivre votre commande à tout moment.
          </p>
        </div>

        {authorized ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-brand-black">Récapitulatif</h2>
              <span className={`badge-wms ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
            </div>

            <ul className="divide-y divide-brand-line rounded-xl border border-brand-line">
              {order.items_list.map((item, index) => (
                <li key={`${item.productId}-${index}`} className="flex justify-between gap-3 p-3 text-sm">
                  <span className="font-semibold text-brand-black">
                    {item.name} <span className="text-brand-gray">× {item.quantity}</span>
                  </span>
                  <span className="font-semibold text-brand-black">
                    {item.lineTotalFcfa === null ? 'À confirmer' : formatFcfa(item.lineTotalFcfa)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 text-sm">
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
                <dt className="font-bold text-brand-black">Total estimé</dt>
                <dd className="font-extrabold text-brand-red">
                  {order.total_fcfa === null ? 'À confirmer par WMS' : formatFcfa(order.total_fcfa)}
                </dd>
              </div>
            </dl>

            <p className="text-sm text-brand-gray">Reçue le {formatDate(order.created_at)}.</p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  `Bonjour WMS, je souhaite compléter ma commande ${order.order_number}.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !bg-[#25D366] flex-1"
              >
                Compléter sur WhatsApp
              </a>
              <Link href="/boutique" className="btn-outline flex-1">
                Retourner à la boutique
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-brand-gray">
              Pour consulter le détail de cette commande, confirmez votre numéro de téléphone.
            </p>
            <OrderTracker orderNumber={order.order_number} token={token ?? null} />
          </div>
        )}

        <p className="mt-6 border-t border-brand-line pt-4 text-xs leading-relaxed text-brand-gray">
          {BRAND_NAME} — {CONTACT_PHONE_PRIMARY}. Les informations transmises servent uniquement au traitement
          et à la livraison de votre commande.
        </p>
      </div>
    </div>
  );
}
