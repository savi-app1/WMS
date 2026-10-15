import type { Metadata } from 'next';
import { isGa4Configured, trafficSummary } from '@/lib/analytics';
import { BarChart, LineChart } from '@/components/admin/charts';
import { StatCard } from '@/components/admin/stat-card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Trafic web — WMS' };

export default function AdminTrafficPage() {
  const traffic = trafficSummary(30);
  const ga4 = isGa4Configured();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Trafic web</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Mesure directe par WMS des pages consultées (30 derniers jours). Ces chiffres sont réellement
          enregistrés sur ce site : ils ne proviennent pas des plateformes publicitaires.
        </p>
      </header>

      {!traffic.hasData ? (
        <div className="card-wms p-6 text-center">
          <p className="text-base font-bold text-brand-black">Aucune donnée de trafic disponible pour l&apos;instant.</p>
          <p className="mt-2 text-sm text-brand-gray">
            La mesure démarre dès la première visite du site public. Aucune donnée n&apos;est inventée ni
            estimée à la place de données réelles.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Pages vues" value={traffic.totalViews} hint="30 derniers jours" tone="red" />
            <StatCard label="Visiteurs" value={traffic.uniqueVisitors} hint="identifiants anonymes" tone="blue" />
            <StatCard label="Fiches produit" value={traffic.productViews} hint="pages produit vues" tone="violet" />
            <StatCard label="Clics WhatsApp" value={traffic.whatsappClicks} hint="ouvrent une conversation" tone="green" />
            <StatCard label="Commandes démarrées" value={traffic.checkoutStarts} hint="formulaire ouvert" tone="cyan" />
            <StatCard label="Commandes créées" value={traffic.ordersCreated} hint="enregistrées en base" tone="amber" />
          </div>

          <section className="card-wms p-4">
            <h2 className="text-base font-extrabold text-brand-black">Pages vues par jour</h2>
            <div className="mt-4">
              <LineChart data={traffic.byDay.map((point) => ({ label: point.day, value: point.views }))} />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card-wms p-4">
              <h2 className="text-base font-extrabold text-brand-black">Origines du trafic (UTM)</h2>
              <div className="mt-4">
                <BarChart
                  data={traffic.bySource.map((source) => ({ label: source.source, value: source.views }))}
                  formatValue={(value) => `${value} vue(s)`}
                />
              </div>
            </section>

            <section className="card-wms p-4">
              <h2 className="text-base font-extrabold text-brand-black">Pages les plus consultées</h2>
              <div className="mt-4">
                <BarChart
                  data={traffic.topPaths.map((path) => ({ label: path.path, value: path.views }))}
                  formatValue={(value) => `${value} vue(s)`}
                />
              </div>
            </section>
          </div>

          <section className="card-wms p-4">
            <h2 className="text-base font-extrabold text-brand-black">Sites référents</h2>
            {traffic.byReferrer.length === 0 ? (
              <p className="mt-2 text-sm text-brand-gray">Aucun référent externe enregistré.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {traffic.byReferrer.map((referrer) => (
                  <li key={referrer.referrer} className="flex justify-between gap-3">
                    <span className="truncate text-brand-gray">{referrer.referrer}</span>
                    <span className="shrink-0 font-bold text-brand-black">{referrer.views}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="card-wms p-4">
        <h2 className="text-base font-extrabold text-brand-black">Google Analytics 4</h2>
        {ga4 ? (
          <p className="mt-2 text-sm text-brand-gray">
            GA4 est configuré (identifiant{' '}
            <span className="font-mono">{process.env.NEXT_PUBLIC_GA_ID}</span>) et chargé en complément de la
            mesure interne.
          </p>
        ) : (
          <p className="mt-2 text-sm text-brand-gray">
            GA4 n&apos;est pas configuré : aucune donnée GA4 n&apos;est disponible, et aucun chiffre
            n&apos;est simulé. Pour l&apos;activer, renseignez <span className="font-mono">NEXT_PUBLIC_GA_ID</span>{' '}
            dans les variables d&apos;environnement, puis redéployez.
          </p>
        )}
        <p className="mt-2 text-xs text-brand-gray">
          Le taux de clics des publicités publicitaires doit être lu dans la plateforme publicitaire
          (Meta, TikTok…) : il ne se déduit pas du trafic du site.
        </p>
      </section>
    </div>
  );
}
