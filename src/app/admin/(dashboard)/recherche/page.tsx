import type { Metadata } from 'next';
import { listProducts } from '@/lib/products';
import { ResearchManager } from '@/components/admin/research-manager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Recherche & assistance — WMS' };

export default function AdminResearchPage() {
  const products = listProducts({ includeUnpublished: true, limit: 500 });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Recherche & assistance</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Préparer des recherches de tendances, d&apos;offres concurrentes, de fournisseurs et des idées de
          contenus. Chaque note conserve sa source et sa date ; les faits vérifiés sont distingués des
          estimations.
        </p>
      </header>

      <ResearchManager products={products.map((product) => ({ id: product.id, name: product.name }))} />
    </div>
  );
}
