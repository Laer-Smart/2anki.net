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
  modelName: 'Basic',
  fields: [`Front ${suffix}`, `Back ${suffix}`],
  fieldNames: ['Front', 'Back'],
  tags: [],
});

describe('transformApkgNotes', () => {
  it('translates the back of every note', async () => {
    const calls: unknown[] = [];
    const client = makeClient(async (req) => {
      calls.push(req);
      return {
        content: [{ type: 'text', text: '{"value":"traducido"}' }],
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
    expect(result.notes.every((n) => n.fields[1] === 'traducido')).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(calls).toHaveLength(3);
    expect(result.usage.totalCalls).toBe(3);
    expect(result.usage.inputTokens).toBe(300);
    expect(result.usage.outputTokens).toBe(60);
    expect(result.usage.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('appends an example for add_example', async () => {
    const client = makeClient(async () => ({
      content: [
        { type: 'text', text: '{"example":"Mitochondria multiply rapidly."}' },
      ],
      usage: { input_tokens: 50, output_tokens: 15 },
    }));

    const result = await transformApkgNotes({
      notes: [sample('a')],
      transform: 'add_example',
      client: client as never,
    });

    expect(result.notes[0].fields[1]).toContain('Back a');
    expect(result.notes[0].fields[1]).toContain(
      'Mitochondria multiply rapidly.'
    );
  });

  it('flips Basic to Cloze for cloze_front', async () => {
    const client = makeClient(async () => ({
      content: [
        {
          type: 'text',
          text: '{"cloze":"{{c1::Mitochondrion}} is the powerhouse."}',
        },
      ],
      usage: { input_tokens: 50, output_tokens: 15 },
    }));

    const result = await transformApkgNotes({
      notes: [sample('a')],
      transform: 'cloze_front',
      client: client as never,
    });

    expect(result.notes[0].modelKind).toBe('cloze');
    expect(result.notes[0].fields[0]).toContain('{{c1::Mitochondrion}}');
    expect(result.notes[0].fields[1]).toBe('');
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
        content: [{ type: 'text', text: '{"value":"ok"}' }],
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

  it('keeps at most `concurrency` calls in flight and slides the window as each finishes', async () => {
    const total = 8;
    const concurrency = 3;
    let inFlight = 0;
    let peak = 0;
    const release: Array<() => void> = new Array(total);
    const started: Array<Promise<void>> = Array.from({ length: total }, () => {
      let resolveStarted: () => void = () => {};
      const p = new Promise<void>((r) => {
        resolveStarted = r;
      });
      (p as Promise<void> & { fire: () => void }).fire = resolveStarted;
      return p;
    });
    const fireStarted = (i: number) =>
      (started[i] as Promise<void> & { fire: () => void }).fire();

    const client = makeClient((req) => {
      const index = Number(
        (req as { messages: { content: string }[] }).messages[0].content.match(
          /\d+/
        )?.[0]
      );
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      fireStarted(index);
      return new Promise((resolve) => {
        release[index] = () => {
          inFlight -= 1;
          resolve({
            content: [{ type: 'text', text: '{"hint":"x"}' }],
            usage: { input_tokens: 0, output_tokens: 0 },
          });
        };
      });
    });

    const notes = Array.from({ length: total }, (_, i) => sample(String(i)));
    const job = transformApkgNotes({
      notes,
      transform: 'add_hint',
      concurrency,
      client: client as never,
    });

    await Promise.all([started[0], started[1], started[2]]);
    expect(inFlight).toBe(concurrency);

    const finishOrder = [2, 0, 1, 4, 3, 6, 7, 5];
    let nextToStart = concurrency;
    for (const idx of finishOrder) {
      await started[idx];
      expect(inFlight).toBeLessThanOrEqual(concurrency);
      release[idx]();
      if (nextToStart < total) {
        await started[nextToStart];
        nextToStart += 1;
      }
    }

    const result = await job;

    expect(peak).toBe(concurrency);
    expect(result.notes).toHaveLength(total);
    expect(result.usage.totalCalls).toBe(total);
    expect(result.notes.map((n) => n.guid)).toEqual(notes.map((n) => n.guid));
  });

  it('caches the static system prompt across per-note calls', async () => {
    const calls: Array<{ system: unknown }> = [];
    const client = makeClient(async (req) => {
      calls.push(req as { system: unknown });
      return {
        content: [{ type: 'text', text: '{"value":"x"}' }],
        usage: { input_tokens: 0, output_tokens: 0 },
      };
    });

    await transformApkgNotes({
      notes: [sample('a'), sample('b')],
      transform: 'translate_back',
      targetLanguage: 'Spanish',
      client: client as never,
    });

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.system).toEqual([
        {
          type: 'text',
          text: expect.any(String),
          cache_control: { type: 'ephemeral' },
        },
      ]);
    }
  });
});
