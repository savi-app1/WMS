'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

const VISITOR_KEY = 'wms_visitor';

/**
 * Mesure d'audience :
 *  - First party (WMS) : chaque page vue est enregistrée dans la base WMS.
 *  - Google Analytics 4 : activé uniquement si NEXT_PUBLIC_GA_ID est défini.
 *  - paramètres UTM capturés depuis l'URL d'origine et conservés.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    if (!pathname) return;

    let visitorId = '';
    try {
      visitorId = window.localStorage.getItem(VISITOR_KEY) ?? '';
      if (!visitorId) {
        visitorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem(VISITOR_KEY, visitorId);
      }
    } catch {
      visitorId = 'anonymous';
    }

    const params = new URLSearchParams(searchParams?.toString() ?? '');
    const utm = {
      source: params.get('utm_source') ?? undefined,
      medium: params.get('utm_medium') ?? undefined,
      campaign: params.get('utm_campaign') ?? undefined,
      content: params.get('utm_content') ?? undefined,
      term: params.get('utm_term') ?? undefined,
    };

    // Mémorise les UTM pour les pages visitées ensuite
    try {
      const stored = utm.source ? { ...utm, ts: Date.now() } : JSON.parse(window.localStorage.getItem('wms_utm') || 'null');
      if (utm.source) window.localStorage.setItem('wms_utm', JSON.stringify(stored));
    } catch {
      /* stockage indisponible */
    }

    const device = /android|iphone|ipad|mobile/i.test(window.navigator.userAgent) ? 'mobile' : 'desktop';

    const payload = {
      type: 'page_view',
      path: pathname,
      referrer: document.referrer || undefined,
      device,
      visitorId,
      utm: Object.values(utm).some(Boolean)
        ? utm
        : (() => {
            try {
              const saved = JSON.parse(window.localStorage.getItem('wms_utm') || 'null');
              return saved ? { source: saved.source, medium: saved.medium, campaign: saved.campaign, content: saved.content, term: saved.term } : utm;
            } catch {
              return utm;
            }
          })(),
    };

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);

    if (gaId && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: pathname });
    }
  }, [pathname, searchParams, gaId]);

  // Suivi des clics WhatsApp (bouton flottant et boutons produits)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.('a');
      if (!target) return;
      const href = target.getAttribute('href') ?? '';
      if (!href.includes('wa.me')) return;
      const visitorId = (() => {
        try {
          return window.localStorage.getItem(VISITOR_KEY) ?? 'anonymous';
        } catch {
          return 'anonymous';
        }
      })();
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'whatsapp_click',
          path: window.location.pathname,
          device: /android|iphone|ipad|mobile/i.test(window.navigator.userAgent) ? 'mobile' : 'desktop',
          visitorId,
        }),
        keepalive: true,
      }).catch(() => undefined);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
        data-event="ga4"
      />
      <Script id="wms-ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
