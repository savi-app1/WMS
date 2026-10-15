/**
 * Prépare les assets de marque officiels (logo, bannière, icônes PWA) à partir
 * des images fournies par le propriétaire du projet.
 *
 * Source : /tmp/arena-coding-uploads/*.jpeg (fournis par le propriétaire)
 * Sortie : public/brand/* et public/icons/*
 *
 * Aucun logo inventé : le logo officiel est simplement recadré et optimisé.
 */
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SRC_DIR = '/tmp/arena-coding-uploads';
const LOGO_SRC = '077f2c36-7f18-4a42-877b-ce045dc48bf3.jpeg';
const BANNER_SRC = '83acf656-840c-4919-b28b-b5f7cccf8e51.jpeg';

const BRAND_DIR = path.join(process.cwd(), 'public', 'brand');
const ICON_DIR = path.join(process.cwd(), 'public', 'icons');

const RED = '#E30613';
const BLACK = '#0B0B0C';

/** Rend le blanc pur transparent en conservant les autres couleurs. */
async function whiteToTransparent(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = info.width * info.height * 4;
  for (let i = 0; i < px; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 238 && g > 238 && b > 238) {
      data[i + 3] = 0;
    } else if (r > 210 && g > 210 && b > 210) {
      // bords adoucis : semi-transparence proportionnelle
      data[i + 3] = Math.round(255 * (1 - (Math.min(r, g, b) - 210) / 28));
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

/** Supprime les bandes noires (letterbox) éventuellement présentes sur l'image source. */
async function removeLetterbox(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let top = 0;
  let bottom = height - 1;
  const rowIsBlank = (y: number) => {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      sum += data[i] + data[i + 1] + data[i + 2];
    }
    return sum / (width * 3) < 24;
  };
  while (top < height && rowIsBlank(top)) top += 1;
  while (bottom > top && rowIsBlank(bottom)) bottom -= 1;
  if (top === 0 && bottom === height - 1) return input;
  return sharp(input).extract({ left: 0, top, width, height: bottom - top + 1 }).toBuffer();
}

async function main() {
  await mkdir(BRAND_DIR, { recursive: true });
  await mkdir(ICON_DIR, { recursive: true });

  const logoRaw = await readFile(path.join(SRC_DIR, LOGO_SRC));
  const bannerRaw = await readFile(path.join(SRC_DIR, BANNER_SRC));

  // 1. Logo principal : letterbox retiré, marges blanches recadrées, fond transparent
  const logoTrimmed = await sharp(await removeLetterbox(logoRaw))
    .trim({ threshold: 30 })
    .toBuffer();
  const trimmedMeta = await sharp(logoTrimmed).metadata();
  const side = Math.max(trimmedMeta.width ?? 1, trimmedMeta.height ?? 1);
  const logoSquare = await sharp(logoTrimmed)
    .resize({ width: side, height: side, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();
  const logoTransparent = await whiteToTransparent(logoSquare);
  await writeFile(path.join(BRAND_DIR, 'wms-logo.png'), logoTransparent);

  // 2. Variante opaque (fond blanc) pour les contextes sans transparence
  await sharp(logoTransparent)
    .flatten({ background: '#FFFFFF' })
    .png()
    .toFile(path.join(BRAND_DIR, 'wms-logo-opaque.png'));

  // 3. Favicon / icônes PWA sur fond rouge ou blanc
  const favicon = await sharp(logoTransparent)
    .resize({ width: 64, height: 64, fit: 'contain' })
    .png()
    .toBuffer();
  await writeFile(path.join(ICON_DIR, 'favicon.png'), favicon);

  for (const size of [192, 512]) {
    await sharp(logoTransparent)
      .resize({ width: size, height: size, fit: 'contain' })
      .png()
      .toFile(path.join(ICON_DIR, `icon-${size}.png`));
  }

  // Icône « maskable » : logo centré sur fond rouge, zone de sécurité respectée
  const maskable = await sharp({
    create: { width: 512, height: 512, channels: 4, background: RED },
  })
    .composite([
      { input: await sharp(logoTransparent).resize({ width: 330, height: 330, fit: 'contain' }).png().toBuffer(), gravity: 'centre' },
    ])
    .png()
    .toFile(path.join(ICON_DIR, 'maskable-512.png'));

  // 4. Bannière officielle optimisée (webp + jpeg de repli)
  const bannerMeta = await sharp(bannerRaw).metadata();
  await sharp(bannerRaw)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(BRAND_DIR, 'wms-banniere.webp'));
  await sharp(bannerRaw)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(BRAND_DIR, 'wms-banniere.jpg'));

  // 5. Image de partage Open Graph (1200x630) construite à partir du logo officiel
  const ogLogo = await sharp(logoTransparent)
    .resize({ width: 380, height: 380, fit: 'contain' })
    .png()
    .toBuffer();
  const ogTitle = Buffer.from(
    `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${BLACK}"/>
      <rect x="0" y="0" width="1200" height="10" fill="${RED}"/>
      <text x="600" y="470" font-family="Helvetica, Arial, sans-serif" font-size="46" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Wendmanegda Multiples Services</text>
      <text x="600" y="528" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#E5E5E5" text-anchor="middle">Engagés pour satisfaire, motivés pour faire grandir</text>
    </svg>`,
  );
  await sharp(ogTitle)
    .composite([{ input: ogLogo, top: 60, left: 410 }])
    .png()
    .toFile(path.join(BRAND_DIR, 'og-default.png'));

  const info = {
    logo: `${BRAND_DIR}/wms-logo.png`,
    banniereSource: `${bannerMeta.width}x${bannerMeta.height}`,
    maskable: Boolean(maskable),
  };
  console.log('Assets de marque générés :', JSON.stringify(info, null, 2));
}

main().catch((err) => {
  console.error('Échec de la préparation des assets :', err);
  process.exit(1);
});
