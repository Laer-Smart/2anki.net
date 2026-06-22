import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditContrast,
  collectColorTokenNames,
  contrastRatio,
  findOrphanTokens,
  formatContrastFindings,
  hexToRgb,
  parseThemeTokens,
} from './designTokens';

const BASE_CSS = readFileSync(
  join(__dirname, '../src/styles/base.css'),
  'utf8'
);

function readSourceTree(dir: string): string {
  let combined = '';
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'generated') {
        continue;
      }
      combined += readSourceTree(full);
    } else if (/\.(ts|tsx|css|module\.css)$/.test(entry.name)) {
      combined += readFileSync(full, 'utf8');
    }
  }
  return combined;
}

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio('#3b82f6', '#3b82f6')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#1f2937', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#1f2937'),
      5
    );
  });

  it('expands 3-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000')).toEqual([0, 0, 0]);
  });
});

describe('parseThemeTokens', () => {
  it('parses all five themes from base.css', () => {
    const themes = parseThemeTokens(BASE_CSS);
    expect(themes.map((t) => t.theme)).toEqual([
      'light',
      'dark',
      'gold',
      'purple',
      'hotpink',
    ]);
    expect(themes[0].tokens['--color-bg-primary']).toBe('#ffffff');
  });
});

describe('base.css contrast (WCAG AA, every theme)', () => {
  it('clears the AA floor for every audited pair', () => {
    const findings = auditContrast(parseThemeTokens(BASE_CSS));
    expect(
      findings,
      `Sub-AA contrast pairs:\n${formatContrastFindings(findings)}`
    ).toEqual([]);
  });
});

describe('findOrphanTokens', () => {
  it('flags a defined-but-unreferenced token in a fixture', () => {
    const css = ':root { --color-used: #fff; --color-orphan: #000; }';
    const source = `${css}\n.a { color: var(--color-used); }`;
    expect(findOrphanTokens(css, source)).toEqual(['--color-orphan']);
  });

  it('treats a token referenced only inside base.css as used', () => {
    const css =
      ':root { --color-only-base: #fff; }\nbody { color: var(--color-only-base); }';
    expect(findOrphanTokens(css, css)).toEqual([]);
  });

  // Color tokens defined in base.css but referenced nowhere today. They are
  // not deleted here: --color-gold-* and --color-indigo are documented in
  // DESIGN.md as the Lifetime/Pro card palette, so removing them is a product
  // call, not a tooling one. This baseline is a ratchet — a NEW orphan fails
  // the suite, and wiring one up (or deleting it) requires trimming this list.
  const KNOWN_UNUSED_TOKENS = [
    '--color-text-success',
    '--color-gold-bg',
    '--color-gold-bg-end',
    '--color-gold-border',
    '--color-gold-border-light',
    '--color-gold-border-hover',
    '--color-gold-text',
    '--color-gold-text-dark',
    '--color-gold-text-darker',
    '--color-gold-shadow',
    '--color-indigo',
  ];

  it('introduces no orphaned color tokens beyond the known baseline', () => {
    const orphans = findOrphanTokens(
      BASE_CSS,
      BASE_CSS + readSourceTree(join(__dirname, '../src'))
    );
    const unexpected = orphans.filter((t) => !KNOWN_UNUSED_TOKENS.includes(t));
    expect(
      unexpected,
      `New orphaned color tokens (define + use, or delete):\n  ${unexpected.join('\n  ')}`
    ).toEqual([]);
    const revived = KNOWN_UNUSED_TOKENS.filter((t) => !orphans.includes(t));
    expect(
      revived,
      `Tokens now in use — remove from KNOWN_UNUSED_TOKENS:\n  ${revived.join('\n  ')}`
    ).toEqual([]);
  });

  it('defines color tokens in :root', () => {
    expect(collectColorTokenNames(BASE_CSS).length).toBeGreaterThan(30);
  });
});
