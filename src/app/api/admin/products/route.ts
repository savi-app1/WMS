import { NextResponse } from 'next/server';
import { createProduct, listProducts } from '@/lib/products';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { productSchema, firstErrorMessage } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  const { searchParams } = new URL(request.url);
  const products = listProducts({
    includeUnpublished: true,
    search: searchParams.get('search') || undefined,
    category: searchParams.get('category') || undefined,
    limit: 500,
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      categoryId: p.category_id,
      categoryName: p.category_name,
      priceFcfa: p.price_fcfa,
      priceType: p.price_type,
      stock: p.stock,
      trackStock: p.track_stock === 1,
      isPublished: p.is_published === 1,
      featured: p.featured === 1,
      isDigital: p.is_digital === 1,
      isService: p.is_service === 1,
      images: p.images_list,
      views: p.views,
      ordersCount: p.orders_count,
      updatedAt: p.updated_at,
    })),
  });
}

export async function POST(request: Request) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: firstErrorMessage(parsed.error) }, { status: 400 });
  }

  const product = createProduct(parsed.data);
  return NextResponse.json({ ok: true, product: { id: product.id, slug: product.slug } }, { status: 201 });
}
