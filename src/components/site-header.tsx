'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { BRAND_NAME, BRAND_SHORT, CONTACT_PHONE_PRIMARY } from '@/lib/paths';

const NAV = [
  { href: '/', label: 'Accueil' },
  { href: '/boutique', label: 'Boutique' },
  { href: '/services', label: 'Services' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const update = () => {
      try {
        const raw = window.localStorage.getItem('wms_cart');
        const cart = raw ? JSON.parse(raw) : [];
        setCartCount(Array.isArray(cart) ? cart.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0);
      } catch {
        setCartCount(0);
      }
    };
    update();
    window.addEventListener('wms:cart-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('wms:cart-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-brand-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-wms">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${BRAND_NAME} — accueil`}>
            <Image
              src="/brand/wms-logo.png"
              alt={`Logo ${BRAND_NAME}`}
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0"
            />
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-extrabold tracking-tight text-brand-black">
                Wendmanegda <span className="text-brand-red">Multiples</span> Services
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-brand-gray">
                {BRAND_SHORT} · Ouagadougou, Burkina Faso
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive(item.href) ? 'text-brand-red' : 'text-brand-ink'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/commande"
              className="relative hidden rounded-lg p-2 text-brand-ink transition-colors hover:text-brand-red sm:block"
              aria-label={`Panier (${cartCount} article${cartCount > 1 ? 's' : ''})`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <a
              href={`https://wa.me/22656592557?text=${encodeURIComponent('Bonjour WMS, je souhaite des informations sur vos produits et services.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:inline-flex"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23z" />
              </svg>
              <span className="hidden lg:inline">{CONTACT_PHONE_PRIMARY}</span>
              <span className="lg:hidden">WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-brand-line text-brand-ink lg:hidden"
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div id="menu-mobile" className="border-t border-brand-line bg-white lg:hidden">
          <nav className="container-wms flex flex-col py-2" aria-label="Navigation mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-3 text-base font-semibold ${
                  isActive(item.href) ? 'bg-brand-light text-brand-red' : 'text-brand-ink'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/commande" className="rounded-lg px-3 py-3 text-base font-semibold text-brand-ink">
              Panier {cartCount > 0 ? `(${cartCount})` : ''}
            </Link>
            <a
              href={`https://wa.me/22656592557?text=${encodeURIComponent('Bonjour WMS, je souhaite des informations sur vos produits et services.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 mb-3 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 font-bold text-white"
            >
              Commander sur WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
