import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BRAND_CITY,
  BRAND_EMAIL,
  BRAND_NAME,
  CONTACT_PHONE_PRIMARY,
  CONTACT_PHONE_SECONDARY,
  WHATSAPP_NUMBER,
} from '@/lib/paths';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contactez ${BRAND_NAME} sur WhatsApp, par téléphone ou par e-mail. Boutique et services numériques à ${BRAND_CITY}.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Bonjour WMS, je souhaite vous contacter.',
  )}`;

  return (
    <div className="container-wms max-w-3xl py-8 sm:py-12">
      <nav aria-label="Fil d'Ariane" className="text-sm text-brand-gray">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-red">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-brand-black">Contact</li>
        </ol>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-black">Nous contacter</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-brand-gray">
        Le canal le plus rapide est WhatsApp : nous répondons généralement dans la journée. Vous pouvez aussi
        nous appeler ou nous écrire par e-mail.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="card-wms flex flex-col justify-between p-5 transition-colors hover:border-[#25D366]"
        >
          <span className="text-sm font-bold uppercase tracking-wide text-brand-gray">WhatsApp (recommandé)</span>
          <span className="mt-2 text-xl font-extrabold text-brand-black">{CONTACT_PHONE_PRIMARY}</span>
          <span className="mt-1 text-sm text-brand-gray">Envoyer un message prérempli</span>
        </a>

        <a href={`tel:${CONTACT_PHONE_PRIMARY.replace(/\s/g, '')}`} className="card-wms flex flex-col justify-between p-5 transition-colors hover:border-brand-red">
          <span className="text-sm font-bold uppercase tracking-wide text-brand-gray">Téléphone</span>
          <span className="mt-2 text-xl font-extrabold text-brand-black">{CONTACT_PHONE_PRIMARY}</span>
          <span className="mt-1 text-sm text-brand-gray">Second numéro : {CONTACT_PHONE_SECONDARY}</span>
        </a>

        <a href={`mailto:${BRAND_EMAIL}`} className="card-wms flex flex-col justify-between p-5 transition-colors hover:border-brand-red">
          <span className="text-sm font-bold uppercase tracking-wide text-brand-gray">E-mail</span>
          <span className="mt-2 text-xl font-extrabold text-brand-black">{BRAND_EMAIL}</span>
          <span className="mt-1 text-sm text-brand-gray">Réponse sous 48 h ouvrées</span>
        </a>

        <div className="card-wms flex flex-col justify-between p-5">
          <span className="text-sm font-bold uppercase tracking-wide text-brand-gray">Adresse</span>
          <span className="mt-2 text-xl font-extrabold text-brand-black">{BRAND_CITY}</span>
          <span className="mt-1 text-sm text-brand-gray">Burkina Faso</span>
        </div>
      </div>

      <section className="card-wms mt-8 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-brand-black">Questions fréquentes avant de commander</h2>
        <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-brand-gray">
          <li>
            <strong className="text-brand-black">Le prix affiché est-il définitif ?</strong> Oui s&apos;il est
            affiché en FCFA. Lorsqu&apos;une fiche indique « Prix à confirmer », WMS vous communique le
            tarif avant toute facturation.
          </li>
          <li>
            <strong className="text-brand-black">Comment payer ?</strong> À la livraison, en espèces ou par
            Mobile Money selon les modalités convenues lors de la confirmation.
          </li>
          <li>
            <strong className="text-brand-black">Combien de temps pour être livré ?</strong> WMS vous indique
            le délai au moment de la confirmation, selon la zone et la disponibilité du produit.
          </li>
          <li>
            <strong className="text-brand-black">Puis-je annuler ?</strong> Oui, tant que le colis n&apos;est
            pas remis. Contactez-nous sur WhatsApp avec votre numéro de commande.
          </li>
        </ul>
      </section>
    </div>
  );
}
