'use strict';
/**
 * Vérification du code : syntaxe JavaScript + détection de secrets en dur
 * + contrôle des fichiers sensibles versionnés.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
let failures = 0;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'data', 'backups', 'public/uploads'].includes(path.relative(ROOT, full))) continue;
      // skip uploads only its inner files
      if (entry.name === 'uploads') continue;
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// 1. Syntaxe
const files = walk(path.join(ROOT, 'src')).concat(walk(path.join(ROOT, 'scripts')))
  .concat([path.join(ROOT, 'server.js')].filter(fs.existsSync));

for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`✘ Syntaxe : ${path.relative(ROOT, f)}\n${r.stderr}`);
    failures += 1;
  }
}
console.log(`✔ Syntaxe vérifiée : ${files.length} fichier(s)`);

// 2. Secrets en dur (motifs interdits)
const SECRET_PATTERNS = [
  /sk_live_/i, /sk_test_/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(?<!\w)password\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /xox[baprs]-[0-9a-zA-Z-]+/,
  /AKIA[0-9A-Z]{16}/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];
const scanTargets = [];
(function scanDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'data', 'backups'].includes(entry.name)) continue;
      if (entry.name === 'uploads') continue;
      scanDir(full);
    } else if (entry.isFile() && !['.jpeg', '.jpg', '.png', '.sqlite'].includes(path.extname(entry.name).toLowerCase())
      && !rel.endsWith('.env') && !rel.includes('package-lock.json')) {
      scanTargets.push(full);
    }
  }
})(ROOT);

for (const f of scanTargets) {
  const rel = path.relative(ROOT, f);
  // le lint lui-même contient les motifs interdits (définitions) : auto-exclusion
  if (rel.endsWith('.env.example') || rel.endsWith('scripts/lint.js')) continue;
  const content = fs.readFileSync(f, 'utf8');
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      // les références process.env.* ne sont pas des secrets en dur
      const cleaned = content.replace(/process\.env\.[A-Z0-9_]+/g, 'ENV_REF');
      if (pattern.test(cleaned)) {
        console.error(`✘ Secret potentiel dans ${rel} (motif : ${pattern})`);
        failures += 1;
      }
    }
  }
}
console.log(`✔ Aucun secret en dur détecté : ${scanTargets.length} fichier(s) analysé(s)`);

// 3. Fichiers sensibles non versionnés
const r = spawnSync('git', ['-C', ROOT, 'status', '--porcelain', '--ignored', '-uall'], { encoding: 'utf8' });
if (r.status === 0) {
  const trackedDanger = ['.env', 'wms.sqlite', 'data/wms'];
  for (const d of trackedDanger) {
    const found = r.stdout.split('\n').filter((l) => {
      if (!l.startsWith('??')) return false;
      const p = l.slice(3);
      if (!p.includes(d)) return false;
      return !p.endsWith('.env.example') && !p.includes('.gitkeep');
    });
    for (const line of found) {
      console.error(`✘ Fichier sensible non ignoré : ${line.slice(3)}`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} problème(s) détecté(s).`);
  process.exit(1);
}
console.log('\n✔ Lint interne réussi.');
