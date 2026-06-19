import path from 'path';
import fs from 'fs';

import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Note from './Note';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

const fixture = fs
  .readFileSync(path.join(__dirname, '../../test/fixtures/section-tags.html'))
  .toString();

const buildCards = async (options: { [key: string]: string }) => {
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name: 'section-tags.html',
    settings: new CardOption(options),
    files: [{ name: 'section-tags.html', contents: fixture }],
    noLimits: true,
    workspace,
  });
  await parser.build(workspace);
  return parser.payload[0].cards;
};

const findCard = (cards: Note[], needle: string) =>
  cards.find((c) => c.name.includes(needle));

describe('section-scoped tags (upload path)', () => {
  it('tags each card with its enclosing parent toggle marker in cherry mode', async () => {
    const cards = await buildCards({ cherry: 'true', 'section-tags': 'true' });

    const apple = findCard(cards, 'apple');
    const car = findCard(cards, 'car');

    expect(apple?.tags).toEqual(
      expect.arrayContaining(['chapter-1', 'global-tag'])
    );
    expect(apple?.tags).not.toContain('chapter-2');

    expect(car?.tags).toEqual(
      expect.arrayContaining(['chapter-2', 'global-tag'])
    );
    expect(car?.tags).not.toContain('chapter-1');
  });

  it('compounds nested section markers onto a deeply nested card', async () => {
    const cards = await buildCards({ cherry: 'true', 'section-tags': 'true' });

    const banana = findCard(cards, 'banana');

    expect(banana?.tags).toEqual(
      expect.arrayContaining(['chapter-1', 'section-A', 'global-tag'])
    );
    expect(banana?.tags).not.toContain('chapter-2');
  });

  it('strips the marker so it never becomes its own card and leaves no markup', async () => {
    const cards = await buildCards({ cherry: 'true', 'section-tags': 'true' });

    expect(findCard(cards, 'chapter-1')).toBeUndefined();
    expect(findCard(cards, 'chapter-2')).toBeUndefined();
    for (const card of cards) {
      expect(card.back).not.toContain('chapter-1');
      expect(card.back).not.toContain('chapter-2');
      expect(card.back).not.toContain('section-A');
    }
  });

  it('dedupes tags that already exist per-card or globally', async () => {
    const cards = await buildCards({ cherry: 'true', 'section-tags': 'true' });
    const apple = findCard(cards, 'apple');
    const chapterOneCount = apple?.tags.filter((t) => t === 'chapter-1').length;
    expect(chapterOneCount).toBe(1);
  });

  it('produces byte-identical card output when the option is off', async () => {
    const off = await buildCards({ cherry: 'true', 'section-tags': 'false' });
    const baseline = await buildCards({ cherry: 'true' });

    expect(
      off.map((c) => ({ name: c.name, back: c.back, tags: c.tags }))
    ).toEqual(
      baseline.map((c) => ({ name: c.name, back: c.back, tags: c.tags }))
    );
  });

  it('off-mode cards do not carry the section markers as tags', async () => {
    const off = await buildCards({ cherry: 'true', 'section-tags': 'false' });
    const apple = findCard(off, 'apple');

    expect(apple?.tags).not.toContain('chapter-1');
    expect(apple?.tags).not.toContain('section-A');
    expect(apple?.tags).toContain('global-tag');
  });
});
