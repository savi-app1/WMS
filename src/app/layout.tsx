import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { WhatsAppFloat } from '@/components/whatsapp-float';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { BRAND_NAME, BRAND_TAGLINE, SITE_URL } from '@/lib/paths';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — Boutique en ligne à Ouagadougou`,
    template: `%s | ${BRAND_NAME}`,
  },
  description:
    'Wendmanegda Multiples Services (WMS) : smartphones, accessoires, électronique, produits numériques et formations à Ouagadougou. Commande en ligne, paiement à la livraison, livraison rapide.',
  applicationName: BRAND_NAME,
  keywords: [
    'Wendmanegda Multiples Services',
    'WMS Ouagadougou',
    'boutique en ligne Burkina Faso',
    'smartphone Ouagadougou',
    'accessoires téléphone Burkina Faso',
    'WMS Academy',
    'e-commerce Burkina Faso',
  ],
  authors: [{ name: BRAND_NAME }],
  openGraph: {
    type: 'website',
    locale: 'fr_BF',
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — Boutique en ligne`,
    description: BRAND_TAGLINE,
    url: SITE_URL,
    images: [{ url: '/brand/og-default.png', width: 1200, height: 630, alt: BRAND_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — Boutique en ligne`,
    description: BRAND_TAGLINE,
    images: ['/brand/og-default.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/icons/favicon.png', type: 'image/png' },
      { url: '/icons/icon-192.png', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
    shortcut: '/icons/favicon.png',
  },
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  category: 'e-commerce',
};

export const viewport: Viewport = {
  themeColor: '#e30613',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-brand-ink antialiased">
        <a href="#contenu" className="skip-link">
          Aller au contenu principal
        </a>
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        <ServiceWorkerRegister />
        <SiteHeader />
        <main id="contenu" className="min-h-[60vh]">
          {children}
        </main>
        <SiteFooter />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
