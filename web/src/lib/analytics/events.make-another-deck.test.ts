import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KNOWN_EVENTS } from './events';

describe('make_another_deck_clicked event', () => {
  it('is in the web allowlist', () => {
    expect(KNOWN_EVENTS.has('make_another_deck_clicked')).toBe(true);
  });

  it('is in the server allowlist', () => {
    const serverSource = readFileSync(
      join(__dirname, '../../../../src/types/AnalyticsEvents.ts'),
      'utf8'
    );
    expect(serverSource).toContain("'make_another_deck_clicked'");
  });
});
