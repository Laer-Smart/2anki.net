import fs from 'fs';
import path from 'path';

import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

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
