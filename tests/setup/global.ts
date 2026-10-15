/**
 * Initialisation globale des tests de bout en bout.
 *
 *  - prépare une base de données de test isolée (data/test-e2e) ;
 *  - applique les migrations et les données de départ ;
 *  - compile l'application (les tests doivent porter sur le code courant) ;
 *  - démarre le serveur de production Next.js sur un port dédié ;
 *  - attend que l'API réponde avant de lancer les tests ;
 *  - arrête proprement tout le groupe de processus à la fin.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createConnection } from 'node:net';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const PORT = 3987;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROOT = process.cwd();
const TEST_DATA_DIR = path.join(ROOT, 'data', 'test-e2e');

export const E2E_ADMIN_EMAIL = 'admin.test@wms.local';
export const E2E_ADMIN_PASSWORD = 'MotDePasseTest-2026!';

let server: ChildProcess | null = null;

function run(command: string, args: string[], env: Record<string, string> = {}): void {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `Échec de « ${command} ${args.join(' ')} » (code ${result.status})\n${result.stdout}\n${result.stderr}`,
    );
  }
}

/** Vrai si un service écoute déjà sur le port : signale un processus obsolète. */
function portIsBusy(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port: PORT });
    socket.setTimeout(1500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(timeoutMs = 120000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server && server.exitCode !== null) {
      throw new Error(`Le serveur de test s'est arrêté (code ${server.exitCode}).`);
    }
    try {
      const response = await fetch(`${BASE_URL}/api/auth/session`);
      if (response.ok) return;
    } catch {
      /* le serveur n'écoute pas encore */
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Le serveur de test n'a pas démarré sur ${BASE_URL}`);
}

export async function setup(): Promise<void> {
  // Garde-fou : un serveur resté d'une exécution précédente ferait tester du
  // code obsolète sans que personne ne s'en aperçoive.
  if (await portIsBusy()) {
    throw new Error(
      `Un service écoute déjà sur le port ${PORT} : arrêtez le processus de test obsolète ` +
        `(pkill -f "next start") avant de relancer les tests de bout en bout.`,
    );
  }

  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  mkdirSync(path.join(TEST_DATA_DIR, 'uploads'), { recursive: true });

  const env = {
    WMS_DATA_DIR: TEST_DATA_DIR,
    ADMIN_EMAIL: E2E_ADMIN_EMAIL,
    ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
    ADMIN_NAME: 'Administrateur de test',
    NEXT_PUBLIC_SITE_URL: BASE_URL,
    SESSION_TTL_HOURS: '2',
  };

  // Base de test isolée, migrée et peuplée AVANT la compilation : les pages
  // pré-rendues pendant le build lisent cette même base.
  run('npx', ['tsx', 'scripts/migrate.ts'], env);
  run('npx', ['tsx', 'scripts/seed.ts'], env);

  // Compilation systématique : les tests de bout en bout doivent porter sur le
  // code courant, jamais sur une compilation périmée.
  run('npx', ['next', 'build'], { ...env, NODE_ENV: 'production' });

  server = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, ...env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
    // Groupe de processus dédié : l'arrêt tue aussi le serveur Next enfant.
    detached: true,
  });

  server.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    if (process.env.WMS_TEST_VERBOSE) process.stdout.write(`[server] ${text}`);
  });
  server.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    if (process.env.WMS_TEST_VERBOSE) process.stderr.write(`[server:err] ${text}`);
  });

  await waitForServer();
}

function killTree(child: ChildProcess, signal: NodeJS.Signals): void {
  const pid = child.pid;
  if (!pid) return;
  try {
    // Le groupe entier : « npx » et le serveur Next qu'il a lancé.
    process.kill(-pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      /* déjà arrêté */
    }
  }
}

export async function teardown(): Promise<void> {
  if (!server) return;
  const child = server;
  killTree(child, 'SIGTERM');

  const deadline = Date.now() + 8000;
  while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (child.exitCode === null && child.signalCode === null) killTree(child, 'SIGKILL');

  // Laisse le temps au port d'être libéré.
  const portDeadline = Date.now() + 8000;
  while ((await portIsBusy()) && Date.now() < portDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  server = null;
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}
