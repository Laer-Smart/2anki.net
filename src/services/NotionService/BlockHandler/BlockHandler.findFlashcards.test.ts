import BlockHandler from './BlockHandler';
import CardOption from '../../../lib/parser/Settings/CardOption';
import CustomExporter from '../../../lib/parser/exporters/CustomExporter';
import ParserRules from '../../../lib/parser/ParserRules';
import Workspace from '../../../lib/parser/WorkSpace';
import NotionAPIWrapper from '../NotionAPIWrapper';
import { setupTests } from '../../../test/configure-jest';

beforeEach(() => setupTests());

function makePageResponse(id: string, title: string) {
  return {
    object: 'page',
    id,
    created_time: '2024-01-01T00:00:00.000Z',
    last_edited_time: '2024-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user-1' },
    last_edited_by: { object: 'user', id: 'user-1' },
    cover: null,
    icon: null,
    parent: { type: 'workspace', workspace: true },
    archived: false,
    in_trash: false,
    url: `https://www.notion.so/${id}`,
    public_url: null,
    properties: {
      title: {
        id: 'title',
        type: 'title',
        title: [{ type: 'text', text: { content: title, link: null }, plain_text: title, href: null, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
      },
    },
  };
}

function makeToggleBlock(id: string, question: string) {
  return {
    object: 'block',
    id,
    parent: { type: 'page_id', page_id: 'page-1' },
    created_time: '2024-01-01T00:00:00.000Z',
    last_edited_time: '2024-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user-1' },
    last_edited_by: { object: 'user', id: 'user-1' },
    has_children: true,
    archived: false,
    in_trash: false,
    type: 'toggle',
    toggle: {
      rich_text: [
        {
          type: 'text',
          text: { content: question, link: null },
          plain_text: question,
          href: null,
          annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        },
      ],
      color: 'default',
    },
  };
}

function makeParagraphBlock(id: string, text: string) {
  return {
    object: 'block',
    id,
    parent: { type: 'block_id', block_id: 'toggle-1' },
    created_time: '2024-01-01T00:00:00.000Z',
    last_edited_time: '2024-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user-1' },
    last_edited_by: { object: 'user', id: 'user-1' },
    has_children: false,
    archived: false,
    in_trash: false,
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content: text, link: null },
          plain_text: text,
          href: null,
          annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        },
      ],
      color: 'default',
    },
  };
}

function makeDataSourceApi(): NotionAPIWrapper {
  const toggleBlock = makeToggleBlock('toggle-1', 'What is spaced repetition?');
  const answerBlock = makeParagraphBlock('para-1', 'A learning method that spaces reviews over time.');
  const pageResponse = makePageResponse('page-1', 'Study Deck');

  return {
    queryDatabase: jest.fn().mockResolvedValue({
      results: [{ id: 'page-1' }],
    }),
    getDatabase: jest.fn().mockResolvedValue({ id: 'ds-1' }),
    getDatabaseTitle: jest.fn().mockResolvedValue('Study Deck'),
    getPage: jest.fn().mockResolvedValue(pageResponse),
    getPageTitle: jest.fn().mockResolvedValue('Study Deck'),
    getTopLevelTags: jest.fn().mockResolvedValue([]),
    getBlocks: jest.fn().mockImplementation(({ id }: { id: string }) => {
      if (id === 'ds-1') {
        return Promise.resolve({ results: [toggleBlock], next_cursor: null, has_more: false, type: 'block', block: {} });
      }
      if (id === 'page-1') {
        return Promise.resolve({ results: [toggleBlock], next_cursor: null, has_more: false, type: 'block', block: {} });
      }
      if (id === 'toggle-1') {
        return Promise.resolve({ results: [answerBlock], next_cursor: null, has_more: false, type: 'block', block: {} });
      }
      return Promise.resolve({ results: [], next_cursor: null, has_more: false, type: 'block', block: {} });
    }),
  } as unknown as NotionAPIWrapper;
}

function makeHandler(api: NotionAPIWrapper): BlockHandler {
  const settings = new CardOption({});
  const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
  return new BlockHandler(exporter, api, settings);
}

describe('BlockHandler.findFlashcards — parentType routing', () => {
  it('routes data_source parentType through the database arm without throwing', async () => {
    const api = makeDataSourceApi();
    const bl = makeHandler(api);

    const decks = await bl.findFlashcards({
      parentType: 'data_source',
      topLevelId: 'ds-1',
      rules: new ParserRules(),
      decks: [],
      parentName: '',
    });

    expect(decks.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty decks and logs once for an unknown parentType, does not throw', async () => {
    const api = makeDataSourceApi();
    const bl = makeHandler(api);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const decks = await bl.findFlashcards({
      parentType: 'unknown_future_type',
      topLevelId: 'unknown-id',
      rules: new ParserRules(),
      decks: [],
      parentName: '',
    });

    expect(decks).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown_future_type')
    );
    errorSpy.mockRestore();
  });
});
