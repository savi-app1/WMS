'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from '@/lib/order-status';

const ACTION_STYLES: Record<string, string> = {
  nouvelle: 'bg-brand-red text-white border-brand-red',
  a_confirmer: 'bg-amber-500 text-white border-amber-500',
  confirmee: 'bg-blue-600 text-white border-blue-600',
  en_preparation: 'bg-violet-600 text-white border-violet-600',
  en_livraison: 'bg-cyan-600 text-white border-cyan-600',
  livree: 'bg-emerald-600 text-white border-emerald-600',
  annulee: 'bg-neutral-500 text-white border-neutral-500',
};

/**
 * Boutons de changement de statut — accès rapide, pensés pour un écran de
 * téléphone. Aucune transition automatique n'existe : chaque changement est
 * une action explicite de l'administrateur.
 */
export function OrderStatusButtons({
  orderId,
  currentStatus,
  compact = false,
  onChanged,
}: {
  orderId: number;
  currentStatus: string;
  compact?: boolean;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const change = async (status: OrderStatus) => {
    setBusy(status);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ message?: string }>(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        json: { status },
      });
      setMessage(result.message ?? 'Statut mis à jour.');
      onChanged?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusy(null);
    }
  };

  const targets = ORDER_STATUSES.filter((status) => status !== currentStatus);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {targets.map((status) => (
          <button
            key={status}
            type="button"
            disabled={busy !== null}
            onClick={() => change(status)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-opacity hover:opacity-90 disabled:opacity-40 ${
              compact ? '' : 'px-3 py-2 text-xs'
            } ${ACTION_STYLES[status]}`}
          >
            {busy === status ? '…' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      {message && !error && <p className="text-xs font-semibold text-emerald-700">{message}</p>}
    </div>
  );
}
