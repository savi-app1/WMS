import type { Metadata } from 'next';
import Link from 'next/link';
import { OrderTracker } from '@/components/order-tracker';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Suivre ma commande',
  description: 'Suivez l’état de votre commande WMS : confirmation, préparation, livraison et remise du colis.',
  alternates: { canonical: '/suivi' },
};

export default function SuiviPage() {
  return (
    <div className="container-wms max-w-2xl py-8 sm:py-12">
      <nav aria-label="Fil d'Ariane" className="text-sm text-brand-gray">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-red">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-brand-black">Suivi</li>
        </ol>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-black">Suivre ma commande</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-brand-gray">
        Saisissez votre numéro de commande et le téléphone utilisé lors de la commande.
      </p>

      <div className="card-wms mt-6 p-5">
        <OrderTracker orderNumber="" />
      </div>

      <p className="mt-4 text-sm text-brand-gray">
        Vous n&apos;avez pas votre numéro de commande ? Il vous a été communiqué à la validation et figure dans
        votre message de confirmation.
      </p>
    </div>
  );
}
