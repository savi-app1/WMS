import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { listCategories, listProducts } from '@/lib/products';
import { ProductCard } from '@/components/product-card';
import { SectionHeading } from '@/components/section-heading';
import { BRAND_CITY, BRAND_NAME, BRAND_TAGLINE, CONTACT_PHONE_PRIMARY, WHATSAPP_NUMBER } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Boutique en ligne, e-commerce et formations à ${BRAND_CITY}`,
  description:
    'Smartphones, accessoires, électronique, produits numériques et formations WMS Academy à Ouagadougou. Commande en ligne, paiement à la livraison, livraison rapide dans la capitale.',
  alternates: { canonical: '/' },
};

const VALUE_PROPS = [
  {
    title: 'Livraison rapide',
    text: 'Livraison à Ouagadougou et dans les environs, avec suivi de votre commande.',
    icon: (
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    ),
  },
  {
    title: 'Commande sur WhatsApp',
    text: `Une question sur un produit ? Écrivez-nous au ${CONTACT_PHONE_PRIMARY}.`,
    icon: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.3-4.3c-.4-.6-.8-1.4-.8-2.2s.6-1.3.8-1.5c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.7 1.6c0 .2 0 .4-.1.5l-.3.4-.3.3c-.1.1-.2.3 0 .5.4.8 1 1.4 1.7 1.8.2.1.4.1.5-.1l.5-.6c.2-.2.3-.2.6-.1l1.5.7c.3.1.5.2.6.3.1.2.1.6-.1 1.2Z" />,
  },
  {
    title: 'Paiement à la livraison',
    text: 'Réglez à la réception de votre colis. Mobile Money accepté selon disponibilité.',
    icon: <path d="M2 6h20v12H2zM2 10h20M6 14h4" />,
  },
  {
    title: 'Qualité et service fiable',
    text: 'Des produits vérifiés, un interlocuteur unique du devis à la livraison.',
    icon: <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />,
  },
];

const STEPS = [
  { n: '01', title: 'Choisissez un produit', text: 'Parcourez le catalogue, filtrez par catégorie ou recherchez un article précis.' },
  { n: '02', title: 'Remplissez le formulaire', text: 'Nom, téléphone, quantité et adresse de livraison. Vérifiez le montant estimé.' },
  { n: '03', title: 'WMS vérifie la commande', text: 'Nous confirmons la disponibilité, le stock et le prix final, puis nous vous appelons.' },
  { n: '04', title: 'Livraison et paiement', text: 'Le colis est préparé, expédié, puis livré. Vous payez à la réception.' },
];

const SERVICES = [
  {
    id: 'graphique',
    title: 'Créations graphiques',
    text: 'Logos, affiches, flyers, visuels pour vos réseaux sociaux et supports de communication.',
    href: '/services#graphique',
  },
  {
    id: 'ecommerce',
    title: 'Accompagnement e-commerce',
    text: 'Mise en place de votre boutique, gestion de page, fiches produits et suivi des commandes.',
    href: '/services#ecommerce',
  },
  {
    id: 'contenus',
    title: 'Contenus publicitaires',
    text: 'Scripts vidéo, voix off, textes de publication et idées de campagnes prêtes à adapter.',
    href: '/services#contenus',
  },
  {
    id: 'academy',
    title: 'Formations WMS Academy',
    text: 'Formations en ligne et e-learning pour monter en compétences sur le numérique et le commerce.',
    href: '/services#academy',
  },
];

const FAQ = [
  {
    q: 'Comment passer une commande ?',
    a: 'Choisissez un produit dans la boutique, remplissez le formulaire de commande avec vos coordonnées et votre adresse. Vous recevez immédiatement un numéro de commande, puis WMS vérifie la disponibilité et vous recontacte par téléphone ou WhatsApp.',
  },
  {
    q: 'Quels moyens de paiement sont acceptés ?',
    a: 'La commande est livrée avec paiement à la livraison. Le Mobile Money (Orange Money, Moov Money, Telecel Money) peut être utilisé lorsque le service est activé par WMS : les modalités exactes vous sont communiquées lors de la confirmation.',
  },
  {
    q: 'Quels sont les délais de livraison ?',
    a: 'La livraison est rapide à Ouagadougou et dans les environs. Le délai précis et les frais de livraison sont confirmés par WMS lors de la validation de la commande, en fonction de votre zone.',
  },
  {
    q: 'Le prix affiché est-il toujours définitif ?',
    a: 'Les prix affichés dans le catalogue sont ceux enregistrés par WMS. Lorsqu\'une fiche indique « Prix à confirmer », WMS vous communique le tarif exact avant toute facturation. Aucun montant n\'est encaissé sans votre accord.',
  },
  {
    q: 'Puis-je suivre ma commande ?',
    a: 'Oui. La page « Suivre ma commande » vous permet de retrouver l\'état d\'une commande à partir de son numéro et de votre téléphone.',
  },
];

export default function HomePage() {
  const categories = listCategories();
  const featured = listProducts({ featured: true, limit: 8 });
  const produits = listProducts({ limit: 8 });
  const selection = featured.length > 0 ? featured : produits;
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Bonjour WMS, je souhaite passer une commande. Pouvez-vous m’aider ?',
  )}`;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-brand-line bg-gradient-to-b from-brand-light to-white">
        <div className="container-wms grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
          <div className="order-2 lg:order-1">
            <span className="badge-wms border-brand-red/20 bg-brand-red/10 text-brand-red">
              {BRAND_CITY}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-brand-black sm:text-4xl lg:text-5xl">
              Achat en ligne, <span className="text-brand-red">livraison locale</span> et services
              numériques par WMS
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-brand-gray sm:text-base">
              {BRAND_NAME} commercialise des smartphones, accessoires, produits électroniques, produits
              numériques et des formations. Vous commandez en ligne, nous vérifions et livrons.
            </p>
            <p className="mt-2 text-sm font-semibold italic text-brand-ink">{BRAND_TAGLINE}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/boutique" className="btn-primary">
                Voir la boutique
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !bg-[#25D366] hover:!bg-[#1eb457]"
              >
                Commander sur WhatsApp
              </a>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-brand-line pt-6">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-brand-gray">Contact</dt>
                <dd className="mt-1 text-sm font-bold text-brand-black">WhatsApp {CONTACT_PHONE_PRIMARY}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-brand-gray">Livraison</dt>
                <dd className="mt-1 text-sm font-bold text-brand-black">Ouaga & environs</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-brand-gray">Paiement</dt>
                <dd className="mt-1 text-sm font-bold text-brand-black">À la livraison</dd>
              </div>
            </dl>
          </div>

          <div className="order-1 lg:order-2">
            <div className="card-wms overflow-hidden shadow-sm">
              <Image
                src="/brand/wms-banniere.webp"
                alt={`Bannière officielle ${BRAND_NAME} : smartphones, accessoires, électronique, formations et services digitaux`}
                width={1029}
                height={382}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="container-wms py-10 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="card-wms p-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {prop.icon}
                </svg>
              </span>
              <h2 className="mt-3 text-[15px] font-bold text-brand-black">{prop.title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-brand-gray">{prop.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catégories */}
      {categories.length > 0 && (
        <section className="container-wms pb-12">
          <SectionHeading
            eyebrow="Catalogue"
            title="Nos catégories"
            description="Parcourez nos univers : highs-tech, audio, montres connectées, stockage, télévision, produits numériques et services."
            href="/boutique"
            linkLabel="Tout le catalogue"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/boutique?categorie=${category.slug}`}
                className="card-wms group flex min-h-[104px] flex-col justify-between p-3.5 transition-colors hover:border-brand-red"
              >
                <span className="text-[13px] font-bold leading-snug text-brand-black group-hover:text-brand-red">
                  {category.name}
                </span>
                <span className="mt-2 text-[11px] font-semibold text-brand-gray">
                  {category.product_count ?? 0} produit{(category.product_count ?? 0) > 1 ? 's' : ''}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Produits */}
      <section className="container-wms pb-12">
        <SectionHeading
          eyebrow="Sélection"
          title="Produits disponibles"
          description="Les fiches produit sont mises à jour par WMS : disponibilité, prix et characteristics sont vérifiés avant votre commande."
          href="/boutique"
          linkLabel="Voir tout le catalogue"
        />
        {selection.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {selection.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="card-wms p-8 text-center text-brand-gray">
            Le catalogue est en cours de mise en ligne. Écrivez-nous sur WhatsApp pour connaître nos
            disponibilités.
          </div>
        )}
      </section>

      {/* Services */}
      <section className="border-y border-brand-line bg-brand-light py-12">
        <div className="container-wms">
          <SectionHeading
            eyebrow="WMS au-delà de la boutique"
            title="Nos services numériques"
            description="WMS accompagne aussi les entreprises et les particuliers : identité visuelle, e-commerce, contenus publicitaires et formations."
            href="/services"
            linkLabel="Détail des services"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <Link key={service.id} href={service.href} className="card-wms bg-white p-5 transition-shadow hover:shadow-md">
                <h3 className="text-base font-bold text-brand-black">{service.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-brand-gray">{service.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-red">
                  En savoir plus
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Processus */}
      <section className="container-wms py-12">
        <SectionHeading eyebrow="Commande" title="Comment ça marche" />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.n} className="card-wms p-5">
              <span className="text-3xl font-extrabold text-brand-red/25">{step.n}</span>
              <h3 className="mt-1 text-base font-bold text-brand-black">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-brand-gray">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="border-t border-brand-line bg-brand-light py-12">
        <div className="container-wms max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Questions fréquentes" />
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card-wms bg-white p-4">
                <summary className="cursor-pointer text-[15px] font-bold text-brand-black">{item.q}</summary>
                <p className="mt-2 text-[14px] leading-relaxed text-brand-gray">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="container-wms py-12">
        <div className="card-wms overflow-hidden bg-brand-black p-6 sm:p-10">
          <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Une question ? Commandez sur WhatsApp</h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-300">
                WMS répond à vos questions sur la disponibilité, les prix et les délais de livraison. Votre
                message est envoyé depuis votre téléphone : c&apos;est vous qui l&apos;envoyez, rien n&apos;est
                déclenché automatiquement.
              </p>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !bg-[#25D366] !text-white hover:!bg-[#1eb457]"
            >
              {CONTACT_PHONE_PRIMARY}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
