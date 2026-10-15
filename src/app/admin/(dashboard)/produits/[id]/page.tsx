import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById, listCategories } from '@/lib/products';
import { ProductForm, type ProductFormValues } from '@/components/admin/product-form';

export const dynamic = 'force-dynamic';

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(Number(id));
  if (!product) notFound();

  const categories = listCategories({ includeInactive: true });

  const initial: ProductFormValues = {
    id: product.id,
    name: product.name,
    categoryId: product.category_id,
    shortDescription: product.short_description ?? '',
    description: product.description ?? '',
    priceFcfa: product.price_fcfa,
    priceType: product.price_type,
    comparePriceFcfa: product.compare_price_fcfa,
    stock: product.stock,
    trackStock: product.track_stock === 1,
    sku: product.sku ?? '',
    images: product.images_list,
    specs: product.specs_list,
    isDigital: product.is_digital === 1,
    isService: product.is_service === 1,
    isPublished: product.is_published === 1,
    featured: product.featured === 1,
  };

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/produits" className="text-xs font-bold text-brand-gray hover:text-brand-red">
          ← Retour aux produits
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-black">{product.name}</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Fiche visible sur le site : <Link href={`/boutique/${product.slug}`} className="font-semibold text-brand-red">{`/boutique/${product.slug}`}</Link>
        </p>
      </div>

      <div className="card-wms p-4">
        <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} initial={initial} />
      </div>
    </div>
  );
}
