import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductBySlug, incrementProductViews, listProducts } from '@/lib/products';
import { listDeliveryZones } from '@/lib/delivery';
import { OrderForm } from '@/components/order-form';
import { ProductCard } from '@/components/product-card';
import { ShareButton } from '@/components/share-button';
import { formatFcfa } from '@/lib/format';
import { productWhatsappMessage } from '@/lib/whatsapp';
import { SITE_URL, WHATSAPP_NUMBER, BRAND_NAME } from '@/lib/paths';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    return { title: 'Produit introuvable' };
  }
  const description =
    product.short_description ||
    `${product.name} chez ${BRAND_NAME}. Commande en ligne, paiement à la livraison, livraison à Ouagadougou.`;
  const image = product.images_list[0] ?? '/brand/og-default.png';

  return {
    title: product.name,
    description,
    alternates: { canonical: `/boutique/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} — ${BRAND_NAME}`,
      description,
      url: `${SITE_URL}/boutique/${product.slug}`,
      images: [{ url: image, width: 800, height: 800, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — ${BRAND_NAME}`,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  incrementProductViews(product.id);

  const zones = listDeliveryZones();
  const related = listProducts({ category: product.category_slug ?? undefined, limit: 5 }).filter(
    (item) => item.id !== product.id,
  );

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    productWhatsappMessage({ name: product.name, slug: product.slug, price: product.price_fcfa }),
  )}`;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description ?? product.description ?? product.name,
    image: product.images_list.map((image) => `${SITE_URL}${image}`),
    brand: { '@type': 'Brand', name: BRAND_NAME },
    ...(product.price_fcfa !== null
      ? {
          offers: {
            '@type': 'Offer',
            price: product.price_fcfa,
            priceCurrency: 'XOF',
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/boutique/${product.slug}`,
            seller: { '@type': 'Organization', name: BRAND_NAME },
          },
        }
      : {}),
  };

  const maxQuantity =
    product.track_stock && product.stock !== null ? Math.max(1, Math.min(product.stock, 99)) : 99;

  return (
    <div className="container-wms py-6 sm:py-10">
      <nav aria-label="Fil d'Ariane" className="text-sm text-brand-gray">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-red">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/boutique" className="hover:text-brand-red">
              Boutique
            </Link>
          </li>
          {product.category_name && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/boutique?categorie=${product.category_slug}`} className="hover:text-brand-red">
                  {product.category_name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-brand-black">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Visuel */}
        <div>
          <div className="card-wms media-frame w-full">
            {product.images_list[0] ? (
              <Image
                src={product.images_list[0]}
                alt={product.name}
                width={800}
                height={800}
                priority
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-center">
                <span className="text-4xl font-extrabold text-brand-red">WMS</span>
                <p className="text-sm text-brand-gray">Visuel en cours d’ajout par WMS</p>
              </div>
            )}
          </div>

          {product.images_list.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images_list.slice(0, 4).map((image) => (
                <div key={image} className="card-wms media-frame">
                  <Image src={image} alt="" width={200} height={200} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {product.description && (
            <section className="mt-6">
              <h2 className="text-lg font-extrabold text-brand-black">Description</h2>
              <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-brand-gray">
                {product.description.split('\n').filter(Boolean).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}

          {product.specs_list.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-extrabold text-brand-black">Caractéristiques</h2>
              <dl className="mt-2 divide-y divide-brand-line rounded-xl border border-brand-line">
                {product.specs_list.map((spec) => (
                  <div key={spec.label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <dt className="font-semibold text-brand-gray">{spec.label}</dt>
                    <dd className="text-right font-medium text-brand-black">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-lg font-extrabold text-brand-black">Livraison &amp; paiement</h2>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-brand-gray">
              <li className="flex gap-2">
                <span className="mt-0.5 text-brand-red">•</span> Livraison à Ouagadougou et environs ; le délai
                exact est confirmé avec vous.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-brand-red">•</span> Frais de livraison selon la zone : ils sont
                affichés dans le formulaire, ou confirmés par WMS si le tarif n&apos;est pas encore défini.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-brand-red">•</span> Paiement à la livraison. Aucun montant n&apos;est
                prélevé sur ce site.
              </li>
            </ul>
          </section>
        </div>

        {/* Commande */}
        <div>
          <div className="lg:sticky lg:top-20">
            {product.category_name && (
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-red">{product.category_name}</p>
            )}
            <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight text-brand-black sm:text-3xl">
              {product.name}
            </h1>
            {product.short_description && (
              <p className="mt-2 text-[15px] leading-relaxed text-brand-gray">{product.short_description}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {product.price_fcfa !== null ? (
                <p className="text-3xl font-extrabold text-brand-black">{formatFcfa(product.price_fcfa)}</p>
              ) : (
                <p className="badge-wms border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800">
                  Prix à confirmer par WMS
                </p>
              )}
              {product.compare_price_fcfa && product.price_fcfa && product.compare_price_fcfa > product.price_fcfa && (
                <p className="text-base text-brand-gray line-through">{formatFcfa(product.compare_price_fcfa)}</p>
              )}
            </div>

            {product.track_stock && product.stock !== null && (
              <p className="mt-2 text-sm">
                {product.stock > 0 ? (
                  <span className="font-semibold text-emerald-700">En stock ({product.stock} disponibles)</span>
                ) : (
                  <span className="font-semibold text-red-700">Rupture de stock — contactez WMS</span>
                )}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !bg-[#25D366] hover:!bg-[#1eb457]"
              >
                Poser une question sur WhatsApp
              </a>
              <ShareButton url={`${SITE_URL}/boutique/${product.slug}`} title={product.name} />
            </div>

            <div className="card-wms mt-6 p-4 sm:p-5">
              <h2 className="text-lg font-extrabold text-brand-black">Commander maintenant</h2>
              <p className="mt-1 text-sm text-brand-gray">
                Remplissez le formulaire : vous recevez un numéro de commande immédiatement.
              </p>
              <div className="mt-4">
                <OrderForm
                  products={[
                    {
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      priceFcfa: product.price_fcfa,
                      stock: product.stock,
                      trackStock: product.track_stock === 1,
                      maxQuantity,
                    },
                  ]}
                  zones={zones.map((zone) => ({ id: zone.id, name: zone.name, feeFcfa: zone.fee_fcfa }))}
                  whatsappHref={whatsappHref}
                  mode="product"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12 border-t border-brand-line pt-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-black">Dans la même catégorie</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
    </div>
  );
}
