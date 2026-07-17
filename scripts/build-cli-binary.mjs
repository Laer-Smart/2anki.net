// Builds a standalone `2anki` executable for the current platform using Node's
// built-in Single Executable Application support. No third-party packager.
//
//   pnpm cli:bundle            # bundle src/cli -> dist/cli/2anki.cjs
//   node scripts/build-cli-binary.mjs
//
// Output: dist/cli/2anki (or 2anki.exe on Windows). The release workflow runs
// this on macOS, Linux, and Windows runners and uploads each artifact.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const outDir = join('dist', 'cli');
const binary = join(outDir, isWindows ? '2anki.exe' : '2anki');

function run(cmd, args) {
  // execFileSync can't resolve a bare `npx` from PATH (ENOENT), and on Windows
  // it's a .cmd shim that also needs a shell to run (EINVAL otherwise). npx sits
  // next to the running node binary, so resolve it there and use a shell on
  // Windows. Other commands (node, codesign) are real executables, spawn fine.
  if (cmd === 'npx') {
    const name = isWindows ? 'npx.cmd' : 'npx';
    const colocated = join(dirname(process.execPath), name);
    const resolved = existsSync(colocated) ? colocated : name;
    execFileSync(resolved, args, { stdio: 'inherit', shell: isWindows });
    return;
  }
  execFileSync(cmd, args, { stdio: 'inherit' });
}

mkdirSync(outDir, { recursive: true });

// 1. Generate the SEA blob from the bundled entry.
run(process.execPath, ['--experimental-sea-config', 'sea-config.json']);

// 2. Copy the running node binary as the target executable.
copyFileSync(process.execPath, binary);

// 3. On macOS the signature must be removed before injecting, then re-applied.
if (isMac) {
  try {
    run('codesign', ['--remove-signature', binary]);
  } catch {
    // unsigned already
  }
}

// 4. Inject the blob into the copied binary.
const postjectArgs = [
  '--yes',
  'postject',
  binary,
  'NODE_SEA_BLOB',
  join(outDir, 'sea-prep.blob'),
  '--sentinel-fuse',
  FUSE,
];
if (isMac) {
  postjectArgs.push('--macho-segment-name', 'NODE_SEA');
}
run('npx', postjectArgs);

// 5. Re-sign ad-hoc on macOS so Gatekeeper will run it.
if (isMac) {
  run('codesign', ['--sign', '-', binary]);
}

process.stdout.write(`Built ${binary}\n`);
