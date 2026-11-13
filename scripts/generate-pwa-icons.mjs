import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const sharp = require('sharp'); // Next.js image dependency from the existing lockfile.
const brand = await readFile(new URL('../apps/web/components/BrewLiteMark.tsx', import.meta.url), 'utf8');
const path = brand.match(/<path d="([^"]+)"/)?.[1];
if (!path) throw new Error('BrewLiteMark path not found');
const directory = new URL('../apps/web/public/icons/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const [size, maskable] of [[192, false], [512, false], [512, true]]) {
  // The existing cup stays inside the maskable safe circle, with a solid brand background.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" fill="#2f1d16"/><g transform="translate(112 112) scale(12)" fill="#fbf8f3"><path d="${path}"/></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(new URL(maskable ? 'icon-maskable-512.png' : `icon-${size}.png`, directory), png);
}
console.log('Generated 192/512/maskable icons from BrewLiteMark.');
