import Link from 'next/link';
import Image from 'next/image';
import { formatFcfa } from '@/lib/format';
import type { ProductWithCategory } from '@/lib/products';

export function ProductCard({ product }: { product: ProductWithCategory }) {
  const image = product.images_list[0];
  const hasPrice = product.price_fcfa !== null && product.price_fcfa > 0;

  return (
    <article className="card-wms group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/boutique/${product.slug}`} className="block" tabIndex={-1} aria-hidden="true">
        <div className="media-frame w-full">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              width={400}
              height={400}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center">
              <span className="text-2xl font-extrabold text-brand-red">WMS</span>
              <span className="text-[11px] font-medium text-brand-gray">{product.category_name ?? 'Produit'}</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.category_name && (
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-red">{product.category_name}</p>
        )}
        <h3 className="mt-1 text-[15px] font-bold leading-snug text-brand-black">
          <Link href={`/boutique/${product.slug}`} className="hover:text-brand-red">
            {product.name}
          </Link>
        </h3>
        {product.short_description && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-brand-gray">{product.short_description}</p>
        )}

        <div className="mt-auto pt-3">
          {hasPrice ? (
            <p className="text-lg font-extrabold text-brand-black">{formatFcfa(product.price_fcfa)}</p>
          ) : (
            <p className="badge-wms border-amber-200 bg-amber-50 text-amber-800">Prix à confirmer</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link href={`/boutique/${product.slug}`} className="btn-primary flex-1 !min-h-[42px] !py-2 text-sm">
              Voir &amp; commander
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
