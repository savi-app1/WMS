/**
 * Commandes : création (côté public) et gestion (côté administration).
 *
 * Règles métier :
 *  - Les montants sont TOUJOURS recalculés côté serveur à partir des prix
 *    enregistrés en base. Le client ne peut pas imposer un prix.
 *  - Une commande ne passe jamais automatiquement à « confirmée ».
 *  - Les statuts sont modifiés manuellement, chaque changement est historisé.
 *  - Les montants « commandés / confirmés / livrés / encaissés » sont distincts.
 */
import { randomInt, randomBytes, createHash } from 'node:crypto';
import { query, queryOne, run, nowIso, transaction, type SqlValue } from './db';
import { getProductById } from './products';
import { canTransition, isOrderStatus, type OrderStatus } from './order-status';
import { normalizePhone } from './format';

export interface OrderItem {
  productId: number;
  name: string;
  slug: string;
  unitPriceFcfa: number | null;
  quantity: number;
  lineTotalFcfa: number | null;
}

export interface Order {
  id: number;
  order_number: string;
  public_token: string;
  customer_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  delivery_zone: string | null;
  delivery_fee_fcfa: number | null;
  items: string;
  subtotal_fcfa: number | null;
  total_fcfa: number | null;
  price_pending: number;
  payment_method: string;
  amount_paid_fcfa: number | null;
  status: OrderStatus;
  note: string | null;
  admin_note: string | null;
  tracking_code: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  is_test: number;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  prepared_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export interface OrderWithItems extends Order {
  items_list: OrderItem[];
  total_quantity: number;
  status_label: string;
}

const STATUS_LABELS: Record<string, string> = {
  nouvelle: 'Nouvelle commande',
  a_confirmer: 'À confirmer',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

function parseItems(raw: string): OrderItem[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
  } catch {
    return [];
  }
}

function hydrate(row: Order): OrderWithItems {
  const items = parseItems(row.items);
  return {
    ...row,
    items_list: items,
    total_quantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    status_label: STATUS_LABELS[row.status] ?? row.status,
  };
}

/** Le jeton public d'une commande est stocké haché (clé de lecture de la commande). */
export function hashPublicToken(token: string): string {
  return createHash('sha256').update(`wms-order:${token}`).digest('hex');
}

export function generateOrderNumber(): string {  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate(),
  ).padStart(2, '0')}`;
  let candidate = '';
  do {
    candidate = `WMS-${stamp}-${String(randomInt(0, 100000)).padStart(5, '0')}`;
  } while (queryOne('SELECT id FROM orders WHERE order_number = ?', [candidate]));
  return candidate;
}

export interface CreateOrderInput {
  customerName: string;
  phone: string;
  email?: string;
  city?: string;
  address: string;
  deliveryZone?: string;
  deliveryFeeFcfa?: number;
  items: { productId: number; quantity: number }[];
  note?: string;
  paymentMethod: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  isTest?: boolean;
}

export interface CreateOrderResult {
  order: OrderWithItems;
  pricePending: boolean;
  /** Jeton de consultation de la commande, communiqué au client une seule fois. */
  publicToken: string;
}

export function createOrder(input: CreateOrderInput): CreateOrderResult {
  // Recalcul intégral côté serveur
  const items: OrderItem[] = [];
  let subtotal = 0;
  let pricePending = false;

  for (const line of input.items) {
    const product = getProductById(line.productId);
    if (!product || product.is_published !== 1) {
      throw new Error(`Le produit #${line.productId} n'est pas disponible.`);
    }
    const quantity = Math.max(1, Math.min(Math.floor(line.quantity), 999));
    const unitPrice = product.price_fcfa;
    const lineTotal = unitPrice === null ? null : unitPrice * quantity;
    if (unitPrice === null) pricePending = true;
    else subtotal += unitPrice * quantity;
    items.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      unitPriceFcfa: unitPrice,
      quantity,
      lineTotalFcfa: lineTotal,
    });
  }

  const deliveryFee = input.deliveryFeeFcfa ?? null;
  const hasPrices = !pricePending;
  const total = hasPrices ? subtotal + (deliveryFee ?? 0) : null;

  const orderNumber = generateOrderNumber();
  // 128 bits d'entropie : le jeton est un « lien de capacité » envoyé au client
  // (consultation de sa commande), il ne doit pas être devinable.
  const publicToken = randomBytes(16).toString('hex');
  const now = nowIso();

  // Les colonnes sont décrites explicitement puis assemblées : le nombre de
  // valeurs ne peut plus se désynchroniser du nombre de colonnes.
  const columns: Record<string, SqlValue> = {
    order_number: orderNumber,
    public_token: hashPublicToken(publicToken),
    customer_name: input.customerName,
    phone: normalizePhone(input.phone),
    email: input.email || null,
    city: input.city || null,
    address: input.address,
    delivery_zone: input.deliveryZone || null,
    delivery_fee_fcfa: deliveryFee,
    items: JSON.stringify(items),
    subtotal_fcfa: hasPrices ? subtotal : null,
    total_fcfa: total,
    price_pending: pricePending ? 1 : 0,
    payment_method: input.paymentMethod,
    status: 'nouvelle',
    note: input.note || null,
    utm_source: input.utm?.source || null,
    utm_medium: input.utm?.medium || null,
    utm_campaign: input.utm?.campaign || null,
    utm_content: input.utm?.content || null,
    utm_term: input.utm?.term || null,
    is_test: input.isTest ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
  const columnNames = Object.keys(columns);

  const result = transaction(() => {
    const inserted = run(
      `INSERT INTO orders (${columnNames.join(', ')})
       VALUES (${columnNames.map(() => '?').join(', ')})`,
      Object.values(columns),
    );

    run(
      `INSERT INTO order_events (order_id, from_status, to_status, action, note, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [inserted.lastInsertRowid, null, 'nouvelle', 'creation', 'Commande reçue via le site.', 'client', now],
    );

    for (const item of items) {
      run('UPDATE products SET orders_count = orders_count + ? WHERE id = ?', [item.quantity, item.productId]);
    }

    return inserted.lastInsertRowid;
  });

  const order = getOrderById(result);
  if (!order) throw new Error("La commande n'a pas pu être enregistrée.");
  return { order, pricePending, publicToken };
}

export function getOrderById(id: number): OrderWithItems | undefined {
  const row = queryOne<Order>('SELECT * FROM orders WHERE id = ?', [id]);
  return row ? hydrate(row) : undefined;
}

export function getOrderByNumber(orderNumber: string): OrderWithItems | undefined {
  const row = queryOne<Order>('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
  return row ? hydrate(row) : undefined;
}

export interface OrderFilters {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export function listOrders(filters: OrderFilters = {}): OrderWithItems[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filters.status && filters.status !== 'toutes') {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push('(order_number LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR address LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }
  if (filters.from) {
    conditions.push('created_at >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push('created_at <= ?');
    params.push(filters.to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);
  const rows = query<Order>(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return rows.map(hydrate);
}

export function countOrders(filters: OrderFilters = {}): number {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filters.status && filters.status !== 'toutes') {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push('(order_number LIKE ? OR customer_name LIKE ? OR phone LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM orders ${where}`, params);
  return Number(row?.c ?? 0);
}

export interface StatusChangeResult {
  ok: boolean;
  message: string;
  order?: OrderWithItems;
}

export function changeOrderStatus(
  orderId: number,
  nextStatus: string,
  options: { note?: string; amountPaidFcfa?: number | null; trackingCode?: string } = {},
): StatusChangeResult {
  const order = getOrderById(orderId);
  if (!order) return { ok: false, message: 'Commande introuvable.' };
  if (!isOrderStatus(nextStatus)) return { ok: false, message: 'Statut inconnu.' };
  if (!canTransition(order.status, nextStatus)) {
    return {
      ok: false,
      message: `Transition impossible : « ${STATUS_LABELS[order.status]} » vers « ${STATUS_LABELS[nextStatus]} ».`,
    };
  }
  if (order.status === nextStatus && options.amountPaidFcfa === undefined && !options.trackingCode) {
    return { ok: false, message: 'La commande est déjà dans ce statut.' };
  }

  const now = nowIso();
  const timestamps: Record<string, string> = {
    confirmee: 'confirmed_at',
    en_preparation: 'prepared_at',
    en_livraison: 'shipped_at',
    livree: 'delivered_at',
    annulee: 'cancelled_at',
  };
  const tsColumn = timestamps[nextStatus];

  transaction(() => {
    let sql = `UPDATE orders SET status = ?, updated_at = ?`;
    const params: (string | number | null)[] = [nextStatus, now];
    if (tsColumn) {
      sql += `, ${tsColumn} = ?`;
      params.push(now);
    }
    if (options.amountPaidFcfa !== undefined) {
      sql += ', amount_paid_fcfa = ?';
      params.push(options.amountPaidFcfa);
    }
    if (options.trackingCode !== undefined) {
      sql += ', tracking_code = ?';
      params.push(options.trackingCode || null);
    }
    if (options.note) {
      sql += ', admin_note = ?';
      params.push(options.note);
    }
    sql += ' WHERE id = ?';
    params.push(orderId);
    run(sql, params);

    run(
      `INSERT INTO order_events (order_id, from_status, to_status, action, note, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, order.status, nextStatus, 'status', options.note || null, 'admin', now],
    );
  });

  return { ok: true, message: `Statut mis à jour : ${STATUS_LABELS[nextStatus]}.`, order: getOrderById(orderId) };
}

export function updateOrderNote(orderId: number, note: string): boolean {
  const result = run('UPDATE orders SET admin_note = ?, updated_at = ? WHERE id = ?', [note, nowIso(), orderId]);
  return result.changes > 0;
}

export function setOrderAmountPaid(orderId: number, amount: number | null): boolean {
  const result = run('UPDATE orders SET amount_paid_fcfa = ?, updated_at = ? WHERE id = ?', [
    amount,
    nowIso(),
    orderId,
  ]);
  return result.changes > 0;
}

export function listOrderEvents(orderId: number) {
  return query<{
    id: number;
    from_status: string | null;
    to_status: string;
    action: string | null;
    note: string | null;
    actor: string;
    created_at: string;
  }>('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC, id ASC', [orderId]);
}

/**
 * Sérialise des lignes en CSV lisible par Excel/LibreOffice en français.
 *
 *  - séparateur « ; » (la virgule est le séparateur décimal en français) ;
 *  - marque d'ordre des octets (BOM) en tête pour que les accents s'affichent
 *    correctement à l'ouverture du fichier.
 */
export function toCsv(rows: Record<string, unknown>[], delimiter = ';'): string {
  if (rows.length === 0) return '\uFEFF';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    const needsQuotes = str.includes('"') || str.includes('\n') || str.includes(delimiter);
    return needsQuotes ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(delimiter)];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(delimiter));
  }
  return `\uFEFF${lines.join('\n')}`;
}

/** Génère un code de suivi lisible. */
export function generateTrackingCode(): string {
  return `BF${randomBytes(4).toString('hex').toUpperCase()}`;
}
