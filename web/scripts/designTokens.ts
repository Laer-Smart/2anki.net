/**
 * Pure helpers for auditing the design-token system in
 * `web/src/styles/base.css`: WCAG-AA contrast per theme and orphaned
 * (defined-but-unreferenced) color tokens.
 *
 * No filesystem access here — callers pass the CSS and source text in
 * (the colocated test reads the real files). This is the machine check
 * that DESIGN.md's colour rules describe in prose, so a sub-AA pairing
 * (the kind PR #3341 caught by hand) fails the suite instead of shipping.
 */

export type ThemeName = 'light' | 'dark' | 'gold' | 'purple' | 'hotpink';

export interface ThemeTokens {
  theme: ThemeName;
  tokens: Record<string, string>;
}

const SELECTOR_TO_THEME: Record<string, ThemeName> = {
  ':root': 'light',
  "[data-theme='dark']": 'dark',
  "[data-theme='gold']": 'gold',
  "[data-theme='purple']": 'purple',
  "[data-theme='hotpink']": 'hotpink',
};

/** A foreground/background token pair that actually co-occurs on screen,
 *  with the WCAG-AA ratio it must clear. */
export interface ContrastPair {
  label: string;
  foreground: string;
  background: string;
  minRatio: number;
}

const NORMAL_TEXT_AA = 4.5;
// Tertiary text is metadata / placeholder copy — DESIGN.md commits it to
// the large-text / non-essential AA floor of 3:1, not 4.5:1.
const LARGE_TEXT_AA = 3;

export const CONTRAST_PAIRS: ContrastPair[] = [
  {
    label: 'primary text on primary bg',
    foreground: '--color-text-primary',
    background: '--color-bg-primary',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'primary text on secondary bg',
    foreground: '--color-text-primary',
    background: '--color-bg-secondary',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'secondary text on primary bg',
    foreground: '--color-text-secondary',
    background: '--color-bg-primary',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'secondary text on secondary bg',
    foreground: '--color-text-secondary',
    background: '--color-bg-secondary',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'tertiary text on primary bg',
    foreground: '--color-text-tertiary',
    background: '--color-bg-primary',
    minRatio: LARGE_TEXT_AA,
  },
  {
    label: 'tertiary text on secondary bg',
    foreground: '--color-text-tertiary',
    background: '--color-bg-secondary',
    minRatio: LARGE_TEXT_AA,
  },
  {
    label: 'link text on primary bg',
    foreground: '--color-text-link',
    background: '--color-bg-primary',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'link text on secondary bg',
    foreground: '--color-text-link',
    background: '--color-bg-secondary',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'danger text on danger-light bg',
    foreground: '--color-danger-text',
    background: '--color-danger-light',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'success text on success-light bg',
    foreground: '--color-success-text',
    background: '--color-success-light',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'warning text on warning-light bg',
    foreground: '--color-warning-text',
    background: '--color-warning-light',
    minRatio: NORMAL_TEXT_AA,
  },
  {
    label: 'info text on info-light bg',
    foreground: '--color-info-text',
    background: '--color-info-light',
    minRatio: NORMAL_TEXT_AA,
  },
];

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a 6-digit hex colour: ${hex}`);
  }
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG contrast ratio in [1, 21]; order-independent. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Parse each theme block in base.css into its token map. */
export function parseThemeTokens(css: string): ThemeTokens[] {
  const results: ThemeTokens[] = [];
  for (const [selector, theme] of Object.entries(SELECTOR_TO_THEME)) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
    if (!block) {
      continue;
    }
    const tokens: Record<string, string> = {};
    const tokenRe = /(--[\w-]+):\s*([^;]+);/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRe.exec(block[1])) !== null) {
      tokens[match[1]] = match[2].trim();
    }
    results.push({ theme, tokens });
  }
  return results;
}

export interface ContrastFinding {
  theme: ThemeName;
  pair: string;
  ratio: number;
  minRatio: number;
}

/** Every pair below its AA floor, across every theme. Empty = all pass. */
export function auditContrast(
  themes: ThemeTokens[],
  pairs: ContrastPair[] = CONTRAST_PAIRS
): ContrastFinding[] {
  const findings: ContrastFinding[] = [];
  for (const { theme, tokens } of themes) {
    for (const pair of pairs) {
      const fg = tokens[pair.foreground];
      const bg = tokens[pair.background];
      if (fg == null || bg == null) {
        continue;
      }
      const ratio = contrastRatio(fg, bg);
      if (ratio < pair.minRatio) {
        findings.push({
          theme,
          pair: pair.label,
          ratio,
          minRatio: pair.minRatio,
        });
      }
    }
  }
  return findings;
}

/** Color token names defined in :root (the canonical superset). */
export function collectColorTokenNames(css: string): string[] {
  const root = new RegExp(':root\\s*\\{([^}]*)\\}').exec(css);
  if (!root) {
    return [];
  }
  const names: string[] = [];
  const tokenRe = /(--color-[\w-]+):/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(root[1])) !== null) {
    names.push(match[1]);
  }
  return names;
}

/**
 * Color tokens defined in :root but never read via `var(--token)` anywhere
 * in the provided source (which must include base.css itself, so a token
 * consumed only by a base-stylesheet rule still counts as used).
 */
export function findOrphanTokens(
  css: string,
  combinedSource: string
): string[] {
  return collectColorTokenNames(css).filter(
    (name) => !combinedSource.includes(`var(${name})`)
  );
}

export function formatContrastFindings(findings: ContrastFinding[]): string {
  return findings
    .map(
      (f) =>
        `  ${f.theme}: ${f.pair} — ${f.ratio.toFixed(2)}:1 (needs ${f.minRatio}:1)`
    )
    .join('\n');
}
