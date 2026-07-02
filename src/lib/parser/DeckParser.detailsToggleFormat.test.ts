import path from 'path';
import fs from 'fs';

import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

async function cardsFor(html: string, name = 'toggle.html') {
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name,
    settings: new CardOption({ cherry: 'false' }),
    files: [{ name, contents: html }],
    noLimits: true,
    workspace,
  });
  await parser.build(workspace);
  return parser.payload.flatMap((d) => d.cards);
}

const wrap = (body: string) =>
  `<html><head><title>Toggles</title></head><body><article class="page sans"><header><h1 class="page-title">Toggles</h1></header><div class="page-body">${body}</div></article></body></html>`;

describe('Notion 2026 details.toggle export format', () => {
  it('converts a bare details.toggle (no ul wrapper, no display:contents) into one card', async () => {
    const cards = await cardsFor(
      wrap(
        `<details class="toggle" open=""><summary>What is the capital of Albania?</summary><div class="indented"><p>Tirana!</p></div></details>`
      )
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toContain('What is the capital of Albania?');
    expect(cards[0].back).toContain('Tirana!');
  });

  it('keeps a nested toggle inside its parent back instead of losing the answer', async () => {
    const cards = await cardsFor(
      wrap(
        `<details class="toggle" open=""><summary>Parent question?</summary><div class="indented"><details class="toggle" open=""><summary>Child question?</summary><div class="indented"><p>Child answer</p></div></details></div></details>`
      )
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toContain('Parent question?');
    expect(cards[0].back).toContain('Child question?');
    expect(cards[0].back).toContain('Child answer');
  });

  it('converts sibling toggles into one card each with the right answers', async () => {
    const cards = await cardsFor(
      wrap(
        `<details class="toggle" open=""><summary>Q1?</summary><div class="indented"><p>A1</p></div></details>` +
          `<details class="toggle" open=""><summary>Q2?</summary><div class="indented"><p>A2</p></div></details>` +
          `<details class="toggle" open=""><summary>Q3?</summary><div class="indented"><p>A3</p></div></details>`
      )
    );
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.name).join(' ')).toContain('Q1?');
    expect(cards[0].back).toContain('A1');
    expect(cards[1].back).toContain('A2');
    expect(cards[2].back).toContain('A3');
  });

  it('matches a real Notion 2026 export fixture', async () => {
    const html = fs.readFileSync(
      path.join(__dirname, '__fixtures__/notion-details-toggle-2026.html'),
      'utf-8'
    );
    const cards = await cardsFor(html, 'notion-details-toggle-2026.html');
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toContain('What is the capital of Albania?');
    expect(cards[0].back).toContain('Tirana!');
  });
});
