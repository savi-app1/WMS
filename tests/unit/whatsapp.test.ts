import { describe, expect, it } from 'vitest';
import { orderWhatsappMessage, productWhatsappMessage, whatsappLink } from '@/lib/whatsapp';

/** Normalise l'espace fine insécable utilisée dans les montants. */
const plain = (value: string) => value.replace(/[\u202f\u00a0]/g, ' ');

describe('whatsappLink', () => {
  it('construit un lien wa.me avec message prérempli', () => {
    const link = whatsappLink('Bonjour WMS');
    expect(link.startsWith('https://wa.me/')).toBe(true);
    expect(link).toContain('text=Bonjour%20WMS');
  });

  it('accepte un numéro international', () => {
    const link = whatsappLink('Test', '+226 70 00 13 17');
    expect(link).toContain('wa.me/22670001317');
  });
});

describe('productWhatsappMessage', () => {
  it('inclut le nom du produit et son lien', () => {
    const message = productWhatsappMessage({ name: 'Smartphone', slug: 'smartphone', price: 150000 });
    expect(message).toContain('Smartphone');
    expect(message).toContain('/boutique/smartphone');
    expect(plain(message)).toContain('150 000 FCFA');
  });

  it('signale un prix non renseigné', () => {
    const message = productWhatsappMessage({ name: 'Webcam', slug: 'webcam', price: null });
    expect(message).toContain('prix à confirmer');
  });
});

describe('orderWhatsappMessage', () => {
  it('résume la commande et son total', () => {
    const message = orderWhatsappMessage({
      order_number: 'WMS-20260101-00001',
      customer_name: 'Aminata',
      items: [{ name: 'Smartphone', quantity: 2 }],
      total_fcfa: 300000,
    });
    expect(message).toContain('WMS-20260101-00001');
    expect(message).toContain('Smartphone x2');
    expect(plain(message)).toContain('300 000 FCFA');
  });

  it('indique un total à confirmer quand le prix manque', () => {
    const message = orderWhatsappMessage({
      order_number: 'WMS-20260101-00002',
      customer_name: 'Aminata',
      items: [],
      total_fcfa: null,
    });
    expect(message).toContain('à confirmer');
  });
});
