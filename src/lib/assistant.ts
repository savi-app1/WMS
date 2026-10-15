/**
 * Module d'assistance WMS.
 *
 * Deux modes, explicitement distingués :
 *  1. MODE LOCAL (toujours disponible, coût nul) : génération de brouillons à
 *     partir des informations RÉELLEMENT enregistrées en base (nom, description,
 *     caractéristiques, prix). Rien n'est inventé : les champs manquants sont
 *     signalés comme « à compléter ».
 *  2. MODE CONNECTEUR (désactivé par défaut) : appel à un fournisseur d'IA
 *     configuré par variable d'environnement. Sans clé, le module refuse
 *     l'appel et le dit clairement — aucune fausse réponse n'est simulée.
 */
import { getProductById, listProducts } from './products';
import { listResearchNotes } from './scripts';
import { formatFcfa } from './format';

export interface AssistantDraft {
  kind: string;
  title: string;
  content: string;
  warnings: string[];
}

export type AiProvider = 'openai' | 'anthropic' | 'google';

export function detectProvider(): { provider: AiProvider | null; configured: boolean } {
  if (process.env.OPENAI_API_KEY) return { provider: 'openai', configured: true };
  if (process.env.ANTHROPIC_API_KEY) return { provider: 'anthropic', configured: true };
  if (process.env.GOOGLE_AI_API_KEY) return { provider: 'google', configured: true };
  return { provider: null, configured: false };
}

/** Brouillon local : fiche produit → description, accroches, pitch WhatsApp, FAQ. */
export function buildProductDraft(productId: number): AssistantDraft {
  const product = getProductById(productId);
  if (!product) {
    return {
      kind: 'erreur',
      title: 'Produit introuvable',
      content: 'Vérifiez le produit sélectionné.',
      warnings: [],
    };
  }

  const warnings: string[] = [];
  if (product.price_fcfa === null) warnings.push('Prix non renseigné : à compléter avant publication.');
  if (product.track_stock === 1 && product.stock === null) warnings.push('Stock non renseigné.');
  if (product.images_list.length === 0) warnings.push('Aucun visuel : ajouter une photo réelle du produit.');
  if (product.specs_list.length === 0) warnings.push('Caractéristiques non renseignées.');

  const price = product.price_fcfa !== null ? formatFcfa(product.price_fcfa) : 'à confirmer par WMS';
  const specs = product.specs_list.map((spec) => `- ${spec.label} : ${spec.value}`).join('\n');

  const content = `## Description courte (fiche produit)
${product.short_description ?? `${product.name} disponible chez Wendmanegda Multiples Services. Prix : ${price}.`}

## Description longue (brouillon)
${product.description ?? `Le produit « ${product.name} » est disponible chez Wendmanegda Multiples Services. ${
    product.category_name ? `Il appartient à la catégorie ${product.category_name}. ` : ''
  }Le prix est de ${price}. WMS vérifie la disponibilité et le tarif exact avant validation de la commande, puis organise la livraison à Ouagadougou et dans les environs, avec paiement à la livraison.`}

${
  product.specs_list.length > 0
    ? `## Caractéristiques\n${specs}\n`
    : '## Caractéristiques\nÀ compléter par WMS à partir des informations réelles du produit.\n'
}
## Accroches courtes (à valider)
1. ${product.name} — ${price}, livraison à Ouagadougou.
2. Commande en ligne, paiement à la livraison, service WMS.
3. Disponibilité confirmée par WMS avant expédition.

## Message WhatsApp (à valider)
Bonjour WMS, je souhaite des informations sur « ${product.name} »${product.price_fcfa ? ` (${price})` : ''}.

## FAQ courte
- Le prix est-il définitif ? → Les prix affichés sont ceux de WMS ; ceux marqués « à confirmer » sont communiqués avant facturation.
- Quand suis-je livré(e) ? → Le délai est confirmé avec vous lors de la validation de la commande.
- Comment payer ? → À la livraison (Mobile Money selon les modalités convenues).`;

  return {
    kind: 'fiche-produit',
    title: `Brouillon — ${product.name}`,
    content,
    warnings,
  };
}

/** Plan de recherche construit à partir des données réelles du catalogue. */
export function buildResearchDraft(queryText: string): AssistantDraft {
  const products = listProducts({ includeUnpublished: true, limit: 50 });
  const notes = listResearchNotes();
  const normalized = queryText.toLowerCase();

  const matching = products.filter((product) =>
    `${product.name} ${product.category_name ?? ''} ${product.short_description ?? ''}`
      .toLowerCase()
      .includes(normalized),
  );

  const content = `# Plan de recherche — « ${queryText} »

## Angle mort dans le catalogue
${
  matching.length === 0
    ? 'Aucun produit du catalogue ne correspond directement à cette recherche. Deux options :\n- vérifier si la demande doit être servie par une commande spéciale (à annoncer au client),\n- créer une fiche produit dédiée avec les informations vérifiées.'
    : matching
        .map(
          (product) =>
            `- ${product.name} (${product.category_name ?? 'sans catégorie'}) — prix : ${
              product.price_fcfa !== null ? formatFcfa(product.price_fcfa) : 'à confirmer'
            } — ${product.stock !== null ? `stock : ${product.stock}` : 'stock non renseigné'}`,
        )
        .join('\n')
}

## Points à vérifier avant d'affirmer quoi que ce soit
1. La disponibilité réelle du produit (à confirmer par WMS, jamais supposée).
2. Le prix de marché public : le citer avec sa source et sa date, sans le présenter comme un tarif WMS.
3. L'existence d'un fournisseur : noter le nom, le contact et la date de vérification.

## Notes de recherche déjà enregistrées
${
  notes.length === 0
    ? 'Aucune note de recherche enregistrée pour le moment.'
    : notes
        .slice(0, 5)
        .map((note) => `- [${note.confidence}] ${note.title} (${note.sources_list.length} source(s))`)
        .join('\n')
}

## Règles de rédaction
- Ne jamais inventer une caractéristique, un prix ou une garantie.
- Distinguer les faits vérifiés (avec source et date) des estimations.
- Les textes générés restent des brouillons jusqu'à validation.`;

  return {
    kind: 'plan-recherche',
    title: `Plan de recherche — ${queryText}`,
    content,
    warnings: [
      'Ce plan ne contient aucune donnée de marché vérifiée : les sources doivent être ajoutées manuellement avec leur URL et leur date.',
    ],
  };
}
