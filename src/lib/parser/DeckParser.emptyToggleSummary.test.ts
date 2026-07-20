import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

const wrap = (body: string) =>
  `<html><head><title>Toggles</title></head><body><article class="page sans"><header><h1 class="page-title">Toggles</h1></header><div class="page-body">${body}</div></article></body></html>`;

async function cardsFor(html: string, options: Record<string, string>) {
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name: 'toggle.html',
    settings: new CardOption(options),
    files: [{ name: 'toggle.html', contents: html }],
    noLimits: true,
    workspace,
  });
  try {
    await parser.build(workspace);
  } catch {
    // Full .apkg packaging needs the Python venv (main checkout only); the
    // parsed cards are populated on parser.payload before packaging runs.
  }
  return parser.payload.flatMap((d) => d.cards);
}

describe('empty toggle-summary cleanup', () => {
  const html = wrap(
    `<details class="toggle" open=""><summary>What is the capital of Albania?</summary><div class="indented"><p>Tirana!</p></div></details>`
  );

  it('strips the empty summary from the back at default settings', async () => {
    const cards = await cardsFor(html, { cherry: 'false' });
    expect(cards).toHaveLength(1);
    expect(cards[0].back).not.toContain('<summary class="toggle"></summary>');
  });

  it('keeps the real answer content while stripping the empty summary', async () => {
    const cards = await cardsFor(html, { cherry: 'false' });
    expect(cards).toHaveLength(1);
    expect(cards[0].back).toContain('Tirana!');
    expect(cards[0].name).toContain('What is the capital of Albania?');
  });
});
