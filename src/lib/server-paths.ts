/**
 * Chemins du serveur (base de données, médias uploadés).
 * Module EXCLUSIVEMENT serveur : il importe `node:path`.
 */
import path from 'node:path';

export const PROJECT_ROOT = process.cwd();

/** Dossier des données d'exécution : base SQLite + médias uploadés. */
export const DATA_DIR = process.env.WMS_DATA_DIR
  ? path.resolve(process.env.WMS_DATA_DIR)
  : path.join(PROJECT_ROOT, 'data');

export const DB_FILE = path.join(DATA_DIR, 'wms.db');

/** Dossier de stockage des médias (images produits, visuels de campagne). */
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
