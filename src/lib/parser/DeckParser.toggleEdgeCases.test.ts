import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

function buildParser(html: string, settings: CardOption): DeckParser {
  const workspace = new Workspace(true, 'fs');
  return new DeckParser({
    name: 'toggle-edge.html',
    settings,
    files: [{ name: 'toggle-edge.html', contents: html }],
    noLimits: true,
    workspace,
  });
}

const wrap = (body: string) =>
  `<!DOCTYPE html><html><head><title>t</title></head><body><article class="page sans"><div class="page-body">${body}</div></article></body></html>`;

describe('Toggle edge cases', () => {
  it('keeps two identical toggles without ids as separate cards', () => {
    const toggle = `<ul class="toggle"><li><details open=""><summary>Define osmosis</summary><p>Movement of water</p></details></li></ul>`;
    const parser = buildParser(
      wrap(toggle + toggle),
      new CardOption({ cherry: 'false' })
    );

    const deck = parser.payload[0];
    expect(deck.cards.length).toBe(2);
  });

  it('produces a card for a toggle whose header is an image only', () => {
    const body = `<ul class="toggle"><li><details open=""><summary><img src="diagram.png" /></summary><p>The mitochondrion</p></details></li></ul>`;
    const parser = buildParser(wrap(body), new CardOption({ cherry: 'false' }));

    const deck = parser.payload[0];
    expect(deck.cards.length).toBe(1);
    expect(deck.cards[0].name).toContain('diagram.png');
    expect(deck.cards[0].back).toContain('The mitochondrion');
  });

  it('does not smear classes from one toggle onto a differently-classed toggle', () => {
    const body =
      `<ul class="toggle red"><li><details open=""><summary>First</summary><p>A</p></details></li></ul>` +
      `<ul class="toggle blue"><li><details open=""><summary>Second</summary><p>B</p></details></li></ul>`;
    const parser = buildParser(wrap(body), new CardOption({ cherry: 'false' }));

    const deck = parser.payload[0];
    const first = deck.cards.find((c) => c.name.includes('First'));
    const second = deck.cards.find((c) => c.name.includes('Second'));

    expect(`${first?.name}${first?.back}`).not.toContain('blue');
    expect(`${second?.name}${second?.back}`).not.toContain('red');
  });
});
