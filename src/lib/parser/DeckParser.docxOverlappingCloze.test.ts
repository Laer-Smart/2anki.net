import { setupTests } from '../../test/configure-jest';
import { DeckParser } from './DeckParser';
import CardOption from './Settings';
import Workspace from './WorkSpace';
import { preprocessDocxHTML } from '../../infrastracture/adapters/fileConversion/preprocessDocxHTML';

beforeEach(() => {
  setupTests();
});

const docxHTML =
  '<h2>Contract remedies</h2>' +
  '<ul>' +
  '<li>Damages compensate the injured party</li>' +
  '<li>Specific performance forces the promised act</li>' +
  '<li>Rescission unwinds the contract</li>' +
  '</ul>';

async function buildDocxDeck(overlapping: string) {
  const workspace = new Workspace(true, 'fs');
  const parser = new DeckParser({
    name: 'notes.docx.html',
    settings: new CardOption({
      cherry: 'false',
      cloze: 'true',
      'overlapping-cloze': overlapping,
    }),
    files: [
      {
        name: 'notes.docx.html',
        contents: preprocessDocxHTML(docxHTML, {
          bulletFanOut: overlapping === 'off',
        }),
      },
    ],
    noLimits: true,
    workspace,
  });
  await parser.writeDeckInfo(workspace);
  return parser.payload[0];
}

const countC1 = (text: string) => (text.match(/\{\{c1::/g) || []).length;

test('docx heading+bullets fans into one cloze card per bullet with overlapping cloze on', async () => {
  const deck = await buildDocxDeck('show-all');
  expect(deck.cards.length).toBe(3);
  for (const card of deck.cards) {
    expect(card.cloze).toBe(true);
    expect(countC1(card.name)).toBe(1);
  }
  expect(deck.cards[0].name).toContain(
    '{{c1::Damages compensate the injured party}}'
  );
});

test('docx heading+bullets fans into one basic card per bullet with overlapping cloze off', async () => {
  const deck = await buildDocxDeck('off');
  expect(deck.cards.length).toBe(3);
  expect(deck.cards[0].name).toContain('Contract remedies — 1/3');
  expect(deck.cards[0].back).toContain('Damages compensate the injured party');
  expect(deck.cards[0].back).not.toContain('Specific performance');
  expect(deck.cards[2].name).toContain('Contract remedies — 3/3');
  expect(deck.cards[2].back).toContain('Rescission unwinds the contract');
  for (const card of deck.cards) {
    expect(countC1(card.name)).toBe(0);
  }
});
