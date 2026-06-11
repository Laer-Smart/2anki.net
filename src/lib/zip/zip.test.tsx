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
