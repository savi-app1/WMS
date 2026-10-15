/** Zones de livraison et frais associés. */
import { query, queryOne, run, nowIso } from './db';

export interface DeliveryZone {
  id: number;
  name: string;
  fee_fcfa: number | null;
  active: number;
  note: string | null;
}

export function listDeliveryZones(includeInactive = false): DeliveryZone[] {
  const where = includeInactive ? '' : 'WHERE active = 1';
  return query<DeliveryZone>(`SELECT * FROM delivery_zones ${where} ORDER BY name ASC`);
}

export function getDeliveryZone(id: number): DeliveryZone | undefined {
  return queryOne<DeliveryZone>('SELECT * FROM delivery_zones WHERE id = ?', [id]);
}

export function createDeliveryZone(input: { name: string; feeFcfa?: number | null; active?: boolean; note?: string }): number {
  const result = run(
    'INSERT INTO delivery_zones (name, fee_fcfa, active, note) VALUES (?,?,?,?)',
    [input.name, input.feeFcfa ?? null, input.active === false ? 0 : 1, input.note ?? null],
  );
  return result.lastInsertRowid;
}

export function updateDeliveryZone(
  id: number,
  input: { name: string; feeFcfa?: number | null; active?: boolean; note?: string },
): boolean {
  return (
    run('UPDATE delivery_zones SET name = ?, fee_fcfa = ?, active = ?, note = ? WHERE id = ?', [
      input.name,
      input.feeFcfa ?? null,
      input.active === false ? 0 : 1,
      input.note ?? null,
      id,
    ]).changes > 0
  );
}

export function deleteDeliveryZone(id: number): boolean {
  return run('DELETE FROM delivery_zones WHERE id = ?', [id]).changes > 0;
}

/** Frais de livraison par défaut (réglables dans l'administration). */
export function defaultDeliveryFee(): number | null {
  const row = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['delivery_default_fee']);
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value);
    return typeof parsed === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

export function setDefaultDeliveryFee(value: number | null): void {
  run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['delivery_default_fee', JSON.stringify(value), nowIso()],
  );
}
