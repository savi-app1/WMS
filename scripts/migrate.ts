/**
 * Applique les migrations de la base WMS et crée le compte administrateur.
 *
 * Usage : npm run migrate
 * Variables d'environnement attendues :
 *   ADMIN_EMAIL    — e-mail de l'administrateur unique
 *   ADMIN_PASSWORD — mot de passe (12 caractères minimum recommandé)
 *   ADMIN_NAME     — nom affiché (facultatif)
 */
import { getDb, query, run, nowIso } from '../src/lib/db';
import { DB_FILE } from '../src/lib/server-paths';
import { hashPassword } from '../src/lib/auth';

// Chargement du fichier .env local (variables non déjà définies)
try {
  process.loadEnvFile();
} catch {
  // pas de fichier .env : les variables d'environnement du shell sont utilisées
}

function main() {
  getDb(); // ouvre la base et applique les migrations manquantes
  const applied = query<{ id: string; applied_at: string }>('SELECT * FROM schema_migrations ORDER BY id');
  console.log(`Base : ${DB_FILE}`);
  console.log(`Migrations appliquées : ${applied.map((m) => m.id).join(', ')}`);

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Administrateur WMS').trim();

  if (!email || !password) {
    console.log(
      '\n[INFO] ADMIN_EMAIL / ADMIN_PASSWORD non définis : aucun compte administrateur créé.',
    );
    console.log('       Renseignez ces deux variables puis relancez `npm run migrate`.');
    return;
  }
  if (password.length < 12) {
    console.error('\n[ERREUR] Le mot de passe administrateur doit contenir au moins 12 caractères.');
    process.exit(1);
  }

  const existing = query<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    run('UPDATE users SET password_hash = ?, name = ?, active = 1 WHERE id = ?', [
      hashPassword(password),
      name,
      existing[0].id,
    ]);
    console.log(`\n[OK] Mot de passe mis à jour pour ${email}.`);
    return;
  }

  run(
    'INSERT INTO users (email, name, password_hash, role, active, created_at) VALUES (?,?,?,?,1,?)',
    [email, name, hashPassword(password), 'admin', nowIso()],
  );
  console.log(`\n[OK] Administrateur créé : ${email}`);
  console.log('     Conservez ce mot de passe : il n\'est stocké qu\'sous forme de hash.');
}

main();
