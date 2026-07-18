import { strToU8, zipSync } from 'fflate';

import { ZipHandler } from './zip';
import CardOption from '../parser/Settings';

function buildZip(files: Record<string, string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, contents] of Object.entries(files)) {
    entries[name] = strToU8(contents);
  }
  return zipSync(entries);
}

function buildBinaryZip(files: Record<string, number>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, size] of Object.entries(files)) {
    // Incompressible-ish payload so fflate keeps it near `size` decompressed;
    // the guard measures decompressed length, which is what we assert on.
    entries[name] = new Uint8Array(size).fill(1);
  }
  return zipSync(entries, { level: 0 });
}

describe('ZipHandler entry-name safety', () => {
  it('drops absolute-path entries while keeping safe entries', async () => {
    const zip = buildZip({
      'safe.html': '<p>safe</p>',
      '/etc/passwd.html': '<p>evil</p>',
    });

    const handler = new ZipHandler(10);
    await handler.build(zip, false, new CardOption({}));

    const names = handler.getFileNames();
    expect(names).toContain('safe.html');
    expect(names).not.toContain('/etc/passwd.html');
  });

  it('drops mid-path traversal entries that escape the destination', async () => {
    const zip = buildZip({
      'notes.md': '# notes',
      'a/../../escape.html': '<p>evil</p>',
    });

    const handler = new ZipHandler(10);
    await handler.build(zip, false, new CardOption({}));

    const names = handler.getFileNames();
    expect(names).toContain('notes.md');
    expect(names).not.toContain('a/../../escape.html');
    expect(names.some((n) => n.includes('..'))).toBe(false);
  });

  it('drops leading-dot-dot traversal entries', async () => {
    const zip = buildZip({
      'ok.html': '<p>ok</p>',
      '../../../../tmp/evil.html': '<p>evil</p>',
    });

    const handler = new ZipHandler(10);
    await handler.build(zip, false, new CardOption({}));

    const names = handler.getFileNames();
    expect(names).toContain('ok.html');
    expect(names.some((n) => n.includes('..'))).toBe(false);
  });

  it('keeps legitimate nested names with spaces and ampersands', async () => {
    const zip = buildZip({
      'Private & Shared/SLE/page.html': '<p>real deck</p>',
      'Private & Shared/SLE/notes.md': '# real',
    });

    const handler = new ZipHandler(10);
    await handler.build(zip, false, new CardOption({}));

    const names = handler.getFileNames();
    expect(names).toContain('Private & Shared/SLE/page.html');
    expect(names).toContain('Private & Shared/SLE/notes.md');
  });
});

describe('ZipHandler decompressed-size guard', () => {
  it('rejects a zip whose decompressed contents exceed the cap', async () => {
    // Three 1 KB image entries decompress to ~3 KB; cap at 2 KB.
    const zip = buildBinaryZip({
      'a.png': 1024,
      'b.png': 1024,
      'c.png': 1024,
    });

    const handler = new ZipHandler(10, 2 * 1024);

    await expect(handler.build(zip, true, new CardOption({}))).rejects.toThrow(
      /too large to process/
    );
  });

  it('accepts a zip that stays under the cap', async () => {
    const zip = buildBinaryZip({ 'a.png': 1024, 'b.png': 1024 });

    const handler = new ZipHandler(10, 8 * 1024);
    await handler.build(zip, true, new CardOption({}));

    expect(handler.getFileNames()).toEqual(
      expect.arrayContaining(['a.png', 'b.png'])
    );
  });

  it('accumulates across nested zips', async () => {
    const inner = buildBinaryZip({ 'big.png': 4 * 1024 });
    const outer = zipSync({ 'nested.zip': inner }, { level: 0 });

    const handler = new ZipHandler(10, 2 * 1024);
    await expect(
      handler.build(outer, true, new CardOption({}))
    ).rejects.toThrow(/too large to process/);
  });
});
