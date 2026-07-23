#!/usr/bin/env node
/**
 * Zip the built dist/ folder for distribution / manual submission.
 * Requires `zip` or falls back to native.
 */
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
const out = resolve(root, 'release');

if (!existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const zipPath = resolve(out, `audio-capture-pro-${stamp}.zip`);
try {
  execSync(`cd "${dist}" && zip -qr "${zipPath}" .`, { stdio: 'inherit' });
  console.log(`Packaged: ${zipPath}`);
} catch (err) {
  console.error('Failed to create zip. Ensure the `zip` binary is available.', err);
  process.exit(1);
}
