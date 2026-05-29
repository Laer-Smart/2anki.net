jest.mock('./imageFetchService', () => ({
  buildImageQuery: jest.fn((value: string) => value.trim()),
  fetchImage: jest.fn(),
}));

import { fetchImage } from './imageFetchService';
import { transformApkgWithImages } from './imageTransformService';
import { ParsedNote } from '../../lib/ankify/transforms/types';

const mockedFetch = fetchImage as jest.MockedFunction<typeof fetchImage>;

const note = (
  overrides: Partial<ParsedNote> & { front?: string; back?: string } = {}
): ParsedNote => {
  const { front, back, ...rest } = overrides;
  return {
    guid: 'g-1',
    modelKind: 'basic',
    modelName: 'Basic',
    fields: [front ?? 'cat', back ?? 'a small carnivorous mammal'],
    fieldNames: ['Front', 'Back'],
    tags: [],
    ...rest,
  };
};

describe('transformApkgWithImages', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('appends an <img> tag to the back field on a hit', async () => {
    mockedFetch.mockResolvedValueOnce({
      bytes: Buffer.from('jpeg'),
      filename: '2anki-abc.jpg',
      mimeType: 'image/jpeg',
      attribution: 'photographer on pexels',
    });

    const result = await transformApkgWithImages({
      notes: [note()],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
    });

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].fields[1]).toBe(
      'a small carnivorous mammal<br><img src="2anki-abc.jpg">'
    );
    expect(result.notes[0].media).toEqual(['2anki-abc.jpg']);
    expect(result.media).toEqual([
      { filename: '2anki-abc.jpg', bytes: Buffer.from('jpeg') },
    ]);
    expect(result.failures).toEqual([]);
  });

  it('emits an empty back as just the <img> tag when the source back was empty', async () => {
    mockedFetch.mockResolvedValueOnce({
      bytes: Buffer.from('jpeg'),
      filename: '2anki-xyz.jpg',
      mimeType: 'image/jpeg',
      attribution: 'attr',
    });

    const result = await transformApkgWithImages({
      notes: [note({ back: '' })],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
    });

    expect(result.notes[0].fields[1]).toBe('<img src="2anki-xyz.jpg">');
  });

  it('passes the note through unchanged when the image source returns no hit', async () => {
    mockedFetch.mockResolvedValueOnce(undefined);

    const result = await transformApkgWithImages({
      notes: [note({ guid: 'miss', front: 'pangolin' })],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
    });

    expect(result.notes[0].fields[1]).toBe('a small carnivorous mammal');
    expect(result.failures).toEqual([]);
    expect(result.media).toEqual([]);
  });

  it('records a failure entry when fetchImage throws but still emits the note', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network down'));

    const result = await transformApkgWithImages({
      notes: [note({ guid: 'bang' })],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
    });

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].fields[1]).toBe('a small carnivorous mammal');
    expect(result.failures).toEqual([
      { guid: 'bang', reason: 'network down' },
    ]);
  });

  it('deduplicates identical filenames across notes', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        bytes: Buffer.from('jpeg'),
        filename: '2anki-shared.jpg',
        mimeType: 'image/jpeg',
        attribution: 'attr',
      })
      .mockResolvedValueOnce({
        bytes: Buffer.from('jpeg'),
        filename: '2anki-shared.jpg',
        mimeType: 'image/jpeg',
        attribution: 'attr',
      });

    const result = await transformApkgWithImages({
      notes: [note({ guid: 'a' }), note({ guid: 'b' })],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
    });

    expect(result.media).toHaveLength(1);
    expect(result.notes[0].fields[1]).toMatch(/2anki-shared\.jpg/);
    expect(result.notes[1].fields[1]).toMatch(/2anki-shared\.jpg/);
  });

  it('skips fetch entirely when the query is empty after sanitization', async () => {
    const result = await transformApkgWithImages({
      notes: [note({ front: '   ' })],
      source: 'wikimedia',
    });

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(result.notes[0].fields[1]).toBe('a small carnivorous mammal');
  });
});
