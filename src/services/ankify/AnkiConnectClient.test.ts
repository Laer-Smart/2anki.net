import {
  AnkiConnectClient,
  AnkiConnectError,
  AnkiConnectUnreachableError,
} from './AnkiConnectClient';

const makeFetch = (
  body: unknown,
  init: Partial<{ ok: boolean; status: number; statusText: string }> = {}
) =>
  jest.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: async () => body,
  })) as unknown as typeof fetch;

describe('AnkiConnectClient', () => {
  test('addNote sends a POST with action+version and returns the result', async () => {
    const fetchImpl = makeFetch({ result: 1234567890, error: null });
    const client = new AnkiConnectClient(
      'http://localhost:8765',
      fetchImpl,
      5000
    );

    const id = await client.addNote({
      deckName: 'My Deck',
      modelName: 'TestModel',
      fields: { Front: 'q', Back: 'a' },
      tags: ['notion-sync'],
    });

    expect(id).toBe(1234567890);
    const callArgs = (fetchImpl as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toBe('http://localhost:8765');
    const body = JSON.parse(callArgs[1].body);
    expect(body).toEqual({
      action: 'addNote',
      version: 6,
      params: {
        note: {
          deckName: 'My Deck',
          modelName: 'TestModel',
          fields: { Front: 'q', Back: 'a' },
          tags: ['notion-sync'],
        },
      },
    });
  });

  test('changeDeck sends the card ids and target deck', async () => {
    const fetchImpl = makeFetch({ result: null, error: null });
    const client = new AnkiConnectClient('http://x', fetchImpl);

    await client.changeDeck([9001, 9002], 'MS3::Pharmacology');

    const body = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({
      action: 'changeDeck',
      version: 6,
      params: { cards: [9001, 9002], deck: 'MS3::Pharmacology' },
    });
  });

  test('omits params for parameterless actions like version/sync', async () => {
    const fetchImpl = makeFetch({ result: 6, error: null });
    const client = new AnkiConnectClient('http://x', fetchImpl);

    await client.ping();

    const body = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({ action: 'version', version: 6 });
  });

  test('throws AnkiConnectError when the response carries an error string', async () => {
    const fetchImpl = makeFetch({ result: null, error: 'deck not found' });
    const client = new AnkiConnectClient('http://x', fetchImpl);

    await expect(client.deckNames()).rejects.toBeInstanceOf(AnkiConnectError);
  });

  test('throws AnkiConnectError when HTTP status is not OK', async () => {
    const fetchImpl = makeFetch(
      {},
      { ok: false, status: 500, statusText: 'Internal Server Error' }
    );
    const client = new AnkiConnectClient('http://x', fetchImpl);

    await expect(client.deckNames()).rejects.toBeInstanceOf(AnkiConnectError);
  });

  test('includes the apiKey field in every action body when configured', async () => {
    const fetchImpl = makeFetch({ result: 6, error: null });
    const client = new AnkiConnectClient(
      'http://localhost:8765',
      fetchImpl,
      undefined,
      'secret-key-abc'
    );

    await client.ping();
    await client.deckNames();

    const body0 = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    const body1 = JSON.parse((fetchImpl as jest.Mock).mock.calls[1][1].body);
    expect(body0).toEqual({
      action: 'version',
      version: 6,
      key: 'secret-key-abc',
    });
    expect(body1).toEqual({
      action: 'deckNames',
      version: 6,
      key: 'secret-key-abc',
    });
  });

  test('omits the key field when apiKey is null (legacy/local containers)', async () => {
    const fetchImpl = makeFetch({ result: 6, error: null });
    const client = new AnkiConnectClient('http://x', fetchImpl);

    await client.ping();

    const body = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).not.toHaveProperty('key');
  });

  test('createModel posts the createModel action with css/cardTemplates payload', async () => {
    const fetchImpl = makeFetch({
      result: { id: 1700000000000 },
      error: null,
    });
    const client = new AnkiConnectClient('http://localhost:8765', fetchImpl);

    await client.createModel({
      modelName: 'Ankify Basic',
      inOrderFields: ['Front', 'Back'],
      css: '.card { color: black; }',
      isCloze: false,
      cardTemplates: [
        {
          Name: 'Card 1',
          Front: '{{Front}}',
          Back: '{{FrontSide}}<hr id="answer">{{Back}}',
        },
      ],
    });

    const body = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({
      action: 'createModel',
      version: 6,
      params: {
        modelName: 'Ankify Basic',
        inOrderFields: ['Front', 'Back'],
        css: '.card { color: black; }',
        isCloze: false,
        cardTemplates: [
          {
            Name: 'Card 1',
            Front: '{{Front}}',
            Back: '{{FrontSide}}<hr id="answer">{{Back}}',
          },
        ],
      },
    });
  });

  test('updateModelStyling posts the updateModelStyling action with model.css payload', async () => {
    const fetchImpl = makeFetch({ result: null, error: null });
    const client = new AnkiConnectClient('http://localhost:8765', fetchImpl);

    await client.updateModelStyling({
      name: 'Ankify Basic',
      css: '.card { color: red; }',
    });

    const body = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({
      action: 'updateModelStyling',
      version: 6,
      params: {
        model: { name: 'Ankify Basic', css: '.card { color: red; }' },
      },
    });
  });

  test('updateModelTemplates posts the updateModelTemplates action with templates payload', async () => {
    const fetchImpl = makeFetch({ result: null, error: null });
    const client = new AnkiConnectClient('http://localhost:8765', fetchImpl);

    await client.updateModelTemplates({
      name: 'Ankify Basic',
      templates: {
        'Card 1': { Front: '{{Front}}', Back: '{{Back}}' },
      },
    });

    const body = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({
      action: 'updateModelTemplates',
      version: 6,
      params: {
        model: {
          name: 'Ankify Basic',
          templates: {
            'Card 1': { Front: '{{Front}}', Back: '{{Back}}' },
          },
        },
      },
    });
  });

  test('storeMediaFile posts the storeMediaFile action with filename + base64 data', async () => {
    const fetchImpl = makeFetch({ result: 'ankify-x.png', error: null });
    const client = new AnkiConnectClient('http://localhost:8765', fetchImpl);

    const stored = await client.storeMediaFile({
      filename: 'ankify-x.png',
      data: 'UEFTREFUQQ==',
    });

    expect(stored).toBe('ankify-x.png');
    const body = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({
      action: 'storeMediaFile',
      version: 6,
      params: { filename: 'ankify-x.png', data: 'UEFTREFUQQ==' },
    });
  });

  test('throws AnkiConnectUnreachableError when fetch rejects', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as unknown as typeof fetch;
    const client = new AnkiConnectClient('http://x', fetchImpl);

    await expect(client.deckNames()).rejects.toBeInstanceOf(
      AnkiConnectUnreachableError
    );
  });
});
