import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BRAND_CITY, BRAND_NAME, BRAND_SHORT, BRAND_TAGLINE, CONTACT_PHONE_PRIMARY, CONTACT_PHONE_SECONDARY } from '@/lib/paths';

export const metadata: Metadata = {
  title: 'À propos de WMS',
  description: `Wendmanegda Multiples Services (WMS) : boutique en ligne, e-commerce, créations graphiques et formations à ${BRAND_CITY}, Burkina Faso.`,
  alternates: { canonical: '/a-propos' },
};

export default function AboutPage() {
  return (
    <div className="container-wms py-8 sm:py-12">
      <nav aria-label="Fil d'Ariane" className="text-sm text-brand-gray">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-red">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-brand-black">À propos</li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
            {BRAND_NAME} ({BRAND_SHORT})
          </h1>
          <p className="mt-3 text-lg font-semibold italic text-brand-red">{BRAND_TAGLINE}</p>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-brand-gray">
            <p>
              Wendmanegda Multiples Services est une entreprise de {BRAND_CITY} qui associe un
              e-commerce de proximité et des services numériques. Nous vendons des smartphones, des
              accessoires, des produits électroniques, des produits numériques et des formations, tout en
              proposant aux entreprises et aux commerçants un accompagnement complet : identité visuelle,
              gestion de pages, contenus publicitaires, mise en ligne de boutique et formation.
            </p>
            <p>
              Notre fonctionnement est simple : vous commandez depuis le site ou sur WhatsApp, nous vérifions
              la disponibilité et le prix réel du produit, nous confirmons avec vous, puis nous préparons et
              livrons le colis. Vous payez à la réception.
            </p>
            <p>
              Nous ne Claimons pas disposer d&apos;un stock permanent dans chaque point de vente : la
              disponibilité de chaque article est vérifiée au moment de la confirmation de commande, et vous
              êtes informé si un article doit être commandé spécialement.
            </p>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="card-wms p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-brand-gray">WhatsApp</dt>
              <dd className="mt-1 font-bold text-brand-black">{CONTACT_PHONE_PRIMARY}</dd>
            </div>
            <div className="card-wms p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-brand-gray">Téléphone</dt>
              <dd className="mt-1 font-bold text-brand-black">{CONTACT_PHONE_SECONDARY}</dd>
            </div>
            <div className="card-wms p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-brand-gray">Ville</dt>
              <dd className="mt-1 font-bold text-brand-black">{BRAND_CITY}</dd>
            </div>
            <div className="card-wms p-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-brand-gray">Activités</dt>
              <dd className="mt-1 font-bold text-brand-black">E-WMS · WMS Academy · Marketing digital</dd>
            </div>
          </dl>
        </div>

        <div className="card-wms overflow-hidden">
          <Image
            src="/brand/wms-banniere.webp"
            alt={`Bannière officielle ${BRAND_NAME}`}
            width={1029}
            height={382}
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
