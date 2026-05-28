import { PrepareDeck } from './PrepareDeck';
import CardOption from '../../../lib/parser/Settings/CardOption';

jest.mock('../../../lib/claude/ClaudeService', () => ({
  generateDeckInfo: jest.fn(),
}));

jest.mock('../../../lib/parser/exporters/CustomExporter', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      configure: jest.fn(),
      save: jest.fn().mockResolvedValue(Buffer.from('fake-apkg')),
    })),
  };
});

jest.mock('../../../lib/anki/getDeckFilename', () => ({
  __esModule: true,
  default: jest.fn((name: string) => `${name}.apkg`),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('./convertPdfTextToHtml', () => ({
  convertPdfTextToHtml: jest.fn().mockResolvedValue({
    html: '<p>extracted text card</p>',
    cardCount: 3,
    isDrmLocked: false,
    needsCredential: false,
  }),
}));

jest.mock('./convertPDFToImages', () => ({
  convertPDFToImages: jest.fn().mockResolvedValue('<p>page image card</p>'),
}));

const { convertPdfTextToHtml } = require('./convertPdfTextToHtml');
const { convertPDFToImages } = require('./convertPDFToImages');

const { generateDeckInfo } = require('../../../lib/claude/ClaudeService');
const CustomExporterMock = require('../../../lib/parser/exporters/CustomExporter').default;

function makeSettings(overrides: Record<string, string> = {}): CardOption {
  return new CardOption({ ...CardOption.LoadDefaultOptions(), ...overrides });
}

function makeWorkspace() {
  return { location: '/tmp/test-workspace' } as any;
}

describe('PrepareDeck — Claude AI flashcards branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes ClaudeService when claudeAIFlashcards is true and user is paying', async () => {
    const deckArray = [
      {
        name: 'My Deck',
        image: '',
        style: null,
        id: 111222333444555,
        settings: { template: 'specialstyle' },
        cards: [
          {
            name: 'Front',
            back: 'Back',
            tags: [],
            cloze: false,
            number: 0,
            enableInput: false,
            answer: '',
            media: [],
          },
        ],
      },
    ];

    generateDeckInfo.mockResolvedValueOnce(deckArray);

    const settings = makeSettings({ 'claude-ai-flashcards': 'true' });
    const result = await PrepareDeck({
      name: 'test.html',
      files: [{ name: 'test.html', contents: '<p>Front</p>' }],
      settings,
      noLimits: true,
      workspace: makeWorkspace(),
    });

    expect(generateDeckInfo).toHaveBeenCalledTimes(1);
    expect(result.name).toContain('My Deck');
    expect(result.apkg).toEqual(Buffer.from('fake-apkg'));
  });

  it('does not invoke ClaudeService when noLimits is false', async () => {
    const settings = makeSettings({ 'claude-ai-flashcards': 'true' });

    jest.mock('../../../lib/parser/DeckParser', () => ({
      DeckParser: jest.fn().mockImplementation(() => ({
        totalCardCount: jest.fn().mockReturnValue(0),
        processFirstFile: jest.fn(),
        tryExperimental: jest.fn().mockResolvedValue(Buffer.from('regular-apkg')),
        name: 'test',
        payload: [],
      })),
    }));

    await PrepareDeck({
      name: 'test.html',
      files: [{ name: 'test.html', contents: '<p>Front</p>' }],
      settings,
      noLimits: false,
      workspace: makeWorkspace(),
    }).catch(() => {});

    expect(generateDeckInfo).not.toHaveBeenCalled();
  });

  it('does not invoke ClaudeService when claudeAIFlashcards is false', async () => {
    const settings = makeSettings({ 'claude-ai-flashcards': 'false' });

    await PrepareDeck({
      name: 'test.html',
      files: [{ name: 'test.html', contents: '<p>Front</p>' }],
      settings,
      noLimits: true,
      workspace: makeWorkspace(),
    }).catch(() => {});

    expect(generateDeckInfo).not.toHaveBeenCalled();
  });
});

describe('PrepareDeck — PDF text-vs-image gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function runPdf(settings: CardOption) {
    return PrepareDeck({
      name: 'notes.pdf',
      files: [{ name: 'notes.pdf', contents: Buffer.from('%PDF-1.4 fake') }],
      settings,
      noLimits: true,
      workspace: makeWorkspace(),
    }).catch(() => undefined);
  }

  it('renders page images by default even when text extraction returns cards', async () => {
    expect(makeSettings().pdfExtractText).toBe(false);
    await runPdf(makeSettings());
    expect(convertPDFToImages).toHaveBeenCalledTimes(1);
  });

  it('uses extracted text when pdf-extract-text is on', async () => {
    expect(makeSettings({ 'pdf-extract-text': 'true' }).pdfExtractText).toBe(true);
    await runPdf(makeSettings({ 'pdf-extract-text': 'true' }));
    expect(convertPdfTextToHtml).toHaveBeenCalledTimes(1);
    expect(convertPDFToImages).not.toHaveBeenCalled();
  });
});

describe('PrepareDeck — diagnostic logging', () => {
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('logs received file list with count, names, and sources when two same-named entries are present', async () => {
    const settings = makeSettings();
    await PrepareDeck({
      name: 'anatomy.pdf',
      files: [
        { name: 'anatomy.pdf', contents: Buffer.from('%PDF-1.4 a') },
        { name: 'anatomy.pdf', contents: Buffer.from('%PDF-1.4 b') },
      ],
      settings,
      noLimits: true,
      workspace: makeWorkspace(),
    }).catch(() => undefined);

    expect(infoSpy).toHaveBeenCalledWith(
      '[PrepareDeck] received',
      expect.objectContaining({
        count: 2,
        names: ['anatomy.pdf', 'anatomy.pdf'],
        sources: expect.arrayContaining(['anatomy.pdf']),
      })
    );
  });

  it('logs a convertFile start line for each same-named entry', async () => {
    const settings = makeSettings();
    await PrepareDeck({
      name: 'anatomy.pdf',
      files: [
        { name: 'anatomy.pdf', contents: Buffer.from('%PDF-1.4 a') },
        { name: 'anatomy.pdf', contents: Buffer.from('%PDF-1.4 b') },
      ],
      settings,
      noLimits: true,
      workspace: makeWorkspace(),
    }).catch(() => undefined);

    const startCalls = infoSpy.mock.calls.filter(
      (args) => args[0] === '[PrepareDeck] convertFile start'
    );
    expect(startCalls).toHaveLength(2);
    expect(startCalls[0][1]).toMatchObject({ name: 'anatomy.pdf', workspaceLocation: '/tmp/test-workspace' });
    expect(startCalls[1][1]).toMatchObject({ name: 'anatomy.pdf', workspaceLocation: '/tmp/test-workspace' });
  });
});
