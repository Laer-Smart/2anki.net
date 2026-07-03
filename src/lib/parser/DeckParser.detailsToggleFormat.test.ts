import path from 'path';
import fs from 'fs';

import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

async function cardsFor(
  html: string,
  options: Record<string, string> = { cherry: 'false' },
  name = 'toggle.html'
) {
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name,
    settings: new CardOption(options),
    files: [{ name, contents: html }],
    noLimits: true,
    workspace,
  });
  await parser.build(workspace);
  return parser.payload.flatMap((d) => d.cards);
}

const wrap = (body: string) =>
  `<html><head><title>Toggles</title></head><body><article class="page sans"><header><h1 class="page-title">Toggles</h1></header><div class="page-body">${body}</div></article></body></html>`;

const capital = (index: number, country: string, city: string) =>
  `[Grand child] ${index}/4 🍒 Capital of <code>${country}</code> is <code>${city}</code>`;

const legacyToggle = (summary: string, bodyInner: string) =>
  `<div style="display:contents"><ul class="toggle"><li><details open=""><summary>${summary}</summary><div style="display:contents">${bodyInner}</div></details></li></ul></div>`;

const legacyCapitalsEquivalent = wrap(
  legacyToggle(
    '[Parent] - Top level',
    legacyToggle(
      '[Child] 1/4 - 🍒 Capital of <code>Sweden</code> is <code>Stockholm</code>',
      ''
    ) +
      legacyToggle(
        '[Child] - Nested',
        legacyToggle(capital(2, 'Albania', 'Tirana'), '') +
          legacyToggle(capital(3, 'Austria', 'Vienna'), '') +
          legacyToggle(capital(4, 'Azerbaijan', 'Baku'), '')
      )
  )
);

const stripNotionAttrs = (html: string) =>
  html.replace(/ id="[^"]*"/g, '').replace(/ dir="auto"/g, '');

const CAPITALS = [
  ['Sweden', 'Stockholm'],
  ['Albania', 'Tirana'],
  ['Austria', 'Vienna'],
  ['Azerbaijan', 'Baku'],
];

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

  it('keeps a nested toggle answer in the parent back with no leftover indentation wrappers', async () => {
    const cards = await cardsFor(
      wrap(
        `<details class="toggle" open=""><summary>Parent question?</summary><div class="indented"><details class="toggle" open=""><summary>Child question?</summary><div class="indented"><p>Child answer</p></div></details></div></details>`
      )
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toContain('Parent question?');
    expect(cards[0].back).toContain('Child question?');
    expect(cards[0].back).toContain('Child answer');
    expect(cards[0].back).not.toContain('class="indented"');
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
    const cards = await cardsFor(
      html,
      { cherry: 'false' },
      'notion-details-toggle-2026.html'
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toContain('What is the capital of Albania?');
    expect(cards[0].back).toContain('Tirana!');
  });
});

describe('Notion 2026 nested details.toggle export format', () => {
  const fixture = () =>
    fs.readFileSync(
      path.join(
        __dirname,
        '__fixtures__/notion-nested-toggle-2026-capitals.html'
      ),
      'utf-8'
    );

  it('keeps every nested fact in the parent card back at default settings', async () => {
    const cards = await cardsFor(
      fixture(),
      { cherry: 'false' },
      'capitals.html'
    );
    expect(cards).toHaveLength(1);
    const back = cards[0].back;
    for (const [country, city] of CAPITALS) {
      expect(back).toContain(country);
      expect(back).toContain(city);
    }
    expect(back.trim().length).toBeGreaterThan(0);
    expect(back).not.toContain('class="indented"');
  });

  it('does not leave the parent card back empty when one toggle per card is enabled', async () => {
    const cards = await cardsFor(
      fixture(),
      { cherry: 'false', 'max-one-toggle-per-card': 'true' },
      'capitals.html'
    );
    expect(cards).toHaveLength(1);
    const back = cards[0].back;
    for (const [country, city] of CAPITALS) {
      expect(back).toContain(country);
      expect(back).toContain(city);
    }
    expect(back).not.toContain('class="indented"');
  });

  it('reaches every cherry-picked leaf fact when cherry-pick is on', async () => {
    const cards = await cardsFor(
      fixture(),
      { cherry: 'true' },
      'capitals.html'
    );
    const rendered = cards.map((c) => `${c.name} ${c.back}`).join(' ');
    for (const [country, city] of CAPITALS) {
      expect(rendered).toContain(country);
      expect(rendered).toContain(city);
    }
  });

  it.each([
    ['default', { cherry: 'false' }],
    ['cherry-pick', { cherry: 'true' }],
    [
      'one toggle per card',
      { cherry: 'false', 'max-one-toggle-per-card': 'true' },
    ],
  ])(
    'produces the same cards as the equivalent 2024 export shape (%s)',
    async (_label, options) => {
      const fromNew = await cardsFor(fixture(), options, 'capitals.html');
      const fromLegacy = await cardsFor(
        legacyCapitalsEquivalent,
        options,
        'capitals.html'
      );
      expect(fromNew.map((c) => stripNotionAttrs(c.name))).toEqual(
        fromLegacy.map((c) => stripNotionAttrs(c.name))
      );
      expect(fromNew.map((c) => stripNotionAttrs(c.back))).toEqual(
        fromLegacy.map((c) => stripNotionAttrs(c.back))
      );
    }
  );
});
