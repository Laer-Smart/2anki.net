jest.mock('../observability/instrumentedAxios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  OBSERVABILITY_SERVICES: ['pexels', 'wikimedia'],
}));

import instrumentedAxios from '../observability/instrumentedAxios';
import { buildImageQuery, fetchImage } from './imageFetchService';

const mockedGet = instrumentedAxios.get as jest.MockedFunction<
  typeof instrumentedAxios.get
>;

describe('buildImageQuery', () => {
  it('strips HTML tags from the source text', () => {
    expect(buildImageQuery('<b>cat</b>')).toBe('cat');
  });

  it('collapses whitespace and strips punctuation', () => {
    expect(buildImageQuery('  cat,  the   pet!  ')).toBe('cat the pet');
  });

  it('keeps unicode letters and numbers', () => {
    expect(buildImageQuery('猫 chat 100%')).toBe('猫 chat 100');
  });

  it('truncates at 100 characters', () => {
    const long = 'word '.repeat(50);
    expect(buildImageQuery(long).length).toBeLessThanOrEqual(100);
  });
});

describe('fetchImage', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('returns undefined when the query is empty', async () => {
    const result = await fetchImage('   ', 'wikimedia');
    expect(result).toBeUndefined();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  describe('pexels', () => {
    it('returns undefined when no API key is provided', async () => {
      const result = await fetchImage('cat', 'pexels');
      expect(result).toBeUndefined();
      expect(mockedGet).not.toHaveBeenCalled();
    });

    it('returns the medium-size photo on a hit', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: {
            photos: [
              {
                src: { medium: 'https://images.pexels.com/cat-medium.jpg' },
                photographer: 'Alex Photographer',
              },
            ],
          },
          status: 200,
          headers: {},
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .mockResolvedValueOnce({
          data: Buffer.from('jpeg-bytes'),
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      const result = await fetchImage('cat', 'pexels', {
        pexelsApiKey: 'KEY_VAL',
      });

      expect(result).toBeDefined();
      expect(result?.mimeType).toBe('image/jpeg');
      expect(result?.filename).toMatch(/^2anki-[a-f0-9]{16}\.jpg$/);
      expect(result?.attribution).toBe('Photo by Alex Photographer on Pexels');

      const [service, url, config] = mockedGet.mock.calls[0];
      expect(service).toBe('pexels');
      expect(url).toBe('https://api.pexels.com/v1/search');
      expect(
        ((config as { headers: Record<string, string> }).headers).Authorization
      ).toBe('KEY_VAL');
    });

    it('returns undefined when Pexels has no photos for the query', async () => {
      mockedGet.mockResolvedValueOnce({
        data: { photos: [] },
        status: 200,
        headers: {},
        config: {},
        statusText: 'OK',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await fetchImage('garbledquery', 'pexels', {
        pexelsApiKey: 'KEY_VAL',
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when the Pexels search call throws', async () => {
      mockedGet.mockRejectedValueOnce(new Error('boom'));

      const result = await fetchImage('cat', 'pexels', {
        pexelsApiKey: 'KEY_VAL',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('wikimedia', () => {
    it('returns the page-image thumbnail for the matching article', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: {
            query: {
              pages: {
                '42': {
                  title: 'Heart',
                  thumbnail: {
                    source: 'https://upload.wikimedia.org/heart-thumb.jpg',
                    width: 800,
                    height: 600,
                  },
                  original: {
                    source: 'https://upload.wikimedia.org/heart-full.jpg',
                  },
                },
              },
            },
          },
          status: 200,
          headers: {},
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .mockResolvedValueOnce({
          data: Buffer.from('jpg-bytes'),
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      const result = await fetchImage('heart anatomy', 'wikimedia');

      expect(result).toBeDefined();
      expect(result?.attribution).toBe('Heart (Wikipedia)');
      expect(result?.filename).toMatch(/\.jpg$/);
    });

    it('falls back to the original image when no thumbnail is available', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: {
            query: {
              pages: {
                '7': {
                  title: 'Madrid',
                  original: {
                    source: 'https://upload.wikimedia.org/madrid.png',
                  },
                },
              },
            },
          },
          status: 200,
          headers: {},
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .mockResolvedValueOnce({
          data: Buffer.from('png-bytes'),
          status: 200,
          headers: { 'content-type': 'image/png' },
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      const result = await fetchImage('Madrid', 'wikimedia');

      expect(result).toBeDefined();
      expect(result?.attribution).toBe('Madrid (Wikipedia)');
    });

    it('returns undefined when neither pageimages nor the summary fallback yield an image', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: {
            query: {
              pages: {
                '7': {
                  title: 'Obscure topic',
                },
              },
            },
          },
          status: 200,
          headers: {},
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .mockResolvedValueOnce({
          data: {},
          status: 200,
          headers: {},
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      const result = await fetchImage('obscure topic', 'wikimedia');

      expect(result).toBeUndefined();
    });

    it('falls back to the REST summary endpoint when pageimages returns no thumbnail', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: {
            query: {
              pages: {
                '11': {
                  title: 'Saitama',
                },
              },
            },
          },
          status: 200,
          headers: {},
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .mockResolvedValueOnce({
          data: {
            thumbnail: {
              source: 'https://upload.wikimedia.org/saitama.jpg',
            },
          },
          status: 200,
          headers: {},
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .mockResolvedValueOnce({
          data: Buffer.from('jpg-bytes'),
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
          config: {},
          statusText: 'OK',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      const result = await fetchImage('Saitama prefecture', 'wikimedia');

      expect(result).toBeDefined();
      expect(result?.attribution).toBe('Saitama (Wikipedia)');
    });

    it('returns undefined when no pages come back from the search', async () => {
      mockedGet.mockResolvedValueOnce({
        data: { query: {} },
        status: 200,
        headers: {},
        config: {},
        statusText: 'OK',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await fetchImage('garbledquery', 'wikimedia');

      expect(result).toBeUndefined();
    });
  });
});
