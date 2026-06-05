import { setupTests } from '../../test/configure-jest';
import {
  runParserCanary,
  CANARY_FIXTURES,
  CanaryResult,
} from './runParserCanary';

beforeEach(() => setupTests());

describe('runParserCanary', () => {
  test('returns pass when all fixtures match their snapshots', async () => {
    const result = await runParserCanary();
    expect(result.status).toBe('pass');
    if (result.status === 'pass') {
      expect(result.failures).toHaveLength(0);
    }
  });

  test('CANARY_FIXTURES lists at least one fixture', () => {
    expect(CANARY_FIXTURES.length).toBeGreaterThan(0);
  });

  test('each fixture entry has a name and snapshot with non-negative counts', () => {
    for (const fixture of CANARY_FIXTURES) {
      expect(typeof fixture.name).toBe('string');
      expect(fixture.name.length).toBeGreaterThan(0);
      expect(fixture.snapshot.cardCount).toBeGreaterThanOrEqual(0);
      expect(fixture.snapshot.imageCount).toBeGreaterThanOrEqual(0);
      expect(fixture.snapshot.clozeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('returns fail with structured diff when a fixture diverges from its snapshot', async () => {
    const result = await runParserCanary([
      {
        name: 'notion-html-2024',
        snapshot: { cardCount: 9999, imageCount: 9999, clozeCount: 9999 },
      },
    ]);

    expect(result.status).toBe('fail');
    if (result.status === 'fail') {
      expect(result.failures.length).toBeGreaterThan(0);
      const failure = result.failures[0];
      expect(failure.fixtureName).toBe('notion-html-2024');
      expect(failure.expected).toEqual({
        cardCount: 9999,
        imageCount: 9999,
        clozeCount: 9999,
      });
      expect(failure.actual.cardCount).not.toBe(9999);
    }
  });

  test('result carries no undefined fields', async () => {
    const result = await runParserCanary();
    expect(result.status).toBeDefined();
    if (result.status === 'pass') {
      expect(result.failures).toBeDefined();
    }
    if (result.status === 'fail') {
      expect(result.failures).toBeDefined();
    }
  });
});
