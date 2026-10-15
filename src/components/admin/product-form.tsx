'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

export interface ProductFormValues {
  id?: number;
  name: string;
  categoryId: number | null;
  shortDescription: string;
  description: string;
  priceFcfa: number | null;
  priceType: string;
  comparePriceFcfa: number | null;
  stock: number | null;
  trackStock: boolean;
  sku: string;
  images: string[];
  specs: { label: string; value: string }[];
  isDigital: boolean;
  isService: boolean;
  isPublished: boolean;
  featured: boolean;
}

export function ProductForm({
  categories,
  initial,
}: {
  categories: { id: number; name: string }[];
  initial?: ProductFormValues;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProductFormValues>(
    initial ?? {
      name: '',
      categoryId: null,
      shortDescription: '',
      description: '',
      priceFcfa: null,
      priceType: 'unique',
      comparePriceFcfa: null,
      stock: null,
      trackStock: false,
      sku: '',
      images: [],
      specs: [],
      isDigital: false,
      isService: false,
      isPublished: true,
      featured: false,
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const update = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('alt', form.name);
      const result = await apiFetch<{ variants: Record<string, string> }>('/api/admin/upload', {
        method: 'POST',
        body,
      });
      const url = result.variants.md ?? result.variants.original ?? Object.values(result.variants)[0];
      if (url) {
        update('images', [...form.images, url].slice(0, 12));
        setMessage('Image ajoutée.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Téléversement impossible.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        name: form.name,
        categoryId: form.categoryId,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        priceFcfa: form.priceFcfa,
        priceType: form.priceType,
        comparePriceFcfa: form.comparePriceFcfa,
        stock: form.stock,
        trackStock: form.trackStock,
        sku: form.sku || undefined,
        images: form.images,
        specs: Object.fromEntries(
          form.specs.filter((spec) => spec.label.trim()).map((spec) => [spec.label.trim(), spec.value]),
        ),
        isDigital: form.isDigital,
        isService: form.isService,
        isPublished: form.isPublished,
        featured: form.featured,
      };
      if (form.id) {
        await apiFetch(`/api/admin/products/${form.id}`, { method: 'PATCH', json: payload });
        setMessage('Produit mis à jour.');
      } else {
        await apiFetch('/api/admin/products', { method: 'POST', json: payload });
        setMessage('Produit créé.');
        router.push('/admin/produits');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="p-name" className="label-wms">
          Nom du produit <span className="text-brand-red">*</span>
        </label>
        <input
          id="p-name"
          className="input-wms"
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          required
          minLength={2}
          maxLength={160}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="p-category" className="label-wms">
            Catégorie
          </label>
          <select
            id="p-category"
            className="input-wms"
            value={form.categoryId === null ? '' : String(form.categoryId)}
            onChange={(event) =>
              update('categoryId', event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">— Aucune —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-sku" className="label-wms">
            Référence interne
          </label>
          <input
            id="p-sku"
            className="input-wms"
            value={form.sku}
            onChange={(event) => update('sku', event.target.value)}
            maxLength={60}
          />
        </div>
      </div>

      <div>
        <label htmlFor="p-short" className="label-wms">
          Description courte (visible sur la fiche)
        </label>
        <input
          id="p-short"
          className="input-wms"
          value={form.shortDescription}
          onChange={(event) => update('shortDescription', event.target.value)}
          maxLength={300}
        />
      </div>

      <div>
        <label htmlFor="p-description" className="label-wms">
          Description complète
        </label>
        <textarea
          id="p-description"
          className="input-wms min-h-[120px]"
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          maxLength={8000}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="p-price" className="label-wms">
            Prix (FCFA)
          </label>
          <input
            id="p-price"
            type="number"
            min={0}
            step={1}
            className="input-wms"
            value={form.priceFcfa ?? ''}
            onChange={(event) =>
              update('priceFcfa', event.target.value === '' ? null : Number(event.target.value))
            }
            placeholder="Laisser vide = prix à confirmer"
          />
        </div>
        <div>
          <label htmlFor="p-price-type" className="label-wms">
            Type de prix
          </label>
          <select
            id="p-price-type"
            className="input-wms"
            value={form.priceType}
            onChange={(event) => update('priceType', event.target.value)}
          >
            <option value="unique">Prix unique</option>
            <option value="sur_demande">Sur demande</option>
            <option value="devis">Sur devis</option>
          </select>
        </div>
        <div>
          <label htmlFor="p-compare" className="label-wms">
            Prix barré (FCFA)
          </label>
          <input
            id="p-compare"
            type="number"
            min={0}
            step={1}
            className="input-wms"
            value={form.comparePriceFcfa ?? ''}
            onChange={(event) =>
              update('comparePriceFcfa', event.target.value === '' ? null : Number(event.target.value))
            }
          />
        </div>
        <div>
          <label htmlFor="p-stock" className="label-wms">
            Stock
          </label>
          <input
            id="p-stock"
            type="number"
            min={0}
            step={1}
            className="input-wms"
            value={form.stock ?? ''}
            onChange={(event) => update('stock', event.target.value === '' ? null : Number(event.target.value))}
            placeholder="Laisser vide = stock non géré"
            disabled={!form.trackStock}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <input
            type="checkbox"
            checked={form.trackStock}
            onChange={(event) => update('trackStock', event.target.checked)}
            className="h-5 w-5 rounded border-brand-line"
          />
          Suivre le stock
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(event) => update('isPublished', event.target.checked)}
            className="h-5 w-5 rounded border-brand-line"
          />
          Publié
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => update('featured', event.target.checked)}
            className="h-5 w-5 rounded border-brand-line"
          />
          En vedette
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <input
            type="checkbox"
            checked={form.isDigital}
            onChange={(event) => update('isDigital', event.target.checked)}
            className="h-5 w-5 rounded border-brand-line"
          />
          Produit numérique
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <input
            type="checkbox"
            checked={form.isService}
            onChange={(event) => update('isService', event.target.checked)}
            className="h-5 w-5 rounded border-brand-line"
          />
          Service
        </label>
      </div>

      {/* Visuels */}
      <div>
        <span className="label-wms">Visuels</span>
        <div className="flex flex-wrap gap-2">
          {form.images.map((image) => (
            <div key={image} className="relative h-20 w-20 overflow-hidden rounded-lg border border-brand-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => update('images', form.images.filter((item) => item !== image))}
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl-lg bg-brand-black/80 text-xs font-bold text-white"
                aria-label="Retirer cette image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="btn-outline mt-2 !min-h-[40px] !py-2 text-sm"
        >
          {uploading ? 'Traitement…' : 'Ajouter une image'}
        </button>
        <p className="mt-1 text-xs text-brand-gray">
          JPEG, PNG, WEBP ou GIF, 5 Mo maximum. Les images sont automatiquement converties en WEBP.
        </p>
      </div>

      {/* Caractéristiques */}
      <div>
        <span className="label-wms">Caractéristiques</span>
        <div className="space-y-2">
          {form.specs.map((spec, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="input-wms"
                placeholder="Caractéristique (ex. Capacité)"
                value={spec.label}
                onChange={(event) => {
                  const next = [...form.specs];
                  next[index] = { ...next[index], label: event.target.value };
                  update('specs', next);
                }}
              />
              <input
                className="input-wms"
                placeholder="Valeur"
                value={spec.value}
                onChange={(event) => {
                  const next = [...form.specs];
                  next[index] = { ...next[index], value: event.target.value };
                  update('specs', next);
                }}
              />
              <button
                type="button"
                onClick={() => update('specs', form.specs.filter((_, i) => i !== index))}
                className="shrink-0 rounded-lg border border-brand-line px-3 text-brand-red"
                aria-label="Supprimer cette caractéristique"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => update('specs', [...form.specs, { label: '', value: '' }])}
          className="mt-2 text-sm font-bold text-brand-red"
        >
          + Ajouter une caractéristique
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {message}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Enregistrement…' : initial?.id ? 'Enregistrer les modifications' : 'Créer le produit'}
      </button>
    </form>
  );
}
