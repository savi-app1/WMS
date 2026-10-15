/**
 * Validation des entrées (côté serveur, source de vérité).
 * Toute donnée entrante passe par ces schémas avant d'atteindre la base.
 */
import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().max(max);

export const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999),
});

export const orderSchema = z.object({
  customerName: trimmed(120).min(2, 'Indiquez votre nom complet.'),
  phone: trimmed(30).min(6, 'Indiquez un numéro de téléphone valide.'),
  email: z
    .string()
    .trim()
    .max(160)
    .email('Adresse e-mail invalide.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  city: trimmed(80).optional(),
  address: trimmed(400).min(3, 'Indiquez une adresse de livraison.'),
  deliveryZone: trimmed(120).optional(),
  deliveryFeeFcfa: z.number().int().min(0).max(10_000_000).optional(),
  items: z.array(orderItemSchema).min(1, 'Ajoutez au moins un produit.').max(30),
  note: trimmed(1000).optional(),
  paymentMethod: z.enum(['paiement_livraison', 'mobile_money', 'a_confirmer']).default('paiement_livraison'),
  utm: z
    .object({
      source: trimmed(100).optional(),
      medium: trimmed(100).optional(),
      campaign: trimmed(100).optional(),
      content: trimmed(100).optional(),
      term: trimmed(100).optional(),
    })
    .optional(),
  website: z.string().max(0).optional(), // champ honeypot anti-spam : doit rester vide
});

export type OrderInput = z.infer<typeof orderSchema>;

export const productSchema = z.object({
  name: trimmed(160).min(2, 'Le nom du produit est obligatoire.'),
  slug: trimmed(120).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  shortDescription: trimmed(300).optional(),
  description: trimmed(8000).optional(),
  priceFcfa: z.number().int().min(0).max(100_000_000).nullable().optional(),
  priceType: z.enum(['unique', 'sur_demande', 'devis']).default('unique'),
  comparePriceFcfa: z.number().int().min(0).max(100_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).nullable().optional(),
  trackStock: z.boolean().default(false),
  sku: trimmed(60).optional(),
  images: z.array(trimmed(300)).max(12).default([]),
  specs: z.record(trimmed(200), trimmed(1000)).default({}),
  isDigital: z.boolean().default(false),
  isService: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  featured: z.boolean().default(false),
});

export type ProductInput = z.infer<typeof productSchema>;

export const scriptSchema = z.object({
  title: trimmed(160).min(2, 'Le titre est obligatoire.'),
  type: z
    .enum(['script_video', 'voix_off', 'texte_pub', 'post_social', 'dialogue_commercial', 'faq', 'autre'])
    .default('script_video'),
  channel: trimmed(60).optional(),
  body: trimmed(20000).min(2, 'Le contenu est obligatoire.'),
  notes: trimmed(4000).optional(),
  tags: z.array(trimmed(40)).max(20).default([]),
  source: trimmed(300).optional(),
  sourceUrl: trimmed(500).optional(),
  sourceDate: trimmed(40).optional(),
  status: z.enum(['brouillon', 'valide', 'archive']).default('brouillon'),
  productId: z.number().int().positive().nullable().optional(),
});

export type ScriptInput = z.infer<typeof scriptSchema>;

export const campaignSchema = z.object({
  name: trimmed(160).min(2, 'Le nom de la campagne est obligatoire.'),
  objective: trimmed(1000).optional(),
  productId: z.number().int().positive().nullable().optional(),
  adCopy: trimmed(8000).optional(),
  videoScript: trimmed(20000).optional(),
  platform: trimmed(60).optional(),
  productUrl: trimmed(500).optional(),
  utm: z
    .object({
      source: trimmed(100).optional(),
      medium: trimmed(100).optional(),
      campaign: trimmed(100).optional(),
      content: trimmed(100).optional(),
      term: trimmed(100).optional(),
    })
    .default({}),
  budgetFcfa: z.number().int().min(0).max(100_000_000).nullable().optional(),
  startDate: trimmed(40).optional(),
  endDate: trimmed(40).optional(),
  status: z.enum(['brouillon', 'pret', 'en_cours', 'termine']).default('brouillon'),
  notes: trimmed(4000).optional(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

export const researchNoteSchema = z.object({
  title: trimmed(200).min(2, 'Le titre est obligatoire.'),
  body: trimmed(20000).min(2, 'Le contenu est obligatoire.'),
  kind: z
    .enum(['tendance', 'concurrence', 'fournisseur', 'idee_video', 'idee_publication', 'assistant', 'autre'])
    .default('tendance'),
  sources: z
    .array(
      z.object({
        label: trimmed(300),
        url: trimmed(500),
        date: trimmed(40).optional(),
      }),
    )
    .max(30)
    .default([]),
  facts: trimmed(8000).optional(),
  confidence: z.enum(['verifie', 'estimation', 'a_verifier']).default('a_verifier'),
});

export type ResearchNoteInput = z.infer<typeof researchNoteSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.'),
  password: z.string().min(8, 'Mot de passe trop court.').max(200),
});

export const statusChangeSchema = z.object({
  status: z.string().min(2).max(40),
  note: trimmed(1000).optional(),
  amountPaidFcfa: z.number().int().min(0).max(100_000_000).nullable().optional(),
  trackingCode: trimmed(120).optional(),
});

export const deliveryZoneSchema = z.object({
  name: trimmed(120).min(2, 'Le nom de la zone est obligatoire.'),
  feeFcfa: z.number().int().min(0).max(10_000_000).nullable().optional(),
  active: z.boolean().default(true),
  note: trimmed(500).optional(),
});

/** Transforme les erreurs Zod en message unique lisible par un client. */
export function firstErrorMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Données invalides.';
  return issue.message;
}
