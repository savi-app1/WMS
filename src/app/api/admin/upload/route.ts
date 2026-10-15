import { NextResponse } from 'next/server';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { UPLOAD_DIR } from '@/lib/server-paths';
import { run, nowIso } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

const VARIANTS = [
  { name: 'sm', width: 400 },
  { name: 'md', width: 900 },
  { name: 'lg', width: 1600 },
];

/**
 * Téléversement d'un visuel produit (administration).
 * Le fichier est re-encodé par sharp : formats webp, dimensions maîtrisées,
 * métadonnées EXIF supprimées (protection de la vie privée).
 */
export async function POST(request: Request) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Formulaire invalide.' }, { status: 400 });
  }

  const file = form.get('file');
  const alt = typeof form.get('alt') === 'string' ? String(form.get('alt')).slice(0, 200) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (5 Mo maximum).' }, { status: 413 });
  }
  const extension = ALLOWED.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: 'Format non accepté. Utilisez JPG, PNG, WEBP ou GIF.' },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  await mkdir(UPLOAD_DIR, { recursive: true });

  const variants: Record<string, string> = {};
  let width = 0;
  let height = 0;

  try {
    const image = sharp(buffer, { failOn: 'error' }).rotate();
    const meta = await image.metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;

    for (const variant of VARIANTS) {
      const filename = `${id}-${variant.name}.webp`;
      await sharp(buffer, { failOn: 'error' })
        .rotate()
        .resize({ width: variant.width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(UPLOAD_DIR, filename));
      variants[variant.name] = `/api/media/${filename}`;
    }

    // Variante originale (qualité webp, dimensions d'origine)
    const originalName = `${id}-original.webp`;
    await sharp(buffer, { failOn: 'error' })
      .rotate()
      .webp({ quality: 88 })
      .toFile(path.join(UPLOAD_DIR, originalName));
    variants.original = `/api/media/${originalName}`;
  } catch {
    return NextResponse.json({ error: 'Image invalide ou corrompue.' }, { status: 400 });
  }

  const mime = 'image/webp';
  const size = Buffer.byteLength(JSON.stringify(variants));
  run(
    'INSERT INTO media (filename, original_name, mime, size, width, height, variants, alt, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, file.name, mime, size, width, height, JSON.stringify(variants), alt, nowIso()],
  );

  return NextResponse.json({ ok: true, variants, width, height }, { status: 201 });
}
