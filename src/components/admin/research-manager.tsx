'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

interface ResearchNote {
  id: number;
  title: string;
  body: string;
  kind: string;
  sources_list: { label: string; url: string; date?: string }[];
  facts: string | null;
  confidence: string;
  updated_at: string;
}

const KINDS = [
  { value: 'tendance', label: 'Tendance de marché' },
  { value: 'concurrence', label: 'Offre concurrente' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'idee_video', label: 'Idée de vidéo' },
  { value: 'idee_publication', label: 'Idée de publication' },
  { value: 'assistant', label: 'Assistance / brouillon' },
  { value: 'autre', label: 'Autre' },
];

const CONFIDENCE = [
  { value: 'verifie', label: 'Vérifié' },
  { value: 'estimation', label: 'Estimation' },
  { value: 'a_verifier', label: 'À vérifier' },
];

const EMPTY = {
  title: '',
  body: '',
  kind: 'tendance',
  sources: '',
  facts: '',
  confidence: 'a_verifier',
};

export function ResearchManager({ products }: { products: { id: number; name: string }[] }) {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<ResearchNote | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assistant, setAssistant] = useState<string | null>(null);
  const [assistantTitle, setAssistantTitle] = useState<string | null>(null);
  const [assistantWarnings, setAssistantWarnings] = useState<string[]>([]);
  const [provider, setProvider] = useState<{ configured: boolean; provider: string | null } | null>(null);
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ notes: ResearchNote[] }>('/api/admin/research');
      setNotes(data.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
    apiFetch<{ providerConfigured: boolean; provider: string | null }>('/api/admin/assistant')
      .then((data) => setProvider({ configured: data.providerConfigured, provider: data.provider }))
      .catch(() => setProvider({ configured: false, provider: null }));
  }, [load]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const sources = form.sources
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, url, date] = line.split('|').map((part) => part.trim());
        return { label: label || url, url: url || label, date: date || undefined };
      });

    const payload = {
      title: form.title,
      body: form.body,
      kind: form.kind,
      sources,
      facts: form.facts || undefined,
      confidence: form.confidence,
    };

    try {
      if (editing) {
        await apiFetch(`/api/admin/research/${editing.id}`, { method: 'PATCH', json: payload });
        setMessage('Note mise à jour.');
      } else {
        await apiFetch('/api/admin/research', { method: 'POST', json: payload });
        setMessage('Note enregistrée.');
      }
      setEditing(null);
      setForm({ ...EMPTY });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Supprimer cette note ?')) return;
    try {
      await apiFetch(`/api/admin/research/${id}`, { method: 'DELETE' });
      setMessage('Note supprimée.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  const runAssistant = async (action: 'product_draft' | 'research_plan') => {
    setError(null);
    setAssistant(null);
    try {
      const result = await apiFetch<{ draft: { title: string; content: string; warnings: string[] } }>(
        '/api/admin/assistant',
        {
          method: 'POST',
          json:
            action === 'product_draft'
              ? { action, productId: selectedProduct }
              : { action, query: query || 'catalogue WMS' },
        },
      );
      setAssistantTitle(result.draft.title);
      setAssistant(result.draft.content);
      setAssistantWarnings(result.draft.warnings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assistant indisponible.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Assistant */}
      <section className="card-wms p-4">
        <h2 className="text-base font-extrabold text-brand-black">Assistant (mode local)</h2>
        <p className="mt-1 text-sm text-brand-gray">
          Génère des brouillons à partir des informations réelles du catalogue. Aucun contenu n&apos;est publié
          automatiquement, aucun chiffre de marché n&apos;est inventé.
        </p>

        {provider && !provider.configured && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
            Aucun fournisseur d&apos;IA n&apos;est configuré (clé API absente) : seules les fonctions locales
            sont actives. Tant qu&apos;un service payant n&apos;est pas approuvé et configuré, aucun appel
            externe n&apos;est effectué.
          </p>
        )}
        {provider?.configured && (
          <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900">
            Un connecteur « {provider.provider} » est détecté. Les appels externes restent désactivés dans
            cette version : rien n&apos;est envoyé sans activation explicite.
          </p>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor="r-product" className="label-wms">
              Produit (pour un brouillon de fiche)
            </label>
            <select
              id="r-product"
              className="input-wms"
              value={selectedProduct === null ? '' : String(selectedProduct)}
              onChange={(event) =>
                setSelectedProduct(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">— Choisir un produit —</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => runAssistant('product_draft')}
              disabled={selectedProduct === null}
              className="btn-outline mt-2 !min-h-[40px] !py-2 text-sm disabled:opacity-40"
            >
              Générer un brouillon de fiche
            </button>
          </div>

          <div>
            <label htmlFor="r-query" className="label-wms">
              Sujet de recherche
            </label>
            <input
              id="r-query"
              className="input-wms"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex. concurrence sur les batteries externes"
            />
            <button
              type="button"
              onClick={() => runAssistant('research_plan')}
              className="btn-outline mt-2 !min-h-[40px] !py-2 text-sm"
            >
              Préparer un plan de recherche
            </button>
          </div>
        </div>

        {assistant && (
          <div className="mt-4 rounded-lg border border-brand-line bg-brand-light p-3">
            <p className="text-sm font-extrabold text-brand-black">{assistantTitle}</p>
            {assistantWarnings.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs font-semibold text-amber-800">
                {assistantWarnings.map((warning) => (
                  <li key={warning}>⚠ {warning}</li>
                ))}
              </ul>
            )}
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-brand-ink">
              {assistant}
            </pre>
            <p className="mt-2 text-xs text-brand-gray">
              Brouillon à valider : copiez-le dans un script ou une note avant utilisation.
            </p>
          </div>
        )}
      </section>

      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}

      {/* Formulaire */}
      <form onSubmit={save} className="card-wms space-y-3 p-4">
        <h2 className="text-base font-extrabold text-brand-black">
          {editing ? 'Modifier la note' : 'Nouvelle note de recherche'}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="n-title" className="label-wms">
              Titre
            </label>
            <input
              id="n-title"
              className="input-wms"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="n-kind" className="label-wms">
              Type
            </label>
            <select
              id="n-kind"
              className="input-wms"
              value={form.kind}
              onChange={(event) => setForm({ ...form, kind: event.target.value })}
            >
              {KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="n-body" className="label-wms">
            Contenu
          </label>
          <textarea
            id="n-body"
            className="input-wms min-h-[140px]"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            required
            minLength={2}
          />
        </div>

        <div>
          <label htmlFor="n-sources" className="label-wms">
            Sources (une par ligne : libellé | URL | date)
          </label>
          <textarea
            id="n-sources"
            className="input-wms min-h-[80px] font-mono text-[13px]"
            value={form.sources}
            onChange={(event) => setForm({ ...form, sources: event.target.value })}
            placeholder={'ARCEP — Rapport 2024 | https://www.arcep.bf/rapport-2024 | 2025-03-01'}
          />
        </div>

        <div>
          <label htmlFor="n-facts" className="label-wms">
            Faits vérifiés / estimations (séparés)
          </label>
          <textarea
            id="n-facts"
            className="input-wms min-h-[80px]"
            value={form.facts}
            onChange={(event) => setForm({ ...form, facts: event.target.value })}
            placeholder="Vérifié : … (source, date)\nEstimation : … (hypothèse)"
          />
        </div>

        <div>
          <label htmlFor="n-confidence" className="label-wms">
            Niveau de confiance
          </label>
          <select
            id="n-confidence"
            className="input-wms"
            value={form.confidence}
            onChange={(event) => setForm({ ...form, confidence: event.target.value })}
          >
            {CONFIDENCE.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">
            {editing ? 'Enregistrer' : 'Ajouter la note'}
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

      {/* Liste */}
      <ul className="space-y-2.5">
        {notes.map((note) => (
          <li key={note.id} className="card-wms p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-extrabold text-brand-black">{note.title}</p>
              <span className="badge-wms border-brand-line bg-brand-light text-brand-gray">
                {CONFIDENCE.find((item) => item.value === note.confidence)?.label ?? note.confidence}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-brand-gray">
              {KINDS.find((kind) => kind.value === note.kind)?.label ?? note.kind}
            </p>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs text-brand-ink">{note.body}</p>
            {note.sources_list.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[11px] text-brand-gray">
                {note.sources_list.map((source, index) => (
                  <li key={index}>
                    🔗 {source.url ? (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-red underline">
                        {source.label}
                      </a>
                    ) : (
                      source.label
                    )}
                    {source.date ? ` — ${source.date}` : ''}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2.5 flex flex-wrap gap-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setEditing(note);
                  setForm({
                    title: note.title,
                    body: note.body,
                    kind: note.kind,
                    sources: note.sources_list.map((s) => `${s.label} | ${s.url}${s.date ? ` | ${s.date}` : ''}`).join('\n'),
                    facts: note.facts ?? '',
                    confidence: note.confidence,
                  });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-brand-red"
              >
                Modifier
              </button>
              <button type="button" onClick={() => remove(note.id)} className="text-brand-gray">
                Supprimer
              </button>
            </div>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="card-wms p-6 text-center text-sm text-brand-gray">Aucune note de recherche.</li>
        )}
      </ul>
    </div>
  );
}
