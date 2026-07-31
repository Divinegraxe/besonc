#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Setup @besonc/* symlinks in dist/ so the compiled services can resolve them.
 *
 * For each shared lib, we emit it to dist/libs/<lib-name>/ with its package.json
 * and source files, then create symlinks at dist/node_modules/@besonc/<lib-name>.
 *
 * This is run by `pnpm run build` after `pnpm run build:nest`.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const libsDir = path.join(root, 'libs');
const distRoot = path.join(root, 'dist');
const distNodeModules = path.join(distRoot, 'node_modules');
const distLibs = path.join(distRoot, 'libs');

const libNames = [
  'shared-types',
  'shared-utils',
  'shared-config',
  'shared-payment',
  'shared-notifications',
  'shared-kyc',
  'shared-api-client',
];

if (!fs.existsSync(distNodeModules)) fs.mkdirSync(distNodeModules, { recursive: true });
if (!fs.existsSync(distLibs)) fs.mkdirSync(distLibs, { recursive: true });
const besoncModulesDir = path.join(distNodeModules, '@besonc');
if (!fs.existsSync(besoncModulesDir)) fs.mkdirSync(besoncModulesDir, { recursive: true });

for (const name of libNames) {
  const src = path.join(libsDir, name, 'src');
  const dest = path.join(distLibs, name);
  const linkPath = path.join(besoncModulesDir, name);

  // Wipe existing dest/link
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { recursive: true, force: true });

  // Copy the src into dist
  fs.cpSync(src, dest, { recursive: true });

  // Symlink @besonc/<name> -> dist/libs/<name>
  fs.symlinkSync(path.join('..', '..', 'libs', name), linkPath, 'dir');

  // Create package.json for the lib (required for some module resolution)
  const pkg = { name: `@besonc/${name}`, version: '0.1.0', main: 'index.js' };
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(pkg, null, 2));

  console.log(`✓ @besonc/${name} -> dist/libs/${name}`);
}

console.log(`\nAll ${libNames.length} shared libs linked into dist/node_modules/@besonc/`);
