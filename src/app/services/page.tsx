import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_CITY, BRAND_NAME, CONTACT_PHONE_PRIMARY, WHATSAPP_NUMBER } from '@/lib/paths';

export const metadata: Metadata = {
  title: 'Services WMS — créations graphiques, e-commerce, contenus, formations',
  description:
    'Wendmanegda Multiples Services propose des créations graphiques, l’accompagnement e-commerce, des contenus publicitaires et les formations WMS Academy.',
  alternates: { canonical: '/services' },
};

const SERVICES = [
  {
    id: 'graphique',
    title: 'Créations graphiques',
    tagline: 'Logo, affiches, flyers, visuels',
    items: [
      'Création et refonte de logo (identité visuelle).',
      'Affiches et flyers pour événements, promotions et campagnes.',
      'Visuels pour les réseaux sociaux et supports imprimés.',
      'Bannières et visuels de catalogue produits.',
    ],
  },
  {
    id: 'ecommerce',
    title: 'Accompagnement e-commerce',
    tagline: 'De la boutique à la livraison',
    items: [
      'Mise en place de boutique en ligne et fiches produits.',
      'Gestion de pages (Facebook, Instagram) et calendrier de publication.',
      'Préparation des campagnes publicitaires et suivi des performances.',
      'Organisation du suivi des commandes et de la livraison.',
    ],
  },
  {
    id: 'contenus',
    title: 'Contenus publicitaires',
    tagline: 'Scripts, voix off, textes de publication',
    items: [
      'Scripts vidéo et voix off pour promotions et lancements.',
      'Textes de publication et accroches pour campagnes.',
      'Dialogues et réponses pour conversations commerciales.',
      'FAQ et argumentaires produits à utiliser par l’équipe.',
    ],
  },
  {
    id: 'academy',
    title: 'Formations WMS Academy',
    tagline: 'Formations en ligne et e-learning',
    items: [
      'Formations en ligne sur le numérique, le marketing et le commerce.',
      'Modules e-learning accessibles à partir d’un téléphone.',
      'Séances pratiques et ressources téléchargeables (PDF, audio).',
      'Parcours de formation et catalogue « Formations et services digitaux » de la boutique.',
    ],
  },
];

export default function ServicesPage() {
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Bonjour WMS, je souhaite des informations sur vos services.',
  )}`;

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
          <li className="font-semibold text-brand-black">Services</li>
        </ol>
      </nav>

      <header className="mt-3 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">
          Les services de {BRAND_NAME}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-brand-gray sm:text-base">
          Au-delà de la vente de produits, WMS accompagne les entreprises, les commerçants et les
          particuliers : identité visuelle, e-commerce, contenus publicitaires et formation. Chaque prestation
          est chiffrée après échange, selon le volume et la complexité du projet.
        </p>
      </header>

      <div className="mt-10 space-y-8">
        {SERVICES.map((service) => (
          <section key={service.id} id={service.id} className="card-wms scroll-mt-24 p-5 sm:p-7">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="text-2xl font-extrabold tracking-tight text-brand-black">{service.title}</h2>
              <p className="text-sm font-semibold text-brand-red">{service.tagline}</p>
            </div>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {service.items.map((item) => (
                <li key={item} className="flex gap-2 text-[15px] leading-relaxed text-brand-gray">
                  <span className="mt-0.5 font-bold text-brand-red">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Demander un devis sur WhatsApp
              </a>
              <Link href="/boutique?categorie=formations-et-services-digitaux" className="btn-outline">
                Voir les offres en boutique
              </Link>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-2xl bg-brand-black p-6 sm:p-10">
        <h2 className="text-2xl font-extrabold text-white">Un projet, une question ?</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-neutral-300">
          Décrivez votre besoin : WMS vous répond sur WhatsApp, vous propose un périmètre et un tarif, puis
          vous livre. Nous sommes à {BRAND_CITY}.
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-5 !bg-[#25D366] hover:!bg-[#1eb457]"
        >
          {CONTACT_PHONE_PRIMARY}
        </a>
      </section>
    </div>
  );
}
