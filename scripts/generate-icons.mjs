#!/usr/bin/env node
/**
 * Generates PNG icons from the SVG source.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');
const svgPath = join(iconsDir, 'icon-monochrome.svg');

const svg = readFileSync(svgPath);

for (const size of [192, 512]) {
  const outPath = join(iconsDir, `icon-${size}x${size}.png`);
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`Generated ${outPath}`);
}
