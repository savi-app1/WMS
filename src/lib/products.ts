/** Accès aux produits et catégories. */
import { query, queryOne, run, nowIso } from './db';
import { slugify } from './format';
import type { ProductInput } from './validation';

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  active: number;
  product_count?: number;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  category_id: number | null;
  category_name?: string | null;
  category_slug?: string | null;
  short_description: string | null;
  description: string | null;
  price_fcfa: number | null;
  price_type: string;
  compare_price_fcfa: number | null;
  stock: number | null;
  track_stock: number;
  sku: string | null;
  images: string;
  specs: string;
  is_digital: number;
  is_service: number;
  is_published: number;
  featured: number;
  position: number;
  views: number;
  orders_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithCategory extends Product {
  images_list: string[];
  specs_list: { label: string; value: string }[];
}

function hydrate(row: Product): ProductWithCategory {
  let images: string[] = [];
  let specs: Record<string, string> = {};
  try {
    images = JSON.parse(row.images || '[]');
  } catch {
    images = [];
  }
  try {
    specs = JSON.parse(row.specs || '{}');
  } catch {
    specs = {};
  }
  return {
    ...row,
    images_list: Array.isArray(images) ? images : [],
    specs_list: Object.entries(specs).map(([label, value]) => ({ label, value: String(value) })),
  };
}

const BASE_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
`;

export function listCategories(options: { includeInactive?: boolean } = {}): Category[] {
  const where = options.includeInactive ? '' : 'WHERE c.active = 1';
  return query<Category>(
    `SELECT c.*, (
        SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_published = 1
      ) AS product_count
      FROM categories c ${where}
      ORDER BY c.position ASC, c.name ASC`,
  );
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return queryOne<Category>('SELECT * FROM categories WHERE slug = ?', [slug]);
}

export interface ProductFilters {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  includeUnpublished?: boolean;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'name' | 'popular';
}

export function listProducts(filters: ProductFilters = {}): ProductWithCategory[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (!filters.includeUnpublished) conditions.push('p.is_published = 1');
  if (filters.category) {
    conditions.push('c.slug = ?');
    params.push(filters.category);
  }
  if (filters.featured) conditions.push('p.featured = 1');
  if (filters.search) {
    conditions.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
    const like = `%${filters.search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    params.push(like, like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order =
    filters.sort === 'price_asc'
      ? 'p.price_fcfa IS NULL ASC, p.price_fcfa ASC'
      : filters.sort === 'price_desc'
        ? 'p.price_fcfa IS NULL ASC, p.price_fcfa DESC'
        : filters.sort === 'name'
          ? 'p.name ASC'
          : filters.sort === 'popular'
            ? 'p.orders_count DESC, p.views DESC'
            : 'p.featured DESC, p.position ASC, p.created_at DESC';

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);

  const rows = query<Product>(
    `${BASE_SELECT} ${where} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return rows.map(hydrate);
}

export function countProducts(filters: ProductFilters = {}): number {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (!filters.includeUnpublished) conditions.push('p.is_published = 1');
  if (filters.category) {
    conditions.push('c.slug = ?');
    params.push(filters.category);
  }
  if (filters.featured) conditions.push('p.featured = 1');
  if (filters.search) {
    conditions.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
    params,
  );
  return Number(row?.c ?? 0);
}

export function getProductBySlug(slug: string, includeUnpublished = false): ProductWithCategory | undefined {
  const row = queryOne<Product>(
    `${BASE_SELECT} WHERE p.slug = ?${includeUnpublished ? '' : ' AND p.is_published = 1'}`,
    [slug],
  );
  return row ? hydrate(row) : undefined;
}

export function getProductById(id: number): ProductWithCategory | undefined {
  const row = queryOne<Product>(`${BASE_SELECT} WHERE p.id = ?`, [id]);
  return row ? hydrate(row) : undefined;
}

function uniqueSlug(name: string, excludeId?: number): string {
  const base = slugify(name) || 'produit';
  let candidate = base;
  let index = 2;
  while (true) {
    const existing = queryOne<{ id: number }>('SELECT id FROM products WHERE slug = ?', [candidate]);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${index++}`;
  }
}

export function createProduct(input: ProductInput): ProductWithCategory {
  const now = nowIso();
  const slug = input.slug ? uniqueSlug(slugify(input.slug)) : uniqueSlug(input.name);
  const result = run(
    `INSERT INTO products (
       slug, name, category_id, short_description, description, price_fcfa, price_type,
       compare_price_fcfa, stock, track_stock, sku, images, specs,
       is_digital, is_service, is_published, featured, position, created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      slug,
      input.name,
      input.categoryId ?? null,
      input.shortDescription ?? null,
      input.description ?? null,
      input.priceFcfa ?? null,
      input.priceType,
      input.comparePriceFcfa ?? null,
      input.stock ?? null,
      input.trackStock ? 1 : 0,
      input.sku ?? null,
      JSON.stringify(input.images ?? []),
      JSON.stringify(input.specs ?? {}),
      input.isDigital ? 1 : 0,
      input.isService ? 1 : 0,
      input.isPublished ? 1 : 0,
      input.featured ? 1 : 0,
      0,
      now,
      now,
    ],
  );
  return getProductById(result.lastInsertRowid)!;
}

export function updateProduct(id: number, input: ProductInput): ProductWithCategory | undefined {
  const existing = getProductById(id);
  if (!existing) return undefined;
  const slug = input.slug ? uniqueSlug(slugify(input.slug), id) : existing.slug;
  run(
    `UPDATE products SET
       slug = ?, name = ?, category_id = ?, short_description = ?, description = ?,
       price_fcfa = ?, price_type = ?, compare_price_fcfa = ?, stock = ?, track_stock = ?,
       sku = ?, images = ?, specs = ?, is_digital = ?, is_service = ?, is_published = ?,
       featured = ?, updated_at = ?
     WHERE id = ?`,
    [
      slug,
      input.name,
      input.categoryId ?? null,
      input.shortDescription ?? null,
      input.description ?? null,
      input.priceFcfa ?? null,
      input.priceType,
      input.comparePriceFcfa ?? null,
      input.stock ?? null,
      input.trackStock ? 1 : 0,
      input.sku ?? null,
      JSON.stringify(input.images ?? []),
      JSON.stringify(input.specs ?? {}),
      input.isDigital ? 1 : 0,
      input.isService ? 1 : 0,
      input.isPublished ? 1 : 0,
      input.featured ? 1 : 0,
      nowIso(),
      id,
    ],
  );
  return getProductById(id);
}

export function deleteProduct(id: number): boolean {
  const result = run('DELETE FROM products WHERE id = ?', [id]);
  return result.changes > 0;
}

export function incrementProductViews(id: number): void {
  run('UPDATE products SET views = views + 1 WHERE id = ?', [id]);
}

export function decrementStockForItems(items: { productId: number; quantity: number }[]): void {
  for (const item of items) {
    run(
      'UPDATE products SET stock = MAX(COALESCE(stock, 0) - ?, updated_at = ?) WHERE id = ? AND track_stock = 1 AND stock IS NOT NULL',
      [item.quantity, nowIso(), item.productId],
    );
  }
}

export function listLowStockProducts(threshold = 3): ProductWithCategory[] {
  const rows = query<Product>(
    `${BASE_SELECT} WHERE p.track_stock = 1 AND p.stock IS NOT NULL AND p.stock <= ? ORDER BY p.stock ASC`,
    [threshold],
  );
  return rows.map(hydrate);
}
