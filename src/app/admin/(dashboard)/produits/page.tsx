import Link from 'next/link';
import { listCategories, listProducts } from '@/lib/products';
import { formatFcfa, formatRelative } from '@/lib/format';
import { ProductForm } from '@/components/admin/product-form';
import { NewProductButton } from '@/components/admin/new-product-button';

export const dynamic = 'force-dynamic';

export default function AdminProductsPage() {
  const categories = listCategories({ includeInactive: true });
  const products = listProducts({ includeUnpublished: true, limit: 500 });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Produits & stocks</h1>
          <p className="mt-1 text-sm text-brand-gray">
            {products.length} produit{products.length > 1 ? 's' : ''} — prix, stock et visuels modifiables à
            tout moment.
          </p>
        </div>
        <NewProductButton categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </header>

      <ul className="space-y-2.5">
        {products.map((product) => (
          <li key={product.id} className="card-wms p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/admin/produits/${product.id}`}
                  className="text-sm font-extrabold text-brand-black hover:text-brand-red"
                >
                  {product.name}
                </Link>
                <p className="mt-0.5 text-xs text-brand-gray">
                  {product.category_name ?? 'Sans catégorie'} · {product.slug}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-brand-black">
                  {product.price_fcfa !== null ? formatFcfa(product.price_fcfa) : 'Prix à confirmer'}
                </p>
                <p className="text-[11px] text-brand-gray">
                  {product.track_stock === 1
                    ? product.stock === null
                      ? 'stock non renseigné'
                      : `stock : ${product.stock}`
                    : 'stock non géré'}
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {product.is_published === 1 ? (
                <span className="badge-wms border-emerald-200 bg-emerald-50 text-emerald-800">Publié</span>
              ) : (
                <span className="badge-wms border-neutral-300 bg-neutral-100 text-neutral-700">Brouillon</span>
              )}
              {product.featured === 1 && (
                <span className="badge-wms border-brand-red/20 bg-brand-red/10 text-brand-red">En vedette</span>
              )}
              {product.is_digital === 1 && (
                <span className="badge-wms border-blue-200 bg-blue-50 text-blue-800">Numérique</span>
              )}
              {product.is_service === 1 && (
                <span className="badge-wms border-violet-200 bg-violet-50 text-violet-800">Service</span>
              )}
              <span className="text-[11px] text-brand-gray">
                {product.views} vue(s) · {product.orders_count} commandé(s) · maj {formatRelative(product.updated_at)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <details className="card-wms p-4">
        <summary className="cursor-pointer text-sm font-bold text-brand-black">Ajouter un produit</summary>
        <div className="mt-4">
          <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </details>
    </div>
  );
}
