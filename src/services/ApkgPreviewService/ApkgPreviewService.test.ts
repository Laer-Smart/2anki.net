import ApkgPreviewService from './ApkgPreviewService';
import { NormalizedCollection } from './types';

const IO_TEMPLATE_QFMT =
  '<div id="image-occlusion-container">{{Image}}<canvas id="image-occlusion-canvas"></canvas></div><script>anki.imageOcclusion.setup();</script>';

function makeIoCollection(): NormalizedCollection {
  const noteType = {
    id: 1,
    name: 'Image Occlusion',
    type: 0 as const,
    css: '.card { font-family: arial; }',
    fields: [
      { name: 'Occlusion', ord: 0 },
      { name: 'Image', ord: 1 },
      { name: 'Header', ord: 2 },
    ],
    templates: [
      {
        name: 'Image Occlusion',
        ord: 0,
        qfmt: IO_TEMPLATE_QFMT,
        afmt: IO_TEMPLATE_QFMT,
      },
    ],
  };

  const note = {
    id: 10,
    mid: 1,
    tags: '',
    fields: ['[[oc1::shape]]', '<img src="study.png">', 'Chapter 1'],
  };

  return {
    noteTypes: new Map([[1, noteType]]),
    notes: new Map([[10, note]]),
    decks: new Map([[2, { id: 2, name: 'Biology' }]]),
    cards: [{ id: 100, nid: 10, did: 2, ord: 0 }],
  };
}

function makeParsed(collection: NormalizedCollection) {
  return {
    collection,
    mediaMap: new Map<string, string>(),
    mediaEntries: new Map<string, Buffer>(),
    parsedAt: Date.now(),
  };
}

function makeClozeCollection(cardOrds: number[]): NormalizedCollection {
  const noteType = {
    id: 1,
    name: 'n2a-cloze',
    type: 1 as const,
    css: '',
    fields: [{ name: 'Text', ord: 0 }],
    templates: [
      {
        name: 'Cloze',
        ord: 0,
        qfmt: '{{cloze:Text}}',
        afmt: '{{cloze:Text}}',
      },
    ],
  };

  const note = {
    id: 10,
    mid: 1,
    tags: '',
    fields: ['{{c1::Paris}} is the capital of {{c2::France}}'],
  };

  const cards = cardOrds.map((ord, i) => ({
    id: 100 + i,
    nid: 10,
    did: 2,
    ord,
  }));

  return {
    noteTypes: new Map([[1, noteType]]),
    notes: new Map([[10, note]]),
    decks: new Map([[2, { id: 2, name: 'Demo' }]]),
    cards,
  };
}

function makeBadOrdClozeCollection(): NormalizedCollection {
  const noteType = {
    id: 1,
    name: 'n2a-cloze',
    type: 0 as const,
    css: '',
    fields: [{ name: 'Text', ord: 0 }],
    templates: [
      {
        name: 'Cloze',
        ord: 0,
        qfmt: '{{cloze:Text}}',
        afmt: '{{cloze:Text}}',
      },
    ],
  };

  const note = {
    id: 10,
    mid: 1,
    tags: '',
    fields: ['{{c1::Paris}} is the capital of {{c2::France}}'],
  };

  const validCard = { id: 100, nid: 10, did: 2, ord: 0 };
  const badOrdCard = { id: 101, nid: 10, did: 2, ord: 1 };

  return {
    noteTypes: new Map([[1, noteType]]),
    notes: new Map([[10, note]]),
    decks: new Map([[2, { id: 2, name: 'Demo' }]]),
    cards: [validCard, badOrdCard],
  };
}

function makePdfStyleCollection(hashName: string): NormalizedCollection {
  const noteType = {
    id: 1,
    name: 'n2a-basic',
    type: 0 as const,
    css: '.card{}',
    fields: [
      { name: 'Front', ord: 0 },
      { name: 'Back', ord: 1 },
    ],
    templates: [
      {
        name: 'Card 1',
        ord: 0,
        qfmt: '{{Front}}',
        afmt: '{{Back}}',
      },
    ],
  };

  const note = {
    id: 10,
    mid: 1,
    tags: '',
    fields: [`<img src="${hashName}">`, 'some back text'],
  };

  return {
    noteTypes: new Map([[1, noteType]]),
    notes: new Map([[10, note]]),
    decks: new Map([[2, { id: 2, name: 'PDF Deck' }]]),
    cards: [{ id: 100, nid: 10, did: 2, ord: 0 }],
  };
}

describe('PDF-style image cards', () => {
  const service = new ApkgPreviewService();
  const HASH_NAME = 'a1b2c3d4e5f67890abcdef1234567890abcdef12.png';
  const ORIGINAL_NAME = 'notes.pdf-page1-1.png';
  const BASE_URL = '/api/apkg/test.apkg/media/';

  it('rewrites a hash-named image src to the preview media URL', () => {
    const parsed = {
      collection: makePdfStyleCollection(HASH_NAME),
      mediaMap: new Map([[HASH_NAME, '0']]),
      mediaEntries: new Map([['0', Buffer.from([0x89, 0x50, 0x4e, 0x47])]]),
      parsedAt: Date.now(),
    };
    const result = service.getCardsPage(parsed, 0, 10, BASE_URL);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toContain(BASE_URL);
    expect(result.cards[0].front).not.toContain('data-missing-media');
  });

  it('marks an original pdftoppm filename as missing when not in mediaMap', () => {
    const parsed = {
      collection: makePdfStyleCollection(ORIGINAL_NAME),
      mediaMap: new Map([[HASH_NAME, '0']]),
      mediaEntries: new Map([['0', Buffer.from([0x89, 0x50, 0x4e, 0x47])]]),
      parsedAt: Date.now(),
    };
    const result = service.getCardsPage(parsed, 0, 10, BASE_URL);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toContain('data-missing-media');
  });

  it('rewrites image src when mediaMap key is the original pdftoppm filename', () => {
    const parsed = {
      collection: makePdfStyleCollection(ORIGINAL_NAME),
      mediaMap: new Map([[ORIGINAL_NAME, '0']]),
      mediaEntries: new Map([['0', Buffer.from([0x89, 0x50, 0x4e, 0x47])]]),
      parsedAt: Date.now(),
    };
    const result = service.getCardsPage(parsed, 0, 10, BASE_URL);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].front).toContain(BASE_URL);
    expect(result.cards[0].front).not.toContain('data-missing-media');
  });
});

describe('ApkgPreviewService.getCardsPage', () => {
  const service = new ApkgPreviewService();

  it('renders a cloze card at ord=0', () => {
    const parsed = makeParsed(makeClozeCollection([0]));
    const result = service.getCardsPage(parsed, 0, 10, 'http://example.com');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].ord).toBe(0);
    expect(result.cards[0].noteTypeName).toBe('n2a-cloze');
  });

  it('renders cloze cards at ord=1 and higher without the template-ord warning', () => {
    const parsed = makeParsed(makeClozeCollection([0, 1]));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = service.getCardsPage(parsed, 0, 10, 'http://example.com');
    warnSpy.mockRestore();

    expect(result.cards).toHaveLength(2);
    expect(result.cards[1].ord).toBe(1);
  });

  it('does not emit the template-ord warning for cloze cards with ord >= 1', () => {
    const parsed = makeParsed(makeClozeCollection([0, 1, 2]));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    service.getCardsPage(parsed, 0, 10, 'http://example.com');

    const templateOrdWarnings = warnSpy.mock.calls.filter(([msg]) =>
      String(msg).includes('template ord=')
    );
    warnSpy.mockRestore();

    expect(templateOrdWarnings).toHaveLength(0);
  });

  describe('ord-out-of-range fallback', () => {
    it('emits a warn log when a card ord exceeds the noteType template count', () => {
      const parsed = makeParsed(makeBadOrdClozeCollection());
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      service.getCardsPage(parsed, 0, 10, 'http://example.com');

      const templateOrdWarnings = warnSpy.mock.calls.filter(([msg]) =>
        String(msg).includes('template ord=')
      );
      warnSpy.mockRestore();

      expect(templateOrdWarnings).toHaveLength(1);
      expect(String(templateOrdWarnings[0][0])).toContain('n2a-cloze');
    });

    it('still renders the out-of-range card against ord=0 instead of dropping it', () => {
      const parsed = makeParsed(makeBadOrdClozeCollection());
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = service.getCardsPage(parsed, 0, 10, 'http://example.com');
      warnSpy.mockRestore();

      expect(result.cards).toHaveLength(2);
      expect(result.cards.every((c) => c.noteTypeName === 'n2a-cloze')).toBe(true);
    });

    it('does not throw when a card ord exceeds the noteType template count', () => {
      const parsed = makeParsed(makeBadOrdClozeCollection());
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() =>
        service.getCardsPage(parsed, 0, 10, 'http://example.com')
      ).not.toThrow();
      warnSpy.mockRestore();
    });
  });

  describe('Image Occlusion fallback', () => {
    it('renders a fallback block instead of raw canvas markup', () => {
      const parsed = makeParsed(makeIoCollection());
      const result = service.getCardsPage(parsed, 0, 10, 'http://example.com');

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].front).toContain('Image Occlusion cards open with masks in Anki');
    });

    it('does not include <canvas> in the rendered output', () => {
      const parsed = makeParsed(makeIoCollection());
      const result = service.getCardsPage(parsed, 0, 10, 'http://example.com');

      expect(result.cards[0].front).not.toContain('<canvas');
      expect(result.cards[0].back).not.toContain('<canvas');
    });

    it('does not include <script> in the rendered output', () => {
      const parsed = makeParsed(makeIoCollection());
      const result = service.getCardsPage(parsed, 0, 10, 'http://example.com');

      expect(result.cards[0].front).not.toContain('<script');
      expect(result.cards[0].back).not.toContain('<script');
    });

    it('still includes the IO card in the deck list — does not drop it', () => {
      const parsed = makeParsed(makeIoCollection());
      const result = service.getCardsPage(parsed, 0, 10, 'http://example.com');

      expect(result.total).toBe(1);
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].noteTypeName).toBe('Image Occlusion');
    });
  });
});
