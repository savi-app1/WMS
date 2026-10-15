'use client';

import { useState } from 'react';
import { formatFcfa } from '@/lib/format';

interface TrackResult {
  orderNumber: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  totalFcfa: number | null;
  pricePending: boolean;
  items: { name: string; quantity: number; unitPriceFcfa: number | null }[];
}

const STEPS = [
  { key: 'nouvelle', label: 'Commande reçue' },
  { key: 'a_confirmer', label: 'À confirmer' },
  { key: 'confirmee', label: 'Confirmée' },
  { key: 'en_preparation', label: 'En préparation' },
  { key: 'en_livraison', label: 'En livraison' },
  { key: 'livree', label: 'Livrée' },
];

const ORDER = STEPS.map((step) => step.key);

export function OrderTracker({ orderNumber, token = null }: { orderNumber: string; token?: string | null }) {
  const [number, setNumber] = useState(orderNumber);
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const target = number.trim();
    if (!target) {
      setError('Indiquez votre numéro de commande.');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ number: target });
      if (phone.trim()) params.set('phone', phone.trim());
      if (token) params.set('token', token);
      const response = await fetch(`/api/orders/track?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Commande introuvable.');
        setResult(null);
      } else {
        setResult(data);
      }
    } catch {
      setError('Connexion impossible. Réessayez ou contactez WMS sur WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = result ? ORDER.indexOf(result.status) : -1;

  return (
    <div className="mt-4">
      {!result && (
        <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {!orderNumber && (
            <div className="flex-1">
              <label htmlFor="track-number" className="label-wms">
                Numéro de commande
              </label>
              <input
                id="track-number"
                className="input-wms"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="Ex. WMS-20260101-12345"
                autoCapitalize="characters"
              />
            </div>
          )}
          <div className="flex-1">
            <label htmlFor="track-phone" className="label-wms">
              Téléphone utilisé lors de la commande
            </label>
            <input
              id="track-phone"
              type="tel"
              inputMode="tel"
              className="input-wms"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ex. 70 00 00 00"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Recherche…' : 'Voir ma commande'}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-brand-line p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-lg font-extrabold text-brand-black">{result.orderNumber}</p>
            <span className="badge-wms border-brand-red/20 bg-brand-red/10 text-brand-red">{result.statusLabel}</span>
          </div>

          {result.status !== 'annulee' && (
            <ol className="mt-4 space-y-2">
              {STEPS.map((step, index) => {
                const done = currentIndex >= index && currentIndex !== -1;
                const current = currentIndex === index;
                return (
                  <li key={step.key} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? 'bg-brand-red text-white' : 'bg-brand-line text-brand-gray'
                      }`}
                    >
                      {done ? '✓' : index + 1}
                    </span>
                    <span className={`text-sm ${current ? 'font-bold text-brand-black' : 'text-brand-gray'}`}>
                      {step.label}
                      {current && <span className="ml-2 text-xs font-semibold text-brand-red">en cours</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <ul className="mt-4 divide-y divide-brand-line border-t border-brand-line">
            {result.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-3 py-2 text-sm">
                <span className="font-semibold text-brand-black">
                  {item.name} <span className="text-brand-gray">× {item.quantity}</span>
                </span>
                <span>
                  {item.unitPriceFcfa === null
                    ? 'Prix à confirmer'
                    : formatFcfa(item.unitPriceFcfa * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex justify-between border-t border-brand-line pt-3 text-base">
            <span className="font-bold text-brand-black">Total</span>
            <span className="font-extrabold text-brand-red">
              {result.totalFcfa === null ? 'À confirmer par WMS' : formatFcfa(result.totalFcfa)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
