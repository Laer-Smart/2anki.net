import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KNOWN_EVENTS } from './events';

function readServerKnownEvents(): Set<string> {
  const serverSource = readFileSync(
    join(__dirname, '../../../../src/types/AnalyticsEvents.ts'),
    'utf8'
  );
  const matches = serverSource.matchAll(/'([a-z0-9_]+)'/g);
  return new Set(Array.from(matches, (m) => m[1]));
}

describe('web/server KNOWN_EVENTS parity', () => {
  it('every web-fired event is in the server allowlist', () => {
    const serverEvents = readServerKnownEvents();
    const missing = Array.from(KNOWN_EVENTS).filter(
      (name) => !serverEvents.has(name)
    );
    expect(missing).toEqual([]);
  });
});
