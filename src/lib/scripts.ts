/** Scripts, campagnes, notes de recherche : accès base de données. */
import { query, queryOne, run, nowIso } from './db';
import type { CampaignInput, ResearchNoteInput, ScriptInput } from './validation';

export interface ScriptRow {
  id: number;
  title: string;
  type: string;
  channel: string | null;
  body: string;
  notes: string | null;
  tags: string;
  source: string | null;
  source_url: string | null;
  source_date: string | null;
  status: string;
  product_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScriptWithMeta extends ScriptRow {
  tags_list: string[];
  product_name?: string | null;
}

function hydrateScript(row: ScriptRow): ScriptWithMeta {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags || '[]');
  } catch {
    tags = [];
  }
  return { ...row, tags_list: Array.isArray(tags) ? tags : [] };
}

export function listScripts(search?: string): ScriptWithMeta[] {
  const params: string[] = [];
  let where = '';
  if (search) {
    where = 'WHERE s.title LIKE ? OR s.body LIKE ? OR s.tags LIKE ?';
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const rows = query<ScriptRow>(
    `SELECT s.*, p.name AS product_name FROM scripts s
       LEFT JOIN products p ON p.id = s.product_id
       ${where} ORDER BY s.updated_at DESC`,
    params,
  );
  return rows.map(hydrateScript);
}

export function getScript(id: number): ScriptWithMeta | undefined {
  const row = queryOne<ScriptRow>(
    'SELECT s.*, p.name AS product_name FROM scripts s LEFT JOIN products p ON p.id = s.product_id WHERE s.id = ?',
    [id],
  );
  return row ? hydrateScript(row) : undefined;
}

export function createScript(input: ScriptInput): number {
  const now = nowIso();
  const result = run(
    `INSERT INTO scripts (title, type, channel, body, notes, tags, source, source_url, source_date, status, product_id, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.title,
      input.type,
      input.channel ?? null,
      input.body,
      input.notes ?? null,
      JSON.stringify(input.tags ?? []),
      input.source ?? null,
      input.sourceUrl ?? null,
      input.sourceDate ?? null,
      input.status,
      input.productId ?? null,
      now,
      now,
    ],
  );
  return result.lastInsertRowid;
}

export function updateScript(id: number, input: ScriptInput): boolean {
  const result = run(
    `UPDATE scripts SET title=?, type=?, channel=?, body=?, notes=?, tags=?, source=?, source_url=?,
       source_date=?, status=?, product_id=?, updated_at=? WHERE id = ?`,
    [
      input.title,
      input.type,
      input.channel ?? null,
      input.body,
      input.notes ?? null,
      JSON.stringify(input.tags ?? []),
      input.source ?? null,
      input.sourceUrl ?? null,
      input.sourceDate ?? null,
      input.status,
      input.productId ?? null,
      nowIso(),
      id,
    ],
  );
  return result.changes > 0;
}

export function duplicateScript(id: number): number | undefined {
  const script = getScript(id);
  if (!script) return undefined;
  return createScript({
    title: `${script.title} (copie)`,
    type: script.type as ScriptInput['type'],
    channel: script.channel ?? undefined,
    body: script.body,
    notes: script.notes ?? undefined,
    tags: script.tags_list,
    source: script.source ?? undefined,
    sourceUrl: script.source_url ?? undefined,
    sourceDate: script.source_date ?? undefined,
    status: 'brouillon',
    productId: script.product_id ?? undefined,
  });
}

export function deleteScript(id: number): boolean {
  return run('DELETE FROM scripts WHERE id = ?', [id]).changes > 0;
}

export interface CampaignRow {
  id: number;
  name: string;
  objective: string | null;
  product_id: number | null;
  ad_copy: string | null;
  video_script: string | null;
  platform: string | null;
  product_url: string | null;
  utm: string;
  budget_fcfa: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product_name?: string | null;
}

function hydrateCampaign(row: CampaignRow): CampaignRow & { utm_params: Record<string, string> } {
  let utm: Record<string, string> = {};
  try {
    utm = JSON.parse(row.utm || '{}');
  } catch {
    utm = {};
  }
  return { ...row, utm_params: utm };
}

export function listCampaigns(): (CampaignRow & { utm_params: Record<string, string> })[] {
  const rows = query<CampaignRow>(
    `SELECT c.*, p.name AS product_name FROM campaigns c
      LEFT JOIN products p ON p.id = c.product_id ORDER BY c.updated_at DESC`,
  );
  return rows.map(hydrateCampaign);
}

export function createCampaign(input: CampaignInput): number {
  const now = nowIso();
  const result = run(
    `INSERT INTO campaigns (name, objective, product_id, ad_copy, video_script, platform, product_url,
      utm, budget_fcfa, start_date, end_date, status, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.name,
      input.objective ?? null,
      input.productId ?? null,
      input.adCopy ?? null,
      input.videoScript ?? null,
      input.platform ?? null,
      input.productUrl ?? null,
      JSON.stringify(input.utm ?? {}),
      input.budgetFcfa ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.status,
      input.notes ?? null,
      now,
      now,
    ],
  );
  return result.lastInsertRowid;
}

export function updateCampaign(id: number, input: CampaignInput): boolean {
  const result = run(
    `UPDATE campaigns SET name=?, objective=?, product_id=?, ad_copy=?, video_script=?, platform=?,
       product_url=?, utm=?, budget_fcfa=?, start_date=?, end_date=?, status=?, notes=?, updated_at=? WHERE id = ?`,
    [
      input.name,
      input.objective ?? null,
      input.productId ?? null,
      input.adCopy ?? null,
      input.videoScript ?? null,
      input.platform ?? null,
      input.productUrl ?? null,
      JSON.stringify(input.utm ?? {}),
      input.budgetFcfa ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.status,
      input.notes ?? null,
      nowIso(),
      id,
    ],
  );
  return result.changes > 0;
}

export function deleteCampaign(id: number): boolean {
  return run('DELETE FROM campaigns WHERE id = ?', [id]).changes > 0;
}

export interface ResearchNoteRow {
  id: number;
  title: string;
  body: string;
  kind: string;
  sources: string;
  facts: string | null;
  confidence: string;
  created_at: string;
  updated_at: string;
}

export function listResearchNotes(): (ResearchNoteRow & { sources_list: { label: string; url: string; date?: string }[] })[] {
  const rows = query<ResearchNoteRow>('SELECT * FROM research_notes ORDER BY updated_at DESC');
  return rows.map((row) => {
    let sources: { label: string; url: string; date?: string }[] = [];
    try {
      sources = JSON.parse(row.sources || '[]');
    } catch {
      sources = [];
    }
    return { ...row, sources_list: Array.isArray(sources) ? sources : [] };
  });
}

export function createResearchNote(input: ResearchNoteInput): number {
  const now = nowIso();
  const result = run(
    'INSERT INTO research_notes (title, body, kind, sources, facts, confidence, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [
      input.title,
      input.body,
      input.kind,
      JSON.stringify(input.sources ?? []),
      input.facts ?? null,
      input.confidence,
      now,
      now,
    ],
  );
  return result.lastInsertRowid;
}

export function updateResearchNote(id: number, input: ResearchNoteInput): boolean {
  const result = run(
    'UPDATE research_notes SET title=?, body=?, kind=?, sources=?, facts=?, confidence=?, updated_at=? WHERE id = ?',
    [
      input.title,
      input.body,
      input.kind,
      JSON.stringify(input.sources ?? []),
      input.facts ?? null,
      input.confidence,
      nowIso(),
      id,
    ],
  );
  return result.changes > 0;
}

export function deleteResearchNote(id: number): boolean {
  return run('DELETE FROM research_notes WHERE id = ?', [id]).changes > 0;
}
