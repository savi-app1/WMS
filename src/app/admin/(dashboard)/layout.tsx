import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentAdmin } from '@/lib/auth';
import { newOrderCount, staleOrders } from '@/lib/stats';
import { AdminNav, type AdminNavItem } from '@/components/admin/admin-nav';
import { AdminLogoutButton } from '@/components/admin/logout-button';
import { BRAND_NAME } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administration WMS',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Contrôle d'accès réel, côté serveur.
  const user = await getCurrentAdmin();
  if (!user) redirect('/admin/connexion');

  const pending = newOrderCount();
  const stale = staleOrders(24).length;

  const items: AdminNavItem[] = [
    { href: '/admin', label: 'Tableau de bord', short: 'Accueil', badge: pending, icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
    { href: '/admin/commandes', label: 'Commandes', short: 'Commandes', badge: pending, icon: 'M6 2l3 4h11a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM8 13h8M8 17h5' },
    { href: '/admin/produits', label: 'Produits & stocks', short: 'Produits', icon: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10' },
    { href: '/admin/statistiques', label: 'Statistiques', short: 'Stats', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { href: '/admin/scripts', label: 'Scripts & contenus', short: 'Scripts', icon: 'M4 4h16v16H4zM8 9h8M8 13h5' },
    { href: '/admin/campagnes', label: 'Campagnes', short: 'Campagnes', icon: 'M3 11l18-7-8 18-2-8z' },
    { href: '/admin/recherche', label: 'Recherche & IA', short: 'Recherche', icon: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4' },
    { href: '/admin/trafic', label: 'Trafic web', short: 'Trafic', icon: 'M3 12h4l3 8 4-16 3 8h4' },
    { href: '/admin/parametres', label: 'Paramètres', short: 'Réglages', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 00-1.7-1L14.5 3h-5l-.4 2.6a7 7 0 00-1.7 1L5 5.6 3 9l2 1.5a7 7 0 000 2L3 14l2 3.4 2.4-1a7 7 0 001.7 1l.4 2.6h5l.4-2.6a7 7 0 001.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-brand-light">
      <header className="sticky top-0 z-40 border-b border-brand-line bg-white">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/brand/wms-logo.png" alt="" width={32} height={32} className="h-8 w-8" />
            <span className="text-sm font-extrabold text-brand-black">
              WMS <span className="hidden font-medium text-brand-gray sm:inline">· Administration</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {stale > 0 && (
              <Link
                href="/admin/commandes?statut=a_confirmer"
                className="hidden rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-900 sm:inline-flex"
              >
                {stale} sans traitement
              </Link>
            )}
            <span className="hidden text-xs font-semibold text-brand-gray sm:inline">{user.name}</span>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <AdminNav items={items} />
        <div className="min-w-0 flex-1 pb-20 lg:pb-8">
          <div className="p-3 sm:p-5">{children}</div>
        </div>
      </div>

      <footer className="hidden border-t border-brand-line bg-white px-5 py-3 text-xs text-brand-gray lg:block">
        {BRAND_NAME} — espace administration privé. Les données clients ne doivent pas être partagées.
      </footer>
    </div>
  );
}
