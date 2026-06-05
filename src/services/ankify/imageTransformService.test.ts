jest.mock('./imageFetchService', () => ({
  buildImageQuery: jest.fn((value: string) => value.trim()),
  fetchImages: jest.fn(),
}));

import { fetchImages } from './imageFetchService';
import { transformApkgWithImages } from './imageTransformService';
import { ParsedNote } from '../../lib/ankify/transforms/types';

const mockedFetch = fetchImages as jest.MockedFunction<typeof fetchImages>;

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

const hit = (filename: string) => ({
  bytes: Buffer.from('jpeg'),
  filename,
  mimeType: 'image/jpeg',
  attribution: 'attr',
});

describe('transformApkgWithImages', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('appends an <img> tag to the back field on a hit', async () => {
    mockedFetch.mockResolvedValueOnce([hit('2anki-abc.jpg')]);

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

  it('appends the image to the template back field on multi-field notes', async () => {
    mockedFetch.mockResolvedValueOnce([hit('2anki-dog.jpg')]);

    const result = await transformApkgWithImages({
      notes: [
        note({
          fields: ['der Hund', '[hʊnt]', 'the dog'],
          fieldNames: ['Word', 'Pronunciation', 'Meaning'],
          frontFieldIndex: 0,
          backFieldIndex: 2,
        }),
      ],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
    });

    expect(result.notes[0].fields).toEqual([
      'der Hund',
      '[hʊnt]',
      'the dog<br><img src="2anki-dog.jpg">',
    ]);
  });

  it('emits an empty back as just the <img> tag when the source back was empty', async () => {
    mockedFetch.mockResolvedValueOnce([hit('2anki-xyz.jpg')]);

    const result = await transformApkgWithImages({
      notes: [note({ back: '' })],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
    });

    expect(result.notes[0].fields[1]).toBe('<img src="2anki-xyz.jpg">');
  });

  it('passes the note through unchanged when the image source returns no hits', async () => {
    mockedFetch.mockResolvedValueOnce([]);

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

  it('records a failure entry when fetchImages throws but still emits the note', async () => {
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
      .mockResolvedValueOnce([hit('2anki-shared.jpg')])
      .mockResolvedValueOnce([hit('2anki-shared.jpg')]);

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

  it('appends every requested image when imageCount is N', async () => {
    mockedFetch.mockResolvedValueOnce([
      hit('2anki-1.jpg'),
      hit('2anki-2.jpg'),
      hit('2anki-3.jpg'),
    ]);

    const result = await transformApkgWithImages({
      notes: [note({ back: 'definition' })],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
      imageCount: 3,
    });

    expect(result.notes[0].fields[1]).toBe(
      'definition<br><img src="2anki-1.jpg"><br><img src="2anki-2.jpg"><br><img src="2anki-3.jpg">'
    );
    expect(result.notes[0].media).toEqual([
      '2anki-1.jpg',
      '2anki-2.jpg',
      '2anki-3.jpg',
    ]);
    expect(result.media).toHaveLength(3);
  });

  it('forwards the requested imageCount to fetchImages', async () => {
    mockedFetch.mockResolvedValueOnce([hit('a.jpg')]);

    await transformApkgWithImages({
      notes: [note()],
      source: 'pexels',
      pexelsApiKey: 'K',
      concurrency: 1,
      imageCount: 4,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.any(String),
      'pexels',
      4,
      expect.objectContaining({ pexelsApiKey: 'K' })
    );
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
