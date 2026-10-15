import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_CITY, BRAND_NAME, CONTACT_PHONE_PRIMARY } from '@/lib/paths';

export const metadata: Metadata = {
  title: 'Conditions de vente',
  description: `Conditions générales de vente de ${BRAND_NAME} : commande, prix, livraison, paiement, annulation et réclamation.`,
  alternates: { canonical: '/conditions' },
};

export default function ConditionsPage() {
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
          <li className="font-semibold text-brand-black">Conditions de vente</li>
        </ol>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-black">Conditions de vente</h1>
      <p className="mt-2 text-sm text-brand-gray">
        Dernière mise à jour : {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}
      </p>

      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-brand-gray">
        <section>
          <h2 className="text-lg font-extrabold text-brand-black">1. Vendeur</h2>
          <p className="mt-1">
            {BRAND_NAME}, boutique en ligne et services numériques situés à {BRAND_CITY}, Burkina Faso.
            Contact WhatsApp : {CONTACT_PHONE_PRIMARY}.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">2. Produits et prix</h2>
          <p className="mt-1">
            Les produits proposés sur ce site sont décrits dans leur fiche : nom, description et
            caractéristiques disponibles. Les prix sont indiqués en francs CFA (FCFA) lorsque la fiche en
            affiche un. Lorsqu&apos;une fiche porte la mention « Prix à confirmer », le tarif est communiqué par
            WMS avant validation de la commande. Les images de produits sont ajoutées et mises à jour par
            WMS ; elles décrivent le produit disponible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">3. Commande</h2>
          <p className="mt-1">
            La commande est enregistrée par le site avec un numéro unique. Cet enregistrement ne vaut pas
            confirmation : WMS vérifie la disponibilité du produit, le stock et le montant, puis confirme la
            commande par téléphone ou WhatsApp. Le contrat est conclu au moment de cette confirmation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">4. Paiement</h2>
          <p className="mt-1">
            La commande est livrée avec paiement à la livraison. Le Mobile Money peut être utilisé lorsque le
            service est activé par WMS : les modalités exactes vous sont communiquées lors de la confirmation.
            Aucun paiement n&apos;est enregistré sur ce site, et aucun moyen de paiement n&apos;est débité depuis
            la page de commande.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">5. Livraison</h2>
          <p className="mt-1">
            Les livraisons sont assurées à {BRAND_CITY} et dans les environs. Le délai et les frais de
            livraison dependent de la zone : ils vous sont indiqués lors de la confirmation. Lorsque le tarif
            d&apos;une zone n&apos;est pas encore défini, il vous est communiqué avant facturation. Le transfert
            des risques s&apos;effectue à la remise physique du colis.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">6. Annulation et réclamation</h2>
          <p className="mt-1">
            Vous pouvez annuler votre commande à tout moment avant la remise du colis, en contactant WMS avec
            votre numéro de commande. Une réclamation relative à un produit non conforme ou manquant est à
            formuler dans les meilleurs délais après la livraison, par WhatsApp ou par téléphone.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">7. Données personnelles</h2>
          <p className="mt-1">
            Les informations transmises (nom, téléphone, adresse) servent uniquement au traitement et à la
            livraison de la commande, ainsi qu&apos;au contact lié à celle-ci. Voir la page{' '}
            <Link href="/confidentialite" className="font-semibold text-brand-red">
              confidentialité
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
