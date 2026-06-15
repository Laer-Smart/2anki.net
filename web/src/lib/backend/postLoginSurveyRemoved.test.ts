import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC_ROOT = join(__dirname, '..', '..');

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !full.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('post-login survey removal', () => {
  it('no source file references the unmounted survey endpoint or marker', () => {
    const offenders = collectSourceFiles(SRC_ROOT).filter((file) => {
      const contents = readFileSync(file, 'utf8');
      return (
        contents.includes('surveys/post-login') ||
        contents.includes('2anki_post_login') ||
        contents.includes('PostLoginSurvey')
      );
    });

    expect(offenders).toEqual([]);
  });
});
