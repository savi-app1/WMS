'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

interface ScriptItem {
  id: number;
  title: string;
  type: string;
  channel: string | null;
  body: string;
  notes: string | null;
  tags_list: string[];
  source: string | null;
  source_url: string | null;
  source_date: string | null;
  status: string;
  product_name?: string | null;
  updated_at: string;
}

const TYPES = [
  { value: 'script_video', label: 'Script vidéo' },
  { value: 'voix_off', label: 'Voix off' },
  { value: 'texte_pub', label: 'Texte publicitaire' },
  { value: 'post_social', label: 'Publication sociale' },
  { value: 'dialogue_commercial', label: 'Dialogue commercial' },
  { value: 'faq', label: 'FAQ' },
  { value: 'autre', label: 'Autre' },
];

const EMPTY = {
  title: '',
  type: 'script_video',
  channel: '',
  body: '',
  notes: '',
  tags: '',
  source: '',
  sourceUrl: '',
  sourceDate: '',
  status: 'brouillon',
  productId: null as number | null,
};

export function ScriptsManager() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [editing, setEditing] = useState<ScriptItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ scripts: ScriptItem[] }>('/api/admin/scripts');
      setScripts(data.scripts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (script: ScriptItem) => {
    setEditing(script);
    setForm({
      title: script.title,
      type: script.type,
      channel: script.channel ?? '',
      body: script.body,
      notes: script.notes ?? '',
      tags: script.tags_list.join(', '),
      source: script.source ?? '',
      sourceUrl: script.source_url ?? '',
      sourceDate: script.source_date ?? '',
      status: script.status,
      productId: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setEditing(null);
    setForm({ ...EMPTY });
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const payload = {
      ...form,
      channel: form.channel || undefined,
      notes: form.notes || undefined,
      source: form.source || undefined,
      sourceUrl: form.sourceUrl || undefined,
      sourceDate: form.sourceDate || undefined,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    try {
      if (editing) {
        await apiFetch(`/api/admin/scripts/${editing.id}`, { method: 'PATCH', json: payload });
        setMessage('Script mis à jour.');
      } else {
        await apiFetch('/api/admin/scripts', { method: 'POST', json: payload });
        setMessage('Script enregistré.');
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  const duplicate = async (id: number) => {
    try {
      await apiFetch(`/api/admin/scripts/${id}/duplicate`, { method: 'POST' });
      setMessage('Script dupliqué.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplication impossible.');
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Supprimer ce script ?')) return;
    try {
      await apiFetch(`/api/admin/scripts/${id}`, { method: 'DELETE' });
      setMessage('Script supprimé.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  const exportAll = () => {
    const content = scripts
      .map((script) =>
        [
          `## ${script.title}`,
          `Type : ${script.type} · Canal : ${script.channel ?? '-'} · Statut : ${script.status}`,
          script.source ? `Source : ${script.source}${script.source_date ? ` (${script.source_date})` : ''}` : '',
          '',
          script.body,
          script.notes ? `\nNotes : ${script.notes}` : '',
          '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wms-scripts-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filtered = scripts.filter((script) =>
    search
      ? `${script.title} ${script.body} ${script.tags_list.join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input-wms !min-h-[40px] flex-1"
          placeholder="Rechercher un script…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="button" onClick={exportAll} className="btn-outline !min-h-[40px] !py-2 text-sm">
          Exporter
        </button>
      </div>

      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}

      <form onSubmit={save} className="card-wms space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-brand-black">
            {editing ? 'Modifier le script' : 'Nouveau script'}
          </h2>
          {editing && (
            <button type="button" onClick={reset} className="text-xs font-bold text-brand-gray">
              Annuler la modification
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="s-title" className="label-wms">
              Titre
            </label>
            <input
              id="s-title"
              className="input-wms"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="s-type" className="label-wms">
              Type
            </label>
            <select
              id="s-type"
              className="input-wms"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="s-channel" className="label-wms">
              Canal
            </label>
            <input
              id="s-channel"
              className="input-wms"
              value={form.channel}
              onChange={(event) => setForm({ ...form, channel: event.target.value })}
              placeholder="facebook, whatsapp, radio…"
            />
          </div>
          <div>
            <label htmlFor="s-status" className="label-wms">
              Statut
            </label>
            <select
              id="s-status"
              className="input-wms"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              <option value="brouillon">Brouillon</option>
              <option value="valide">Validé</option>
              <option value="archive">Archivé</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="s-body" className="label-wms">
            Contenu
          </label>
          <textarea
            id="s-body"
            className="input-wms min-h-[180px] font-mono text-[13px]"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            required
            minLength={2}
          />
        </div>

        <div>
          <label htmlFor="s-notes" className="label-wms">
            Notes internes
          </label>
          <textarea
            id="s-notes"
            className="input-wms min-h-[70px]"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="s-tags" className="label-wms">
              Étiquettes (séparées par des virgules)
            </label>
            <input
              id="s-tags"
              className="input-wms"
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="s-source" className="label-wms">
              Source
            </label>
            <input
              id="s-source"
              className="input-wms"
              value={form.source}
              onChange={(event) => setForm({ ...form, source: event.target.value })}
              placeholder="Bannière WMS, entretien client…"
            />
          </div>
          <div>
            <label htmlFor="s-source-date" className="label-wms">
              Date de la source
            </label>
            <input
              id="s-source-date"
              className="input-wms"
              value={form.sourceDate}
              onChange={(event) => setForm({ ...form, sourceDate: event.target.value })}
              placeholder="2026-10-15"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary">
          {editing ? 'Enregistrer les modifications' : 'Enregistrer le script'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-brand-gray">Chargement…</p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((script) => (
            <li key={script.id} className="card-wms p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-brand-black">{script.title}</p>
                  <p className="mt-0.5 text-xs text-brand-gray">
                    {TYPES.find((type) => type.value === script.type)?.label ?? script.type}
                    {script.channel ? ` · ${script.channel}` : ''}
                    {script.source ? ` · source : ${script.source}` : ''}
                    {script.source_date ? ` (${script.source_date})` : ''}
                  </p>
                </div>
                <span className="badge-wms border-brand-line bg-brand-light text-brand-gray">{script.status}</span>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-brand-gray">{script.body}</p>
              <div className="mt-2.5 flex flex-wrap gap-3 text-xs font-bold">
                <button type="button" onClick={() => startEdit(script)} className="text-brand-red">
                  Modifier
                </button>
                <button type="button" onClick={() => duplicate(script.id)} className="text-brand-gray">
                  Dupliquer
                </button>
                <button type="button" onClick={() => remove(script.id)} className="text-brand-gray">
                  Supprimer
                </button>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="card-wms p-6 text-center text-sm text-brand-gray">Aucun script enregistré.</li>
          )}
        </ul>
      )}
    </div>
  );
}
