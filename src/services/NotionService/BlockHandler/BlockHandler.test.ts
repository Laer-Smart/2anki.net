test('Highlighted text is rendered with background', async () => {
  const mockToggleBlock = {
    object: 'block' as const,
    id: 'highlight-test-id',
    parent: { type: 'page_id' as const, page_id: 'page-id' },
    created_time: '',
    last_edited_time: '',
    created_by: { object: 'user' as const, id: 'user-id' },
    last_edited_by: { object: 'user' as const, id: 'user-id' },
    has_children: false,
    archived: false,
    in_trash: false,
    type: 'toggle' as const,
    toggle: {
      rich_text: [
        {
          type: 'text' as const,
          text: { content: 'This is a ', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default' as const,
          },
          plain_text: 'This is a ',
          href: null,
        },
        {
          type: 'text' as const,
          text: { content: 'highlighted ', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'yellow_background' as const,
          },
          plain_text: 'highlighted ',
          href: null,
        },
        {
          type: 'text' as const,
          text: { content: 'line', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default' as const,
          },
          plain_text: 'line',
          href: null,
        },
      ],
      color: 'default' as const,
    },
  };
  const settings = new CardOption({});
  const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
  const bl = new BlockHandler(exporter, api, settings);
  const flashcards = await bl.getFlashcards(
    new ParserRules(),
    [mockToggleBlock],
    [],
    undefined
  );
  expect(flashcards.length).toBeGreaterThan(0);
  const card = flashcards[0];
  expect(card.name).toContain('<span style="background-color:#DFAB01">highlighted </span>');
});
import * as dotenv from 'dotenv';
import CustomExporter from '../../../lib/parser/exporters/CustomExporter';
import Note from '../../../lib/parser/Note';
import ParserRules from '../../../lib/parser/ParserRules';

import CardOption from '../../../lib/parser/Settings/CardOption';
import Workspace from '../../../lib/parser/WorkSpace';
import { setupTests } from '../../../test/configure-jest';
import { pageId as examplId } from '../../../test/test-utils';
import MockNotionAPI from '../_mock/MockNotionAPI';
import { getToggleBlocks } from '../helpers/getToggleBlocks';
import renderTextChildren from '../helpers/renderTextChildren';
import BlockHandler from './BlockHandler';

dotenv.config({ path: 'test/.env' });
const api = new MockNotionAPI(process.env.NOTION_KEY!, '3');

const defaultAnnotations = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: 'default' as const,
};

function richText(content: string) {
  return {
    type: 'text' as const,
    text: { content, link: null },
    annotations: { ...defaultAnnotations },
    plain_text: content,
    href: null,
  };
}

function codeText(content: string) {
  return {
    type: 'text' as const,
    text: { content, link: null },
    annotations: { ...defaultAnnotations, code: true },
    plain_text: content,
    href: null,
  };
}

function buildToggleBlock(
  id: string,
  rich_text: ReturnType<typeof richText>[]
) {
  return {
    object: 'block' as const,
    id,
    parent: { type: 'page_id' as const, page_id: 'page-id' },
    created_time: '',
    last_edited_time: '',
    created_by: { object: 'user' as const, id: 'user-id' },
    last_edited_by: { object: 'user' as const, id: 'user-id' },
    has_children: true,
    archived: false,
    in_trash: false,
    type: 'toggle' as const,
    toggle: { rich_text, color: 'default' as const },
  };
}

function paragraphBlock(id: string, rich_text: ReturnType<typeof richText>[]) {
  return {
    object: 'block' as const,
    id,
    parent: { type: 'block_id' as const, block_id: 'parent-toggle' },
    created_time: '',
    last_edited_time: '',
    created_by: { object: 'user' as const, id: 'user-id' },
    last_edited_by: { object: 'user' as const, id: 'user-id' },
    has_children: false,
    archived: false,
    in_trash: false,
    type: 'paragraph' as const,
    paragraph: { rich_text, color: 'default' as const },
  };
}

class ChildStubApi extends MockNotionAPI {
  constructor(
    private readonly delegate: MockNotionAPI,
    private readonly toggleId: string,
    private readonly children: ReturnType<typeof paragraphBlock>[]
  ) {
    super(process.env.NOTION_KEY!, '3');
  }

  async getBlocks(
    params: Parameters<MockNotionAPI['getBlocks']>[0]
  ): ReturnType<MockNotionAPI['getBlocks']> {
    if (params.id === this.toggleId) {
      return {
        type: 'block',
        block: {},
        object: 'list',
        next_cursor: null,
        has_more: false,
        results: this.children,
      } as Awaited<ReturnType<MockNotionAPI['getBlocks']>>;
    }
    return this.delegate.getBlocks(params);
  }
}

type Options = { [key: string]: string };

const loadCards = async (
  options: Options,
  pageId: string,
  ws: Workspace,
  rules?: ParserRules
): Promise<Note[]> => {
  const settings = new CardOption(options);
  const r = rules || new ParserRules();
  const exporter = new CustomExporter('', ws.location);
  const bl = new BlockHandler(exporter, api, settings);
  const decks = await bl.findFlashcards({
    parentType: 'page',
    topLevelId: pageId,
    rules: r,
    decks: [],
    parentName: '',
  });
  return decks[0].cards;
};

async function findCardByName(
  name: string,
  options: Options
): Promise<Note | undefined> {
  const flashcards = await loadCards(
    options,
    examplId,
    new Workspace(true, 'fs'),
    new ParserRules()
  );
  return flashcards.find((f) => f.name.includes(name));
}

beforeEach(() => setupTests());

jest.mock('get-notion-object-title', () => ({
  getNotionObjectTitle: jest.fn(),
}));

describe('BlockHandler', () => {
  test.skip('Get Notion Page', async () => {
    const page = await api.getPage('446d09aa05d041058c16e56232188e2b');
    const title = await api.getPageTitle(page, new CardOption({}));
    expect(title).toBe('Testing');
  });

  test('Get Blocks', async () => {
    // This should be mocked
    const blocks = await api.getBlocks({
      createdAt: '',
      lastEditedAt: '',
      id: '07a7b319183642b9afecdcc4c456f73d',
      all: true,
      type: 'page',
    });
    const topLevelToggles = getToggleBlocks(blocks.results);
    expect(topLevelToggles.length).toEqual(14);
  });

  test.skip('Toggle Headings in HTML export', async () => {
    const r = new ParserRules();
    r.setFlashcardTypes(['heading']);
    const cards = await loadCards(
      {},
      '25226df63b4d4895a71f3bba01d8a8f3',
      new Workspace(true, 'fs'),
      r
    );
    console.log('cards', JSON.stringify(cards, null, 4));
    expect(cards.length).toBe(1);
  });

  test.skip('Subpages', async () => {
    const settings = new CardOption({ all: 'true' });
    const rules = new ParserRules();
    const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
    const bl = new BlockHandler(exporter, api, settings);
    const decks = await bl.findFlashcards({
      parentType: 'page',
      topLevelId: examplId,
      rules,
      decks: [],
      parentName: '',
    });

    expect(decks.length > 1).toBe(true);
    expect(decks[1].name.includes('::')).toBe(true);
  });

  test.skip('Toggle Mode', async () => {
    const flashcards = await loadCards(
      {},
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    const nestedOnes = flashcards.find((c) => c.name.match(/Nested/i));
    expect(nestedOnes?.back).toBe(true);
  });

  test.skip('Strikethrough Local Tags', async () => {
    const card = await findCardByName('This card has three tags', {
      tags: 'true',
    });
    const expected = ['global tag', 'tag a', 'tag b'];
    expect(card?.tags).toBe(expected);
  });

  test('Basic Cards from Blocks', async () => {
    const flashcards = await loadCards(
      { cloze: 'false' },
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    const card = flashcards[0];
    // For toggle blocks, the front should contain the rendered summary (question) as HTML
    expect(card.name).toBe('1 - This is a basic card');
    // The back should contain the rendered children content (answer)
    expect(card.back).toBe(
      '<p class="" id="f83ce56a-9039-4888-81be-375b19a84790">This is the back of the card</p>'
    );
  }, 30000);

  test('Multi-line Toggle with Cloze and Newlines', async () => {
    // Test cloze deletion with the exact data from the user's issue
    const flashcards = await loadCards(
      { cloze: 'true' },
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    
    // Find the cloze card (should be the second card based on mock data)
    const clozeCard = flashcards.find((c) =>
      c.name.includes('{{c1::cloze deletion}}')
    );
    
    expect(clozeCard).toBeTruthy();
    expect(clozeCard?.name).toContain('{{c1::cloze deletion}}');
  });

  test('Multi-line Toggle with Newlines (Basic)', async () => {
    // Test the basic (non-cloze) processing with the multi-line mock data
    const mockToggleBlock = {
      object: "block" as const,
      id: "0d29f785-320d-4fce-ae81-9bf0b02b81cc",
      parent: {
        type: "page_id" as const,
        page_id: "43df8b2d-4e00-4d2c-8848-07a60c2cc1cd"
      },
      created_time: "2021-04-13T18:35:00.000Z",
      last_edited_time: "2021-04-13T18:35:00.000Z",
      created_by: {
        object: "user" as const,
        id: "1590db54-99fe-467c-a656-be319fe6ca8b"
      },
      last_edited_by: {
        object: "user" as const,
        id: "1590db54-99fe-467c-a656-be319fe6ca8b"
      },
      has_children: false,
      archived: false,
      in_trash: false,
      type: "toggle" as const,
      toggle: {
        rich_text: [
          {
            type: "text" as const,
            text: {
              content: "Mult-line cloze \n",
              link: null
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default" as const
            },
            plain_text: "Mult-line cloze \n",
            href: null
          },
          {
            type: "text" as const,
            text: {
              content: "First",
              link: null
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: true,
              color: "default" as const
            },
            plain_text: "First",
            href: null
          },
          {
            type: "text" as const,
            text: {
              content: "\n",
              link: null
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default" as const
            },
            plain_text: "\n",
            href: null
          },
          {
            type: "text" as const,
            text: {
              content: "Second",
              link: null
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: true,
              color: "default" as const
            },
            plain_text: "Second",
            href: null
          },
          {
            type: "text" as const,
            text: {
              content: " \n",
              link: null
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default" as const
            },
            plain_text: " \n",
            href: null
          },
          {
            type: "text" as const,
            text: {
              content: "Third",
              link: null
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: true,
              color: "default" as const
            },
            plain_text: "Third",
            href: null
          }
        ],
        color: "default" as const
      }
    };

    // Test with cloze enabled to match user's scenario
    const settings = new CardOption({ cloze: 'true' });
    const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
    const bl = new BlockHandler(exporter, api, settings);
    
    // Process the block through getFlashcards
    const flashcards = await bl.getFlashcards(
      new ParserRules(),
      [mockToggleBlock],
      [],
      undefined
    );
    
    expect(flashcards.length).toBeGreaterThan(0);
    const card = flashcards[0];
    
    expect(card.name).toContain('{{c1::First}}');
    expect(card.name).toContain('{{c2::Second}}');
    expect(card.name).toContain('{{c3::Third}}');
    expect(card.name).not.toContain('<br />');
  });

  test('Cloze Deletion from Blocks', async () => {
    const flashcards = await loadCards(
      { cloze: 'true' },
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    const card = flashcards.find((c) =>
      c.name.includes('2 - This is a {{c1::cloze deletion}}')
    );
    expect(card?.back).toBe(
      '<p class="" id="34be35bd-db68-4588-85d9-e1adc84c45a5">Extra</p>'
    );
  });

  test('Cloze markers inside toggle content produce a cloze card with the header as Extra', async () => {
    const toggleId = 'content-cloze-toggle';
    const mockToggleBlock = buildToggleBlock(toggleId, [
      richText('Australia'),
    ]);
    const childApi = new ChildStubApi(api, toggleId, [
      paragraphBlock('child-para', [
        richText('The capital is '),
        codeText('Canberra'),
        richText(', founded in '),
        codeText('1913'),
        richText('.'),
      ]),
    ]);
    const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
    const bl = new BlockHandler(
      exporter,
      childApi,
      new CardOption({ cloze: 'true', 'cloze-from-toggle-content': 'true' })
    );
    const flashcards = await bl.getFlashcards(
      new ParserRules(),
      [mockToggleBlock],
      [],
      undefined
    );

    expect(flashcards.length).toBe(1);
    const card = flashcards[0];
    expect(card.cloze).toBe(true);
    expect(card.name).toContain('{{c1::Canberra}}');
    expect(card.name).toContain('{{c2::1913}}');
    expect(card.name).not.toContain('<code>');
    expect(card.back).toContain('Australia');
    expect(card.back).not.toContain('{{c');
  });

  test('Cloze markers in toggle content stay a basic card when cloze-from-toggle-content is off', async () => {
    const toggleId = 'content-cloze-off-toggle';
    const mockToggleBlock = buildToggleBlock(toggleId, [richText('Australia')]);
    const childApi = new ChildStubApi(api, toggleId, [
      paragraphBlock('child-para', [
        richText('The capital is '),
        codeText('Canberra'),
        richText(', founded in '),
        codeText('1913'),
        richText('.'),
      ]),
    ]);
    const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
    const bl = new BlockHandler(exporter, childApi, new CardOption({ cloze: 'true' }));
    const flashcards = await bl.getFlashcards(
      new ParserRules(),
      [mockToggleBlock],
      [],
      undefined
    );

    expect(flashcards.length).toBe(1);
    const card = flashcards[0];
    expect(card.name).toContain('Australia');
    expect(card.name).not.toContain('{{c');
    expect(card.back).toContain('Canberra');
    expect(card.back).not.toContain('{{c');
  });

  test('Cloze markers inside a toggle table survive into the cloze Text', async () => {
    const toggleId = 'content-cloze-table-toggle';
    const mockToggleBlock = buildToggleBlock(toggleId, [
      richText('Periodic facts'),
    ]);
    const childApi = new ChildStubApi(api, toggleId, [
      paragraphBlock('symbol-para', [
        richText('Symbol: '),
        codeText('H'),
        richText(' Number: '),
        codeText('1'),
      ]),
    ]);
    const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
    const bl = new BlockHandler(
      exporter,
      childApi,
      new CardOption({ cloze: 'true', 'cloze-from-toggle-content': 'true' })
    );
    const flashcards = await bl.getFlashcards(
      new ParserRules(),
      [mockToggleBlock],
      [],
      undefined
    );

    expect(flashcards.length).toBe(1);
    const card = flashcards[0];
    expect(card.cloze).toBe(true);
    expect(card.name).toContain('Symbol');
    expect(card.name).toContain('{{c1::H}}');
    expect(card.name).toContain('{{c2::1}}');
    expect(card.back).toContain('Periodic facts');
  });

  test('Cloze markers in the toggle header keep the header as the cloze Text', async () => {
    const toggleId = 'header-cloze-toggle';
    const mockToggleBlock = buildToggleBlock(toggleId, [
      codeText('Canberra'),
      richText(' was founded in '),
      codeText('1913'),
    ]);
    const childApi = new ChildStubApi(api, toggleId, [
      paragraphBlock('source-para', [richText('Source: Anki manual')]),
    ]);
    const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
    const bl = new BlockHandler(exporter, childApi, new CardOption({ cloze: 'true' }));
    const flashcards = await bl.getFlashcards(
      new ParserRules(),
      [mockToggleBlock],
      [],
      undefined
    );

    expect(flashcards.length).toBe(1);
    const card = flashcards[0];
    expect(card.cloze).toBe(true);
    expect(card.name).toContain('{{c1::Canberra}}');
    expect(card.name).toContain('{{c2::1913}}');
    expect(card.back).toContain('Source: Anki manual');
  });

  test('Input Cards from Blocks', async () => {
    const flashcards = await loadCards(
      { cloze: 'false', 'enable-input': 'true' },
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    expect(
      flashcards.find((n) => n.name.includes('6 - 21 + 21 is '))
    ).toBeTruthy();
  });

  test('Enable Cherry Picking Using 🍒 Emoji', async () => {
    const flashcards = await loadCards(
      { cherry: 'true', cloze: 'true' },
      examplId,
      new Workspace(true, 'fs')
    );
    expect(flashcards.length).toBe(2);
  });

  test("Only Create Flashcards From Toggles That Don't Have The 🥑 Emoji", async () => {
    const flashcards = await loadCards(
      { avocado: 'true' },
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    const avocado = flashcards.find((c) => c.name.includes('🥑'));
    expect(avocado).toBeFalsy();
  }, 30000);

  test('Use Notion ID', async () => {
    const flashcards = await loadCards(
      { 'use-notion-id': 'true' },
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    const card = flashcards.find((f) =>
      f.name.includes('3 - 21 + 21 is #buddy')
    );
    const expected = 'a5445230-bfa9-4bf1-bc35-a706c1d129d1';
    expect(card?.notionId).toBe(expected);
  });

  test('Strikethrough Global Tags', async () => {
    const card = await findCardByName('This card has global tags', {
      tags: 'true',
    });
    expect(card?.tags.includes('global-tag')).toBe(true);
    expect(card?.tags.includes('global-tag')).toBe(true);
  });

  test('Use Plain Text for Back', async () => {
    const flashcards = await loadCards(
      { paragraph: 'true' },
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    const card = flashcards.find((c) =>
      c.name.includes('1 - This is a basic card')
    );
    expect(card?.back).toBe('This is the back of the card');
  });

  test('Basic and Reversed', async () => {
    const flashcards = await loadCards(
      { 'basic-reversed': 'true' },
      'fb300010f93745e882e1fd04e0cae6ef',
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    expect(flashcards.length).toBe(2);
  });

  jest.setTimeout(10000);
  test('Enable two columns', async () => {
    const rules = new ParserRules();
    rules.setFlashcardTypes(['column_list']);
    const flashcards = await loadCards(
      {
        'basic-reversed': 'false',
      },
      'eb64d738c17b444ab9d8a747372bed85',
      new Workspace(true, 'fs'),
      rules
    );
    expect(flashcards.length).toBe(1);
  });

  test('Add Notion Link', async () => {
    const expected =
      'https://www.notion.so/Notion-API-Test-Page-3ce6b147ac8a425f836b51cc21825b85#e5201f35c72240d38e3a5d218e5d80a5';
    const flashcards = await loadCards(
      {
        'add-notion-link': 'true',
        parentBlockId: examplId,
      },
      examplId,
      new Workspace(true, 'fs'),
      new ParserRules()
    );
    const card = flashcards.find((f) =>
      f.name.includes('1 - This is a basic card')
    );
    expect(card).toBeTruthy();
    expect(card?.notionLink).toBe(expected);
  });

  test.todo('Maximum One Toggle Per Card');
  test.todo('Use All Toggle Lists');
  test.todo('Template Options');
  test.todo('Just the Reversed Flashcards');
  test.todo('Remove Underlines');
  test.todo('Download Media Files');
  test('Cloze respects preserve-newlines setting', async () => {
    const mockToggleBlock = {
      object: "block" as const,
      id: "preserve-nl-test",
      parent: { type: "page_id" as const, page_id: "page-id" },
      created_time: "",
      last_edited_time: "",
      created_by: { object: "user" as const, id: "user-id" },
      last_edited_by: { object: "user" as const, id: "user-id" },
      has_children: false,
      archived: false,
      in_trash: false,
      type: "toggle" as const,
      toggle: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: "Line one\n", link: null },
            annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" as const },
            plain_text: "Line one\n",
            href: null
          },
          {
            type: "text" as const,
            text: { content: "Answer", link: null },
            annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: true, color: "default" as const },
            plain_text: "Answer",
            href: null
          }
        ],
        color: "default" as const
      }
    };

    const settingsOn = new CardOption({ cloze: 'true', 'perserve-newlines': 'true' });
    const exporterOn = new CustomExporter('', new Workspace(true, 'fs').location);
    const blOn = new BlockHandler(exporterOn, api, settingsOn);
    const cardsOn = await blOn.getFlashcards(new ParserRules(), [mockToggleBlock], [], undefined);
    expect(cardsOn[0].name).toContain('<br />');

    const settingsOff = new CardOption({ cloze: 'true', 'perserve-newlines': 'false' });
    const exporterOff = new CustomExporter('', new Workspace(true, 'fs').location);
    const blOff = new BlockHandler(exporterOff, api, settingsOff);
    const cardsOff = await blOff.getFlashcards(new ParserRules(), [mockToggleBlock], [], undefined);
    expect(cardsOff[0].name).not.toContain('<br />');
  });

  test('Table block produces one Note per data row with single getBlocks call', async () => {
    const tablePageId = 'a9678fc8-77df-41a6-b6e4-e9c884ab5948';
    const tableBlockId = '1e2fc662-0bdd-49c1-978b-cb4d8cb8b33f';

    const rules = new ParserRules();
    rules.setFlashcardTypes(['table']);

    const getBlocksSpy = jest.spyOn(api, 'getBlocks');

    const flashcards = await loadCards(
      {},
      tablePageId,
      new Workspace(true, 'fs'),
      rules
    );

    expect(flashcards).toHaveLength(2);
    expect(flashcards[0].name).toContain('hello');
    expect(flashcards[0].back).toContain('world');
    expect(flashcards[1].name).toContain('goodbye');
    expect(flashcards[1].back).toContain('moon');

    const tableBlockCalls = getBlocksSpy.mock.calls.filter(
      (call) => call[0].id === tableBlockId
    );
    expect(tableBlockCalls).toHaveLength(1);

    getBlocksSpy.mockRestore();
  });
});
