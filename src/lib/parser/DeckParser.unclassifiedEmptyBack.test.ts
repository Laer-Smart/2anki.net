import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import { PrepareDeck } from '../../infrastracture/adapters/fileConversion/PrepareDeck';
import { EmptyDeckError } from '../../usecases/jobs/EmptyDeckError';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

const bareBulletPage = (count: number): string => {
  const items = Array.from(
    { length: count },
    (_, i) => `<li>Fact number ${i} about biology</li>`
  ).join('');
  return `<html><head><title>Notes</title></head><body><div class="page-body"><ul>${items}</ul></div></body></html>`;
};

const bareP012ProsePage = (count: number): string => {
  const paras = Array.from(
    { length: count },
    (_, i) =>
      `<p>This is prose sentence number ${i} without any question or answer structure here</p>`
  ).join('');
  return `<html><head><title>Prose</title></head><body><div class="page-body">${paras}</div></body></html>`;
};

const clozeBulletPage = (count: number): string => {
  const items = Array.from(
    { length: count },
    (_, i) => `<li>The {{c1::organelle ${i}}} does work</li>`
  ).join('');
  return `<html><head><title>Cloze</title></head><body><div class="page-body"><ul>${items}</ul></div></body></html>`;
};

const parse = async (name: string, contents: string, cloze: boolean) => {
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name,
    settings: new CardOption(cloze ? {} : { cloze: 'false' }),
    files: [{ name, contents }],
    noLimits: true,
    workspace,
  });
  await parser.writeDeckInfo(workspace);
  return parser;
};

describe('unclassified parse path — empty-back content loss', () => {
  it('does not fabricate front-only cards for a bare bullet list without cloze', async () => {
    const parser = await parse('notes.html', bareBulletPage(15), false);

    expect(parser.parsePathSignature()).toBe('unclassified');
    expect(parser.emptyBackCount).toBe(0);
    expect(parser.totalCardCount()).toBe(0);
  });

  it('surfaces EmptyDeckError instead of a silent empty deck for bare prose without cloze', async () => {
    const workspace = new Workspace(true, 'fs');
    await expect(
      PrepareDeck({
        name: 'prose.html',
        files: [{ name: 'prose.html', contents: bareP012ProsePage(15) }],
        settings: new CardOption({ cloze: 'false' }),
        noLimits: true,
        workspace,
      })
    ).rejects.toBeInstanceOf(EmptyDeckError);
  });

  it('still produces cloze cards when the bullets carry cloze deletions', async () => {
    const parser = await parse('cloze.html', clozeBulletPage(12), true);

    expect(parser.parsePathSignature()).toBe('unclassified');
    expect(parser.totalCardCount()).toBe(12);
    const cards = parser.payload.flatMap((deck) => deck.cards);
    expect(cards.every((card) => card.cloze)).toBe(true);
    expect(cards.every((card) => card.hasClozeDeletion())).toBe(true);
  });
});
