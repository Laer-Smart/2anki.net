import { execFileSync } from 'node:child_process';

const SHORT_SHA_LENGTH = 7;
// Wide enough for a full TrunkVer (timestamp.0.0-g<sha>-<buildref>); the
// error_events.release column is varchar(64) to match.
const MAX_RELEASE_LENGTH = 64;
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function normalizeRelease(
  raw: string | null | undefined
): string | null {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '') {
    return null;
  }
  if (FULL_SHA_PATTERN.test(trimmed)) {
    return trimmed.slice(0, SHORT_SHA_LENGTH);
  }
  return trimmed.slice(0, MAX_RELEASE_LENGTH);
}

function readGitShortSha(): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      timeout: 5_000,
    });
  } catch {
    return null;
  }
}

interface ReleaseEnv {
  RELEASE?: string;
  GIT_SHA?: string;
}

export function resolveRelease(
  env: ReleaseEnv = process.env,
  readGitSha: () => string | null = readGitShortSha
): string | null {
  return (
    normalizeRelease(env.RELEASE) ??
    normalizeRelease(env.GIT_SHA) ??
    normalizeRelease(readGitSha())
  );
}

let cachedRelease: string | null | undefined;

export function getRelease(): string | null {
  if (cachedRelease === undefined) {
    cachedRelease = resolveRelease();
  }
  return cachedRelease;
}
