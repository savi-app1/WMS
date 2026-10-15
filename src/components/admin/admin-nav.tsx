'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export interface AdminNavItem {
  href: string;
  label: string;
  short: string;
  badge?: number;
  icon: string;
}

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const primary = items.slice(0, 4);
  const secondary = items.slice(4);

  return (
    <>
      {/* Navigation horizontale (mobile) */}
      <nav className="sticky top-0 z-40 border-b border-brand-line bg-white lg:hidden" aria-label="Navigation administration">
        <div className="flex items-center gap-1 overflow-x-auto px-2 py-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                isActive(item.href) ? 'bg-brand-red text-white' : 'text-brand-ink'
              }`}
            >
              {item.short}
              {item.badge ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-black px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </nav>

      {/* Menu « plus » mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-line bg-white lg:hidden">
        <div className="grid grid-cols-5">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${
                isActive(item.href) ? 'text-brand-red' : 'text-brand-gray'
              }`}
            >
              <span className="relative">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
                {item.badge ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </span>
              {item.short}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-brand-gray"
            aria-expanded={open}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Plus
          </button>
        </div>
        {open && (
          <div className="border-t border-brand-line bg-white p-3">
            <div className="grid grid-cols-2 gap-2">
              {secondary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                    isActive(item.href) ? 'border-brand-red text-brand-red' : 'border-brand-line text-brand-ink'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barre latérale (ordinateur) */}
      <aside className="hidden w-60 shrink-0 border-r border-brand-line bg-white lg:block">
        <div className="sticky top-0 p-3">
          <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-brand-gray">Espace WMS</p>
          <nav className="space-y-0.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive(item.href) ? 'bg-brand-red/10 text-brand-red' : 'text-brand-ink hover:bg-brand-light'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
