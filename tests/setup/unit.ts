/**
 * Préparation de l'environnement des tests unitaires et d'intégration.
 *
 * Chaque processus de test (worker Vitest) travaille dans sa propre base
 * SQLite (data/test-unit-<worker>) : aucune donnée de test n'atteint la base
 * de production et deux workers ne peuvent pas se marcher dessus.
 */
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const worker = process.env.VITEST_WORKER_ID ?? '0';
const TEST_DIR = path.resolve(process.cwd(), 'data', `test-unit-${worker}`);

process.env.WMS_DATA_DIR = TEST_DIR;
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3987';

rmSync(TEST_DIR, { recursive: true, force: true });
mkdirSync(path.join(TEST_DIR, 'uploads'), { recursive: true });
