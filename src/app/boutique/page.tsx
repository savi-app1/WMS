import Link from 'next/link';
import type { Metadata } from 'next';
import { listCategories, listProducts } from '@/lib/products';
import { ProductCard } from '@/components/product-card';
import { SortSelect } from '@/components/sort-select';
import { BRAND_CITY } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Boutique — catalogue produits',
  description: `Catalogue WMS : smartphones, accessoires, électronique, montres connectées, produits numériques et formations. Livraison à ${BRAND_CITY}.`,
  alternates: { canonical: '/boutique' },
};

export default async function BoutiquePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string; tri?: string }>;
}) {
  const params = await searchParams;
  const search = (params.q ?? '').trim();
  const category = params.categorie ?? '';
  const sort = params.tri ?? 'recent';

  const categories = listCategories();
  const products = listProducts({
    search: search || undefined,
    category: category || undefined,
    sort: sort as 'recent',
  });

  const buildUrl = (next: { categorie?: string; tri?: string }) => {
    const sp = new URLSearchParams();
    if (search) sp.set('q', search);
    if (next.categorie !== undefined) {
      if (next.categorie) sp.set('categorie', next.categorie);
    } else if (category) {
      sp.set('categorie', category);
    }
    if (next.tri !== undefined) {
      if (next.tri !== 'recent') sp.set('tri', next.tri);
    } else if (sort !== 'recent') {
      sp.set('tri', sort);
    }
    const queryString = sp.toString();
    return queryString ? `/boutique?${queryString}` : '/boutique';
  };

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="container-wms py-8 sm:py-10">
      <nav aria-label="Fil d'Ariane" className="text-sm text-brand-gray">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-red">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-brand-black">Boutique</li>
          {activeCategory && (
            <>
              <li aria-hidden="true">/</li>
              <li className="font-semibold text-brand-black">{activeCategory.name}</li>
            </>
          )}
        </ol>
      </nav>

      <header className="mt-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">
          {activeCategory ? activeCategory.name : 'Notre catalogue'}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-brand-gray">
          {activeCategory?.description ??
            'Tous nos produits et services numériques. Les prix affichés sont ceux enregistrés par WMS ; les fiches marquées « Prix à confirmer » sont vérifiées avant facturation.'}
        </p>
      </header>

      {/* Recherche */}
      <form method="get" action="/boutique" className="mt-6 flex flex-col gap-3 sm:flex-row">
        {category && <input type="hidden" name="categorie" value={category} />}
        <div className="flex-1">
          <label htmlFor="recherche" className="sr-only">
            Rechercher un produit
          </label>
          <input
            id="recherche"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Rechercher un smartphone, une formation, un câble…"
            className="input-wms"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1 sm:flex-none">
            Rechercher
          </button>
          {search && (
            <Link href={buildUrl({ categorie: '' })} className="btn-outline">
              Effacer
            </Link>
          )}
        </div>
      </form>

      {/* Catégories */}
      <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Filtrer par catégorie">
        <Link
          href={buildUrl({ categorie: '' })}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            !category ? 'border-brand-red bg-brand-red text-white' : 'border-brand-line bg-white text-brand-ink hover:border-brand-red'
          }`}
        >
          Toutes
        </Link>
        {categories.map((item) => (
          <Link
            key={item.id}
            href={buildUrl({ categorie: item.slug })}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              category === item.slug
                ? 'border-brand-red bg-brand-red text-white'
                : 'border-brand-line bg-white text-brand-ink hover:border-brand-red'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      {/* Tri */}
      <div className="mt-2 flex items-center justify-between gap-3 border-b border-brand-line pb-4">
        <p className="text-sm text-brand-gray">
          {products.length} produit{products.length > 1 ? 's' : ''}
          {search && (
            <>
              {' '}
              pour « <span className="font-semibold text-brand-black">{search}</span> »
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="tri" className="hidden text-sm font-semibold text-brand-gray sm:block">
            Trier
          </label>
          <SortSelect value={sort} />
        </div>
      </div>

      {products.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="card-wms mt-6 p-10 text-center">
          <p className="text-lg font-bold text-brand-black">Aucun produit ne correspond à votre recherche.</p>
          <p className="mt-2 text-brand-gray">
            Écrivez-nous sur WhatsApp : nous pouvons avoir l&apos;article que vous cherchez, ou le proposer
            en commande spéciale.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/boutique" className="btn-outline">
              Voir tout le catalogue
            </Link>
            <a
              href="https://wa.me/22656592557?text=Bonjour%20WMS%2C%20je%20cherche%20un%20article%20qui%20n%27est%20pas%20affich%C3%A9%20sur%20le%20site."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary !bg-[#25D366]"
            >
              Demander sur WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
