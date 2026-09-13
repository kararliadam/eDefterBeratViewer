import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(desktopDir);
const dest = join(desktopDir, 'dist');

const files = [
  'popup.html',
  'popup.js',
  'popup.css',
  'desktop-bridge.js',
  'xslt-transform.js',
  'pdf-export.js',
];

const directories = ['vendor', 'xslt'];

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const file of files) {
  cpSync(join(repoRoot, file), join(dest, file));
}

cpSync(join(repoRoot, 'popup.html'), join(dest, 'index.html'));

for (const directory of directories) {
  cpSync(join(repoRoot, directory), join(dest, directory), { recursive: true });
}
