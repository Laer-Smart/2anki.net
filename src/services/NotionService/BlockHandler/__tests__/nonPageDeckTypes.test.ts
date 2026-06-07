import BlockHandler from '../BlockHandler';
import NotionAPIWrapper from '../../NotionAPIWrapper';
import CustomExporter from '../../../../lib/parser/exporters/CustomExporter';
import CardOption from '../../../../lib/parser/Settings';
import ParserRules from '../../../../lib/parser/ParserRules';

jest.mock('../../../../lib/parser/exporters/CustomExporter');

const TS = '2026-01-01T00:00:00.000Z';

interface FakeBlock {
  object: 'block';
  id: string;
  type: string;
  has_children: boolean;
  created_time: string;
  last_edited_time: string;
  [key: string]: unknown;
}

function richText(content: string) {
  return [
    {
      type: 'text',
      text: { content, link: null },
      plain_text: content,
      href: null,
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
    },
  ];
}

function toggle(id: string, summary: string, hasChildren = false): FakeBlock {
  return {
    object: 'block',
    id,
    type: 'toggle',
    has_children: hasChildren,
    created_time: TS,
    last_edited_time: TS,
    toggle: { rich_text: richText(summary), color: 'default' },
  };
}

function buildApi(blocksByParent: Record<string, FakeBlock[]>): NotionAPIWrapper {
  const api = {
    getPage: jest.fn(async (id: string) => ({
      id,
      object: 'page',
      created_time: TS,
      last_edited_time: TS,
      url: `https://notion.so/${id}`,
      properties: {},
    })),
    getTopLevelTags: jest.fn(async () => []),
    getPageTitle: jest.fn(async () => 'Root page'),
    getBlocks: jest.fn(async ({ id }: { id: string }) => ({
      results: blocksByParent[id] ?? [],
    })),
  };
  return api as unknown as NotionAPIWrapper;
}

function newHandler(api: NotionAPIWrapper, settings: CardOption): BlockHandler {
  const exporter = new CustomExporter('', '/tmp');
  const handler = new BlockHandler(exporter, api, settings);
  handler.useAll = true;
  return handler;
}

function rulesWithDeckTypes(deckTypes: string[]): ParserRules {
  const rules = new ParserRules();
  rules.setDeckTypes(deckTypes);
  return rules;
}

describe('findFlashcardsFromPage non-page deck types', () => {
  it('turns a toggle into a top-level deck sourced from its children', async () => {
    const childCard = toggle('child-card', 'Question on the toggle');
    const deckToggle = toggle('deck-toggle', 'My toggle deck', true);
    const api = buildApi({
      root: [deckToggle],
      'deck-toggle': [childCard],
    });
    const settings = new CardOption(CardOption.LoadDefaultOptions());
    const handler = newHandler(api, settings);

    const decks = await handler.findFlashcardsFromPage({
      parentType: 'page',
      topLevelId: 'root',
      rules: rulesWithDeckTypes(['page', 'database', 'toggle']),
      decks: [],
      parentName: '',
    });

    const toggleDeck = decks.find((d) => d.name.includes('My toggle deck'));
    expect(toggleDeck).toBeDefined();
    expect(toggleDeck?.cards.map((c) => c.name)).toEqual([
      'Question on the toggle',
    ]);
  });

  it.each([
    ['heading_1', 'heading_1'],
    ['heading_2', 'heading_2'],
    ['heading_3', 'heading_3'],
    ['bulleted_list_item', 'bulleted_list_item'],
    ['numbered_list_item', 'numbered_list_item'],
  ])(
    'turns a %s block into a top-level deck sourced from its children',
    async (deckType) => {
      const childCard = toggle('child-card', 'Inner question');
      const deckBlock: FakeBlock = {
        object: 'block',
        id: 'deck-block',
        type: deckType,
        has_children: true,
        created_time: TS,
        last_edited_time: TS,
        [deckType]: { rich_text: richText('Section title'), color: 'default' },
      };
      const api = buildApi({
        root: [deckBlock],
        'deck-block': [childCard],
      });
      const settings = new CardOption(CardOption.LoadDefaultOptions());
      const handler = newHandler(api, settings);

      const decks = await handler.findFlashcardsFromPage({
        parentType: 'page',
        topLevelId: 'root',
        rules: rulesWithDeckTypes(['page', 'database', deckType]),
        decks: [],
        parentName: '',
      });

      const deck = decks.find((d) => d.name.includes('Section title'));
      expect(deck).toBeDefined();
      expect(deck?.cards.map((c) => c.name)).toEqual(['Inner question']);
    }
  );

  it('lets DECK win over FLASHCARD when a type is in both', async () => {
    const childCard = toggle('child-card', 'Child question');
    const deckToggle = toggle('deck-toggle', 'Toggle as deck', true);
    const api = buildApi({
      root: [deckToggle],
      'deck-toggle': [childCard],
    });
    const settings = new CardOption(CardOption.LoadDefaultOptions());
    const handler = newHandler(api, settings);

    const rules = rulesWithDeckTypes(['page', 'database', 'toggle']);
    rules.setFlashcardTypes(['toggle']);

    const decks = await handler.findFlashcardsFromPage({
      parentType: 'page',
      topLevelId: 'root',
      rules,
      decks: [],
      parentName: '',
    });

    const rootDeck = decks.find((d) => d.name === 'Root page');
    expect(rootDeck?.cards.map((c) => c.name)).toEqual([]);
    const toggleDeck = decks.find((d) => d.name.includes('Toggle as deck'));
    expect(toggleDeck?.cards.map((c) => c.name)).toEqual(['Child question']);
  });

  it('default deck_is of page,database produces no extra decks from a toggle', async () => {
    const childCard = toggle('child-card', 'Child question');
    const deckToggle = toggle('deck-toggle', 'A toggle', true);
    const api = buildApi({
      root: [deckToggle],
      'deck-toggle': [childCard],
    });
    const settings = new CardOption(CardOption.LoadDefaultOptions());
    const handler = newHandler(api, settings);

    const decks = await handler.findFlashcardsFromPage({
      parentType: 'page',
      topLevelId: 'root',
      rules: new ParserRules(),
      decks: [],
      parentName: '',
    });

    expect(decks.map((d) => d.name)).toEqual(['Root page']);
    const rootDeck = decks[0];
    expect(rootDeck.cards.map((c) => c.name)).toEqual(['A toggle']);
  });
});
