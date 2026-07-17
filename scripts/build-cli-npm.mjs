// Assembles a publishable npm package for the 2anki CLI into `npm-dist/`.
// The CLI is a dependency-free Node bundle, so the published package is just the
// bundled entry + a minimal package.json — `npx @2anki/cli` and
// `npm i -g @2anki/cli` both work, and npm installs never hit macOS Gatekeeper.
//
//   node scripts/build-cli-npm.mjs [version]
//
// Version comes from the arg, else the `cli-v*` tag in GITHUB_REF_NAME, else
// 0.0.0 for a local dry run. The release workflow runs this then `npm publish`.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

function resolveVersion() {
  const fromArg = process.argv[2];
  if (fromArg) return fromArg.replace(/^cli-v/, '');
  const ref = process.env.GITHUB_REF_NAME ?? '';
  if (ref.startsWith('cli-v')) return ref.slice('cli-v'.length);
  return '0.0.0';
}

const version = resolveVersion();
const outDir = 'npm-dist';
mkdirSync(outDir, { recursive: true });

// Bundle with a node shebang so the published bin is directly executable.
execFileSync(
  'npx',
  [
    '--yes',
    'esbuild@0.25.10',
    'src/cli/bin.ts',
    '--bundle',
    '--platform=node',
    '--target=node18',
    '--format=cjs',
    '--banner:js=#!/usr/bin/env node',
    `--outfile=${join(outDir, '2anki.cjs')}`,
  ],
  { stdio: 'inherit' }
);

const pkg = {
  name: '@2anki/cli',
  version,
  description: 'Turn your notes into Anki decks with the 2anki API',
  bin: { '2anki': '2anki.cjs' },
  files: ['2anki.cjs', 'README.md'],
  type: 'commonjs',
  engines: { node: '>=18' },
  keywords: ['anki', '2anki', 'flashcards', 'cli'],
  homepage: 'https://2anki.net/developers',
  license: 'MIT',
};
writeFileSync(
  join(outDir, 'package.json'),
  `${JSON.stringify(pkg, null, 2)}\n`
);

try {
  copyFileSync('src/cli/README.md', join(outDir, 'README.md'));
} catch {
  // README is optional for publish
}

process.stdout.write(`Assembled ${outDir}/ for @2anki/cli@${version}\n`);
