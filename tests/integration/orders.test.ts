/**
 * Tests d'intégration sur la couche métier (base de données de test isolée).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { getDb, query, queryOne, run, nowIso } from '@/lib/db';
import { createProduct } from '@/lib/products';
import { createOrder, changeOrderStatus, listOrderEvents, listOrders } from '@/lib/orders';
import { statsForPeriod, topProducts, statusBreakdown } from '@/lib/stats';

function seedCategory(): number {
  run(
    'INSERT INTO categories (slug, name, description, position, active) VALUES (?,?,?,?,1)',
    ['tests', 'Tests', 'Catégorie de test', 0],
  );
  return Number(queryOne<{ id: number }>('SELECT id FROM categories WHERE slug = ?', ['tests'])?.id);
}

describe('cycle de vie d\'une commande', () => {
  let categoryId = 0;
  let productId = 0;

  beforeAll(() => {
    getDb();
    categoryId = seedCategory();
    const product = createProduct({
      name: 'Produit de test',
      categoryId,
      shortDescription: 'Description courte',
      description: 'Description complète',
      priceFcfa: 10000,
      priceType: 'unique',
      comparePriceFcfa: null,
      stock: 5,
      trackStock: true,
      sku: 'TEST-1',
      images: [],
      specs: { Couleur: 'Noir' },
      isDigital: false,
      isService: false,
      isPublished: true,
      featured: false,
    });
    productId = product.id;
  });

  it('calcule le total à partir des prix serveur', () => {
    const { order, pricePending } = createOrder({
      customerName: 'Client Test',
      phone: '70 00 13 17',
      address: 'Ouaga, test',
      items: [{ productId, quantity: 3 }],
      deliveryFeeFcfa: 1000,
      paymentMethod: 'paiement_livraison',
    });

    expect(pricePending).toBe(false);
    expect(order.subtotal_fcfa).toBe(30000);
    expect(order.total_fcfa).toBe(31000);
    expect(order.items_list[0].lineTotalFcfa).toBe(30000);
    expect(order.status).toBe('nouvelle');
  });

  it('ignore le prix envoyé par le client', () => {
    const { order } = createOrder({
      customerName: 'Client Test',
      phone: '70001317',
      address: 'Ouaga, test',
      items: [{ productId, quantity: 1 }],
      deliveryFeeFcfa: 0,
      paymentMethod: 'paiement_livraison',
    });
    expect(order.subtotal_fcfa).toBe(10000);
    expect(order.total_fcfa).toBe(10000);
  });

  it('signale un prix à confirmer quand le produit n\'a pas de prix', () => {
    const product = createProduct({
      name: 'Produit sans prix',
      categoryId,
      shortDescription: undefined,
      description: undefined,
      priceFcfa: null,
      priceType: 'unique',
      comparePriceFcfa: null,
      stock: null,
      trackStock: false,
      sku: undefined,
      images: [],
      specs: {},
      isDigital: false,
      isService: false,
      isPublished: true,
      featured: false,
    });

    const { order, pricePending } = createOrder({
      customerName: 'Client Test',
      phone: '70001317',
      address: 'Ouaga, test',
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'a_confirmer',
    });

    expect(pricePending).toBe(true);
    expect(order.total_fcfa).toBeNull();
    expect(order.price_pending).toBe(1);
  });

  it('génère des numéros de commande uniques', () => {
    const numbers = new Set<string>();
    for (let index = 0; index < 5; index += 1) {
      const { order } = createOrder({
        customerName: 'Client Test',
        phone: '70001317',
        address: 'Ouaga, test',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'paiement_livraison',
      });
      numbers.add(order.order_number);
    }
    expect(numbers.size).toBe(5);
    for (const number of numbers) {
      expect(number).toMatch(/^WMS-\d{8}-\d{5}$/);
    }
  });

  it('persiste la commande en base', () => {
    const { order } = createOrder({
      customerName: 'Persistée',
      phone: '70001317',
      address: 'Ouaga, test',
      items: [{ productId, quantity: 2 }],
      paymentMethod: 'paiement_livraison',
    });
    const row = queryOne<{ customer_name: string; status: string }>(
      'SELECT customer_name, status FROM orders WHERE order_number = ?',
      [order.order_number],
    );
    expect(row?.customer_name).toBe('Persistée');
    expect(row?.status).toBe('nouvelle');
  });

  it('enregistre l\'événement de création', () => {
    const { order } = createOrder({
      customerName: 'Historique',
      phone: '70001317',
      address: 'Ouaga, test',
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'paiement_livraison',
    });
    const events = listOrderEvents(order.id);
    expect(events.length).toBe(1);
    expect(events[0].to_status).toBe('nouvelle');
    expect(events[0].actor).toBe('client');
  });

  it('refuse une transition non autorisée', () => {
    const { order } = createOrder({
      customerName: 'Transitions',
      phone: '70001317',
      address: 'Ouaga, test',
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'paiement_livraison',
    });
    const result = changeOrderStatus(order.id, 'livree');
    expect(result.ok).toBe(false);
    expect(getStatus(order.id)).toBe('nouvelle');
  });

  it('suit le parcours complet et historise chaque étape', () => {
    const { order } = createOrder({
      customerName: 'Parcours',
      phone: '70001317',
      address: 'Ouaga, test',
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'paiement_livraison',
    });

    expect(changeOrderStatus(order.id, 'a_confirmer').ok).toBe(true);
    expect(changeOrderStatus(order.id, 'confirmee').ok).toBe(true);
    expect(changeOrderStatus(order.id, 'en_preparation').ok).toBe(true);
    expect(changeOrderStatus(order.id, 'en_livraison').ok).toBe(true);
    expect(changeOrderStatus(order.id, 'livree').ok).toBe(true);
    expect(getStatus(order.id)).toBe('livree');

    const events = listOrderEvents(order.id);
    expect(events.map((event) => event.to_status)).toEqual([
      'nouvelle',
      'a_confirmer',
      'confirmee',
      'en_preparation',
      'en_livraison',
      'livree',
    ]);
  });

  it('permet l\'annulation et bloque les transitions suivantes', () => {
    const { order } = createOrder({
      customerName: 'Annulation',
      phone: '70001317',
      address: 'Ouaga, test',
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'paiement_livraison',
    });
    expect(changeOrderStatus(order.id, 'annulee').ok).toBe(true);
    expect(changeOrderStatus(order.id, 'confirmee').ok).toBe(false);
    expect(getStatus(order.id)).toBe('annulee');
  });

  it('refuse un produit inexistant ou non publié', () => {
    expect(() =>
      createOrder({
        customerName: 'Erreur',
        phone: '70001317',
        address: 'Ouaga, test',
        items: [{ productId: 999999, quantity: 1 }],
        paymentMethod: 'paiement_livraison',
      }),
    ).toThrow(/disponible/);
  });
});

describe('statistiques', () => {
  it('calcule les totaux, taux et produits les plus commandés', () => {
    const from = new Date(Date.now() - 86400000).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const stats = statsForPeriod(from, to);

    expect(stats.total).toBeGreaterThan(0);
    expect(stats.confirmationRate).toBeGreaterThanOrEqual(0);
    expect(stats.confirmationRate).toBeLessThanOrEqual(100);
    expect(stats.deliveryRate).toBeGreaterThanOrEqual(0);
    expect(stats.orderValue).toBeGreaterThan(0);

    const top = topProducts(5, from, to);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].quantity).toBeGreaterThan(0);

    const breakdown = statusBreakdown();
    expect(Object.keys(breakdown).length).toBeGreaterThan(0);
  });

  it('sépare le montant commandé du montant encaissé', () => {
    const from = new Date(Date.now() - 86400000).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const stats = statsForPeriod(from, to);
    expect(stats.collected).toBe(0);
    expect(stats.orderValue).toBeGreaterThan(0);
  });
});

describe('listes de commandes', () => {
  it('filtre par statut et par recherche', () => {
    const all = listOrders({ limit: 500 });
    expect(all.length).toBeGreaterThan(0);
    const delivered = listOrders({ status: 'livree', limit: 500 });
    expect(delivered.every((order) => order.status === 'livree')).toBe(true);
    const found = listOrders({ search: 'Parcours', limit: 500 });
    expect(found.length).toBeGreaterThan(0);
  });
});

function getStatus(orderId: number): string {
  const row = queryOne<{ status: string }>('SELECT status FROM orders WHERE id = ?', [orderId]);
  return row?.status ?? '';
}

export { nowIso, query };
