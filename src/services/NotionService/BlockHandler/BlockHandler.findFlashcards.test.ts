import BlockHandler from './BlockHandler';
import CardOption from '../../../lib/parser/Settings/CardOption';
import CustomExporter from '../../../lib/parser/exporters/CustomExporter';
import ParserRules from '../../../lib/parser/ParserRules';
import Workspace from '../../../lib/parser/WorkSpace';
import NotionAPIWrapper from '../NotionAPIWrapper';
import { setupTests } from '../../../test/configure-jest';

beforeEach(() => setupTests());

function makeDataSourceApi(): NotionAPIWrapper {
  const row = {
    id: 'row-1',
    properties: {
      Front: {
        id: 'front',
        type: 'title',
        title: [
          {
            type: 'text',
            text: { content: 'What is spaced repetition?', link: null },
            plain_text: 'What is spaced repetition?',
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
        ],
      },
      Back: {
        id: 'back',
        type: 'rich_text',
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'A learning method that spaces reviews over time.',
              link: null,
            },
            plain_text: 'A learning method that spaces reviews over time.',
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
        ],
      },
    },
  };

  return {
    queryDatabase: jest.fn().mockResolvedValue({
      results: [row],
    }),
    getDatabase: jest.fn().mockResolvedValue({ id: 'ds-1' }),
    getDatabaseTitle: jest.fn().mockResolvedValue('Study Deck'),
    getPage: jest.fn(),
    getPageTitle: jest.fn(),
    getTopLevelTags: jest.fn().mockResolvedValue([]),
    getBlocks: jest.fn(),
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
