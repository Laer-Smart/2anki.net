import { transformApkgNotes } from './transformService';
import { ParsedNote } from '../../lib/ankify/transforms/types';

type MessageCreateFn = (req: unknown) => Promise<unknown>;

interface FakeClient {
  messages: { create: MessageCreateFn };
}

function makeClient(handler: MessageCreateFn): FakeClient {
  return { messages: { create: handler } };
}

const sample = (suffix: string): ParsedNote => ({
  guid: `g-${suffix}`,
  modelKind: 'basic',
  front: `Front ${suffix}`,
  back: `Back ${suffix}`,
  tags: [],
});

describe('transformApkgNotes', () => {
  it('translates the back of every note', async () => {
    const calls: unknown[] = [];
    const client = makeClient(async (req) => {
      calls.push(req);
      return {
        content: [{ type: 'text', text: '{"back":"traducido"}' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      };
    });

    const result = await transformApkgNotes({
      notes: [sample('a'), sample('b'), sample('c')],
      transform: 'translate_back',
      targetLanguage: 'Spanish',
      concurrency: 2,
      client: client as never,
    });

    expect(result.notes).toHaveLength(3);
    expect(result.notes.every((n) => n.back === 'traducido')).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(calls).toHaveLength(3);
    expect(result.usage.totalCalls).toBe(3);
    expect(result.usage.inputTokens).toBe(300);
    expect(result.usage.outputTokens).toBe(60);
    expect(result.usage.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('appends an example for add_example', async () => {
    const client = makeClient(async () => ({
      content: [{ type: 'text', text: '{"example":"Mitochondria multiply rapidly."}' }],
      usage: { input_tokens: 50, output_tokens: 15 },
    }));

    const result = await transformApkgNotes({
      notes: [sample('a')],
      transform: 'add_example',
      client: client as never,
    });

    expect(result.notes[0].back).toContain('Back a');
    expect(result.notes[0].back).toContain('Mitochondria multiply rapidly.');
  });

  it('flips Basic to Cloze for cloze_front', async () => {
    const client = makeClient(async () => ({
      content: [{ type: 'text', text: '{"cloze":"{{c1::Mitochondrion}} is the powerhouse."}' }],
      usage: { input_tokens: 50, output_tokens: 15 },
    }));

    const result = await transformApkgNotes({
      notes: [sample('a')],
      transform: 'cloze_front',
      client: client as never,
    });

    expect(result.notes[0].modelKind).toBe('cloze');
    expect(result.notes[0].front).toContain('{{c1::Mitochondrion}}');
    expect(result.notes[0].back).toBe('');
  });

  it('records a failure when the model returns junk', async () => {
    let n = 0;
    const client = makeClient(async () => {
      n += 1;
      if (n === 2) {
        return {
          content: [{ type: 'text', text: 'not json at all' }],
          usage: { input_tokens: 0, output_tokens: 0 },
        };
      }
      return {
        content: [{ type: 'text', text: '{"back":"ok"}' }],
        usage: { input_tokens: 0, output_tokens: 0 },
      };
    });

    const result = await transformApkgNotes({
      notes: [sample('a'), sample('b'), sample('c')],
      transform: 'translate_back',
      targetLanguage: 'Spanish',
      concurrency: 1,
      client: client as never,
    });

    expect(result.notes).toHaveLength(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].guid).toBe('g-b');
  });

  it('respects the concurrency bound', async () => {
    let inFlight = 0;
    let peak = 0;
    const client = makeClient(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight -= 1;
      return {
        content: [{ type: 'text', text: '{"hint":"x"}' }],
        usage: { input_tokens: 0, output_tokens: 0 },
      };
    });

    const notes = Array.from({ length: 8 }, (_, i) => sample(String(i)));
    await transformApkgNotes({
      notes,
      transform: 'add_hint',
      concurrency: 3,
      client: client as never,
    });

    expect(peak).toBeLessThanOrEqual(3);
  });
});
