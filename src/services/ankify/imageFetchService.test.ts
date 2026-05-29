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
    it('returns the image url found via the search generator', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: {
            query: {
              pages: {
                '42': {
                  title: 'File:Anatomy heart.jpg',
                  imageinfo: [
                    {
                      url: 'https://upload.wikimedia.org/heart.jpg',
                      mime: 'image/jpeg',
                    },
                  ],
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

      const result = await fetchImage('heart anatomy', 'wikimedia');

      expect(result).toBeDefined();
      expect(result?.attribution).toBe(
        'File:Anatomy heart.jpg (Wikimedia Commons)'
      );
      expect(result?.filename).toMatch(/\.png$/);
    });

    it('rejects SVG results so Anki can render the image without an SVG renderer', async () => {
      mockedGet.mockResolvedValueOnce({
        data: {
          query: {
            pages: {
              '7': {
                title: 'File:Diagram.svg',
                imageinfo: [
                  {
                    url: 'https://upload.wikimedia.org/diagram.svg',
                    mime: 'image/svg+xml',
                  },
                ],
              },
            },
          },
        },
        status: 200,
        headers: {},
        config: {},
        statusText: 'OK',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await fetchImage('diagram', 'wikimedia');

      expect(result).toBeUndefined();
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
