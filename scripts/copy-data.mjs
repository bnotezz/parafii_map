// scripts/copy-data.mjs
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILES_TO_COPY = [
  'parafii_tree.json',
  'catalog.json',
  'fond_P720.json',
  'parafii.geojson',
];

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const root = process.cwd(); 

const srcDir  = path.join(root, 'data');
const destDir = path.join(root, 'public', 'data');

await mkdir(destDir, { recursive: true });

await Promise.all(
  FILES_TO_COPY.map((file) =>
    cp(path.join(srcDir, file), path.join(destDir, file)),
  ),
);

console.log(`✓  Copied ${FILES_TO_COPY.length} data file(s) → public/data`);
