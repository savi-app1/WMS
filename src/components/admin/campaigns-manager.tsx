'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

interface Campaign {
  id: number;
  name: string;
  objective: string | null;
  product_id: number | null;
  product_name?: string | null;
  ad_copy: string | null;
  video_script: string | null;
  platform: string | null;
  product_url: string | null;
  utm_params: Record<string, string>;
  budget_fcfa: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
}

interface ProductOption {
  id: number;
  name: string;
  slug: string;
}

const STATUSES = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'pret', label: 'Prêt' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
];

const EMPTY = {
  name: '',
  objective: '',
  productId: null as number | null,
  adCopy: '',
  videoScript: '',
  platform: '',
  productUrl: '',
  utm: { source: '', medium: '', campaign: '', content: '', term: '' },
  budgetFcfa: null as number | null,
  startDate: '',
  endDate: '',
  status: 'brouillon',
  notes: '',
};

export function CampaignsManager({ products }: { products: ProductOption[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ campaigns: Campaign[] }>('/api/admin/campaigns');
      setCampaigns(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectProduct = (productId: number | null) => {
    const product = products.find((item) => item.id === productId);
    setForm((current) => ({
      ...current,
      productId,
      productUrl:
        product && !current.productUrl
          ? `${window.location.origin}/boutique/${product.slug}`
          : current.productUrl,
    }));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const payload = {
      name: form.name,
      objective: form.objective || undefined,
      productId: form.productId,
      adCopy: form.adCopy || undefined,
      videoScript: form.videoScript || undefined,
      platform: form.platform || undefined,
      productUrl: form.productUrl || undefined,
      utm: Object.fromEntries(Object.entries(form.utm).filter(([, value]) => value.trim() !== '')),
      budgetFcfa: form.budgetFcfa,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      status: form.status,
      notes: form.notes || undefined,
    };
    try {
      if (editing) {
        await apiFetch(`/api/admin/campaigns/${editing.id}`, { method: 'PATCH', json: payload });
        setMessage('Campagne mise à jour.');
      } else {
        await apiFetch('/api/admin/campaigns', { method: 'POST', json: payload });
        setMessage('Campagne enregistrée.');
      }
      setEditing(null);
      setForm({ ...EMPTY });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Supprimer cette campagne ?')) return;
    try {
      await apiFetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
      setMessage('Campagne supprimée.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  const buildTrackedUrl = (campaign: Campaign) => {
    if (!campaign.product_url) return '';
    const url = new URL(campaign.product_url, window.location.origin);
    Object.entries(campaign.utm_params ?? {}).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    return url.toString();
  };

  return (
    <div className="space-y-4">
      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}

      <form onSubmit={save} className="card-wms space-y-3 p-4">
        <h2 className="text-base font-extrabold text-brand-black">
          {editing ? 'Modifier la campagne' : 'Nouvelle campagne'}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="c-name" className="label-wms">
              Nom de la campagne
            </label>
            <input
              id="c-name"
              className="input-wms"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="c-product" className="label-wms">
              Produit ou service concerné
            </label>
            <select
              id="c-product"
              className="input-wms"
              value={form.productId === null ? '' : String(form.productId)}
              onChange={(event) => selectProduct(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">— Aucun —</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-platform" className="label-wms">
              Plateforme cible
            </label>
            <input
              id="c-platform"
              className="input-wms"
              value={form.platform}
              onChange={(event) => setForm({ ...form, platform: event.target.value })}
              placeholder="facebook, radio, whatsapp…"
            />
          </div>
          <div>
            <label htmlFor="c-status" className="label-wms">
              Statut
            </label>
            <select
              id="c-status"
              className="input-wms"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="c-objective" className="label-wms">
            Objectif
          </label>
          <input
            id="c-objective"
            className="input-wms"
            value={form.objective}
            onChange={(event) => setForm({ ...form, objective: event.target.value })}
            placeholder="Générer des demandes WhatsApp, vendre un lot, faire connaître la boutique…"
          />
        </div>

        <div>
          <label htmlFor="c-copy" className="label-wms">
            Texte publicitaire
          </label>
          <textarea
            id="c-copy"
            className="input-wms min-h-[110px]"
            value={form.adCopy}
            onChange={(event) => setForm({ ...form, adCopy: event.target.value })}
          />
        </div>

        <div>
          <label htmlFor="c-script" className="label-wms">
            Script vidéo / voix off
          </label>
          <textarea
            id="c-script"
            className="input-wms min-h-[110px]"
            value={form.videoScript}
            onChange={(event) => setForm({ ...form, videoScript: event.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="c-url" className="label-wms">
              Lien vers la fiche produit
            </label>
            <input
              id="c-url"
              className="input-wms"
              value={form.productUrl}
              onChange={(event) => setForm({ ...form, productUrl: event.target.value })}
              placeholder="https://…"
            />
          </div>
          <div>
            <label htmlFor="c-budget" className="label-wms">
              Budget prévu (FCFA)
            </label>
            <input
              id="c-budget"
              type="number"
              min={0}
              className="input-wms"
              value={form.budgetFcfa ?? ''}
              onChange={(event) =>
                setForm({ ...form, budgetFcfa: event.target.value === '' ? null : Number(event.target.value) })
              }
            />
          </div>
          <div>
            <label htmlFor="c-start" className="label-wms">
              Date de début
            </label>
            <input
              id="c-start"
              type="date"
              className="input-wms"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="c-end" className="label-wms">
              Date de fin
            </label>
            <input
              id="c-end"
              type="date"
              className="input-wms"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
            />
          </div>
        </div>

        <fieldset className="rounded-lg border border-brand-line p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-brand-gray">
            Paramètres UTM (suivi des visites)
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['source', 'medium', 'campaign', 'content', 'term'] as const).map((key) => (
              <div key={key}>
                <label htmlFor={`c-utm-${key}`} className="label-wms !text-[11px]">
                  utm_{key}
                </label>
                <input
                  id={`c-utm-${key}`}
                  className="input-wms !min-h-[40px] !py-1.5 text-sm"
                  value={form.utm[key]}
                  onChange={(event) => setForm({ ...form, utm: { ...form.utm, [key]: event.target.value } })}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="c-notes" className="label-wms">
            Notes
          </label>
          <textarea
            id="c-notes"
            className="input-wms min-h-[70px]"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">
            {editing ? 'Enregistrer' : 'Créer la campagne'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({ ...EMPTY });
              }}
              className="btn-outline"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <ul className="space-y-2.5">
        {campaigns.map((campaign) => (
          <li key={campaign.id} className="card-wms p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-brand-black">{campaign.name}</p>
                <p className="mt-0.5 text-xs text-brand-gray">
                  {campaign.platform ?? 'Plateforme non définie'}
                  {campaign.product_name ? ` · ${campaign.product_name}` : ''}
                  {campaign.budget_fcfa ? ` · budget ${campaign.budget_fcfa} FCFA` : ''}
                </p>
              </div>
              <span className="badge-wms border-brand-line bg-brand-light text-brand-gray">
                {STATUSES.find((status) => status.value === campaign.status)?.label ?? campaign.status}
              </span>
            </div>
            {campaign.objective && <p className="mt-1.5 text-xs text-brand-gray">{campaign.objective}</p>}
            {buildTrackedUrl(campaign) && (
              <p className="mt-2 break-all rounded-lg bg-brand-light p-2 text-[11px] text-brand-ink">
                <span className="font-bold">Lien suivi :</span> {buildTrackedUrl(campaign)}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setEditing(campaign);
                  setForm({
                    name: campaign.name,
                    objective: campaign.objective ?? '',
                    productId: campaign.product_id,
                    adCopy: campaign.ad_copy ?? '',
                    videoScript: campaign.video_script ?? '',
                    platform: campaign.platform ?? '',
                    productUrl: campaign.product_url ?? '',
                    utm: {
                      source: campaign.utm_params?.source ?? '',
                      medium: campaign.utm_params?.medium ?? '',
                      campaign: campaign.utm_params?.campaign ?? '',
                      content: campaign.utm_params?.content ?? '',
                      term: campaign.utm_params?.term ?? '',
                    },
                    budgetFcfa: campaign.budget_fcfa,
                    startDate: campaign.start_date ?? '',
                    endDate: campaign.end_date ?? '',
                    status: campaign.status,
                    notes: campaign.notes ?? '',
                  });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-brand-red"
              >
                Modifier
              </button>
              <button type="button" onClick={() => remove(campaign.id)} className="text-brand-gray">
                Supprimer
              </button>
            </div>
          </li>
        ))}
        {campaigns.length === 0 && (
          <li className="card-wms p-6 text-center text-sm text-brand-gray">Aucune campagne préparée.</li>
        )}
      </ul>
    </div>
  );
}
