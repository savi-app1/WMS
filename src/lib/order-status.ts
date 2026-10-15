/**
 * Statuts de commande et règles de transition.
 * Source unique de vérité, partagée par l'API, l'interface et les tests.
 */

export const ORDER_STATUSES = [
  'nouvelle',
  'a_confirmer',
  'confirmee',
  'en_preparation',
  'en_livraison',
  'livree',
  'annulee',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  nouvelle: 'Nouvelle commande',
  a_confirmer: 'À confirmer',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

export const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  nouvelle: 'Commande reçue, en attente de vérification par WMS.',
  a_confirmer: 'WMS vérifie la disponibilité, le stock et le prix final.',
  confirmee: 'Commande validée manuellement, en attente de préparation.',
  en_preparation: 'Colis en cours de préparation.',
  en_livraison: 'Colis confié au livreur / en cours de livraison.',
  livree: 'Colis remis au client.',
  annulee: 'Commande annulée.',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  nouvelle: 'bg-red-100 text-red-800 border-red-200',
  a_confirmer: 'bg-amber-100 text-amber-900 border-amber-200',
  confirmee: 'bg-blue-100 text-blue-900 border-blue-200',
  en_preparation: 'bg-violet-100 text-violet-900 border-violet-200',
  en_livraison: 'bg-cyan-100 text-cyan-900 border-cyan-200',
  livree: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  annulee: 'bg-neutral-200 text-neutral-700 border-neutral-300',
};

/** Statuts considered as "actives" (non terminées). */
export const ACTIVE_STATUSES: OrderStatus[] = [
  'nouvelle',
  'a_confirmer',
  'confirmee',
  'en_preparation',
  'en_livraison',
];

export const TERMINAL_STATUSES: OrderStatus[] = ['livree', 'annulee'];

/**
 * Transitions autorisées. Toute autre transition est refusée par l'API.
 * L'annulation reste possible tant que la commande n'est pas livrée.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  nouvelle: ['a_confirmer', 'confirmee', 'en_preparation', 'annulee'],
  a_confirmer: ['confirmee', 'nouvelle', 'annulee'],
  confirmee: ['en_preparation', 'a_confirmer', 'annulee'],
  en_preparation: ['en_livraison', 'confirmee', 'annulee'],
  en_livraison: ['livree', 'en_preparation', 'annulee'],
  livree: [],
  annulee: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function statusLabel(status: string): string {
  return isOrderStatus(status) ? STATUS_LABELS[status] : status;
}
