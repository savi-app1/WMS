import type { Metadata } from 'next';
import { listProducts } from '@/lib/products';
import { CampaignsManager } from '@/components/admin/campaigns-manager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Campagnes — WMS' };

export default function AdminCampaignsPage() {
  const products = listProducts({ includeUnpublished: true, limit: 500 });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Préparation de campagnes</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Les campagnes sont préparées et enregistrées ici. Aucune publication n&apos;est automatique et
          aucun budget n&apos;est engagé : la diffusion reste une action manuelle du propriétaire, avec
          les paramètres UTM de suivi.
        </p>
      </header>

      <CampaignsManager
        products={products.map((product) => ({ id: product.id, name: product.name, slug: product.slug }))}
      />
    </div>
  );
}
