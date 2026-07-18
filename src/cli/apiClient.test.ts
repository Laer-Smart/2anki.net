import { ApiClient, ApiError } from './apiClient';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as Response;
}

function apkgResponse(
  bytes: number[],
  headers: Record<string, string>
): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/apkg', ...headers }),
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  } as Response;
}

describe('ApiClient', () => {
  it('verifies the key against the key-authed jobs endpoint with a bearer token', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(200, []));
    const client = new ApiClient(
      { apiKey: 'sk_live_abc', apiBase: 'http://localhost:2020' },
      fetchImpl as unknown as typeof fetch
    );

    await client.listJobs();

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:2020/api/upload/jobs',
      { headers: { Authorization: 'Bearer sk_live_abc' } }
    );
  });

  it('throws a typed ApiError with the server message on a non-2xx', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(401, { message: 'Authentication required' })
    );
    const client = new ApiClient(
      { apiKey: 'sk_live_abc' },
      fetchImpl as unknown as typeof fetch
    );

    await expect(client.listJobs()).rejects.toMatchObject({
      status: 401,
      message: 'Authentication required',
    });
  });

  it('refuses to call the API when no key is stored', async () => {
    const client = new ApiClient({});
    await expect(client.listJobs()).rejects.toBeInstanceOf(ApiError);
  });

  it('posts the file under the `pakker` field with the bearer token', async () => {
    const fetchImpl = jest.fn(async () =>
      apkgResponse([1, 2, 3], { 'file-name': 'Deck.apkg', 'x-card-count': '5' })
    );
    const client = new ApiClient(
      { apiKey: 'sk_live_abc', apiBase: 'http://localhost:2020' },
      fetchImpl as unknown as typeof fetch
    );

    await client.convert('notes.md', new Uint8Array([1, 2, 3]));

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('http://localhost:2020/api/upload/file');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer sk_live_abc'
    );
    // The server multer field is `pakker`, not `file` — the wrong name yields an
    // empty req.files and a 400 "Please select a file to upload."
    const form = init.body as FormData;
    expect(form.get('pakker')).not.toBeNull();
    expect(form.get('file')).toBeNull();
  });

  it('returns a single deck as raw apkg bytes with its name and card count', async () => {
    const fetchImpl = jest.fn(async () =>
      apkgResponse([9, 9, 9], {
        'file-name': encodeURIComponent('My Deck.apkg'),
        'x-card-count': '42',
      })
    );
    const client = new ApiClient(
      { apiKey: 'sk_live_abc' },
      fetchImpl as unknown as typeof fetch
    );

    const result = await client.convert('notes.md', new Uint8Array([1]));

    expect(result).toEqual({
      kind: 'single',
      bytes: new Uint8Array([9, 9, 9]),
      deckName: 'My Deck.apkg',
      cardCount: 42,
    });
  });

  it('returns batch decks when the server responds with JSON', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(200, {
        kind: 'batch',
        decks: [
          { name: 'A', filename: 'A.apkg', downloadUrl: '/download/w/A.apkg' },
        ],
      })
    );
    const client = new ApiClient(
      { apiKey: 'sk_live_abc' },
      fetchImpl as unknown as typeof fetch
    );

    const result = await client.convert('notes.zip', new Uint8Array([1]));

    expect(result.kind).toBe('batch');
    if (result.kind === 'batch') {
      expect(result.decks[0].downloadUrl).toBe('/download/w/A.apkg');
    }
  });

  it('surfaces the server error message on a failed convert', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(400, { message: 'Please select a file to upload.' })
    );
    const client = new ApiClient(
      { apiKey: 'sk_live_abc' },
      fetchImpl as unknown as typeof fetch
    );

    await expect(
      client.convert('notes.md', new Uint8Array([1]))
    ).rejects.toMatchObject({
      status: 400,
      message: 'Please select a file to upload.',
    });
  });
});
