import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_NAME, CONTACT_PHONE_PRIMARY } from '@/lib/paths';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: `Politique de confidentialité de ${BRAND_NAME} : données collectées, finalités, durée de conservation, droits et contact.`,
  alternates: { canonical: '/confidentialite' },
};

export default function ConfidentialitePage() {
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
          <li className="font-semibold text-brand-black">Confidentialité</li>
        </ol>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-black">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-brand-gray">
        Dernière mise à jour : {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}
      </p>

      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-brand-gray">
        <section>
          <h2 className="text-lg font-extrabold text-brand-black">Responsable du traitement</h2>
          <p className="mt-1">
            {BRAND_NAME}. Contact : WhatsApp {CONTACT_PHONE_PRIMARY}.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">Données collectées</h2>
          <p className="mt-1">
            Ce site collecte uniquement les informations que vous saisissez dans le formulaire de commande :
            nom et prénom, numéro de téléphone, adresse de livraison, ville, note facultative, et
            éventuellement une adresse e-mail. Un identifiant technique anonyme est créé pour mesurer
            l&apos;audience du site (pages consultées) ; il n&apos;est pas utilisé pour vous identifier.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">Finalités</h2>
          <ul className="mt-1 list-disc space-y-1.5 pl-5">
            <li>Traitement, préparation et livraison de votre commande.</li>
            <li>Prise de contact au sujet de la commande (confirmation, disponibilité, livraison).</li>
            <li>Mesure d&apos;audience du site afin d&apos;améliorer le catalogue et les pages.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">Base légale et durée de conservation</h2>
          <p className="mt-1">
            Le traitement repose sur l&apos;exécution de la commande et sur l&apos;obligation légale de tenir une
            information commerciale. Les données de commande sont conservées le temps nécessaire au suivi de la
            vente et à la preuve de la transaction ; elles sont ensuite supprimées ou anonymisées. Les
            statistiques de consultation sont conservées 12 mois.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">Partage avec des tiers</h2>
          <p className="mt-1">
            Vos informations ne sont ni vendues ni louées. Elles peuvent être communiquées au livreur ou au
            transporteur, uniquement dans le cadre de la livraison. Aucun transfert hors du Burkina Faso
            n&apos;est réalisé par WMS dans le cadre de ce site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">Vos droits</h2>
          <p className="mt-1">
            Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en
            contactant WMS par WhatsApp ou par téléphone, en indiquant votre numéro de commande. Vous pouvez
            également désactiver les cookies de mesure d&apos;audience dans votre navigateur.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-brand-black">Sécurité</h2>
          <p className="mt-1">
            L&apos;espace d&apos;administration est protégé par mot de passe chiffré et sessions sécurisées. Les
            commandes ne sont pas publiées : elles ne sont consultables que par WMS et par vous, via votre
            numéro de commande.
          </p>
        </section>
      </div>
    </div>
  );
}
