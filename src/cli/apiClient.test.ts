import { ApiClient, ApiError } from './apiClient';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    text: async () => JSON.stringify(body),
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

  it('uploads a file as multipart with the bearer token', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(200, { key: 'deck123' })
    );
    const client = new ApiClient(
      { apiKey: 'sk_live_abc', apiBase: 'http://localhost:2020' },
      fetchImpl as unknown as typeof fetch
    );

    const job = await client.uploadFile('notes.md', new Uint8Array([1, 2, 3]));

    expect(job.key).toBe('deck123');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('http://localhost:2020/api/upload/file');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer sk_live_abc'
    );
    expect(init.body).toBeInstanceOf(FormData);
    // The server multer field is `pakker`, not `file` — sending the wrong name
    // yields an empty req.files and a 400 "Please select a file to upload."
    const form = init.body as FormData;
    expect(form.get('pakker')).not.toBeNull();
    expect(form.get('file')).toBeNull();
  });
});
