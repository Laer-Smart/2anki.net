import { createZipArchive } from './createZipArchive';

function collectArchive(
  append: (archive: ReturnType<typeof createZipArchive>) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = createZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    append(archive);
    archive.finalize();
  });
}

describe('createZipArchive', () => {
  it('produces a zip with the local-file-header magic bytes', async () => {
    const buffer = await collectArchive((archive) => {
      archive.append(Buffer.from('collection bytes'), {
        name: 'collection.anki2',
      });
      archive.append(Buffer.from('{}'), { name: 'media' });
    });

    expect(buffer.subarray(0, 4).toString('hex')).toBe('504b0304');
  });

  it('writes a non-empty archive for appended entries', async () => {
    const buffer = await collectArchive((archive) => {
      archive.append(Buffer.from('hello'), { name: 'note.txt' });
    });

    expect(buffer.length).toBeGreaterThan(0);
  });
});
