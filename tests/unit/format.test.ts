import { describe, expect, it } from 'vitest';
import {
  formatFcfa,
  formatPhone,
  isValidBurkinaPhone,
  matchesPhoneTail,
  normalizePhone,
  slugify,
} from '@/lib/format';

/**
 * Les montants français utilisent une espace fine insécable (U+202F) comme
 * séparateur de milliers : on la normalise pour comparer les chaînes.
 */
const plain = (value: string) => value.replace(/[\u202f\u00a0]/g, ' ');

describe('formatFcfa', () => {
  it('formate un montant en FCFA', () => {
    expect(plain(formatFcfa(15000))).toBe('15 000 FCFA');
    expect(plain(formatFcfa(1234567))).toBe('1 234 567 FCFA');
  });

  it('indique « Prix à confirmer » quand le montant est absent', () => {
    expect(formatFcfa(null)).toBe('Prix à confirmer');
    expect(formatFcfa(undefined)).toBe('Prix à confirmer');
  });

  it('gère le montant zéro', () => {
    expect(plain(formatFcfa(0))).toBe('0 FCFA');
  });
});

describe('normalizePhone', () => {
  it('normalise un numéro burkinabè local', () => {
    expect(normalizePhone('70 00 13 17')).toBe('22670001317');
  });

  it('normalise un numéro avec l\'indicatif pays', () => {
    expect(normalizePhone('+226 56 59 25 57')).toBe('22656592557');
  });

  it('conserve un numéro déjà normalisé', () => {
    expect(normalizePhone('22656592557')).toBe('22656592557');
  });
});

describe('isValidBurkinaPhone', () => {
  it('accepte un numéro valide', () => {
    expect(isValidBurkinaPhone('+226 56 59 25 57')).toBe(true);
    expect(isValidBurkinaPhone('56592557')).toBe(true);
  });

  it('refuse un numéro trop court', () => {
    expect(isValidBurkinaPhone('12345')).toBe(false);
  });
});

describe('formatPhone', () => {
  it('affiche un numéro lisible', () => {
    expect(formatPhone('22656592557')).toBe('+226 56 59 25 57');
  });
});

describe('matchesPhoneTail', () => {
  const enregistre = '+226 70 12 34 56';

  it('accepte les 4 derniers chiffres du numéro enregistré', () => {
    expect(matchesPhoneTail('3456', enregistre)).toBe(true);
    expect(matchesPhoneTail('70 12 34 56', enregistre)).toBe(true);
    expect(matchesPhoneTail('+226 70 12 34 56', enregistre)).toBe(true);
  });

  it('accepte un numéro se terminant par 0000', () => {
    // Cas sensible : « 0000 » ressemble à un indicatif international et ne doit
    // pas être normalisé comme tel, sinon le suivi de commande échoue.
    expect(matchesPhoneTail('0000', '+226 70 00 00 00')).toBe(true);
  });

  it('refuse un numéro différent ou trop court', () => {
    expect(matchesPhoneTail('9999', enregistre)).toBe(false);
    expect(matchesPhoneTail('345', enregistre)).toBe(false);
    expect(matchesPhoneTail('', enregistre)).toBe(false);
  });
});

describe('slugify', () => {
  it('produit un slug stable et URL-friendly', () => {
    expect(slugify('Batterie externe 6000 mAh')).toBe('batterie-externe-6000-mah');
  });

  it('supprime les accents', () => {
    expect(slugify('Écouteurs Bluetooth')).toBe('ecouteurs-bluetooth');
  });

  it('ne produit que des caractères valides dans une URL', () => {
    // Une chaîne sans lettre ni chiffre ne produit rien : les appelants
    // (création de produit) appliquent alors un repli explicite « produit ».
    expect(slugify('***')).toBe('');
    expect(slugify('Écouteurs & casques !')).toBe('ecouteurs-casques');
  });
});
