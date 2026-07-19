import path from 'path';
import fs from 'fs';

import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

const fixture = fs
  .readFileSync(
    path.join(__dirname, '../../test/fixtures/toggle-with-bullets.html')
  )
  .toString();

const parseWith = async (options: { [key: string]: string }) => {
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name: 'toggle-with-bullets.html',
    settings: new CardOption(options),
    files: [{ name: 'toggle-with-bullets.html', contents: fixture }],
    noLimits: true,
    workspace,
  });
  await parser.writeDeckInfo(workspace);
  return parser.payload[0].cards;
};

describe('global tags from settings', () => {
  it('applies each global tag to every card', async () => {
    const cards = await parseWith({ 'global-tags': 'mcp, exam prep' });

    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.tags).toEqual(expect.arrayContaining(['mcp', 'exam-prep']));
    }
  });

  it('leaves tags untouched when no global tags are set', async () => {
    const cards = await parseWith({});

    for (const card of cards) {
      expect(card.tags).not.toContain('mcp');
    }
  });
});
