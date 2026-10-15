#!/usr/bin/env node
/**
 * Génère un fichier .env local avec un mot de passe administrateur aléatoire
 * et l'affiche une seule fois sur le terminal (jamais dans un rapport public).
 *
 * Usage : node scripts/generate-env.mjs
 */
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const example = await readFile(path.join(root, '.env.example'), 'utf8');

const password = `Wms-${randomBytes(9).toString('base64url')}`;
const content = example
  .replace('ADMIN_PASSWORD=changez-moi-avec-un-long-mot-de-passe', `ADMIN_PASSWORD=${password}`)
  .replace('NEXT_PUBLIC_SITE_URL=http://localhost:3000', 'NEXT_PUBLIC_SITE_URL=http://localhost:3000');

await writeFile(path.join(root, '.env'), content, { mode: 0o600 });
console.log('Fichier .env généré.');
console.log(`Mot de passe administrateur (à conserver) : ${password}`);
