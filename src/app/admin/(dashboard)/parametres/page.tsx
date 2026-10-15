import type { Metadata } from 'next';
import { SettingsManager } from '@/components/admin/settings-manager';
import { countActiveSessions } from '@/lib/auth';
import { getCurrentAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Paramètres — WMS' };

export default async function AdminSettingsPage() {
  const user = await getCurrentAdmin();
  const sessions = user ? countActiveSessions(user.id) : 0;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Paramètres</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Coordonnées, frais de livraison et informations de la boutique.
        </p>
      </header>

      <section className="card-wms p-4">
        <h2 className="text-base font-extrabold text-brand-black">Compte administrateur</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-brand-gray">Identifiant</dt>
            <dd className="font-semibold text-brand-black">{user?.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-brand-gray">Nom affiché</dt>
            <dd className="font-semibold text-brand-black">{user?.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-brand-gray">Sessions actives</dt>
            <dd className="font-semibold text-brand-black">{sessions}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-brand-gray">Dernière connexion</dt>
            <dd className="font-semibold text-brand-black">
              {user?.last_login_at ? new Date(user.last_login_at).toLocaleString('fr-FR') : '—'}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-brand-gray">
          Le mot de passe se change via la variable d&apos;environnement <span className="font-mono">ADMIN_PASSWORD</span>,
          puis <span className="font-mono">npm run migrate</span>. Il n&apos;est jamais stocké en clair.
        </p>
      </section>

      <SettingsManager />
    </div>
  );
}
