import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  ORDER_STATUSES,
  STATUS_LABELS,
  canTransition,
  isOrderStatus,
} from '@/lib/order-status';

describe('statuts de commande', () => {
  it('expose les sept statuts obligatoires', () => {
    expect([...ORDER_STATUSES]).toEqual([
      'nouvelle',
      'a_confirmer',
      'confirmee',
      'en_preparation',
      'en_livraison',
      'livree',
      'annulee',
    ]);
  });

  it('fournit un libellé lisible pour chaque statut', () => {
    for (const status of ORDER_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('reconnaît un statut valide', () => {
    expect(isOrderStatus('livree')).toBe(true);
    expect(isOrderStatus('teleporte')).toBe(false);
  });
});

describe('transitions autorisées', () => {
  it('autorise le parcours nominal', () => {
    expect(canTransition('nouvelle', 'a_confirmer')).toBe(true);
    expect(canTransition('a_confirmer', 'confirmee')).toBe(true);
    expect(canTransition('confirmee', 'en_preparation')).toBe(true);
    expect(canTransition('en_preparation', 'en_livraison')).toBe(true);
    expect(canTransition('en_livraison', 'livree')).toBe(true);
  });

  it('interdit de sauter la livraison', () => {
    expect(canTransition('nouvelle', 'livree')).toBe(false);
    expect(canTransition('confirmee', 'livree')).toBe(false);
  });

  it('interdit toute sortie d\'une commande livrée ou annulée', () => {
    expect(canTransition('livree', 'annulee')).toBe(false);
    expect(canTransition('annulee', 'confirmee')).toBe(false);
  });

  it('permet l\'annulation avant la livraison', () => {
    expect(canTransition('nouvelle', 'annulee')).toBe(true);
    expect(canTransition('en_preparation', 'annulee')).toBe(true);
    expect(canTransition('en_livraison', 'annulee')).toBe(true);
  });

  it('autorise le retour en arrière tant que le colis n\'est pas remis', () => {
    expect(canTransition('a_confirmer', 'nouvelle')).toBe(true);
    expect(canTransition('en_livraison', 'en_preparation')).toBe(true);
  });

  it('autorise un statut identique (mise à jour sans changement)', () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it('ne propose aucune transition depuis un statut final', () => {
    expect(ALLOWED_TRANSITIONS.livree).toEqual([]);
    expect(ALLOWED_TRANSITIONS.annulee).toEqual([]);
  });
});
