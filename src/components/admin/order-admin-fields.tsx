'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/client-api';

export function OrderAdminFields({
  orderId,
  initialNote,
  initialAmountPaid,
  initialTrackingCode,
}: {
  orderId: number;
  initialNote: string;
  initialAmountPaid: number | null;
  initialTrackingCode: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [amount, setAmount] = useState(initialAmountPaid === null ? '' : String(initialAmountPaid));
  const [tracking, setTracking] = useState(initialTrackingCode);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await apiFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        json: {
          note,
          amountPaidFcfa: amount === '' ? null : Number(amount),
          trackingCode: tracking,
        },
      });
      setStatus('Enregistré.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-wms p-4">
      <h2 className="text-base font-extrabold text-brand-black">Informations internes</h2>
      <form onSubmit={save} className="mt-3 space-y-3">
        <div>
          <label htmlFor="admin-note" className="label-wms">
            Note interne
          </label>
          <textarea
            id="admin-note"
            className="input-wms min-h-[72px]"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            placeholder="Disponibilité vérifiée, prix confirmé, point de livraison…"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="amount-paid" className="label-wms">
              Montant réellement encaissé (FCFA)
            </label>
            <input
              id="amount-paid"
              type="number"
              min={0}
              step={1}
              className="input-wms"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Laisser vide si non encaissé"
            />
          </div>
          <div>
            <label htmlFor="tracking" className="label-wms">
              Code de suivi
            </label>
            <input
              id="tracking"
              className="input-wms"
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
              maxLength={120}
              placeholder="Ex. BF1A2B3C"
            />
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        {status && <p className="text-sm font-semibold text-emerald-700">{status}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <p className="text-xs text-brand-gray">
          Le montant encaissé est distinct du montant commandé : une livraison n&apos;implique pas un
          paiement reçu.
        </p>
      </form>
    </section>
  );
}
