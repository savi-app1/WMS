import type { Metadata } from 'next';
import Link from 'next/link';
import { CartView } from '@/components/cart-view';
import { listDeliveryZones } from '@/lib/delivery';
import { WHATSAPP_NUMBER } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ma commande',
  description: 'Finalisez votre commande WMS : renseignez vos coordonnées et votre adresse de livraison.',
  robots: { index: false, follow: false },
};

export default function CommandePage() {
  const zones = listDeliveryZones();
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Bonjour WMS, je souhaite passer une commande depuis le site.',
  )}`;

  return (
    <div className="container-wms py-8 sm:py-10">
      <nav aria-label="Fil d'Ariane" className="text-sm text-brand-gray">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-red">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-brand-black">Commande</li>
        </ol>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-black">Finaliser la commande</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-brand-gray">
        Aucun paiement n&apos;est demandé sur ce site : vous réglez à la livraison, après avoir vérifié votre
        commande avec WMS.
      </p>

      <div className="mt-6">
        <CartView
          zones={zones.map((zone) => ({ id: zone.id, name: zone.name, feeFcfa: zone.fee_fcfa }))}
          whatsappHref={whatsappHref}
        />
      </div>
    </div>
  );
}
