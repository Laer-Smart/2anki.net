import fs from 'fs';
import os from 'os';
import path from 'path';
import { zipSync } from 'fflate';

import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';
import { ZipHandler } from '../zip/zip';

beforeEach(() => setupTests());

function buildMarkdownParser(constructorWorkspace: Workspace) {
  const markdown = [
    '- What is shown here?',
    '    ![image.png](image.png)',
    '',
  ].join('\n');
  return new DeckParser({
    name: 'notes.md',
    settings: new CardOption({ 'markdown-nested-bullet-points': 'true' }),
    files: [
      { name: 'notes.md', contents: markdown },
      { name: 'image.png', contents: Buffer.from('fake-png-bytes') },
    ] as unknown as DeckParser['files'],
    noLimits: true,
    workspace: constructorWorkspace,
  });
}

test('batch build keeps the embedded markdown image in card media and the exporter', async () => {
  process.env.SKIP_CREATE_DECK = 'true';

  const constructorWorkspace = new Workspace(true, 'fs');
  const batchWorkspace = Workspace.subdir(constructorWorkspace.location);

  const parser = buildMarkdownParser(constructorWorkspace);

  await parser.writeDeckInfo(batchWorkspace);

  const card = parser.payload[0].cards[0];
  const embeddedSrc = /<img[^>]+src="([^"]+)"/.exec(card.back)?.[1];

  expect(embeddedSrc).toBeDefined();
  expect(card.media).toContain(embeddedSrc);
  expect(
    parser.customExporter.media.some((m) => path.basename(m) === embeddedSrc)
  ).toBe(true);
  expect(fs.existsSync(path.join(batchWorkspace.location, embeddedSrc!))).toBe(
    true
  );
});

test('embeds a disk-backed (spilled) image with its real bytes into the deck media', async () => {
  process.env.SKIP_CREATE_DECK = 'true';

  const constructorWorkspace = new Workspace(true, 'fs');
  const batchWorkspace = Workspace.subdir(constructorWorkspace.location);

  // Spill the image to disk exactly as the upload path now does, then feed the
  // lazily-read entry into the parser instead of an in-memory Buffer.
  const spill = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-spill-'));
  const imageBytes = Buffer.from('distinct-spilled-png-bytes-0123456789');
  const zip = zipSync(
    { 'image.png': new Uint8Array(imageBytes) },
    { level: 0 }
  );
  const handler = new ZipHandler(10);
  await handler.build(zip, true, new CardOption({}), spill);
  const spilledImage = handler.files.find((f) => f.name === 'image.png');

  const markdown = [
    '- What is shown here?',
    '    ![image.png](image.png)',
    '',
  ].join('\n');
  const parser = new DeckParser({
    name: 'notes.md',
    settings: new CardOption({ 'markdown-nested-bullet-points': 'true' }),
    files: [
      { name: 'notes.md', contents: markdown },
      spilledImage,
    ] as unknown as DeckParser['files'],
    noLimits: true,
    workspace: constructorWorkspace,
  });

  await parser.writeDeckInfo(batchWorkspace);

  const card = parser.payload[0].cards[0];
  const embeddedSrc = /<img[^>]+src="([^"]+)"/.exec(card.back)?.[1];
  expect(embeddedSrc).toBeDefined();
  expect(card.media).toContain(embeddedSrc);

  const mediaPath = path.join(batchWorkspace.location, embeddedSrc!);
  expect(fs.existsSync(mediaPath)).toBe(true);
  // The bytes packed into the deck media must equal the spilled image's real
  // bytes — proving the lazy disk read flows through embedFile → addMedia.
  expect(fs.readFileSync(mediaPath)).toEqual(imageBytes);
});
