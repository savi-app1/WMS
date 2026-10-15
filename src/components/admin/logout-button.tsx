'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* la session expire de toute façon */
    }
    router.replace('/admin/connexion');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-bold text-brand-ink transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50"
    >
      {loading ? 'Déconnexion…' : 'Déconnexion'}
    </button>
  );
}
