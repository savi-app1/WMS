'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

interface Zone {
  id: number;
  name: string;
  fee_fcfa: number | null;
  active: number;
  note: string | null;
}

interface Settings {
  deliveryDefaultFee: number | null;
  whatsappNumber: string;
  contactEmail: string;
  announcement: string;
}

export function SettingsManager() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [newZone, setNewZone] = useState({ name: '', feeFcfa: '' as string, note: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [zoneData, settingsData] = await Promise.all([
        apiFetch<{ zones: Zone[] }>('/api/admin/delivery-zones'),
        apiFetch<{ settings: Settings }>('/api/admin/settings'),
      ]);
      setZones(zoneData.zones);
      setSettings(settingsData.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!settings) return;
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        json: {
          deliveryDefaultFee: settings.deliveryDefaultFee,
          whatsappNumber: settings.whatsappNumber,
          contactEmail: settings.contactEmail,
          announcement: settings.announcement,
        },
      });
      setMessage('Paramètres enregistrés.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  const addZone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/admin/delivery-zones', {
        method: 'POST',
        json: {
          name: newZone.name,
          feeFcfa: newZone.feeFcfa === '' ? null : Number(newZone.feeFcfa),
          active: true,
          note: newZone.note || undefined,
        },
      });
      setNewZone({ name: '', feeFcfa: '', note: '' });
      setMessage('Zone ajoutée.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout impossible.');
    }
  };

  const updateZone = async (zone: Zone, patch: Partial<Zone>) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/delivery-zones/${zone.id}`, {
        method: 'PATCH',
        json: {
          name: zone.name,
          feeFcfa: zone.fee_fcfa,
          active: zone.active === 1,
          note: zone.note ?? undefined,
          ...patch,
        },
      });
      setMessage('Zone mise à jour.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  };

  const removeZone = async (id: number) => {
    if (!window.confirm('Supprimer cette zone ?')) return;
    try {
      await apiFetch(`/api/admin/delivery-zones/${id}`, { method: 'DELETE' });
      setMessage('Zone supprimée.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-4">
      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}

      <section className="card-wms p-4">
        <h2 className="text-base font-extrabold text-brand-black">Paramètres généraux</h2>
        {settings && (
          <form onSubmit={saveSettings} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="s-whatsapp" className="label-wms">
                  Numéro WhatsApp (chiffres uniquement)
                </label>
                <input
                  id="s-whatsapp"
                  className="input-wms"
                  value={settings.whatsappNumber}
                  onChange={(event) => setSettings({ ...settings, whatsappNumber: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor="s-email" className="label-wms">
                  E-mail de contact
                </label>
                <input
                  id="s-email"
                  type="email"
                  className="input-wms"
                  value={settings.contactEmail}
                  onChange={(event) => setSettings({ ...settings, contactEmail: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor="s-fee" className="label-wms">
                  Frais de livraison par défaut (FCFA)
                </label>
                <input
                  id="s-fee"
                  type="number"
                  min={0}
                  className="input-wms"
                  value={settings.deliveryDefaultFee ?? ''}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      deliveryDefaultFee: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                  placeholder="Laisser vide = à confirmer"
                />
              </div>
              <div>
                <label htmlFor="s-announce" className="label-wms">
                  Annonce (facultatif)
                </label>
                <input
                  id="s-announce"
                  className="input-wms"
                  value={settings.announcement}
                  onChange={(event) => setSettings({ ...settings, announcement: event.target.value })}
                  placeholder="Ex. Livraison offerte ce week-end"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </form>
        )}
      </section>

      <section className="card-wms p-4">
        <h2 className="text-base font-extrabold text-brand-black">Zones de livraison</h2>
        <p className="mt-1 text-sm text-brand-gray">
          Laissez le frais vide pour afficher « à confirmer » sur le site.
        </p>

        <ul className="mt-3 space-y-2">
          {zones.map((zone) => (
            <li key={zone.id} className="rounded-lg border border-brand-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-brand-black">{zone.name}</p>
                <span
                  className={`badge-wms ${
                    zone.active === 1
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-neutral-300 bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {zone.active === 1 ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div>
                  <label className="label-wms !text-[11px]" htmlFor={`fee-${zone.id}`}>
                    Frais (FCFA)
                  </label>
                  <input
                    id={`fee-${zone.id}`}
                    type="number"
                    min={0}
                    defaultValue={zone.fee_fcfa ?? ''}
                    onBlur={(event) => {
                      const value = event.target.value === '' ? null : Number(event.target.value);
                      if (value !== zone.fee_fcfa) void updateZone(zone, { fee_fcfa: value });
                    }}
                    className="input-wms !min-h-[40px] !w-32 !py-1.5 text-sm"
                    placeholder="À confirmer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void updateZone(zone, { active: zone.active === 1 ? 0 : 1 })}
                  className="text-xs font-bold text-brand-gray"
                >
                  {zone.active === 1 ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  type="button"
                  onClick={() => void removeZone(zone.id)}
                  className="text-xs font-bold text-brand-red"
                >
                  Supprimer
                </button>
              </div>
              {zone.note && <p className="mt-1 text-xs text-brand-gray">{zone.note}</p>}
            </li>
          ))}
        </ul>

        <form onSubmit={addZone} className="mt-4 space-y-2 border-t border-brand-line pt-4">
          <p className="text-sm font-bold text-brand-black">Ajouter une zone</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="input-wms"
              placeholder="Nom de la zone"
              value={newZone.name}
              onChange={(event) => setNewZone({ ...newZone, name: event.target.value })}
              required
            />
            <input
              type="number"
              min={0}
              className="input-wms"
              placeholder="Frais (optionnel)"
              value={newZone.feeFcfa}
              onChange={(event) =>
                setNewZone({
                  ...newZone,
                  feeFcfa: event.target.value,
                })
              }
            />
            <input
              className="input-wms"
              placeholder="Note interne"
              value={newZone.note}
              onChange={(event) => setNewZone({ ...newZone, note: event.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary !min-h-[40px] !py-2 text-sm">
            Ajouter la zone
          </button>
        </form>
      </section>
    </div>
  );
}
